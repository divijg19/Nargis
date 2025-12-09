# Build Stage
FROM golang:1.25-alpine AS builder
WORKDIR /app

# Install git for fetching dependencies
RUN apk add --no-cache git

# Copy go.mod and go.sum first for caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
# -ldflags="-s -w" strips debug information to reduce binary size
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o gateway .

# Runtime Stage
FROM alpine:latest

# Install ca-certificates for HTTPS and tzdata
# wget is part of busybox in alpine, so we don't need to install curl
RUN apk add --no-cache ca-certificates tzdata

# Create a non-root user
RUN adduser -D -g '' nargis

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/gateway .

# Use the non-root user
USER nargis

# Expose port
EXPOSE 8080

# Healthcheck using wget (built-in)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the binary
CMD ["./gateway"]
