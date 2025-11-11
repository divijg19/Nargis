const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 9001 });
console.debug("Mock realtime server listening on ws://localhost:9001");

wss.on("connection", (ws) => {
	console.debug("client connected");
	ws.on("message", (msg) => {
		console.debug("recv", msg.toString());
		// When EOS received, send back a simulated AI response
		if (msg.toString().includes("EOS")) {
			setTimeout(() => {
				const response = JSON.stringify({
					choices: [
						{ message: { content: "Create a task: Buy groceries and milk" } },
					],
				});
				ws.send(response);
			}, 1000);
		}
	});
});
