import { revalidateTag } from "next/cache";
import { revalidatePortfolio } from "../../../../lib/revalidate-portfolio";

export const dynamic = "force-dynamic";

/** Public Worker access is blocked separately; local Node fallback additionally requires the secret. */
export function POST(request: Request) {
	return revalidatePortfolio(request, process.env.PORTFOLIO_REVALIDATION_SECRET, (tag) =>
		revalidateTag(tag, { expire: 0 }),
	);
}
