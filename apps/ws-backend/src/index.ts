import { WebSocket, WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import { WebSocketWithID } from "./types.js";
import { handleDisconnect } from "./roomManager.js";
import { handleMessage } from "./messageHandler.js";

const wss = new WebSocketServer({ port: 8080 });

const HTTP_BACKEND_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

wss.on("connection", async function connection(ws: WebSocket, request) {
	const url = request.url;
	console.log(`New WebSocket connection attempt, ${url}`);

	if (!url) {
		console.log("No URL provided, closing ws connection");
		ws.close();
		return;
	}

	const params = new URLSearchParams(url.split("?")[1]);
	const ticket = params.get("ticket");

	if (!ticket) {
		console.log("No ticket provided, closing ws connection");
		ws.close();
		return;
	}

	const wsWithId = ws as WebSocketWithID;
	wsWithId.id = uuidv4();
	// These will be set after ticket validation
	(wsWithId as any).userId = null;
	wsWithId.roomId = null;
	(wsWithId as any).isAlive = true;

	// Validate the ticket with the http-backend
	let userId: string | null = null;
	try {
		const response = await fetch(
			`${HTTP_BACKEND_URL}/internal/validate-ticket/${ticket}`
		);
		if (response.ok) {
			const data = await response.json();
			userId = data.userId;
		} else {
			console.log(`Ticket validation failed: ${response.statusText}`);
		}
	} catch (error) {
		console.error("Error validating ticket:", error);
	}

	if (!userId) {
		console.log("Invalid ticket, closing ws connection");
		ws.close();
		return;
	}
	wsWithId.userId = userId;

	console.log(
		`WebSocket connection established for user ${userId} with id ${wsWithId.id}`
	);

	ws.on("close", () => {
		handleDisconnect(wsWithId);
	});

	ws.on("pong", () => {
		(wsWithId as any).isAlive = true;
	});

	ws.on("message", (data) => {
		handleMessage(wsWithId, data);
	});

	ws.send("Welcome! You are connected.");
});

// Set up the heartbeat interval to detect and terminate dead connections.
const interval = setInterval(() => {
	wss.clients.forEach((ws) => {
		const wsWithId = ws as any;

		if (wsWithId.isAlive === false) {
			return ws.terminate(); // Terminate dead connections
		}

		wsWithId.isAlive = false; // Assume it's dead until a pong is received
		ws.ping(); // Send a ping
	});
}, 30000); // Ping every 30 seconds

console.log("WebSocket server is running on port 8080");
