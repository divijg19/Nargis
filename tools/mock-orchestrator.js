/* Mock HTTP orchestrator for gateway end-to-end testing
 * - Health:  GET  /health -> 200 {"status":"ok"}
 * - Audio:   POST /api/v1/process-audio -> streams NDJSON lines
 *
 * Run: node tools/mock-orchestrator.js
 * Env:
 *   ORCH_PORT=9101
 */

const http = require("node:http");

const port = Number(process.env.ORCH_PORT || 9101);

function writeNdjson(res, obj) {
  res.write(`${JSON.stringify(obj)}\n`);
}

const server = http.createServer((req, res) => {
  const { method, url } = req;
  const parsedUrl = new URL(url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  const path = parsedUrl.pathname;

  if (method === "GET" && path === "/health") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "ok", service: "mock-orchestrator" }));
    return;
  }

  if (method === "POST" && path === "/api/v1/process-audio") {
    // Drain request body so client uploads don't stall.
    req.on("data", () => {});
    req.on("end", () => {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/x-ndjson");
      // Flush headers early if possible
      if (typeof res.flushHeaders === "function") res.flushHeaders();

      const mode = parsedUrl.searchParams.get("mode") || "chat";
      writeNdjson(res, {
        type: "response",
        content: `ok from mock orchestrator (${mode})`,
      });
      setTimeout(() => {
        writeNdjson(res, { type: "end", content: "done" });
        res.end();
      }, 50);
    });
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: "not found", method, url: url || "" }));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mock orchestrator listening on http://127.0.0.1:${port}`);
});
