"use client";

import { useEffect, useState } from "react";

export function WebSocketClient() {
	const [messages, setMessages] = useState<string[]>([]);
	const [input, setInput] = useState("");
	const [socket, setSocket] = useState<WebSocket | null>(null);

	useEffect(() => {
		const ws = new WebSocket("ws://localhost:8080");

		ws.onopen = () => {
			console.log("WebSocket connection established");
			setSocket(ws);
		};

		ws.onmessage = (event) => {
			setMessages((prev) => [...prev, `Server: ${event.data}`]);
		};

		ws.onclose = () => {
			console.log("WebSocket connection closed");
			setSocket(null);
		};

		return () => {
			ws.close();
		};
	}, []);

	const sendMessage = () => {
		if (socket && input) {
			socket.send(input);
			setMessages((prev) => [...prev, `You: ${input}`]);
			setInput("");
		}
	};

	return (
		<div>
			<h2>WebSocket Chat</h2>
			<div>{messages.map((msg, i) => <div key={i}>{msg}</div>)}</div>
			<input value={input} onChange={(e) => setInput(e.target.value)} />
			<button onClick={sendMessage} disabled={!socket}>Send</button>
		</div>
	);
}
