import { AdminPanel } from "../../../features/management/admin/admin-panel";

export const metadata = { title: "Activity log — FolioCraft Admin" };

/** Mounts the independently addressable administrative activity view. */
export default function AdministrationPage() {
	return <AdminPanel key="audit" view="audit" />;
}
