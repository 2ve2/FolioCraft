# Platform color token extraction — 2026-10-22

## Problem and boundary

Platform colors were scattered across global styles, feature modules and one administrative icon. This task centralizes their exact values while preserving the existing rendered output, source cascade, content, behavior and owner appearance. Branch: `codex/platform-color-tokens`, from freshly fetched main `8b49fe2`. Work is confined to the independent GitHub checkout. Unrelated untracked `docs/ADMIN_CONSOLE_TASK.md` is preserved and excluded.

No dependency, layout, spacing, typography, API, authentication policy, ownership rule, schema, migration, provider resource, production configuration or deployment is changed. Public portfolio styles and owner-selected appearance remain untouched.

## Inventory and design

The complete baseline inventory is [inventory.json](2026-10-22-platform-color-tokens/inventory.json):452 CSS declaration occurrences, including the existing focus token,8 platform system-color occurrences and17 public-portfolio occurrences. The platform migration replaces426 declaration occurrences plus one inline decorative administrative resource-icon value. It centralizes310 exact literal spellings, including the existing focus value. RGB/RGBA/HSL/HSLA literals:0. The inventory scans declaration values, not property names such as `white-space` or selectors such as `canvas`.

[palette.json](2026-10-22-platform-color-tokens/palette.json) maps every extracted literal to its semantic/component role and its first original use. Existing identical literal occurrences share a token; no near-equal values are merged. `#fff` and named `white` retain separate tokens, as do `transparent` and transparent-black `#0000`. Alpha values and gradient stop order are preserved exactly. Existing base aliases and scoped admin aliases retain their inheritance boundaries. No dark mode is enabled.

Groups: entry/shared controls and modules; workspace/editor/preview chrome; administration. All palette definitions are introduced with the first group so each intermediate state remains valid. Later groups only consume those definitions. The inline icon retains its color through `var(--color-admin-resource-icon)`.

Baseline counts per stylesheet (files with zero literals remain in source and unchanged):

```text
components/ui/product-footer.module.css                 11
components/ui/public-notices.module.css                  3
components/ui/tooltip-button.module.css                 12
features/assets/asset-picker.module.css                 14
features/legal/legal.module.css                        11
features/management/admin/admin-shell.module.css        23
features/management/admin/admin.module.css              73
features/management/admin/operations.module.css          3
features/management/admin/reports.module.css             6
features/management/shared/management.module.css        12
features/not-found/not-found.module.css                 22
features/portfolio/published-shell.module.css           10 (excluded)
features/portfolio/report.module.css                     7 (excluded)
styles/editor-groups.css                                 2
styles/foundation.css                                   34
styles/landing.css                                      23
styles/loading.css                                      13
styles/readability.css                                   5
styles/reset.css                                         4
styles/responsive.css                                    4
styles/scrollbars.css                                   19
styles/select-control.css                               21
styles/tokens.css                                        1 (existing definition)
styles/welcome.css                                      22
styles/workspace-preview.css                             1
styles/workspace.css                                    96
```

### Justified remaining literals

-8 platform system-color declarations remain in forced-colors rules: tooltip background/text/border (`Canvas`, `CanvasText`), missing-page button border (`ButtonText`), loading sheet/text (`CanvasText`), scrollbar track/thumb (`Canvas`, `CanvasText`). These must follow the user's system palette rather than a fixed brand value.
- `styles/reset.css` retains `red, red` in its unchanged `@supports (color: color-mix(in lab, red, red))` capability query. Custom properties inside that query would change what the browser tests. The rendered placeholder declaration uses the transparent token.
- The17 declaration occurrences in `features/portfolio/published-shell.module.css` and `features/portfolio/report.module.css` remain unchanged because they belong to public portfolio rendering. `packages/portfolio` and owner theme/accent data are untouched. Brand SVG assets and the fictional landing portfolio's theme data are also outside platform CSS.
- `inherit`, `currentColor`, `none` and `auto` remain CSS behavior keywords, not fixed palette values. No platform hexadecimal/RGB/HSL declaration remains outside `tokens.css` and the two excluded public modules.

## Exact visual proof

Local Bun/Hono and a production Next build used an environment-file-free self-contained copy with loopback PostgreSQL `folio_test` on55435. Provider configuration was absent. The fixture signed up through native Better Auth, created and saved a real site through owned domain APIs, received a disposable local staff role, enrolled native TOTP, completed a fresh sign-in challenge and passed `/api/admin/me/permissions`. MFA requirements, CSP, CORS and ownership were unchanged. No application endpoint or forged staff-session proof was added.

