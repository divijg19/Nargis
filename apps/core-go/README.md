---
title: Nargis Gateway
emoji: ⚡
colorFrom: blue
colorTo: red
sdk: docker
app_port: 7860
pinned: false
---

# core-go

Go gateway for Nargis realtime and proxy traffic.

For repo-level context, see:
- [../../README.md](../../README.md)
- [../../ARCHITECTURE.md](../../ARCHITECTURE.md)
- [../../ROADMAP.md](../../ROADMAP.md)

## Responsibilities

- Websocket transport
- Stream forwarding and cancellation handling
- Gateway-side proxy and health surfaces
- Runtime policy around origins, auth, and readiness

## Local Commands

```bash
cd apps/core-go
go test ./...
go vet ./...
go build ./...
```
