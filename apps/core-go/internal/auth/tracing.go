package auth

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

const RequestIDHeader = "X-Request-ID"

type requestIDContextKey struct{}
type requestLoggerContextKey struct{}

func WithRequestID(ctx context.Context, requestID string) context.Context {
	id := strings.TrimSpace(requestID)
	if id == "" {
		id = uuid.NewString()
	}
	return context.WithValue(ctx, requestIDContextKey{}, id)
}

func RequestIDFromContext(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(requestIDContextKey{}).(string)
	if !ok {
		return "", false
	}
	v = strings.TrimSpace(v)
	if v == "" {
		return "", false
	}
	return v, true
}

func WithRequestLogger(ctx context.Context, logger *slog.Logger) context.Context {
	if logger == nil {
		logger = slog.Default()
	}
	return context.WithValue(ctx, requestLoggerContextKey{}, logger)
}

func LoggerFromContext(ctx context.Context) *slog.Logger {
	if logger, ok := ctx.Value(requestLoggerContextKey{}).(*slog.Logger); ok && logger != nil {
		return logger
	}
	if requestID, ok := RequestIDFromContext(ctx); ok {
		return slog.With("request_id", requestID)
	}
	return slog.Default()
}

func TracingMiddleware(next http.Handler) http.Handler {
	if next == nil {
		next = http.HandlerFunc(func(http.ResponseWriter, *http.Request) {})
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := strings.TrimSpace(r.Header.Get(RequestIDHeader))
		if requestID == "" {
			requestID = uuid.NewString()
		}

		r2 := r.Clone(r.Context())
		r2.Header.Set(RequestIDHeader, requestID)

		ctx := WithRequestID(r2.Context(), requestID)
		ctx = WithRequestLogger(ctx, slog.With("request_id", requestID))
		r2 = r2.WithContext(ctx)

		w.Header().Set(RequestIDHeader, requestID)
		next.ServeHTTP(w, r2)
	})
}