The same fixture/database/session stayed alive across both builds. Chromium used deviceScaleFactor1, viewport height1000, reduced motion and a fixed browser clock. Each page awaited its real content, network idle and `document.fonts.ready`; screenshots used fullPage, animations disabled and caret hidden. Browser requests were limited to exact local web/API origins. No screenshot masks, tolerances, color normalization, image resizing or provider mocks were used. Landing/auth/legal were captured anonymously; Studio and admin used the real authenticated session.404 responses were asserted404; other routes200. Every capture had0 page errors.

48 before and48 after screenshots were decoded to RGBA with the installed Pillow library and compared channel-for-channel. All48 have0 changed pixels. [visual.json](2026-10-22-platform-color-tokens/visual.json) records dimensions, decoded SHA256 values and each diff count. The hashes match for every pair; compressed PNG metadata is irrelevant.

```text
Route       ar390 ar768 ar1440 en390 en768 en1440 (different pixels)
landing       0     0      0      0     0      0
login         0     0      0      0     0      0
signup        0     0      0      0     0      0
privacy       0     0      0      0     0      0
terms         0     0      0      0     0      0
404           0     0      0      0     0      0
studio        0     0      0      0     0      0
admin         0     0      0      0     0      0
```

An independent substitution check expands every new `var(--color-*)` in the final CSS back to its exact original literal. All29 stylesheets outside `tokens.css` match the baseline after ignoring only whitespace/comments; selectors, declarations, ordering, gradients and values remain identical. The inline icon also resolves to its original value. This brackets states outside the captured initial screens without claiming they received interactive browser coverage.

Session-local reproducibility commands from the independent checkout:

```sh
python3 work/platform-color-tokens/inventory.py
bun --no-env-file work/platform-color-tokens/run-visual.ts
# After the before capture, the task signaled the after build/capture:
touch work/platform-color-tokens/capture-after
python3 work/platform-color-tokens/compare.py
python3 work/platform-color-tokens/evidence.py
```

The orchestration constructs an explicit synthetic local environment, rejects external browser traffic, keeps fixture cookies/password/TOTP in memory and deletes its exact account in finally. Raw before/after PNGs, build logs and session-local measurement scripts remain under ignored `work/platform-color-tokens/`. Final fixture cleanup reports1 removed and0 remaining. The exact comparison result is `Compared 48 screenshots; 0 different pixels`.

## Contrast preservation

[contrast.json](2026-10-22-platform-color-tokens/contrast.json) records80 before/after token-pair ratios: principal text/background/focus pairs plus all opaque foreground/background pairs directly declared in the same baseline rule. Ratios use WCAG sRGB linearization with coefficients0.2126/0.7152/0.0722 and `(lighter + 0.05) / (darker + 0.05)`. Every recorded before/after ratio is identical. Representative results:

```text
Platform body/page        14.8552:1
Muted/page                 4.8293:1
Muted/card                 5.0655:1
Primary/white text         7.1882:1
Secondary/white surface    9.4227:1
Error/surface              6.8690:1
Admin body/page           13.5929:1
Admin muted/card           4.9321:1
Admin primary/white text   6.1199:1
Focus/white                4.8177:1
Focus/page                 4.5931:1
```

Existing limitations are retained, not repaired in a zero-change extraction: input placeholder/white3.4978:1; admin focus/white2.6425:1. The resource icon/white3.2731:1 is decorative. The JSON lists every measured pair and whether it meets4.5:1 for normal text; it is not a blanket accessibility certification. Inherited/composited/translucent/background-image/interaction combinations are not exhaustively audited. Exact source/pixel equivalence establishes preservation, not newly improved contrast.

## Quality gates and commit checkpoints

All commands execute in `work/platform-color-tokens/build`, a source-only copy with physically local frozen dependencies and no environment files. Only the explicit disposable local database is supplied. Baseline main and all three stylesheet-group states each pass11/11 commands. There are44 successful command executions across these four checkpoints. No failure is attributed to main without baseline proof.

