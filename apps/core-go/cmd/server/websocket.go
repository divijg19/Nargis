package main

import (
	"bufio"
	"context"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/divijg19/Nargis/core-go/internal/auth"
	"github.com/divijg19/Nargis/core-go/internal/metrics"
	"github.com/divijg19/Nargis/core-go/internal/orchestrator"
	"github.com/divijg19/Nargis/core-go/internal/vad"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

func safeSend(send chan<- []byte, msg []byte) {
	defer func() {
		if r := recover(); r != nil {
		}
	}()
	send <- msg
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	syncDepsFromLegacyGlobals()
	reqLogger := auth.LoggerFromContext(r.Context())

	appDeps.ensureAudioSemaphore()
	if appDeps.vadProc == nil {
		appDeps.vadProc = vad.NewProcessor(vad.DefaultConfig())
	}

	uid, err := auth.VerifyJWTFromRequest(r)
	authToken := extractAuthToken(r)
	if shouldRequireAuth() {
		if err != nil || strings.TrimSpace(uid) == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
	}

	ws, err := appDeps.upgrader.Upgrade(w, r, nil)
	if err != nil {
		reqLogger.Error("WS upgrade failed", "error", err)
		return
	}
	metrics.ActiveWebsockets.Inc()
	defer func() {
		ws.Close()
		metrics.ActiveWebsockets.Dec()
	}()

	send := make(chan []byte, 256)

	type orchState struct {
		mu     sync.Mutex
		cancel context.CancelFunc
		mode   string
	}
	state := &orchState{mode: "chat"}
	audioQueue := make(chan []byte)
	workerReady := make(chan struct{})
	defer close(audioQueue)

	go func() {
		for msg := range send {
			if err := ws.WriteMessage(websocket.TextMessage, msg); err != nil {
				reqLogger.Error("WS write failed", "error", err)
				return
			}
		}
	}()
	defer close(send)

	go func() {
		close(workerReady)
		for payload := range audioQueue {
			select {
			case appDeps.audioSem <- struct{}{}:
			default:
				safeSend(send, []byte(`{"type": "error", "content": "Too many requests, try again later."}`))
				continue
			}

			reqID := uuid.New().String()
			reqLogger.Info("Processing audio", "req_id", reqID, "user_id", uid)
			start := time.Now()

			ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
			state.mu.Lock()
			state.cancel = cancel
			mode := state.mode
			state.mu.Unlock()

			stream, err := appDeps.orchClient.ProcessAudioBufferWithOptions(
				ctx,
				payload,
				reqID,
				&orchestrator.ProcessAudioOptions{Mode: mode, AuthToken: authToken},
			)
			metrics.OrchestratorLatency.Observe(time.Since(start).Seconds())
			if err != nil {
				reqLogger.Error("Orchestrator failed", "error", err, "req_id", reqID)
				if ctx.Err() == context.Canceled {
					safeSend(send, []byte(`{"type": "end", "content": "canceled"}`))
					cancel()
					state.mu.Lock()
					state.cancel = nil
					state.mu.Unlock()
					<-appDeps.audioSem
					continue
				}
				if se, ok := err.(*orchestrator.StatusError); ok {
					if se.StatusCode == http.StatusUnauthorized || se.StatusCode == http.StatusForbidden {
						safeSend(send, []byte(`{"type":"error","content":"Login required for agent mode."}`))
						cancel()
						state.mu.Lock()
						state.cancel = nil
						state.mode = "chat"
						state.mu.Unlock()
						<-appDeps.audioSem
						continue
					}
				}
				safeSend(send, []byte(`{"type": "error", "content": "AI service unavailable"}`))
				cancel()
				state.mu.Lock()
				state.cancel = nil
				state.mu.Unlock()
				<-appDeps.audioSem
				continue
			}
			scanner := bufio.NewScanner(stream)
			buf := make([]byte, 0, 64*1024)
			scanner.Buffer(buf, 1024*1024)
			canceled := false
			terminalSent := false
		scanLoop:
			for scanner.Scan() {
				select {
				case <-ctx.Done():
					canceled = true
					break scanLoop
				default:
				}
				line := strings.TrimSpace(scanner.Text())
				if line == "" {
					continue
				}
				if terminalSent {
					continue
				}
				safeSend(send, []byte(line))
			}
			if err := scanner.Err(); err != nil {
				if ctx.Err() == context.Canceled {
					if !terminalSent {
						terminalSent = true
						safeSend(send, []byte(`{"type": "end", "content": "canceled"}`))
					}
				} else {
					reqLogger.Error("Failed to stream response", "error", err, "req_id", reqID)
					if !terminalSent {
						terminalSent = true
						safeSend(send, []byte(`{"type": "error", "content": "Failed to stream response"}`))
					}
				}
			} else if canceled {
				if !terminalSent {
					terminalSent = true
					safeSend(send, []byte(`{"type": "end", "content": "canceled"}`))
				}
			}

			stream.Close()

			cancel()
			state.mu.Lock()
			state.cancel = nil
			state.mu.Unlock()
			<-appDeps.audioSem
		}
	}()
	<-workerReady

	if appDeps.busClient != nil && uid != "" {
		ctx, cancel := context.WithCancel(r.Context())
		defer cancel()

		events, err := appDeps.busClient.SubscribeToUserEvents(ctx, uid)
		if err != nil {
			reqLogger.Error("Failed to subscribe to user events", "uid", uid, "error", err)
		} else {
			go func() {
				for {
					select {
					case <-ctx.Done():
						return
					case event, ok := <-events:
						if !ok {
							return
						}
						metrics.EventBusMessages.Inc()
						safeSend(send, []byte(event))
					}
				}
			}()
		}
	}

	for {
		msgType, msg, err := ws.ReadMessage()
		if err != nil {
			break
		}

		if msgType == websocket.TextMessage {
			txt := strings.TrimSpace(string(msg))
			if strings.HasPrefix(txt, "MODE:") {
				mode := strings.ToLower(strings.TrimSpace(strings.TrimPrefix(txt, "MODE:")))
				switch mode {
				case "chat":
					state.mu.Lock()
					state.mode = "chat"
					state.mu.Unlock()
					continue
				case "agent":
					if strings.TrimSpace(authToken) == "" {
						safeSend(send, []byte(`{"type":"error","content":"Login required for execute mode."}`))
						continue
					}
					if strings.TrimSpace(os.Getenv("JWT_SECRET_KEY")) != "" || strings.TrimSpace(os.Getenv("JWT_HMAC_SECRET")) != "" {
						if sub, verr := auth.VerifyJWTToken(authToken); verr != nil || strings.TrimSpace(sub) == "" {
							safeSend(send, []byte(`{"type":"error","content":"Login required for execute mode."}`))
							continue
						}
					}
					state.mu.Lock()
					state.mode = "agent"
					state.mu.Unlock()
					continue
				default:
					continue
				}
			}
			switch txt {
			case "EOS", "STOP":
				if txt == "STOP" {
					state.mu.Lock()
					if state.cancel != nil {
						state.cancel()
						state.cancel = nil
					}
					state.mu.Unlock()
				}
				continue
			default:
				continue
			}
		}
		if msgType != websocket.BinaryMessage {
			continue
		}

		if shouldApplyVAD(msg) {
			isSpeech, _ := appDeps.vadProc.Process(msg)
			if !isSpeech {
				metrics.AudioFramesProcessed.WithLabelValues("dropped").Inc()
				continue
			}
		}
		metrics.AudioFramesProcessed.WithLabelValues("forwarded").Inc()

		select {
		case audioQueue <- msg:
		default:
			safeSend(send, []byte(`{"type": "error", "content": "Already processing. Try again in a moment."}`))
		}
	}
}

func shouldApplyVAD(msg []byte) bool {
	mode := strings.ToLower(strings.TrimSpace(getVADMode()))
	switch mode {
	case "off", "0", "false", "disabled":
		return false
	case "on", "1", "true", "enabled":
		return true
	default:
		if len(msg) < 2 {
			return false
		}
		if looksLikeAudioContainer(msg) {
			return false
		}
		if len(msg)%2 != 0 {
			return false
		}
		return true
	}
}

func looksLikeAudioContainer(b []byte) bool {
	if len(b) >= 4 {
		if b[0] == 0x1A && b[1] == 0x45 && b[2] == 0xDF && b[3] == 0xA3 {
			return true
		}
		if b[0] == 'O' && b[1] == 'g' && b[2] == 'g' && b[3] == 'S' {
			return true
		}
		if b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' {
			return true
		}
		if b[0] == 'f' && b[1] == 'L' && b[2] == 'a' && b[3] == 'C' {
			return true
		}
		if b[0] == 'I' && b[1] == 'D' && b[2] == '3' {
			return true
		}
	}
	return false
}
