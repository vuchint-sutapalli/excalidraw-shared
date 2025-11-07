"use client";
import { useSocket } from "@/hooks/useSocket";
import { ReactNode, createContext, useContext } from "react";

const SocketContext = createContext<{
	socket: WebSocket | null;
	loading: boolean;
} | null>(null);
// Provide a default value of null to SocketContext
export const useSocketContext = () => {
	const context = useContext(SocketContext);
	if (context === undefined) {
		throw new Error("useSocketContext must be used within a SocketProvider");
	}
	return context;
};
interface Props {
	children: ReactNode;
}
export default function SocketProvider({ children }: Props) {
	const { socket, loading } = useSocket();

	return (
		<SocketContext.Provider value={{ socket, loading }}>
			{loading ? <div>Loading WebSocket...</div> : children}
		</SocketContext.Provider>
	);
}
