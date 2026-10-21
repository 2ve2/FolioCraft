import { AdminStaff } from "../../../../../features/management/admin/admin-staff";
import { localizedMetadata } from "../../../../../lib/locale-metadata";
export const generateMetadata = localizedMetadata({
	ar: "الطاقم — إدارة إيكنارا",
	en: "Staff — Ichnara Admin",
});
export default function Page() {
	return <AdminStaff />;
}
