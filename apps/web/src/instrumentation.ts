import { captureRequestError } from "@sentry/nextjs";
import type { Instrumentation } from "next";

/** Uses the request-scoped client created by the supported OpenNext Worker wrapper, if enabled. */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
	captureRequestError(error, request, context);
};
