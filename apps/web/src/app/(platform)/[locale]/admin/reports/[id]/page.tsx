import { AdminReportDetail } from "../../../../../../features/management/admin/admin-reports";
export const metadata = { title: "Report — Ichnara Admin" };
/** Passes the route identity to the server-authorized report detail feature. */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return <AdminReportDetail key={id} id={id} />;
}
