import { PUBLIC_CACHE_TAG_PREFIX } from "@ichnara/contracts/public-cache";
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";
import { withFilter } from "@opennextjs/cloudflare/overrides/tag-cache/tag-cache-filter";
import portfolioIncrementalCache from "./portfolio-incremental-cache";

const config = defineCloudflareConfig({
	incrementalCache: portfolioIncrementalCache,
	tagCache: withFilter({
		tagCache: doShardedTagCache({ baseShardSize: 1, regionalCache: false }),
		filterFn: (tag) =>
			(typeof tag === "string" ? tag : tag.tag).startsWith(PUBLIC_CACHE_TAG_PREFIX),
	}),
});
config.buildCommand = "bun run build --webpack";

export default config;
