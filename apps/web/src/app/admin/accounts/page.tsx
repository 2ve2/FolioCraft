import { AdminPanel } from "../../../features/management/admin/admin-panel";

export const metadata = { title: "Accounts — Ichnara Admin" };

/** Mounts the independently addressable administrative accounts view. */
export default function AdministrationPage() {
	return <AdminPanel key="users" view="users" />;
}
