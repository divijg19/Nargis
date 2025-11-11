/* Simple mock WebSocket server for local testing of RealtimeConnection
 * - Listens on ws://localhost:8080/ws
 * - On connection, emits interim transcript strings, then a transcript+llm JSON
 * - Emits an additional AI-only message after a short delay
 * Run with: node tools/mock-ws-server.js
 */

const WebSocket = require("ws");
const url = "0.0.0.0";
const port = 8080;
const path = "/ws";

const wss = new WebSocket.Server({ host: url, port, path }, () => {
	console.log(`Mock WS server listening at ws://${url}:${port}${path}`);
});

wss.on("connection", function connection(ws) {
	console.log("Client connected");

	// Send a few interim transcript strings to simulate live ASR
	setTimeout(() => {
		ws.send("hey this is a test");
		console.log("-> sent interim #1");
	}, 800);

	setTimeout(() => {
		ws.send("hey this is a test, composing more words");
		console.log("-> sent interim #2");
	}, 1600);

	// Send final transcript + LLM payload
	setTimeout(() => {
		const payload = {
			transcript: "Create a task: Prepare slides for Monday meeting at 3pm",
			llm: {
				choices: [
					{
						message: {
							content:
								"Sure — I've drafted a task: 'Prepare slides for Monday meeting at 3pm'. Would you like to set a due date?",
						},
					},
				],
			},
		};
		ws.send(JSON.stringify(payload));
		console.log("-> sent transcript+llm payload");
	}, 2600);

	// Send a follow-up AI-only message
	setTimeout(() => {
		const aiOnly = {
			choices: [
				{ message: { content: "Reminder: don't forget to attach charts." } },
			],
		};
		ws.send(JSON.stringify(aiOnly));
		console.log("-> sent AI-only payload");
	}, 5000);

	ws.on("message", function incoming(msg) {
		console.log("received from client:", msg.toString().slice(0, 200));
		// Echo received text back as a simple confirmation object after a short delay
		setTimeout(() => {
			try {
				ws.send(
					JSON.stringify({
						choices: [
							{
								message: {
									content: `Echoed back: ${msg.toString().slice(0, 120)}`,
								},
							},
						],
					}),
				);
			} catch {
				// ignore
			}
		}, 700);
	});

	ws.on("close", () => console.log("Client disconnected"));
	ws.on("error", (err) => console.error("WS error", err));
});

wss.on("error", (err) => console.error("Server error", err));
