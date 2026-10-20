import { AdminReports } from "../../../../../features/management/admin/admin-reports";
export const metadata = { title: "Reports — Ichnara Admin" };
/** Mounts the permission-gated report queue inside the existing management shell. */
export default function ReportsPage() {
	return <AdminReports />;
}
