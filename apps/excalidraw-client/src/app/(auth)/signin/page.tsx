import AuthPage from "@/components/AuthPage";
import { Suspense } from "react";

import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Sign in",
};

function Signin() {
	return (
		<Suspense>
			<AuthPage mode="signin" />
		</Suspense>
	);
}

export default Signin;
