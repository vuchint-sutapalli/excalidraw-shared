import AuthPage from "@/components/AuthPage";
import { Suspense } from "react";

import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Sign Up",
};

function Signup() {
	return (
		<Suspense>
			<AuthPage mode="signup" />
		</Suspense>
	);
}

export default Signup;
