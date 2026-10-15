import type { ReactNode } from "react";
import { AdminShell } from "../../features/management/admin/admin-shell";

/** Keeps every administration route behind the same session-aware layout. */
export default function AdministrationLayout({ children }: { children: ReactNode }) {
	return <AdminShell>{children}</AdminShell>;
}
