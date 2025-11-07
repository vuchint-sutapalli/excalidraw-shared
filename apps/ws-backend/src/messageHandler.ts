import { RawData } from "ws";
import { prismaClient } from "@repo/db/client";
import { WebSocketMessage, WebSocketWithID } from "./types.js";
import { joinRoom, leaveRoom, rooms } from "./roomManager.js";
import { parse } from "path";

export async function handleMessage(ws: WebSocketWithID, data: RawData) {
	let messageAsString: string;
	if (Buffer.isBuffer(data)) {
		messageAsString = data.toString();
	} else if (data instanceof ArrayBuffer) {
		messageAsString = Buffer.from(data).toString();
	} else if (Array.isArray(data)) {
		// Buffer[]
		const buffers = data.map((buf) =>
			Buffer.isBuffer(buf) ? buf : Buffer.from(buf)
		);
		messageAsString = Buffer.concat(buffers).toString();
	} else {
		console.log("Invalid message format", typeof data);
		return;
	}

	try {
		const parsedData: WebSocketMessage = JSON.parse(messageAsString);
		console.log("received: %s", parsedData);
		let room;

		switch (parsedData.type) {
			case "join_room":
				joinRoom(ws, parsedData.roomId);
				break;
			case "leave_room":
				leaveRoom(ws, parsedData.roomId);
				break;
			case "chat":
				// Check if the connection is authorized for this room.
				if (ws.roomId !== parsedData.roomId) {
					console.log(
						`Connection ${ws.id} is not in room ${parsedData.roomId}. Ignoring message.`
					);
					return;
				}
				const messageToStore = parsedData.message;
				await prismaClient.chat.create({
					data: {
						roomId: Number(parsedData.roomId),
						userId: ws.userId,
						message: messageToStore,
					},
				});

				room = rooms[parsedData.roomId];
				if (room) {
					Object.values(room).forEach((userSockets) => {
						userSockets.forEach((socket) => {
							if (socket !== ws) {
								socket.send(
									JSON.stringify({
										type: parsedData.type,
										roomId: parsedData.roomId,
										userId: ws.userId,
										message: parsedData.message,
									})
								);
							}
						});
					});
				}
				break; // <--- ADDED break statement here

			case "update-elements":
				// Check if the connection is authorized for this room.
				if (ws.roomId !== parsedData.roomId) {
					console.log(
						`Connection ${ws.id} is not in room ${parsedData.roomId}. Ignoring message.`
					);
					return;
				}

				console.log(
					"Storing shape data in shape table for room:",
					parsedData.roomId,
					ws.userId,
					JSON.stringify(parsedData.message)
				);

				// The new elements from the imported file.
				const newElements = parsedData.message as any[];

				try {
					// Use a transaction to ensure atomicity: delete all old elements, then create all new ones.
					await prismaClient.$transaction([
						// 1. Delete all existing elements for this room.
						prismaClient.element.deleteMany({
							where: { roomId: Number(parsedData.roomId) },
						}),
						// 2. Create all the new elements from the imported file.
						prismaClient.element.createMany({
							data: newElements.map((element) => ({
								id: element.id,
								roomId: Number(parsedData.roomId),
								data: element,
							})),
						}),
					]);

					// --- SUCCESS ---
					// Broadcast the successful update to all OTHER clients in the room.
					room = rooms[parsedData.roomId];
					if (room) {
						Object.values(room).forEach((userSockets) => {
							userSockets.forEach((socket) => {
								socket.send(
									JSON.stringify({
										type: "elements-updated",
										roomId: parsedData.roomId,
										userId: ws.userId,
										message: newElements,
									})
								);
							});
						});
					}
				} catch (error) {
					// --- FAILURE ---
					console.error(
						"Failed to process 'update-elements' transaction:",
						error
					);
					// Check if the WebSocket is still open before sending a message.
					if (ws.readyState === ws.OPEN) {
						// Notify the originating client that the import failed.
						ws.send(
							JSON.stringify({
								type: "import-failed",
								message:
									"There was a problem saving the imported canvas. Please try again.",
							})
						);
					} else {
						console.log("ws connection closed alrdy");
					}
				}
				break;
			case "cursor-move":
				// Check if the connection is authorized for this room.
				if (ws.roomId !== parsedData.roomId) {
					console.log(
						`Connection ${ws.id} of ${ws.roomId} is not in room ${parsedData.roomId}. Ignoring message.`
					);
					return;
				}
				console.log("Broadcasting cursor move to room:", parsedData.roomId);
				room = rooms[parsedData.roomId];
				if (room) {
					Object.values(room).forEach((userSockets) => {
						userSockets.forEach((socket) => {
							if (socket !== ws) {
								// socket.send(messageAsString);
								socket.send(
									JSON.stringify({
										type: "cursor-move",
										roomId: parsedData.roomId,
										userId: ws.userId,
										userName: parsedData.userName,
										x: parsedData.x,
										y: parsedData.y,
									})
								);
							}
						});
					});
				}
				break;
			case "stroke-start":
				if (!parsedData.element || !parsedData.element.id) {
					console.log("Invalid stroke-start message: missing element data.");
					return;
				}
				break;
			// For update and end, we just need to ensure the strokeId is present.
			case "stroke-update":
			case "stroke-end":
			case "highlight-start":
			case "highlight-update":
			case "highlight-end":
			case "clear-highlights":
			case "element-create":
			case "elements-update":
			case "elements-delete":
				if (
					(parsedData.type === "stroke-update" ||
						parsedData.type === "stroke-end" ||
						parsedData.type === "highlight-update" ||
						parsedData.type === "highlight-end") &&
					!("strokeId" in parsedData && parsedData.strokeId)
				) {
					console.log(`Invalid ${parsedData.type} message: missing strokeId.`);
					return;
				}
				// Check if the connection is authorized for this room.
				if (ws.roomId !== parsedData.roomId) {
					console.log(
						`Connection ${ws.id} is not in room ${parsedData.roomId} but in ${ws.roomId}. Ignoring message.`
					);
					return;
				}
				console.log("recieved stroke msg", parsedData.type, parsedData.roomId);

				room = rooms[parsedData.roomId];
				if (room) {
					Object.values(room).forEach((userSockets) => {
						userSockets.forEach((socket) => {
							if (socket !== ws) {
								// just broadcast the original message
								socket.send(messageAsString);
								// socket.send(
								// 	JSON.stringify({
								// 		type: parsedData.type,
								// 		roomId: parsedData.roomId,
								// 		userId: ws.userId,
								// 		userName: parsedData.userName,
								// 		x: parsedData.x,
								// 		y: parsedData.y,
								// 	})
								// );
							}
						});
					});
				}
				if (parsedData.type === "element-create") {
					console.log(parsedData);

					// await prismaClient.element.create({
					// 	data: {
					// 		id: parsedData.element.id,
					// 		whiteboardId: Number(parsedData.roomId),
					// 		data: parsedData.element,
					// 	},
					// });
					await prismaClient.element.create({
						data: {
							id: parsedData.element.id,
							roomId: Number(parsedData.roomId),
							data: parsedData.element,
						},
					});
				} else if (parsedData.type === "elements-delete") {
					console.log(parsedData);

					await prismaClient.element.deleteMany({
						where: { id: { in: parsedData.elementIds } },
					});
				} else if (
					parsedData.type === "elements-update" &&
					parsedData.elements
				) {
					await prismaClient.$transaction(
						parsedData.elements.map((element: any) =>
							prismaClient.element.upsert({
								where: { id: element.id },
								update: { data: element },
								create: {
									id: element.id,
									roomId: Number(parsedData.roomId),
									data: element,
								},
							})
						)
					);
				}

				break;
			case "clear-canvas":
				if (ws.roomId !== parsedData.roomId) {
					return;
				}
				room = rooms[parsedData.roomId];
				if (room) {
					Object.values(room).forEach((userSockets) => {
						userSockets.forEach((socket) => {
							if (socket !== ws) {
								socket.send(
									JSON.stringify({
										type: "canvas-cleared",
										roomId: parsedData.roomId,
									})
								);
							}
						});
					});
				}
				// Delete all elements from the database for this room
				await prismaClient.element.deleteMany({
					where: { roomId: Number(parsedData.roomId) },
				});
				break;
			default:
				console.log("Unknown message type");
		}
	} catch (error) {
		console.error("Failed to parse message or process it:", error);
	}
}
