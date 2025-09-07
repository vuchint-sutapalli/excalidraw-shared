import { WebSocket, WebSocketServer } from "ws";

import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { JWT_SECRET } from "@repo/backend-common/config";

dotenv.config();

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", function connection(ws, request) {

	const url = request.url; // e.g., "/?roomId=roomId123"
	if(!url){
		ws.close();
		return;
	}
	const params = new URLSearchParams(url.split("?")[1]);
	const token = params.get("token");
	if(!token){
		ws.close();
		return;
	}

	const decoded = jwt.verify(token, JWT_SECRET);
	
	if(!decoded || typeof decoded === "string" || !decoded.userId){
		ws.close();
		return;
	}

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
