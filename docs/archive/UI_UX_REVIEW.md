# Observed prototype review

2026-10-13; Google AI Studio preview after user logged in.
https://ai.studio/apps/8adde5df-a98e-4263-8e84-910e47a5accd

## Tested scope
Landing, Create Your Website, Console, Profile, Edit Content, Site Settings, New Project required title, More options, Draft Post, Inspect in Live View, public project card/modal, Appearance preset/font/mobile preview, Skills section toggle/restore, Arabic selector.
No real publish, message transmission, successful content creation, backend persistence after reload, full keyboard audit or actual mobile editor usability test performed. AI Studio assistant's own feature claims are not verification evidence.

## Strengths
Clear purple visual identity, readable main heading hierarchy, cards, adjacent controls/live preview, preset/font visual updates, working section visibility toggle, project details modal, native required title validation.

## P0
- Theme/content coupling: Warm Editorial changes location (San Francisco to Zürich/Basel), role and bio; Inter font then restores earlier persona content. Fixed layout product must preserve content across appearance changes.
- Wrong actions: Profile opens public portfolio; Edit Content opens Register New Project; Site Settings opens Cloudflare Edge Audit Logs.
- Create Your Website opens populated Elena demo dashboard rather than empty user onboarding.
- Pale bio/secondary text/numbers in light/editorial preview visibly difficult to read; contrast not measured numerically. Must validate semantic text palette rather than claim a contrast score.

## P1
- Arabic selector changes selected option only; visible copy and layout direction remain English/LTR.
- Project fields are developer-specific (Badge/Platform, Release Version, Tech Stack Dialects, Executive Synopsis), with no visible cover/gallery/case-study body inputs.
- Draft Technical Essay has title, estimated read time and abstract but no visible body editor.
- Duplicate navigation/appearance/publish actions; two device preview controls label mobile widths 375 and 390.
- Header clipped at observed roughly 1042px viewport. Internal mobile preview changes its width but does not establish editor responsiveness on a phone.
- Very dense technical persona, PGP terminology and encrypted inquiry labels; use optional details and broad professional wording.
- Save Local vs Auto-saved vs multiple publish controls have ambiguous state semantics.

## P2
- More options did not open visible UI in successful click attempt.
- Four cards displayed with text Showing 3 of 6.
- GitHub, repository/live deployment links point to generic github.com, not actual project targets.
- Inspect in Live View opens public listing, not selected project detail; clicking a public card opens a detail modal.
- Performance, encryption, analytics, edge audit, testimonial and adoption claims are displayed but not technically verified.

## Target changes
Separate demo/create; content/appearance/settings navigation; empty-state next steps; profile/project editors; fixed renderer shared by preview/public; actual locale support; safe semantic presets and font pairs; public direct URLs for projects/articles; honest save/publish feedback and real state.

Screenshot evidence in original handoff parent: editorial-review.jpg. Original theme/lang/section settings were returned to initial values after testing; no publish performed.
