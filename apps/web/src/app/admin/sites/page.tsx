import { AdminPanel } from "../../../features/management/admin/admin-panel";

export const metadata = { title: "Sites — FolioCraft Admin" };

/** Mounts the independently addressable administrative sites view. */
export default function AdministrationPage() {
	return <AdminPanel key="sites" view="sites" />;
}
