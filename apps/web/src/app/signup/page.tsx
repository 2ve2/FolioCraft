import { AuthScreen } from "../../features/auth/auth-screen";

/** Mounts the independent account-creation route. */
export default function SignupPage() {
	return <AuthScreen key="signup" mode="signup" />;
}
