package auth

import (
	"context"
	"errors"
	"net/http"
	"os"
	"strings"

	jwt "github.com/golang-jwt/jwt/v5"
)

const userIDHeader = "X-User-Id"
const guestIDHeader = "X-Guest-Id"
const guestPrefix = "guest_"

type userIDContextKey struct{}

// WithUserID returns a new context with an authenticated user id attached.
func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDContextKey{}, strings.TrimSpace(userID))
}

// UserIDFromContext extracts an authenticated user id from context.
func UserIDFromContext(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(userIDContextKey{}).(string)
	if !ok {
		return "", false
	}
	v = strings.TrimSpace(v)
	if v == "" {
		return "", false
	}
	return v, true
}

func extractBearerToken(r *http.Request) (string, error) {
	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if authHeader == "" {
		return "", errors.New("missing authorization header")
	}
	if !strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
		return "", errors.New("invalid authorization header")
	}
	token := strings.TrimSpace(authHeader[7:])
	if token == "" {
		return "", errors.New("missing bearer token")
	}
	return token, nil
}

func extractGuestUserID(r *http.Request) (string, bool) {
	guestID := strings.TrimSpace(r.Header.Get(guestIDHeader))
	if guestID == "" {
		return "", false
	}
	if strings.HasPrefix(guestID, guestPrefix) {
		return guestID, true
	}
	return guestPrefix + guestID, true
}

func userIDFromClaims(claims jwt.MapClaims) string {
	if sub, ok := claims["sub"].(string); ok && strings.TrimSpace(sub) != "" {
		return strings.TrimSpace(sub)
	}
	if uid, ok := claims["user_id"].(string); ok && strings.TrimSpace(uid) != "" {
		return strings.TrimSpace(uid)
	}
	if uid, ok := claims["uid"].(string); ok && strings.TrimSpace(uid) != "" {
		return strings.TrimSpace(uid)
	}
	return ""
}

func validateToken(tokenStr string, secret string) (string, error) {
	claims := jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return "", err
	}
	if !token.Valid {
		return "", errors.New("invalid token")
	}
	uid := userIDFromClaims(claims)
	if uid == "" {
		return "", errors.New("missing user id claim")
	}
	return uid, nil
}

// JWTMiddleware validates edge JWTs and forwards the resolved user id in X-User-Id.
func JWTMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
		if authHeader == "" {
			if guestUserID, ok := extractGuestUserID(r); ok {
				r2 := r.Clone(r.Context())
				r2 = r2.WithContext(WithUserID(r2.Context(), guestUserID))
				r2.Header.Set(userIDHeader, guestUserID)
				next.ServeHTTP(w, r2)
				return
			}
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		secret := strings.TrimSpace(os.Getenv("JWT_SECRET_KEY"))
		if secret == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		token, err := extractBearerToken(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		uid, err := validateToken(token, secret)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		r2 := r.Clone(r.Context())
		r2 = r2.WithContext(WithUserID(r2.Context(), uid))
		r2.Header.Set(userIDHeader, uid)
		next.ServeHTTP(w, r2)
	})
}
