export type Asset = {
	id: string;
	siteId: string;
	mime: string;
	size: number;
	width: number | null;
	height: number | null;
	status: "pending" | "ready" | "deleting" | "deleted";
	expiresAt: string;
	createdAt: string;
};
export type UploadIntent = Asset & {
	uploadUrl: string;
	uploadHeaders: Record<string, string>;
	uploadExpiresIn: number;
};
