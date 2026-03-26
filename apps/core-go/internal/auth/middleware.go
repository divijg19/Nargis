package auth

import (
	"errors"
	"net/http"
	"os"
	"strings"

	jwt "github.com/golang-jwt/jwt/v5"
)

const userIDHeader = "X-User-Id"

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
		r2.Header.Set(userIDHeader, uid)
		next.ServeHTTP(w, r2)
	})
}
