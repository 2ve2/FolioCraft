import { siteDraftService } from "./draft-service";
import { publicSiteService } from "./public-service";
import { releaseService } from "./release-service";

export {
	type DraftTransaction,
	lockOwnedSite,
	mutateOwnedDraft,
	ownedSite,
	siteDto,
} from "./draft-service";

/** Stable internal entry point; each implementation owns one site lifecycle boundary. */
export const siteService = { ...siteDraftService, ...releaseService, ...publicSiteService };
