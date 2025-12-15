// Force the API base URL to be a relative path.
// This ensures that all API calls are sent to the Next.js proxy,
// which will then forward them to your backend at http://localhost:3001.

// When running on the server, we need an absolute URL.
// When running on the client, a relative URL is sufficient.
const IS_SERVER = typeof window === "undefined";
export const API_BASE_URL = IS_SERVER
	? process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
	: "/api";

// export const API_BASE_URL =
// 	process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

/**
 * A wrapper around the native `fetch` function that automatically includes
 * credentials and sets a default 'Content-Type' header for JSON bodies.
 * This helps to reduce boilerplate and prevent errors in API calls.
 *
 * @param url The URL to fetch.
 * @param options The options for the fetch request.
 * @returns A promise that resolves to the response.
 */
export async function apiFetch(
	url: string,
	options: RequestInit = {}
): Promise<Response> {
	const defaultHeaders: HeadersInit = {};
	if (options.body) {
		defaultHeaders["Content-Type"] = "application/json";
	}

	console.log("inside common client api handler");

	const mergedOptions: RequestInit = {
		...options,
		credentials: "include",
		headers: {
			...defaultHeaders,
			...options.headers,
		},
	};

	const response = await fetch(url, mergedOptions);

	// Global handler for unauthorized responses
	if (response.status === 401) {
		console.log("recieved 401");

		// Check if we are on the client-side before redirecting
		if (typeof window !== "undefined") {
			// Construct the redirect URL from the current path and search params
			const originalUrl = window.location.pathname + window.location.search;
			const redirectUrl = encodeURIComponent(originalUrl);
			// Redirect to the sign-in page with the original URL as a query param
			window.location.href = `/signin?redirect=${redirectUrl}`;
		}

		// Throw an error to stop further processing in the calling function.
		// This will be caught by React Query's `onError` handler.
		throw new Error("Unauthorized");
	}

	return response;
}

/**
 * A client-side wrapper for apiFetch that handles JSON parsing and error formatting.
 * @param url The URL to fetch.
 * @param options The options for the fetch request.
 * @returns A promise that resolves to the parsed JSON data.
 * @throws An error with a formatted message if the request fails.
 */
export async function apiClient<T>(
	url: string,
	options: RequestInit = {},
	customErrorMessage?: string
): Promise<T> {
	const response = await apiFetch(url, options);
	const data = await response.json();

	if (!response.ok) {
		// Handle structured validation errors from Zod, etc.
		if (data.errors) {
			const firstErrorField = Object.keys(data.errors)[0];
			const firstErrorMessage = data.errors[firstErrorField]?.[0];
			throw new Error(
				firstErrorMessage || "An unknown validation error occurred."
			);
		}

		// Fallback for generic errors.
		throw new Error(
			data.message ||
				data.error ||
				customErrorMessage ||
				`Request failed with status ${response.status}`
		);
	}

	return data as T;
}

// This interface represents structured validation errors from the backend (e.g., from Zod).
interface ValidationError {
	[key: string]: string[];
}

// Define a generic API response type. Adjust based on your actual API.
interface AuthResponse {
	token?: string;
	user?: { id: string; email: string; name: string };
	error?: string;
	message?: string; // Some APIs use 'message' for errors
	errors?: ValidationError;
}

export async function signin(
	email: string,
	password: string
): Promise<AuthResponse> {
	return apiClient<AuthResponse>(
		`${API_BASE_URL}/auth/signin`,
		{
			method: "POST",
			body: JSON.stringify({ email, password }),
		},
		"Sign-in failed."
	);
}

export async function signup(
	email: string,
	password: string
): Promise<AuthResponse> {
	// const response = await apiFetch(`${API_BASE_URL}/auth/signup`, {
	return apiClient<AuthResponse>(
		`${API_BASE_URL}/auth/signup`,
		{
			method: "POST",
			body: JSON.stringify({ email, password, name: "dummy" }), // Consider making 'name' dynamic
		},
		"Sign-up failed."
	);
}

export async function signout(): Promise<Response> {
	const response = await apiFetch(`${API_BASE_URL}/auth/signout`, {
		method: "POST",
	});

	if (!response.ok) {
		throw new Error("Sign-out failed.");
	}
	// Signout might not return a JSON body, so just return the raw response
	return response;
}
