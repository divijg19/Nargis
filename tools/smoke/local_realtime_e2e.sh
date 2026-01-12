#!/usr/bin/env bash
set -euo pipefail

ORCH_PORT="${ORCH_PORT:-9101}"
GATEWAY_PORT="${GATEWAY_PORT:-9102}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "== Local realtime E2E =="
echo "Root: $ROOT_DIR"
echo "Mock orchestrator: http://127.0.0.1:$ORCH_PORT"
echo "Gateway:           http://127.0.0.1:$GATEWAY_PORT"
echo

cleanup() {
  if [ -n "${GW_PID:-}" ] && kill -0 "$GW_PID" >/dev/null 2>&1; then
    kill "$GW_PID" || true
  fi
  if [ -n "${ORCH_PID:-}" ] && kill -0 "$ORCH_PID" >/dev/null 2>&1; then
    kill "$ORCH_PID" || true
  fi
}
trap cleanup EXIT

echo "Starting mock orchestrator..."
ORCH_PORT="$ORCH_PORT" node "$ROOT_DIR/tools/mock-orchestrator.js" &
ORCH_PID=$!

# wait for orchestrator
for _ in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:$ORCH_PORT/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done
curl -fsS "http://127.0.0.1:$ORCH_PORT/health" >/dev/null

echo "Starting gateway..."
(
  cd "$ROOT_DIR/apps/gateway"
  PORT="$GATEWAY_PORT" \
  ORCHESTRATOR_URL="http://127.0.0.1:$ORCH_PORT" \
  REDIS_URL="" \
  VAD_MODE="auto" \
  WS_REQUIRE_AUTH="0" \
  go run .
) &
GW_PID=$!

# wait for gateway
for _ in $(seq 1 80); do
  if curl -fsS "http://127.0.0.1:$GATEWAY_PORT/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done
curl -fsS "http://127.0.0.1:$GATEWAY_PORT/health" >/dev/null

echo "Running WS client against gateway..."
WS_URL="ws://127.0.0.1:$GATEWAY_PORT/ws" node "$ROOT_DIR/tools/smoke/ws_e2e_client.js"

echo "OK: local realtime E2E passed"
