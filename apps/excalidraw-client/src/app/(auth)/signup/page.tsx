import AuthPage from "@/components/AuthPage";
import { Suspense } from "react";

function Signup() {
	return (
		<Suspense>
			<AuthPage mode="signup" />
		</Suspense>
	);
}

export default Signup;
