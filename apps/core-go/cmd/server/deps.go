package main

import (
	"net/http"
	"strings"

	"github.com/divijg19/Nargis/core-go/internal/auth"
	"github.com/divijg19/Nargis/core-go/internal/bus"
	"github.com/divijg19/Nargis/core-go/internal/config"
	"github.com/divijg19/Nargis/core-go/internal/orchestrator"
	"github.com/divijg19/Nargis/core-go/internal/vad"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

type gatewayDependencies struct {
	config       *config.Config
	orchClient   *orchestrator.Client
	busClient    *bus.Client
	rateLimitRDB *redis.Client
	vadProc      *vad.Processor
	upgrader     websocket.Upgrader
	audioSem     chan struct{}
}

var appDeps = &gatewayDependencies{}

// Legacy test shims. Runtime code should prefer appDeps, but the existing test
// suite still mutates these package globals directly.
var (
	cfg          *config.Config
	orchClient   *orchestrator.Client
	busClient    *bus.Client
	rateLimitRDB *redis.Client
	vadProc      *vad.Processor
	upgrader     websocket.Upgrader
	audioSem     chan struct{}
)

func newGatewayDependencies(cfg *config.Config) *gatewayDependencies {
	return &gatewayDependencies{
		config:     cfg,
		orchClient: orchestrator.NewClient(cfg.OrchestratorURL),
		vadProc:    vad.NewProcessor(vad.DefaultConfig()),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return auth.CheckOrigin(r) },
		},
		audioSem: make(chan struct{}, 4),
	}
}

func syncLegacyGlobalsFromDeps() {
	if appDeps == nil {
		return
	}
	cfg = appDeps.config
	orchClient = appDeps.orchClient
	busClient = appDeps.busClient
	rateLimitRDB = appDeps.rateLimitRDB
	vadProc = appDeps.vadProc
	upgrader = appDeps.upgrader
	audioSem = appDeps.audioSem
}

func syncDepsFromLegacyGlobals() {
	if appDeps == nil {
		appDeps = &gatewayDependencies{}
	}
	if cfg != nil {
		appDeps.config = cfg
	}
	if orchClient != nil {
		appDeps.orchClient = orchClient
	}
	if busClient != nil {
		appDeps.busClient = busClient
	}
	if rateLimitRDB != nil {
		appDeps.rateLimitRDB = rateLimitRDB
	}
	if vadProc != nil {
		appDeps.vadProc = vadProc
	}
	if upgrader.CheckOrigin != nil {
		appDeps.upgrader = upgrader
	}
	if audioSem != nil {
		appDeps.audioSem = audioSem
	}
}

func (d *gatewayDependencies) ensureAudioSemaphore() chan struct{} {
	if d.audioSem == nil {
		d.audioSem = make(chan struct{}, 4)
	}
	return d.audioSem
}

func (d *gatewayDependencies) getOrchestratorBaseURL() string {
	if d != nil && d.config != nil {
		if u := strings.TrimSpace(d.config.OrchestratorURL); u != "" {
			return u
		}
	}
	return strings.TrimSpace(getEnvWithFallback("ORCHESTRATOR_URL", "http://localhost:8000"))
}
