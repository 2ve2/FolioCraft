import { connection } from "next/server";
import type { ReactNode } from "react";
import { AdminShell } from "../../../../features/management/admin/admin-shell";

/** Keeps every administration route behind the same session-aware layout. */
export default async function AdministrationLayout({ children }: { children: ReactNode }) {
	await connection();
	return <AdminShell>{children}</AdminShell>;
}
