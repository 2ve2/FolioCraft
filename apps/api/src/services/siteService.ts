import { publicSiteService } from "./publicSiteService";
import { releaseService } from "./releaseService";
import { siteDraftService } from "./siteDraftService";

export {
	type DraftTransaction,
	lockOwnedSite,
	mutateOwnedDraft,
	ownedSite,
	siteDto,
} from "./siteDraftService";

/** Stable internal entry point; each implementation owns one site lifecycle boundary. */
export const siteService = { ...siteDraftService, ...releaseService, ...publicSiteService };
