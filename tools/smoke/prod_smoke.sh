#!/usr/bin/env bash
set -euo pipefail

WEB_URL="${WEB_URL:-https://nargis.vercel.app}"
GATEWAY_URL="${GATEWAY_URL:-https://divijg19-nargis-go.hf.space}"
API_PY_URL="${API_PY_URL:-https://divijg19-nargis-py.hf.space}"

echo "Web:     $WEB_URL"
echo "Gateway: $GATEWAY_URL"
echo "api-py:  $API_PY_URL"
echo

echo "== HTTP health checks =="

failures=0

check_url() {
  name="$1"
  url="$2"

  echo "[$name] GET $url"
  set +e
  body=$(curl -sS -L "$url")
  rc=$?
  code=$(curl -sS -L -o /dev/null -w "%{http_code}" "$url")
  set -e

  if [ $rc -ne 0 ]; then
    echo "curl failed (rc=$rc)"
    failures=$((failures + 1))
    return 1
  fi
  echo "HTTP $code"
  if [ "$code" -lt 200 ] || [ "$code" -ge 300 ]; then
    echo "Non-2xx response body:"
    echo "$body" | head -c 2000
    echo
    failures=$((failures + 1))
    return 1
  fi
  return 0
}

echo "[api-py] GET / (optional)"
set +e
code=$(curl -sS -o /dev/null -w "%{http_code}" "$API_PY_URL/")
echo "HTTP $code"
root_rc=$?
set -e
if [ $root_rc -ne 0 ]; then
  echo "[api-py] Note: / did not return 200 (this is OK if /health is healthy)."
fi

check_url "api-py" "$API_PY_URL/health"

check_url "gateway" "$GATEWAY_URL/health"

echo "[gateway] GET /ready"
set +e
code=$(curl -sS -o /dev/null -w "%{http_code}" "$GATEWAY_URL/ready")
echo "HTTP $code"
ready_rc=$?
set -e
if [ $ready_rc -ne 0 ]; then
  echo "[gateway] Note: /ready did not return 200 (redeploy gateway to enable readiness checks)."
fi

echo

echo "== WebSocket check (optional) =="
if command -v websocat >/dev/null 2>&1; then
  WS_URL="${WS_URL:-${GATEWAY_URL/https:/wss:}/ws}"
  echo "Connecting: $WS_URL"
  echo "(This just opens then immediately closes)"
  timeout 5s websocat -v "$WS_URL" </dev/null || true
else
  echo "Skipping: websocat not installed. Install with your package manager to validate WS." 
fi

echo

if [ "$failures" -ne 0 ]; then
  echo "FAILED: $failures required check(s) failed"
  exit 1
fi

echo "OK: smoke checks completed"
