import AuthPage from "@/components/AuthPage";
import { Suspense } from "react";

function Signin() {
	return (
		<Suspense>
			<AuthPage mode="signin" />
		</Suspense>
	);
}

export default Signin;
