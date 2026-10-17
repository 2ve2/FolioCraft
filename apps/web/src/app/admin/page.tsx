import { AdminPanel } from "../../features/management/admin/admin-panel";

export const metadata = { title: "Overview — Ichnara Admin" };

/** Mounts the platform overview, independently of the personal studio. */
export default function Administration() {
	return <AdminPanel key="overview" view="overview" />;
}
