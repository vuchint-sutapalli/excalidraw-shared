import { API_BASE_URL, apiFetch } from "./auth";

interface Shape {
	// Define the properties of a shape according to your application's requirements
	id: string;
	type: string;
	x: number;
	y: number;
	width?: number;
	height?: number;
	radius?: number;
	roomId: string;
	data: any;
}

export interface RoomData {
	id: string;
	slug: string;
	createdAt: string;
	adminId: string;
	isStarred: boolean;
	description: string | null;
	tags: string[];
}

export async function getWebSocketTicket(): Promise<string> {
	const response = await apiFetch(`${API_BASE_URL}/room/ticket`, {
		method: "POST",
	});
	const data = await response.json();
	if (!response.ok) {
		throw new Error(data.message || "Failed to get WebSocket ticket.");
	}
	return data.ticket;
}

export async function createRoom(
	roomName: string
): Promise<{ roomId: string }> {
	console.log(API_BASE_URL, roomName);

	const response = await apiFetch(`${API_BASE_URL}/room`, {
		method: "POST",
		body: JSON.stringify({ name: roomName }),
	});

	const data = await response.json();
	if (!response.ok) {
		if (data.errors) {
			const firstErrorField = Object.keys(data.errors)[0];
			const firstErrorMessage = data.errors[firstErrorField]?.[0];
			throw new Error(firstErrorMessage || "Room creation  failed.");
		}
		throw new Error(data.message || data.error || "Room creation failed.");
	}
	return data;
}

export async function editRoomMetaData(
	slug: string,
	metadata: {
		isStarred?: boolean;
		description?: string;
		tags?: string[];
	}
): Promise<{ room: RoomData }> {
	if (!slug) {
		throw new Error("Slug is required");
	}
	if (Object.keys(metadata).length === 0) {
		throw new Error("No changes made to room metadata");
	}

	const response = await apiFetch(`${API_BASE_URL}/room/edit/${slug}`, {
		method: "PUT",
		body: JSON.stringify(metadata),
	});
	const data = await response.json();
	if (!response.ok) {
		if (data.errors) {
			const firstErrorField = Object.keys(data.errors)[0];

			const firstErrorMessage = data.errors[firstErrorField]?.[0];
			throw new Error(firstErrorMessage || "Room metadata update failed.");
		}
		throw new Error(
			data.message || data.error || "Room metadata update failed."
		);
	}
	return data;
}

export async function getRoom(
	slug: string
): Promise<{ userId: string; room: RoomData }> {
	const response = await apiFetch(`${API_BASE_URL}/room/${slug}`, {
		method: "GET",
	});
	const data = await response.json();
	if (!response.ok) {
		if (data.errors) {
			const firstErrorField = Object.keys(data.errors)[0];
			const firstErrorMessage = data.errors[firstErrorField]?.[0];
			throw new Error(firstErrorMessage || "Fetching room failed.");
		}
		throw new Error(data.message || data.error || "Fetching room failed.");
	}
	return data;
}

export async function getUserRooms(): Promise<{
	rooms: Array<RoomData>;
}> {
	console.log("trying to fetch rooms");

	const response = await apiFetch(`${API_BASE_URL}/rooms`, {
		method: "GET",
	});
	const data = await response.json();
	if (!response.ok) {
		if (data.errors) {
			const firstErrorField = Object.keys(data.errors)[0];
			const firstErrorMessage = data.errors[firstErrorField]?.[0];
			throw new Error(firstErrorMessage || "Fetching rooms failed.");
		}
		throw new Error(data.message || data.error || "Fetching rooms failed.");
	}
	return data;
}

export async function fetchShapesInClient(
	roomId: string
): Promise<{ shapes: Shape[] }> {
	const response = await apiFetch(`${API_BASE_URL}/shapes/${roomId}`, {
		method: "GET",
	});
	const data = await response.json();
	if (!response.ok) {
		if (data.errors) {
			const firstErrorField = Object.keys(data.errors)[0];
			const firstErrorMessage = data.errors[firstErrorField]?.[0];
			throw new Error(firstErrorMessage || "Fetching shapes failed.");
		}
		throw new Error(data.message || data.error || "Fetching shapes failed.");
	}
	return data;
}
