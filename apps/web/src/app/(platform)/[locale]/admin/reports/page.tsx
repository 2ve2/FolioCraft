import { AdminReports } from "../../../../../features/management/admin/admin-reports";
import { localizedMetadata } from "../../../../../lib/locale-metadata";
export const generateMetadata = localizedMetadata({
	ar: "البلاغات — إدارة إيكنارا",
	en: "Reports — Ichnara Admin",
});
/** Mounts the permission-gated report queue inside the existing management shell. */
export default function ReportsPage() {
	return <AdminReports />;
}
