import { AdminReportDetail } from "../../../../../../features/management/admin/admin-reports";
import { localizedMetadata } from "../../../../../../lib/locale-metadata";
export const generateMetadata = localizedMetadata({
	ar: "بلاغ — إدارة إيكنارا",
	en: "Report — Ichnara Admin",
});
/** Passes the route identity to the server-authorized report detail feature. */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return <AdminReportDetail key={id} id={id} />;
}
