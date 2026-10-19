import { AdminAccountDetail } from "../../../../features/management/admin/admin-directory";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return <AdminAccountDetail key={id} id={id} />;
}