```text
bun install --frozen-lockfile
Checked448 installs across601 packages (no changes); exit0
bun audit
No vulnerabilities found (checked539 packages); exit0
bun run typecheck
API/web/E2E typechecks and Next typegen; exit0
bun run check
Checked429 files in the completed candidate (425 before JSON evidence additions). No fixes applied.; exit0
bun run test:web
37 pass;0 fail;685 expect() calls; exit0
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55435/folio_test bun run test
81 pass;12 conditional skips;0 fail;5311 expect() calls; exit0
Actual workerd database:7 unbound +7 local-binding checks; exit0
bun run test:worker-storage
8 Workers storage regressions passed; no provider/database requests; exit0
bun run test:worker-mail
15 Workers mail checks passed; all outbound mocked; exit0
bun run build
Generating static pages(50/50); exit0
bun run --cwd apps/web build:cloudflare
Generating static pages(50/50); OpenNext build complete; exit0
(cd apps/api && bunx --no-install wrangler deploy --dry-run --outdir ../../work/api-dry-run)
Total Upload5135.16KiB / gzip939.35KiB; --dry-run: exiting now; exit0
```

The12 conditional skips are unchanged on baseline main; none was introduced or disabled here. The guarded runner also reports `enforced_mfa_suite`:11 pass;0 fail;308 expect() calls. The main source/check count increases only for the four JSON evidence files; follow-up checks cover those additions. No package/lockfile change occurred. `git diff --check` passes.

## Files and completed groups

- Entry/shared group: `styles/tokens.css`, reset/foundation/welcome/landing/loading/select-control; UI footer/notices/tooltip modules; legal and missing-page modules. Documentation: CHANGELOG scope/checkpoints, STATUS, DECISIONS, DESIGN_SYSTEM, SOURCE_STRUCTURE and this evidence with four JSON records.
- Workspace group (completed and verified): workspace/editor/readability/responsive/scrollbar/preview styles, asset-picker and shared-management modules.
- Administration group (completed and verified): shell/admin/operations/reports modules and resource-icon token use in admin-overview.

## Limits and human operations

No provisioning, new secret, migration or deployment is required to review/merge this CSS-only web change. Required human operational commands for this task: none. Any later deployment is a separate human decision; it was not executed here. No Neon, R2, Resend or Cloudflare resource/account was accessed or changed. No actual credentials or runtime environment files were opened, copied, printed or committed.

Not verified: physical devices, Firefox/WebKit, hosted cookies/persistence/provider delivery, every interactive control state in screenshots, actual dark mode, remote PR checks or a deployed-trial comparison. Local integration/runtime gates are evidence only for their stated local coverage. Branch push, PR and final server cleanup are pending at this checkpoint.


### Workspace checkpoint

Entry committed as `6bcd8e8` (`refactor(web): tokenize platform entry colors`). Workspace styles, asset picker and shared management styles consume exact existing palette roles. All11 workspace-state gates exit0: frozen install448/601, audit539 clean, Biome429, web37/0/685, API81/12 unchanged conditional skips/0/5311 plus native MFA11/0/308 and workerd database14/14, storage8/8, mail15/15, Next/OpenNext50/50 and API dry run5135.16KiB/gzip939.35KiB. The source-only gate copy contains the first two groups; administration remains at baseline for this checkpoint. Full-candidate pixel proof remains48/48 identical. Administration is the next separate step.


### Administration checkpoint and local acceptance

Workspace committed as `3939be4` (`refactor(web): tokenize workspace colors`). All administration CSS now consumes palette tokens, including fallback values; the decorative resource-icon scalar also resolves to its exact original color. Complete source expansion matches all29 non-token stylesheets and the entire icon component file. The final gate copy matches every current platform source file byte-for-byte.

All11 final-candidate gates exit0 with the result lines above: frozen install448/601, audit539 clean, Biome429, web37/0/685, API81/12 baseline skips/0/5311 plus native MFA11/0/308, actual workerd database14/14, storage8/8, mail15/15, Next/OpenNext50/50 and API dry run5135.16KiB/gzip939.35KiB. No gate failed; the initial sandbox-only local PostgreSQL socket restriction was resolved by an authorized local-runtime retry before tests. The literal audit excludes custom-property identifier words and verifies0 remaining platform palette declarations outside tokens, with exactly8 documented system-color declarations.

All48 decoded screenshot pairs remain identical.80 recorded contrast pairs remain identical. All edited Markdown is English; `git diff --check` and the source Biome check pass. API/shared portfolio files, package manifests, lockfile, migrations and runtime configuration are unchanged. PR creation and PostgreSQL shutdown follow this implementation commit; those actions are not preclaimed here.
