import type { Draft } from "@ichnara/contracts";
import type { text } from "./copy";

export type Page<T> = { items: T[]; hasMore: boolean; limit: number; offset: number };
export type Inquiry = {
	id: string;
	name: string;
	email: string;
	message: string;
	status: "new" | "read" | "archived";
	createdAt: string;
};
export type Release = { id: string; revision: number; createdAt: string; active: boolean };
export type Snapshot = { id: string; revision: number; createdAt: string; snapshot: Draft };
export type AdminSite = {
	id: string;
	ownerId: string;
	slug: string;
	revision: number;
	publishedReleaseId: string | null;
	suspended: boolean;
	suspensionReason: string | null;
	releaseCount?: number;
	assetCount?: number;
	inquiryCount?: number;
};
export type Audit = {
	id: string;
	actorId: string;
	action: string;
	targetType: string;
	targetId: string;
	status: "attempted" | "succeeded" | "failed";
	reason: string | null;
	createdAt: string;
};
export type AdminUser = {
	id: string;
	name: string;
	email: string;
	role?: string | null;
	banned?: boolean | null;
};
export type Counts = Record<keyof typeof text.en.counts, number>;
