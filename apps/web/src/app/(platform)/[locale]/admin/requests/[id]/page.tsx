import { AdminRequests } from "../../../../../../features/management/admin/admin-requests";
import { localizedMetadata } from "../../../../../../lib/locale-metadata";
export const generateMetadata = localizedMetadata({
	ar: "طلب بيانات — إدارة إيكنارا",
	en: "Data request — Ichnara Admin",
});
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return <AdminRequests key={id} id={id} />;
}
