import { AdminRequests } from "../../../../features/management/admin/admin-requests";
export const metadata = { title: "Data request — Ichnara Admin" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return <AdminRequests key={id} id={id} />;
}
