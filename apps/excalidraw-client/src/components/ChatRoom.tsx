import { fetchShapes } from "@/apis/room.server";
import SocketProvider from "@/components/SocketProvider";
import React from "react";
import ChatRoomClient from "./ChatRoomClient";
async function ChatRoom({
	roomId,
	userName,
	userId,
	slug,
}: {
	roomId: string;
	userName: string;
	userId?: string;
	slug: string;
}) {
	const existingShapes = await fetchShapes(roomId);
	console.log("existing shapes in chatroom", existingShapes);

	return (
		<SocketProvider>
			<ChatRoomClient
				userName={userName}
				userId={userId ?? "unknown"}
				slug={slug}
				existingShapes={existingShapes.shapes}
				id={roomId}
			/>
		</SocketProvider>
	);
}

export default ChatRoom;
