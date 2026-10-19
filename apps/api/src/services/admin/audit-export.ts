import { env } from "../../config/env";
import { auth } from "../../lib/auth";
import { ApiError } from "../../lib/response-helpers";
import { type AuditFilters, listAdminAudit } from "./audit-service";
import { appendSensitiveOutcome, prepareSensitiveAction } from "./sensitive-action";
export const csvColumns = [
	"id",
	"actorId",
	"action",
	"targetType",
	"targetId",
	"requestId",
	"status",
	"createdAt",
] as const;
/** Quotes all cells and neutralizes spreadsheet formulas even after leading whitespace. */
export function csvCell(value: unknown) {
	const text = String(value ?? "");
	return `"${(/^[\s]*[=+\-@]/.test(text) ? "'" : "") + text.replaceAll('"', '""')}"`;
}
export async function exportAdminAudit(
	headers: Headers,
	credentials: unknown,
	filters: AuditFilters & { actorId?: string; action?: string },
	maxRows: number,
) {
	if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > env.ADMIN_AUDIT_EXPORT_MAX_ROWS)
		throw new ApiError(400, "EXPORT_LIMIT_EXCEEDED");
	const actor = await auth.api.getSession({ headers });
	if (!actor) throw new ApiError(401, "UNAUTHORIZED");
	const { audit } = await prepareSensitiveAction(
		actor,
		headers,
		"audit.export",
		"events",
		credentials,
	);
	let csv: string;
	try {
		const page = await listAdminAudit(maxRows, 0, filters.actorId, filters.action, filters);
		csv = `${[
			csvColumns.map(csvCell).join(","),
			...page.items.map((row) => csvColumns.map((key) => csvCell(row[key])).join(",")),
		].join("\r\n")}\r\n`;
	} catch (e) {
		await appendSensitiveOutcome(audit, "failed");
		throw e;
	}
	await appendSensitiveOutcome(audit, "succeeded");
	return csv;
}
