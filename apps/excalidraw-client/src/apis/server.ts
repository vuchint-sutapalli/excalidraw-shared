import { cookies } from "next/headers";

const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

type ServerApiResponse<T> = {
	data: T | null;
	error?: "unauthorized" | "not-found" | string;
};

/**
 * A server-side wrapper for fetch that forwards the auth cookie and handles common responses.
 * @param url The path for the API endpoint (e.g., "/room/slug").
 * @param options The options for the fetch request.
 * @returns A promise that resolves to the parsed JSON data or an error object.
 */
export async function serverApiFetch<T>(
	url: string,
	options: RequestInit = {}
): Promise<ServerApiResponse<T>> {
	const cookieStore = await cookies();
	const authToken = cookieStore.get("authToken")?.value;
	const headers = new Headers(options.headers);

	if (authToken) {
		headers.set("Cookie", `authToken=${authToken}`);
	}

	if (options.body && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	try {
		const response = await fetch(`${API_BASE_URL}${url}`, {
			...options,
			headers,
		});

		if (response.status === 401 || response.status === 403)
			return { data: null, error: "unauthorized" };
		if (response.status === 404) return { data: null, error: "not-found" };

		const data = await response.json();

		if (!response.ok) {
			const errorMessage =
				data.message || data.error || `Request failed: ${response.statusText}`;
			return { data: null, error: errorMessage };
		}

		return { data };
	} catch (e) {
		return {
			data: null,
			error: e instanceof Error ? e.message : "An unknown error occurred",
		};
	}
}
