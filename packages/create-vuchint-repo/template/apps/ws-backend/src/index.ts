import { WebSocket, WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", function connection(ws) {
	console.log("A new client connected!");
	ws.on("error", console.error);

	ws.on("message", function message(data) {
		console.log("received: %s", data);

		// Broadcast the received message to all clients.
		wss.clients.forEach(function each(client) {
			if (client !== ws && client.readyState === WebSocket.OPEN) {
				client.send(data.toString());
			}
		});
	});

	ws.send("Welcome! You are connected.");
});

console.log("WebSocket server is running on ws://localhost:8080");
