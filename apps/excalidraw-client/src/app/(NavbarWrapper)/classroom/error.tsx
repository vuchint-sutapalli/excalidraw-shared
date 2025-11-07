"use client"; // Error components must be Client Components

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Error({
	error,
}: {
	error: Error & { digest?: string };
}) {
	const router = useRouter();

	useEffect(() => {
		// Log the error to an error reporting service
		console.error(error);
	}, [error]);

	return (
		<div className="flex flex-col items-center justify-center h-screen">
			<h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
			<p className="text-gray-600 mb-6">{error.message}</p>
			<button
				onClick={() => {
					// Redirect to the sign-in page as a safe recovery action
					router.push("/signin");
				}}
				className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
			>
				Sign In Again
			</button>
		</div>
	);
}
