import { AuthScreen } from "../../../../features/auth/auth-screen";

/** Mounts the independent sign-in route. */
export default function LoginPage() {
	return <AuthScreen key="login" mode="login" />;
}
