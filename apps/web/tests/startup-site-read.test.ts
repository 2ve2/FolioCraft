import { expect, test } from "bun:test";
import {
	createStartupSiteRead,
	type StartupSession,
} from "../src/features/studio/startup-site-read";

/** Holds a real asynchronous boundary so tests can change the session before network completion. */
function deferred<T>() {
	let resolve: (value: T) => void = () => {};
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}
const signedIn: StartupSession = { identity: "account:session", pending: false, error: false };

test("speculation waits for a signed-in verified session and consumes once", async () => {
	const network = deferred<{ value: { draft: string }; identity: string }>();
	const read = createStartupSiteRead(() => network.promise, "");
	const taking = read.take(signedIn.identity, () => signedIn);
	network.resolve({ value: { draft: "owned content" }, identity: signedIn.identity });
	expect(await taking).toEqual({ accepted: true, value: { draft: "owned content" } });
	expect(await read.take(signedIn.identity, () => signedIn)).toEqual({ accepted: false });
});

for (const [name, state] of Object.entries({
	signedOut: { identity: "", pending: false, error: false },
	pending: { ...signedIn, pending: true },
	error: { ...signedIn, error: true },
	otherAccount: { ...signedIn, identity: "other:session" },
})) {
	test(`discards a result when initial verification is ${name}`, async () => {
		const read = createStartupSiteRead(
			async () => ({ value: "private draft", identity: signedIn.identity }),
			"",
		);
		expect(await read.take(signedIn.identity, () => state)).toEqual({ accepted: false });
	});
}

test("invalidation discards the result before the network response arrives", async () => {
	const network = deferred<{ value: string; identity: string }>();
	const read = createStartupSiteRead(() => network.promise, "");
	const taking = read.take(signedIn.identity, () => signedIn);
	read.invalidate();
	expect(await taking).toEqual({ accepted: false });
	network.resolve({ value: "old account draft", identity: signedIn.identity });
	expect(await read.take(signedIn.identity, () => signedIn)).toEqual({ accepted: false });
});

test("rechecks synchronous session identity after network completion", async () => {
	const network = deferred<{ value: string; identity: string }>();
	let state = signedIn;
	const read = createStartupSiteRead(() => network.promise, "");
	const taking = read.take(signedIn.identity, () => state);
	state = { ...signedIn, identity: "other:session" };
	network.resolve({ value: "old draft", identity: signedIn.identity });
	expect(await taking).toEqual({ accepted: false });
});

test("a known initial identity cannot authorize a different account", async () => {
	const read = createStartupSiteRead(
		async () => ({ value: "old draft", identity: "old:session" }),
		"old:session",
	);
	expect(await read.take(signedIn.identity, () => signedIn)).toEqual({ accepted: false });
});

test("401 and other failures fall back without an unhandled rejection", async () => {
	const read = createStartupSiteRead(async () => {
		throw new Error("401");
	}, "");
	await Promise.resolve();
	expect(await read.take(signedIn.identity, () => signedIn)).toEqual({ accepted: false });
});

test("an empty owned-site result remains a successful onboarding result", async () => {
	const read = createStartupSiteRead(
		async () => ({ value: null, identity: signedIn.identity }),
		"",
	);
	expect(await read.take(signedIn.identity, () => signedIn)).toEqual({
		accepted: true,
		value: null,
	});
});

for (const identity of ["other:session", "account:other-session", ""]) {
	test(`rejects a server-bound result with mismatched or absent identity (${identity || "missing"})`, async () => {
		const read = createStartupSiteRead(
			async () => ({ value: "other private draft", identity }),
			"",
		);
		expect(await read.take(signedIn.identity, () => signedIn)).toEqual({ accepted: false });
	});
}
