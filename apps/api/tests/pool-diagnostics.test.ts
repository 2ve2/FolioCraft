import { describe, expect, test } from "bun:test";
import { poolErrorDiagnostic } from "../src/db/pool-diagnostics";

describe("pool diagnostics", () => {
	test("preserves only allowlisted names/codes and actual lifecycle metadata", () => {
		for (const stage of ["request", "scheduled", "shared"] as const) {
			for (const code of ["57P01", "57014", "08006", "ECONNRESET", "ETIMEDOUT"]) {
				for (const state of [
					{ ending: false, ended: false },
					{ ending: true, ended: false },
					{ ending: true, ended: true },
				]) {
					expect(poolErrorDiagnostic({ name: "error", code }, stage, state)).toEqual({
						event: "database_pool_error",
						name: "error",
						code,
						stage,
						...state,
					});
				}
			}
		}
	});

	test("excludes arbitrary fields and rejects even short unknown names/codes", () => {
		const privateValue =
			"postgresql://private:password@private.invalid/db SELECT private user@example.invalid";
		for (const code of [privateValue, "ALICE", "XXXXX", 57014, null, undefined]) {
			const diagnostic = poolErrorDiagnostic(
				{
					name: privateValue,
					code,
					message: privateValue,
					stack: privateValue,
					query: privateValue,
					parameters: [privateValue],
					host: privateValue,
					cause: { code: "ECONNRESET", message: privateValue },
					toJSON: () => {
						throw new Error("Must never serialize the error");
					},
				},
				"request",
				{ ending: false, ended: false },
			);
			expect(diagnostic).toEqual({
				event: "database_pool_error",
				name: "unknown",
				code: "unknown",
				stage: "request",
				ending: false,
				ended: false,
			});
			expect(JSON.stringify(diagnostic)).not.toContain(privateValue);
		}
	});

	test("handles native errors, non-errors, getters and hostile descriptors safely", () => {
		expect(
			poolErrorDiagnostic(new Error("private"), "shared", { ending: true, ended: true }).name,
		).toBe("Error");
		for (const error of [
			null,
			undefined,
			"private",
			42,
			{
				get code() {
					throw new Error("private");
				},
				get name() {
					throw new Error("private");
				},
			},
			new Proxy(
				{},
				{
					getOwnPropertyDescriptor() {
						throw new Error("private");
					},
				},
			),
		]) {
			expect(poolErrorDiagnostic(error, "scheduled", { ending: false, ended: false }).code).toBe(
				"unknown",
			);
		}
	});
});
