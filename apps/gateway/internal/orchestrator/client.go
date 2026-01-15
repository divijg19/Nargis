package orchestrator

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"time"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

type StatusError struct {
	StatusCode int
	Status     string
	Body       string
}

func (e *StatusError) Error() string {
	if e == nil {
		return "orchestrator returned status error"
	}
	if e.Body == "" {
		return fmt.Sprintf("orchestrator returned %s", e.Status)
	}
	return fmt.Sprintf("orchestrator returned %s: %s", e.Status, e.Body)
}

func NewClient(url string) *Client {
	return &Client{
		baseURL: url,
		httpClient: &http.Client{
			Timeout: 120 * time.Second, // Long timeout for AI processing
		},
	}
}

const processAudioPath = "/api/v1/process-audio"

type ProcessAudioOptions struct {
	Mode      string
	AuthToken string
}

// ProcessAudioBuffer sends a complete audio buffer to the backend.
// Used for retries and buffered fallback.
func (c *Client) ProcessAudioBuffer(ctx context.Context, audioData []byte, requestID string) (io.ReadCloser, error) {
	return c.ProcessAudioBufferWithOptions(ctx, audioData, requestID, nil)
}

// ProcessAudioBufferWithOptions sends a complete audio buffer to the backend.
// Options can include mode selection and forwarding an Authorization bearer token.
func (c *Client) ProcessAudioBufferWithOptions(ctx context.Context, audioData []byte, requestID string, opts *ProcessAudioOptions) (io.ReadCloser, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("audio_file", "audio.webm")
	if err != nil {
		return nil, fmt.Errorf("failed to create form file: %w", err)
	}
	if _, err := part.Write(audioData); err != nil {
		return nil, fmt.Errorf("failed to write audio data: %w", err)
	}
	writer.Close()

	u, err := url.Parse(c.baseURL + processAudioPath)
	if err != nil {
		return nil, fmt.Errorf("failed to parse orchestrator url: %w", err)
	}
	if opts != nil {
		mode := opts.Mode
		if mode == "" {
			mode = "chat"
		}
		q := u.Query()
		q.Set("mode", mode)
		u.RawQuery = q.Encode()
	}

	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("X-Request-ID", requestID)
	if opts != nil {
		if tok := opts.AuthToken; tok != "" {
			req.Header.Set("Authorization", "Bearer "+tok)
		}
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		defer resp.Body.Close()
		preview, _ := io.ReadAll(io.LimitReader(resp.Body, 8*1024))
		return nil, &StatusError{StatusCode: resp.StatusCode, Status: resp.Status, Body: string(preview)}
	}

	return resp.Body, nil
}

// ForwardRequest forwards a request body directly to the orchestrator.
func (c *Client) ForwardRequest(ctx context.Context, body io.Reader, contentType string, requestID, userID, claims string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+processAudioPath, body)
	if err != nil {
		return nil, err
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	req.Header.Set("X-Request-ID", requestID)
	if userID != "" {
		req.Header.Set("X-User-ID", userID)
	}
	if claims != "" {
		req.Header.Set("X-User-Claims", claims)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		preview, _ := io.ReadAll(io.LimitReader(resp.Body, 8*1024))
		resp.Body.Close()
		return nil, fmt.Errorf("orchestrator returned %s: %s", resp.Status, string(preview))
	}
	return resp, nil
}
