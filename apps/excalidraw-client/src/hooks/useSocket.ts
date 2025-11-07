import { WS_URL } from "@/app/config";
import { getWebSocketTicket } from "@/apis/room.client";
import { useEffect, useState } from "react";

export function useSocket() {
	const [loading, setLoading] = useState(true);
	const [socket, setSocket] = useState<WebSocket | null>(null);

	useEffect(() => {
		const connect = async () => {
			try {
				const ticket = await getWebSocketTicket();
				const ws = new WebSocket(WS_URL + `/?ticket=${ticket}`);

				ws.onopen = () => {
					console.log("WebSocket connection established");
					setLoading(false);
					setSocket(ws);
				};

				ws.onclose = () => {
					console.log("WebSocket connection closed");
					setSocket(null);
				};

				ws.onerror = (error) => {
					console.error("WebSocket error:", error);
				};

			} catch (error) {
				console.error("Failed to connect to WebSocket:", error);
				setLoading(false);
			}
		};

		connect();

		return () => {
			if (socket) {
				socket.close();
			}
		};
	}, []);

	return { socket, loading };
}
