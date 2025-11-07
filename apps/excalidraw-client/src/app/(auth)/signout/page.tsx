"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signout } from "../../../apis/auth";

export default function SignoutPage() {
	const router = useRouter();

	useEffect(() => {
		const performSignout = async () => {
			try {
				// This function calls your backend's /api/auth/signout endpoint
				await signout();
			} catch (error) {
				console.error("Signout failed:", error);
				// Even if the API call fails (e.g., network issue), we still want to redirect
				// the user to the sign-in page, as their session might already be invalid
				// or they might be offline.
			} finally {
				// Redirect to the sign-in page after attempting to sign out.
				router.push("/signin");
			}
		};

		performSignout();
	}, [router]);

	return (
		<div className="min-h-screen flex items-center justify-center">
			Signing you out...
		</div>
	);
}
