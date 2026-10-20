import { AdminSecurity } from "../../../../../features/management/admin/admin-security";

/** Mounts only native own-account authenticator enrollment and sign-in verification. */
export default function Page() {
	return <AdminSecurity />;
}
