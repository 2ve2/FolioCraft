# Product requirements

## Confirmed concept
A universal portfolio builder with one fixed, comprehensive layout. Users customize theme/colors, font family/style/size. The UI structure remains consistent. Backend independent: Bun + Hono + Better Auth + Drizzle ORM. Sooqha backend is the implementation-style reference.

## Proposed first-release scope
Arabic/English; one site per account initially; profile, projects, experience, skills, education/certificates, articles and contact. Optional empty sections automatically disappear. Users can toggle section visibility and curate project order/featured status. No freeform drag-and-drop page builder.

## Experiences
- Marketing: clear value proposition, working example and create action separate from demo.
- Onboarding: account → basic profile → first project or skip → appearance → preview/publish.
- Dashboard: Content, Appearance, Settings; clear saving/draft/published states; one primary publish action.
- Desktop editor: controls plus live preview. Mobile editor: edit/preview tabs rather than squeezed columns.
- Public portfolio: identity, best work and contact clear above lengthy credentials; independent routes for projects and articles.

## Content fields
- Site profile: name, role, bio, optional image/location/availability, public contact/social links.
- Project: title, cover, summary, role, dates, rich body/results/gallery, optional tools and links, sort/featured status.
- Experience: organization, role, dates/current, description and accomplishments.
- Skills: categories and entries.
- Education/certificates: organization, qualification, dates and optional verification link.
- Article: title, summary, cover, rich body, slug and draft/public selection. Read time calculated.
- Contact: configured public links and inquiry form; do not expose account email unless explicitly chosen.

## Appearance
Start with three complete presets: light, dark, warm editorial. Identical content and section structure across presets. Curated Arabic/Latin font pairs, constrained text sizes and limited radius/border options. Use semantic CSS variables and tested contrast. No custom script/CSS or arbitrary HTML execution.

## Save and publish
Immediate local preview; debounced draft autosave with saving/saved/failed feedback. Revision checks prevent stale tabs overwriting newer work. Explicit publish creates a complete release snapshot and atomically updates the public release pointer. Public queries never return draft content. Unpublish and rollback use release semantics. Media referenced by active/historical releases must not be deleted by draft cleanup.

## Core acceptance
1. A new user signs up/signs in, creates a site, enters bio and one project, changes appearance and publishes a real reachable portfolio.
2. A second user cannot read/write private first-user content or adopt their upload keys.
3. Reload/relogin preserves saved data.
4. Theme/font/visibility changes preserve stored content byte-for-byte apart from intentional content edits.
5. Public release stays unchanged while drafts are edited; publication cannot produce a partial mixed version.
6. Arabic translates actual UI text and uses correct direction; mixed URLs/emails remain readable.
7. Preview and public rendering agree at representative desktop/mobile widths.
8. Upload failure, save failure, invalid fields and unavailable API produce honest actionable UI feedback.

## Deferred
Custom domains, paid plans/payment, advanced analytics, importing GitHub/LinkedIn, AI writing, collaboration/multiple sites, arbitrary uploaded fonts and elaborate realtime infrastructure. No fabricated stats, testimonials, performance scores, E2E encryption or enterprise adoption claims. Plan supports extension but does not implement it prematurely.
