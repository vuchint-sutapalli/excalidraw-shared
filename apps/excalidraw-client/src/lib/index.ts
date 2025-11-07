export function safeJsonParse(str: string) {
	try {
		return JSON.parse(str);
	} catch (error) {
		console.log("Failed to parse JSON:", error);
		return null; // Or handle the error in another way, e.g., throw a custom error
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => void>(
	func: T,
	limit: number
): (...args: Parameters<T>) => void {
	let inThrottle: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return function (this: any, ...args: Parameters<T>) {
		if (!inThrottle) {
			func.apply(this, args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}

export const formatTimestamp = (timestamp: number): string => {
	const now = Date.now();
	const secondsAgo = Math.round((now - timestamp) / 1000);

	if (secondsAgo < 5) {
		return "just now";
	}
	if (secondsAgo < 60) {
		return `${secondsAgo}s ago`;
	}
	const minutesAgo = Math.floor(secondsAgo / 60);
	if (minutesAgo < 60) {
		return `${minutesAgo}m ago`;
	}
	const hoursAgo = Math.floor(minutesAgo / 60);
	if (hoursAgo < 24) {
		return `${hoursAgo}h ago`;
	}

	const date = new Date(timestamp);
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
