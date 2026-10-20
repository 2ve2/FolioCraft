import { type AnyColumn, type SQL, sql } from "drizzle-orm";

/** Compares text identifiers byte-wise so keyset order never depends on the database locale. */
export const binaryText = (column: AnyColumn) => sql`${column} collate "C"`;

/** Selects rows strictly after a text cursor using the same byte-wise order as binaryText. */
export const afterText = (column: AnyColumn, cursor: string): SQL =>
	sql`${binaryText(column)} > ${cursor}`;
