// WebSocket E2E smoke client for the Nargis gateway.
// - Sends a small binary chunk
// - Exits 0 once it receives an {type:"end"} message (or any message if not JSON)
// Usage:
//   WS_URL=ws://localhost:8080/ws node tools/smoke/ws_e2e_client.js
// Requires: npm/bun install ws (already used elsewhere in this repo)

const WebSocket = require("ws");

let WS_URL = process.env.WS_URL || "ws://localhost:8080/ws";

if (process.env.WS_TOKEN) {
  try {
    const u = new URL(WS_URL);
    u.searchParams.set("token", process.env.WS_TOKEN);
    WS_URL = u.toString();
  } catch {
    const sep = WS_URL.includes("?") ? "&" : "?";
    WS_URL = `${WS_URL}${sep}token=${encodeURIComponent(process.env.WS_TOKEN)}`;
  }
}

const timeoutMs = Number(process.env.TIMEOUT_MS || 8000);

console.log(`Connecting to ${WS_URL}...`);
const ws = new WebSocket(WS_URL);

const timeout = setTimeout(() => {
  console.error(`Timed out after ${timeoutMs}ms`);
  try {
    ws.close();
  } finally {
    process.exit(1);
  }
}, timeoutMs);

ws.on("open", () => {
  console.log("Connected. Sending binary chunk...");
  // A partial RIFF header ensures the gateway's VAD auto-detection bypasses VAD.
  const buf = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24]);
  ws.send(buf);
});

ws.on("message", (data) => {
  const text = data.toString();
  console.log("Received:", text);

  try {
    const parsed = JSON.parse(text);
    if (parsed && parsed.type === "end") {
      clearTimeout(timeout);
      ws.close();
      return;
    }
  } catch {
    // Non-JSON message, treat as success signal.
    clearTimeout(timeout);
    ws.close();
    return;
  }
});

ws.on("close", () => {
  clearTimeout(timeout);
  process.exit(0);
});

ws.on("error", (err) => {
  clearTimeout(timeout);
  console.error("WebSocket error:", err);
  process.exit(1);
});
