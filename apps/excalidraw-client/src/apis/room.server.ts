import { serverApiFetch } from "./server";
import { cookies } from "next/headers";

type RoomUserData = {
	roomData: {
		id: string;
		slug: string;
		shapes: { id: string; roomId: number; data: unknown }[];
	} | null;
	userData?: { userId: string; name: string; email: string };
	error?: "unauthorized" | "not-found" | "server-error";
};

export async function getRoomFromServer(slug: string): Promise<RoomUserData> {
	const cookieStore = await cookies();
	const authToken = cookieStore.get("authToken")?.value;

	if (!authToken) {
		return { roomData: null, error: "unauthorized" };
	}

	// Perform fetches in parallel for better performance
	const [userResponse, roomResponse] = await Promise.all([
		serverApiFetch<{ userId: string; name: string; email: string }>("/me"),
		serverApiFetch<{ room: RoomUserData["roomData"] }>(`/room/${slug}`),
	]);

	if (userResponse.error || roomResponse.error) {
		// Prioritize the error type to return.
		if (
			userResponse.error === "unauthorized" ||
			roomResponse.error === "unauthorized"
		) {
			return { roomData: null, error: "unauthorized" };
		}
		if (
			userResponse.error === "not-found" ||
			roomResponse.error === "not-found"
		) {
			return { roomData: null, error: "not-found" };
		}
		return { roomData: null, error: "server-error" };
	}

	return {
		roomData: roomResponse.data?.room ?? null,
		userData: userResponse.data ?? undefined,
	};
}

export interface Shape {
	// Define the properties of a shape according to your application's requirements
	id: string;
	type: string;
	x: number;
	y: number;
	width?: number;
	height?: number;
	radius?: number;
	roomId: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data: any;
}

export async function fetchShapes(
	roomId: string
): Promise<{ shapes: Shape[] }> {
	const response = await serverApiFetch<{ shapes: Shape[] }>(
		`/shapes/${roomId}`
	);
	if (response.error || !response.data) {
		throw new Error(response.error || "Failed to fetch shapes.");
	}
	return response.data;
}

interface CurrentUser {
	email: string;
	name: string;
	userId: string;
}

export async function getCurrentUser(): Promise<CurrentUser> {
	const response = await serverApiFetch<CurrentUser>("/auth/me");

	if (response.error || !response.data) {
		throw new Error(response.error || "Failed to fetch current user.");
	}

	return response.data;
}
