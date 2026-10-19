import { reportInput, slugSchema } from "@ichnara/contracts";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { errorResponse, successResponse } from "../../lib/response-helpers";
import { reportLimits, reportService } from "../../services/reports";

export const publicReportRoutes = new Hono();
/** Bounds the streamed body as well as its declared length before parsing strict input. */
publicReportRoutes.post(
	"/:slug/report",
	bodyLimit({
		maxSize: reportLimits.bodyBytes,
		onError: (c) => errorResponse(c, "BODY_TOO_LARGE", 413, "BODY_TOO_LARGE"),
	}),
	async (c) => {
		const slug = slugSchema.parse(c.req.param("slug")),
			input = reportInput.parse(await c.req.json());
		return successResponse(
			c,
			await reportService.create(slug, input, c.req.header("x-folio-client-ip") ?? "unknown"),
			undefined,
			201,
		);
	},
);
