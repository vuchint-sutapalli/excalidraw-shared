export const BACKEND_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export const WS_URL =
	process.env.NEXT_PUBLIC_WS_URL ||
	(window.location.protocol === "https:"
		? "wss://prod.ws.slategpt.app"
		: "ws://localhost:8080");

// export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
