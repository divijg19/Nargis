FROM golang:1.25.3 AS builder
WORKDIR /src

# Cache modules separately for better layer reuse
COPY go.mod go.sum ./
RUN go mod download

# Copy source after deps
COPY . .

ARG TARGETOS=linux
ARG TARGETARCH=amd64
ENV CGO_ENABLED=0
RUN GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -ldflags "-s -w -buildid=" -o /out/server ./...

FROM gcr.io/distroless/static:nonroot
COPY --from=builder /out/server /app/server
USER 65532:65532
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD ["/app/server","--healthcheck"]
ENTRYPOINT ["/app/server"]
