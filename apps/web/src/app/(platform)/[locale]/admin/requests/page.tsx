import { AdminRequests } from "../../../../../features/management/admin/admin-requests";
import { localizedMetadata } from "../../../../../lib/locale-metadata";
export const generateMetadata = localizedMetadata({
	ar: "طلبات حقوق البيانات — إدارة إيكنارا",
	en: "Data rights requests — Ichnara Admin",
});
export default function Page() {
	return <AdminRequests />;
}
