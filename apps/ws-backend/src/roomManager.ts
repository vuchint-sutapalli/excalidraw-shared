import { RoomConnections, WebSocketWithID } from "./types.js";

export const rooms: RoomConnections = {};

export function joinRoom(ws: WebSocketWithID, roomId: string) {
	// If the connection is already in a room, leave it first.
	if (ws.roomId) {
		leaveRoom(ws, ws.roomId);
	}

	// Create room and user entry if they don't exist
	if (!rooms[roomId]) {
		rooms[roomId] = {};
	}
	if (!rooms[roomId][ws.userId]) {
		rooms[roomId][ws.userId] = new Set();
	}

	ws.roomId = roomId;

	// Add the socket to the Set. Set will handle duplicates automatically.

	rooms[roomId]?.[ws.userId]?.add(ws);

	ws.send(
		JSON.stringify({
			type: "status",
			message: `You have joined room ${roomId}`,
		})
	);
	// Send a specific confirmation message
	ws.send(
		JSON.stringify({
			type: "joined_room",
			roomId: roomId,
		})
	);
}

export function leaveRoom(ws: WebSocketWithID, roomId: string) {
	// Ensure the connection is actually in the room it's trying to leave.
	if (ws.roomId !== roomId) return;

	const room = rooms[roomId];
	if (room?.[ws.userId]) {
		room[ws.userId]?.delete(ws);
		if (room[ws.userId]?.size === 0) {
			delete room[ws.userId];
		}
		if (Object.keys(room).length === 0) {
			delete rooms[roomId];
		}
	}

	ws.roomId = null;
	ws.send(
		JSON.stringify({
			type: "status",
			message: `You have left room ${roomId}`,
		})
	);
}

export function handleDisconnect(ws: WebSocketWithID) {
	// If the connection was in a room, remove it.
	if (ws.roomId) {
		leaveRoom(ws, ws.roomId);
	}
	if (!ws.userId) {
		// Should not happen with validated connections
		return;
	}
	console.log(`User ${ws.userId} with connection ${ws.id} disconnected.`);
}
