import { AdminSiteDetail } from "../../../../features/management/admin/admin-directory";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return <AdminSiteDetail key={id} id={id} />;
}
