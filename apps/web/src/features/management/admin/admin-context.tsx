"use client";
import type { Locale } from "@ichnara/contracts";
import { createContext, useContext } from "react";

export type AdminSession = {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	user: { id: string; name: string; email: string };
};
export const AdminContext = createContext<AdminSession | null>(null);

/** Provides only the administrator identity and interface locale to authorized child views. */
export function useAdminSession() {
	const context = useContext(AdminContext);
	if (!context) throw new Error("Administration views require the authorized administration shell");
	return context;
}
