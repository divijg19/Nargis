// Simple WebSocket smoke client for the Nargis gateway
// Usage: node tools/smoke/ws_client.js
// Requires: npm install ws

const WebSocket = require("ws");

let WS_URL = process.env.WS_URL || "ws://localhost:8080/ws";
// Append JWT token if provided for auth-enabled gateways
if (process.env.WS_TOKEN) {
  try {
    const u = new URL(WS_URL);
    u.searchParams.set("token", process.env.WS_TOKEN);
    WS_URL = u.toString();
  } catch {
    // fallback if WS_URL isn't a valid URL string
    const sep = WS_URL.includes("?") ? "&" : "?";
    WS_URL = `${WS_URL}${sep}token=${encodeURIComponent(process.env.WS_TOKEN)}`;
  }
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

(async () => {
  console.log(`Connecting to ${WS_URL}...`);
  const ws = new WebSocket(WS_URL);

  ws.on("open", async () => {
    console.log("Connected. Sending small binary chunk...");
    // Send a tiny synthetic binary payload (not a valid audio file, but gateway will forward it)
    const buf = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24]); // partial RIFF header bytes
    ws.send(buf);
    // Wait a moment and send EOS
    await sleep(200);
    console.log("Sending EOS marker");
    ws.send("EOS");
  });

  ws.on("message", (data) => {
    try {
      const text = data.toString();
      const parsed = JSON.parse(text);
      console.log(
        "Received JSON from server:",
        JSON.stringify(parsed, null, 2),
      );
    } catch (err) {
      // JSON.parse failed; log the parse error and treat message as plain text
      console.debug("JSON parse error:", err);
      console.log("Received non-JSON message from server:", data.toString());
    }
  });

  ws.on("close", () => {
    console.log("Connection closed");
    process.exit(0);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
    process.exit(1);
  });
})();
