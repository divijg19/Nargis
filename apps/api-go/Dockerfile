FROM golang:1.25 AS builder
WORKDIR /src

# Cache modules
COPY go.mod go.sum ./
RUN go env -w GOFLAGS=-mod=mod
RUN go mod download

# Copy source
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags "-s -w" -o /app/main ./...

FROM gcr.io/distroless/static:nonroot
COPY --from=builder /app/main /app/main

# The distroless nonroot image expects an unprivileged user; the binary must be
# owned by a non-root user which the image exposes. Ensure the binary is
# readable by non-root; the build produces a statically linked binary so we
# simply set permissions.
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/app/main"]
