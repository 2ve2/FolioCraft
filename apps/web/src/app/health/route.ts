/** Reports web liveness without a database, provider request, cookie or mutation. */
export function GET() {
	return Response.json({ status: true }, { headers: { "Cache-Control": "no-store" } });
}
