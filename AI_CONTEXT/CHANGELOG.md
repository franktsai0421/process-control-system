# PROCESS OS - Meaningful Change History

## 2026-09-17 — Private collaboration CI

- Run isolated CI on Windows because the existing encrypted ZIP backup engine explicitly requires Windows. Select the native archive engine and check each PowerShell command's exit code so an earlier regression failure cannot be hidden by a later successful command.
- CI validates Local fixtures, Canonical and upload safety only; it never deploys or uses Production credentials.

## 2026-09-17 — Portable private collaboration candidate

- Replace workstation-specific browser-tool paths with installed-tool discovery and explicit environment settings; resolve repository fixtures from script location and temporary files through platform APIs.
- Default host backups to ignored repository-relative `.local-backups`, reject network backup paths and require Windows system configuration instead of a fixed drive fallback.
- Remove workstation locations from tracked documentation. Rebuild only the unpublished candidate history after verified offline recovery; original site history, Local data and existing backups stay untouched.
- Add portable-path tests and a working-tree/reachable-history preflight with Canonical validation. Private GitHub setup remains subject to successful checks; no Staging or Production activity is included.

## 2026-09-17 — Local Canonical collaboration

- Preserve all approved baseline business records in stable domain packages; exclude identities, accounts, drafts and operation history. Keep media bytes outside Git with digest indexes and portable placeholders.
- Bootstrap empty Local from Canonical through existing migrations; retain existing data and demo role rules. Support SQLite rowid semantics and valid legacy backup-PK warnings without rewriting schema.
- Add stable export, three-way sync/conflict refusal, verified backups/rollback, task safety commands and isolated data tests.
- Use supported Miniflare built-in Request.cf data and loopback-only Local guard; remove remote font loading. No source Git history rewrite, Cloudflare connection, deployment or existing Local conversion.


## 2026-09-16 — Local passwordless demo authentication

- Preserve all three quick-entry buttons and existing backend role rules; issue fixed demo identities with signed, expiring and explicitly typed Sessions.
- Centralize DEMO_LOGIN_ENABLED (unset/true allows; false rejects new and existing demo Sessions). Remove seed credentials, built-in administrator injection and the legacy frontend default password.
- Add guarded Local startup using existing Drizzle migrations only, empty-state initialization, idempotent verification and fail-closed conflicts. Existing Local/Production data and Sites mapping are not changed by this source update.
- Add isolated authentication regression checks and fresh-clone startup documentation. 測試階段快捷入口預設開放；正式營運前必須由Frank明確確認關閉。

This file records verified, meaningful changes only. `AI_CONTEXT.md` describes the current system state.

## [Build 2026.09.15.7100] - 2026-09-15 — large-photo saves bypass browser quota

- Removed shared business JSON from `localStorage`. The compatibility layer now serves existing SPA reads/writes from an in-memory mirror, clears legacy shared browser copies, and sends process/media changes directly to the revision-checked API, where large snapshots continue through D1 references to private R2.
- Process Save now waits for the cloud write before showing success. Oversized best-effort recovery data can no longer throw a second browser-quota error that hides the original save failure.
- Hosted startup now trusts a remembered user only when the server confirms the signed session. Stale browser identity returns to the login/public-viewer flow instead of opening an apparently editable screen whose writes receive HTTP 403.
- No D1 schema, shared-state key, R2 object format, role definition, production record, or backup data changed.

## [Build 2026.09.12.7000] - 2026-09-12 — internal-test release safety and large draft persistence

- Explicit public-demo mode allows ADMIN, RD, and STAFF entry on the hosted site. Demo sessions use signed, expiring cookies shared across workers, check current account status, and stop working when the feature flag is disabled. Cross-site mutations are rejected.
- Fixed Product Status rendering replacing an in-progress editor workspace with the approved snapshot. Navigation now preserves the draft and all 19 current nodes while production views still use the approved version.
- Large shared snapshots and backups are stored in private R2 with a SHA-256-verified D1 reference, retaining legacy inline D1 compatibility. This fixes D1 row-size failures when draft photos exceed the inline limit. Local ZIP backups include R2 metadata and blobs and avoid same-second filename collisions.
- Added protected, revision-checked release transfer with mandatory before/after backups and digest verification. Browser recovery preserves unsaved local drafts before deployment; the current V6 draft includes the 19-node editor workspace without approving it.
- Updated React/Vite and vulnerable transitive dependencies. The unavailable fixed image-size release is mitigated with a tested parser guard; two version-based audit alerts remain. See SECURITY_REVIEW.md for scope and limitations.
- PASS: isolated authentication, role, CSRF, large R2 payload, restore, corruption and revision-conflict checks; local D1/R2 backup restoration; existing BOM/import/version/language checks; desktop/tablet/mobile navigation and photo containment; TypeScript. No new SQL tables; snapshot persistence now spans D1 and private R2.

## [Build 2026.09.12.6900] - 2026-09-12 — stable editor photo slots

- Fixed the two-category editor-card case where a newly visible product-photo category inherited the former full-row rule, moved below the work preview, and overflowed the card.
- Work and product previews now keep fixed side-by-side slots. Adding a second or third photo to the same category changes only the `+2`/`+3` badge; desktop and mobile cards keep every preview inside their bounds.
- PASS: exact work-plus-product regression with before/after position comparison, card-bound checks, 390 px responsive coverage, process consistency, language-loop, system-upgrade guards, JavaScript syntax, and production build. No schema change, deployment, production D1 write, or media-data mutation.

## [Build 2026.09.12.6800] - 2026-09-12 — compact production cards without template photos

- Product Status, Dispatch monitoring, and Line Player no longer repeat the process-template photo in production-card headers. A process name matching the type badge is also omitted, leaving a compact identifier, counts, and type label.
- Empty guidance-media placeholders are not rendered. The shorter header and tighter content spacing let normal short cards display without an inner scrollbar, while exceptional long content retains contained scrolling.
- PASS: Build 6800 browser coverage, direct A-CUT-05 DOM measurement, process consistency, language-loop, system-upgrade guards, JavaScript syntax, and production build. No schema change, deployment, production D1 write, or backup/restore action.

## [Build 2026.09.12.6700] - 2026-09-12 — classified card galleries and accessible cloud backups

- Process-builder cards now keep their identifier, process-type badge, product count, and compact template cue in the left column, while machine, work, and product photos use labelled classified previews on the right. Duplicate process names are suppressed and product-specific editing remains a separate bottom action.
- Each classification displays one larger preview plus the total count (`+2`, `+3`, and so on). Opening a preview uses the shared lightbox and exposes every photo from that classification through previous/next navigation.
- Local ADMIN Backup & Restore can switch between host ZIP and cloud snapshot modes. Cloud mode exposes weekly enablement, time selection, schedule save, immediate backup, restore, and deletion; enabled cloud schedules also perform missed-run catch-up during normal allowed site reads.
- PASS: classified-media browser coverage, same-category lightbox navigation, local cloud-backup controls, data-safety and local-backup tests, process consistency, language-loop, JavaScript syntax, desktop visual inspection, 390 px responsive checks, and production build. No schema change, deployment, production D1 write, or real backup/restore action.

## [Build 2026.09.11.6600] - 2026-09-11 — readable builder-card photo categories

- Process-builder cards now show only work and machine media as wide, vertically separated previews. When only one category is present, its photo expands to fill the media area.
- Product-supplement photos are removed from the preview grid and represented by a separate bottom action with the media count, keeping product-specific content available without shrinking the operational photos.
- PASS: isolated browser coverage, JavaScript syntax, desktop visual inspection at 66% auto-fit, and 390 px responsive checks. No schema change, deployment, or production D1 mutation.

## [Build 2026.09.11.6500] - 2026-09-11 — stable reviewed layouts and larger categorized media

- Process-builder cards are 360×270 with larger work and machine photos at the top and product-supplement photos enlarged at the bottom. Template media remains a small process-type cue beside the title.
- Auto-layout reserves horizontal and vertical connector corridors. Legacy layouts with insufficient clearance are repaired, and submitted, approved, or historical versions are normalized on first display so review cannot reintroduce touching blocks or merged routes.
- Product Status, Dispatch monitoring, and Line Player shrink short cards to their content, enlarge guidance media, and wrap uninterrupted long strings inside the card.
- PASS: Build 6500 isolated browser coverage, desktop and 390 px responsive checks, existing equipment/BOM/version/language regressions, JavaScript syntax, and production build. No schema change or production D1 mutation.

## [Build 2026.09.11.6400] - 2026-09-11 — TV flow overview and paired process guidance

- Line Player and Dispatch monitoring now use the same auto-arranged connected graph as Product Status. Each product header shows its stage, flow count and approved version; distinct curved routes, 50% minimum auto-fit and zoom controls keep the whole process understandable on the production TV.
- Blank canvas areas in Product Status, Dispatch and Line Player support left-button drag panning. Production machine names repaint to the active Chinese or Vietnamese language without showing both names together.
- Production node content is ordered as product BOM, machine photos, common instructions with their media, then product-specific instructions with their media. Template/category thumbnails are small, separate and have no text overlay; redundant BOM counts were removed from colored headers.
- Process-builder cards are reduced to 320×210 and split work, product and machine photos into labelled groups outside the images. Template photos are small category cues beside the process name rather than part of the operation gallery.
- PASS: Build 6400 browser coverage for connected player/dispatch graphs, flow counts, auto-fit zoom, blank-canvas panning, language repaint, paired media order, compact editor cards and 390 px overflow; process consistency, language-loop, version-return, product-inheritance, BOM search, Build 5900 equipment regression, JavaScript syntax and production build also pass. No schema change, deployment or production D1 mutation.

## [Build 2026.09.11.6300] - 2026-09-11 — C-line BOM and process-media separation

- C-line semi-finished products without an independent BOM root now derive their selectable requirement list from the direct child rows under their occurrence in a parent BOM. `3100101` is verified to expose `20501001`, and the same list is used by editing, counts, validation, status and playback.
- Process-template media is shown separately in the basic-data area, editor card and colored production header. It is excluded from operation-instruction/product media, while legacy copied template images remain readable without a data migration.
- Applying operation content always closes the editor dialog. A failed server flush leaves the dialog closed and reports that the current-page content is retained.
- Editor zoom now reaches 50%; process cards are 360×300 for larger, separated media previews. Connection SVG paths use independently routed curves instead of shared orthogonal segments.
- Equipment lists and selectors display only the active Chinese or Vietnamese name and repaint immediately after language switching.
- PASS: Build 6300 isolated browser coverage for C-line inherited BOM selection, modal close on failed flush, separated media, language switch, 50% zoom, unique curved connections, status/player/dispatch cards and mobile overflow. No schema change, production deployment or real D1 mutation.

## [Build 2026.09.11.6200] - 2026-09-11 — compact editing and consistent production cards

- Fixed operation apply to close its dialog immediately, widened common-step inputs, removed the empty inspector column, and moved each product's photo/video upload into its media header.
- Expanded builder cards to 330 x 240, enlarged thumbnails, labelled Process/Product/Machine media, added assigned/total BOM counts, and strengthened process-type borders, header colors, and badges.
- Machine selection now shows both the current block and every other reuse location. Product Status no longer repeats machine photos in the generic media gallery; its product chip opens a focused BOM dialog.
- Rebuilt Dispatch monitoring and Line Player as responsive complete-card grids based on the same approved selected-product presentation used by Product Status. The process-master Excel import remains available outside a draft and creates one before opening the picker.
- PASS: Build 6200 browser coverage, Build 5900 and 6000 regressions, process consistency, system-upgrade guards, JavaScript syntax checks, desktop/390 px responsive layouts, and production build. Local source and isolated fixtures only; no deployment, production database synchronization, approval, or schema change.

## [Build 2026.09.11.6100] - 2026-09-11 — readable process cards and shared approved presentation

- Added one shared image/video viewer to equipment dialogs, process-editor cards, inspector media, product status, dispatch monitoring, and line playback. Common operation, product-supplement, and selected-machine media are kept in clearly labelled groups and can be enlarged without opening the process editor.
- Made reusable machine selection denser and responsive, clearly marked the current block, listed other reuse locations, and shortened equipment-catalog usage to operation numbers such as `A-CUT-05、A-CUT-06`.
- Increased process cards to 300 × 220, set the minimum canvas zoom to 80%, enlarged card text and thumbnails, and added process-type colors and badges. The inspector now places common steps, completion standards, and media side by side where space permits.
- Unified Product Status, Dispatch monitoring, and Line Player around the selected product's approved version. Cards now show common and product-specific steps, completion standards, machines and thumbnails, categorized common/product/machine media, selected product context, and collapsible BOM content.
- PASS: Build 6100 isolated browser coverage, equipment regression, complete-page Excel regression, process consistency, system-upgrade source guards, JavaScript syntax checks, responsive desktop/390 px layouts, and standard production build. Local source and isolated fixtures only; no deployment, production database synchronization, approval, or schema change.

## [Build 2026.09.11.6000] - 2026-09-11 — complete page Excel exchange and quiet save status

- Consolidated every existing master-data exchange surface to one Excel import button and one full-page Excel export button. Removed the duplicate current-BOM export and template-download controls.
- Added versioned complete-page workbooks for AB/C products and categories, line/stage administration, and BOM. Round trips preserve empty categories, lines, stages, BOM rows, and unknown extension fields; system exports replace the full draft page scope while legacy files remain partial-update compatible.
- Retained the existing complete process-master Excel v3 exchange, which already includes all stages, processes, equipment, photos, and unknown fields in one location.
- Removed the persistent bottom-right sync/status notice and the master-data synchronization explainer. Short action feedback and protected controls remain, with save wording no longer exposing shared/public-database details.
- PASS: BOM, line/stage, master-page Excel round trips, legacy compatibility, master administration, syntax checks, responsive browser checks, and standard build. Local source and local development data only; no deployment, published database connection, approval, or production-data mutation.

## [Build 2026.09.11.5900] - 2026-09-11 — unified machine catalog and equipment table

- Replaced the separate Machine Assembly / Machine Setting master choices with one displayed Machine Setting process while retaining the `machine-assembly` compatibility key. The process-master page now presents one global five-process catalog; names, photos, custom additions, and deletions propagate to every stage, and the obsolete top stage selector is removed.
- Reimported the supplied consolidated `機器設定表` into the local V2 draft. Multi-number rows are expanded and repeated physical machines are deduplicated by line/stage/number, resulting in 182 machines (A 41, B 15, C 126). Existing source-imported records were replaced, manual records are preserved, and no draft was submitted or approved.
- Replaced expanded equipment forms with a line/stage-grouped summary table, thumbnails, search/filter controls, and a modal add/edit experience with compressed multi-photo replacement. Removed quantity and manually entered process fields; approved process usage is derived dynamically from approved process-version snapshots.
- Updated complete-page Excel exchange to v3, including machine type and informational approved usage while removing obsolete quantity/manual-process columns. v1/v2 imports remain supported and legacy machine kinds migrate into the unified machine catalog.
- PASS: unified catalog, source import/deduplication, grouped table, popup photo editing, approved usage, Excel v3 photo round-trip, exact stage filtering, 390 px responsive layout, process-master API, master administration, and process consistency. Local only; no deployment and no approved production data change.

## [Build 2026.09.10.5800] - 2026-09-10 — stage equipment and complete Excel exchange

- Added draft-controlled equipment CRUD under Machine Assembly / Machine Setting, thumbnails, physical-number selection by line/stage, and nonexclusive cross-operation usage labels. Historical machine selections are retained.
- Extracted 190 records and all corresponding photos from the four requested workbook sheets; source images are compressed into 196 WebP assets. The original workbook is unchanged. Imported the 165 assembly and 25 setting records into the local user's PROCESS V2 draft, without submitting or approving it.
- Extended complete-page Excel to v2 with equipment rows and deduplicated embedded photo content; retained v1 reading and existing approval/delete permissions. Review differences now detect equipment edits and same-count photo changes. No new database table/key and no deployment.
- Isolated tests passed for source mapping, equipment CRUD, photo upload, complete Excel round-trip, draft/approval isolation, reusable equipment choices, server validation, mobile 390 px and Vietnamese rendering. Standard production build passed; Sites' Windows build wrapper remains unavailable.

## [Build 2026.09.10.5700] - 2026-09-10 — process-master Excel and approval control

- Changed the Process Data page from direct editing to the same governed lifecycle used by AB/C master data: create/save a draft, submit to the approval platform, withdraw when authorized, review differences and history, and apply to the process editor only after supervisor approval. The existing master-data permissions continue to control view, import/export, delete, withdraw, and approval actions.
- Replaced the complete-page JSON exchange with a versioned XLSX workbook containing format metadata, all stage/template rows, and all photo rows. Embedded photo data is split into numbered chunks below Excel cell limits and reconstructed during draft-only import; unsupported formats, malformed templates, duplicate IDs, and incomplete photo chunks are rejected.
- Added server validation for `PROCESS` master snapshots and protected approval/deletion transitions. Isolated browser coverage verified draft isolation, custom process/photo creation, Excel round-trip, approval activation, editor photo inheritance, version history, Vietnamese labels, and 390 px no-overflow behavior. No D1 table/shared-state key was added, no deployment occurred, and no real shared data was written.

## [Build 2026.09.10.5600] - 2026-09-10 — complete process-master exchange

- Added user-created process templates to every stage's process-master page. A custom template has an editable name, accepts the same compressed multi-photo uploads as the six required presets, appears in the process-builder add menu, and can be deleted under the existing protected master-delete rule.
- Added permission-aware full-page JSON export/import. The versioned `PROCESS_OS_PROCESS_MASTER` format includes every stage, template, compatibility field, unknown future template field, and embedded photo. Import validates the file, rejects unsupported newer versions, restores missing required presets, and replaces the current process-template master only after confirmation.
- Isolated browser coverage created, named, photographed, saved, exported, removed, imported, persisted, and reloaded a custom template across the complete 21-stage dataset; it also verified the v1 envelope, all template/photo counts, Vietnamese labels, permission-visible controls, and 390 px no-overflow behavior. Existing `processMasterData` and D1 schema are unchanged; no deployment or real shared-data write was performed.

## [Build 2026.09.10.5500] - 2026-09-10 — photo-first process master presets

- Replaced the former per-stage process-template defaults with six fixed ordered choices: Entry, Manual, Manual Inspection, Machine Assembly, Machine Setting, and Exit. The master page no longer asks for mode, staffing, or equipment and focuses on the process photos.
- Cleaned the two supplied factory photos and created matching Manual Inspection, Machine Assembly, Machine Setting, and Exit photographs. Every preset includes its curated local image, supports additional compressed photo uploads/removal, and automatically copies its images into a newly created block; block media remains independently editable.
- Isolated browser coverage verified all stages migrate idempotently to six presets, all six images load, a template photo can be added and saved, a new Entry operation inherits the photo, Vietnamese text renders, and the 390 px page has no horizontal overflow. Existing drafts/history are retained, the `processMasterData` JSON is extended without a D1 schema change, and no deployment or real shared-data write was performed.

## [Build 2026.09.10.5400] - 2026-09-10 — exclusive BOM operation assignment

- Enforced one owning operation for each normalized product/item combination while keeping the complete root BOM visible in every applicable operation.
- Items used elsewhere now show the owning operation number/name and a transfer hint; their checkboxes remain locked until the original operation clears the item. Unassigned items remain visually blank on the right, and current-operation selections stay editable.
- Isolated browser coverage moved item `3060301` from `A-CUT-02` to `A-CUT-01`, verified persisted source/destination state, Traditional Chinese/Vietnamese labels, and a 390 px dialog with no horizontal overflow and a reachable Apply action. Existing `bomSelections` storage is unchanged; no D1 schema, deployment, or real shared data changed.

## [Build 2026.09.10.5300] - 2026-09-10 — visible BOM operation usage

- Added a right-side usage indicator to every operation-editor BOM row. Selected item codes now list all current-workspace operation numbers and names that use the same product/item combination, with a distinct current-block marker.
- Usage indicators recalculate immediately after an item is selected, remain readable in Traditional Chinese and Vietnamese, and stack below the BOM description on phone layouts.
- Isolated browser coverage verified an item already used by `A-CUT-02` is identified while editing `A-CUT-01`, then shows both operations after selection. The 390 px dialog retained no horizontal overflow and its Apply action remained reachable. No schema, persistence field, deployment, or real shared data changed.

## [Build 2026.09.10.5200] - 2026-09-10 — distributed BOM coverage diagnostics

- Confirmed and preserved the intended BOM rule: for each participating product, selections may be distributed across different operations and stages, while their normalized union must cover every root BOM code before submission. Only operations on that product's formal route contribute to completeness.
- Expanded each BOM issue detail to list the exact missing item code and item name, with a direct correction action and responsive Traditional Chinese/Vietnamese presentation.
- Isolated browser coverage distributed BOM selections across eight operations, left one named item missing, verified that an out-of-route assignment does not hide the error, then assigned the item and completed submission. The 390 px view retained no horizontal overflow. Existing `bomSelections`, D1 schema, deployment state, and real shared data are unchanged.

## [Build 2026.09.10.5100] - 2026-09-10 — complete freely selectable BOM lists

- Removed the operation-editor filter that hid root BOM codes already assigned to another operation for the same product. Every selected product now shows its complete root BOM in every operation and allows the same code to be selected in more than one operation.
- Counts now state selected items versus total root item codes, and the empty message is reserved for products that genuinely have no root BOM. Traditional Chinese and Vietnamese remain supported.
- Isolated browser coverage verified all 14 root items remain visible, a code used by another operation can be selected without removing the original assignment, and the 390 px dialog retains its action controls without horizontal overflow. Existing `bomSelections` storage and union-based validation remain unchanged; no D1 schema, deployment, or real shared data changed.

## [Build 2026.09.10.5000] - 2026-09-10 — route-wide BOM inheritance and submission repair

- Fixed the incomplete propagation path where adding a product to the category/line workspace copied `productCodes` across its formal route but left that product's `bomSelections` empty in the other operations. Each affected operation now inherits only BOM codes already assigned there and present in the new product's own root BOM.
- Editable workspaces reconcile this rule on open, so existing affected drafts can be repaired before validation without modifying locked approved/history versions. Existing selections are unioned and product-unique codes still require explicit assignment.
- BOM issue product rows now show the actual missing root-code count. Isolated browser coverage reproduced `105B100121` at 2/14 assigned (`缺 12 個料號`), reconciled it to 14/14, verified zero full-draft errors, and completed submission persistence. No D1 schema, shared-state key, deployed site, or real shared data changed.

## [Build 2026.09.10.4900] - 2026-09-10 — shared BOM item selection

- Selecting or clearing a BOM item in one product group now mirrors the state to every selected product in the same operation that exposes the same normalized item code. Different or unavailable item codes remain unchanged.
- Opening an operation also reconciles older asymmetric selections, so a code already selected in an upper product group appears selected in matching lower groups before the user edits them.
- Isolated browser coverage verified initial inheritance, check/uncheck synchronization, the real `3060504` fixture code, and the 390 px modal. Existing `bomSelections` fields and revision flow are retained; no D1 schema, deployment, or real shared data changed.

## [Build 2026.09.10.4800] - 2026-09-10 — automatic photo compression

- Common operation photos and product-specific photos now use the same upload preparation path. New raster photos are resized to a maximum 1600-pixel edge and encoded as WebP before they enter the existing operation media fields; videos, animated GIFs, and SVG files are not converted.
- Added Traditional Chinese/Vietnamese upload guidance and isolated browser coverage for both photo entry points and a 390 px mobile dialog. A 2200×1400, 10.5 MB PNG fixture became a 1600×1018, 0.99 MB WebP in both paths.
- No D1 schema, shared-state key, existing saved media, production deployment, or real backup data was changed.

## [Build 2026.09.10.4700] - 2026-09-10 — direct issue repair and product-specific media

- Added visible direct actions for collapsed validation groups. Operation/BOM issues open the relevant editor, missing-stage issues retain the temporary diagnostic node, and connection issues highlight the source/target with a non-persisted drag demonstration.
- Fixed the stale `BOM unassigned` warning after Select all. The issue list now recalculates immediately; validation deduplicates/normalizes item codes and remains compatible with legacy `bomProductCode`/`bomItems` operations.
- Added per-product supplemental media beside per-product operation steps. Product status, dispatch monitoring, and line playback show only the selected product's supplemental content/media; editor nodes show a compact entry point without embedding those photos.
- Updated responsive dialog layouts and Traditional Chinese/Vietnamese text for the new controls. No D1 table or shared-state-key change; `productMediaItems` is optional within the existing operation JSON. Local-only; no production deployment or real backup mutation.

## [Build 2026.09.10.4600] - 2026-09-10 — stable editor viewport and participating-product rules

- Editor re-renders now restore the page and each stage canvas scrollbar during add-menu, process creation, movement and connection actions. New-node visibility is handled inside its canvas without focusing the removed/recreated DOM, preventing the whole page from jumping.
- Submission route/BOM validation now starts only for products selected in at least one process node. Unselected catalog products no longer produce missing-stage errors.
- Product applicability now behaves as a category/line workspace set: a product added or removed in one node is synchronized to every existing node on that product's formal route, and later nodes inherit that set.
- Missing-stage correction opens an existing candidate node when possible; an empty stage receives a clearly marked temporary diagnostic node and the real process chooser. The diagnostic node is not persisted.
- PASS: isolated browser coverage for stable page/canvas scroll, visible creation, participating-product validation, synchronized applicability, temporary diagnostic navigation, connection layout and bilingual rules. No real D1 or backup data was changed.
- Existing `productCodes[]` remains the stored representation; the synchronization and validation ownership rules are a material data-flow change without a schema migration. Local only; no production deployment.

## [Build 2026.09.10.4500] - 2026-09-10 — visible creation and graph organization

- New process nodes now trigger the existing graph layout, scroll into the visible part of their stage canvas, receive focus, and briefly highlight so they cannot appear lost beyond the current viewport.
- Successful connection creation now lays out connected nodes from left to right according to arrow direction and recalculates routed connector paths. The destination remains visible after rendering. Ordinary position moves no longer show a success toast.
- The submission issue panel now explains each present error type and count in plain language and exposes all nine checks actually used by validation. The existing product/type grouping and fix navigation remain intact.
- PASS: isolated browser validation for visible node creation, left-to-right connection layout/arrows, silent stable movement, complete bilingual rules; Build 4200 regression, process consistency, system-upgrade guards, and language-loop checks.
- No schema or persistence-model change. Local only; no production deployment and no real D1/backup mutation.

## [Build 2026.09.10.4400] - 2026-09-10 — simplified save behavior

- Removed the exposed manual re-sync button and disabled background shared-state polling between open tabs. Normal explicit saves continue to use D1 and optimistic revision checks.
- A failed write is not retried automatically. The page shows one plain save-failure message directing the user to close other tabs and reopen the latest URL; routine saving/saved notices remain hidden.
- Updated the isolated browser and data-safety guards to require no background polling, no retry loop, and no manual re-sync control.
- Local-only build; no production deployment and no real D1/backup mutation.

## [Build 2026.09.10.4300] - 2026-09-10 — local editor and sync stabilization

- Restored the requested desktop gesture: dragging a node body onto another node creates the existing `nextIds` connection and arrow; releasing on blank canvas saves the position. Endpoint and touch-handle linking continue to use the same cycle/duplicate/self validation.
- Prevented position jumps by removing forced synchronous flush/rollback from pointer release, preserving the user's zoom mode, and rejecting overlapping drops with a clear message. Legacy layouts whose stored 178 px spacing overlaps the current 264×184 nodes are arranged before first render.
- Stopped the two/three-second failed-write retry loop. A failed write is retained locally and synchronization pauses until the user presses the bilingual manual retry button; routine saving/saved/background-poll notices remain hidden.
- Added a bilingual expandable list of the actual submission checks to the version workspace. Existing grouped issue navigation remains unchanged.
- PASS: Build 4100, Build 4200 and Build 4300 isolated browser suites; user lifecycle/roles, master administration, process consistency, version return, language-loop, system-upgrade guards, and data-safety tests. Browser network fixtures confirmed one failed write does not repeat after 3.2 seconds and a manual retry performs exactly one new write.
- No production deployment and no real D1/backup mutation. Physical phone gestures and the Windows folder picker remain unverified.

## [Build 2026.09.09.4200] - 2026-09-09 — local regression fixes

- Fixed backup tab content changing independently of active navigation. One tab-selection path now drives content, active/ARIA state and URL history, including reload/back/forward. Stale backup responses cannot overwrite another tab.
- Fixed legacy `.user-create` grid collision that squeezed the heading/form; isolated the section layout and added field-specific create errors and password clearing after success.
- Git history confirmed whole-node desktop drag and a one-successor graph rule, but no earlier standalone endpoint implementation or working new-node product inheritance was found. Restored body movement with shared pointer endpoints (icon-only on touch), confirmation for replacing a successor, and rollback on failed persistence. No alternative graph model introduced.
- New-node products were always initialized empty. They now derive scoped common selections; disjoint alternatives stay unassigned. Removed startup rewriting of saved SAMPLE graph links.
- Read-only local data inspection found three configured products in a nine-product category; the remaining six explain 30 missing-stage plus six BOM issues. These are incomplete data, not a reason to bypass validation. New-node empty initialization was a separate defect.
- Submission errors now start collapsed and group by type/product. Fix navigation focuses the correct stage/dialog; product/BOM changes refresh counts. Chinese/Vietnamese messages explain missing applicability and BOM assignments.
- PASS: production `pnpm run build`; Sites build wrapper could not resolve its Windows invocation, so the existing package build was used. PASS: user-management, system-upgrade source guards, process-consistency, version-return-policy, master-admin, data-safety, local-backup isolated fixtures, language-loop, editor-line-selection and product-inheritance checks. The editor-line test was rerun successfully with its required `public/process` argument.
- PASS: isolated browser suites for tab history/reload, responsive User fields/errors/create, bilingual state, inherited product save/reload, retained existing node content, grouped issue navigation and declining counts; mouse link/delete/reconnect/cycle, modal repeat/conflict retention, CDP touch movement/link and responsive overflow. Browser tests intercepted all APIs; no production or real backup mutations.
- Actual local browser loaded Build 4200 with the existing ADMIN session. Physical mobile/virtual keyboard and Windows folder picker remain unverified/not accepted. No production deployment.

## [Build 2026.09.09.4100] - 2026-09-09 — local corrective preview

- Replaced expanded account cards with role templates, create form, searchable list and individual dialog. Dedicated revision-checked API handles roles/users; historical deletion archives instead of erasing history. Role changes reset inheritance.
- Fixed loopback demo login/logout using backend-issued transient cookies; hosted login still requires credentials.
- Fixed desktop sidebar positioning and replaced the fixed inspector/density/click-link UI with native dialog and separate pointer drag handles. Existing outgoing links are preserved.
- Background sync no longer calls the whole-page renderer or announces routine updates. Pending forms/dialogs block poll application; local HMR is disabled for review stability.
- Corrected folder button's undefined request helper and asynchronous native picker handling. **Windows picker did not open an observable dialog and timed out: selection/cancel NOT accepted.** Manual safe path entry remains.
- PASS: production build, isolated D1 user/role/login/archive/revision tests, data-safety, local-backup fixture tests, process consistency, editor-line selection, master-admin and source guards. Browser fixture tested mouse move/link, emulated touch link, modal repeat/layout/zoom/conflict input retention and user/editor horizontal overflow at 375/390/430/768/1024/1366/1920 widths (editor subset).
- Real browser verified local ADMIN/RD/STAFF logout/reentry. Not yet fully accepted: physical touch/keyboard, all-screen bilingual audit, Windows picker, all requested gesture/connection negative cases. No production deployment or real backup restore performed.
- Earlier Build 4000 UI/picker acceptance claims were too broad; the concrete failures and coverage above supersede them.

## [Build 2026.09.09.4000] - 2026-09-09

### Added

- Added ADMIN-only full user administration with sanitized listing, role inheritance/effective-scope display, password reset, enable/disable, protected deletion, case-insensitive IDs, and last-ADMIN protection.
- Added a dedicated responsive process-editor modal, three node densities, pointer move handles, canvas panning, position undo, and click-to-connect mode with duplicate/self/cycle guards.
- Added a real local-host folder picker capability and safe backend creation/validation for manual host backup paths.

### Changed

- Demo identity cards now select real enabled accounts and always use the normal backend password verification path.
- Process nodes default to approximately 50% larger cards; long content stays compact while complete details remain in the editor modal.
- Shared browser state no longer retains the current login password; public shared-state responses continue to remove every password field.

### Fixed

- Creating a user now immediately refreshes the complete visible user list and synchronizes through the existing D1 revision flow.
- Unrelated shared-state writes no longer fail user validation when the user collection is not part of the update.
- Process-editor section headings now survive inspector re-rendering, and the modal provides explicit save/cancel access.

### Verification

- Production build and isolated user, data-safety, process-consistency, backup, localization, and editor regression tests completed successfully.
- Local browser verification covered the user list, backup controls, enlarged editor nodes, modal sections, Traditional Chinese/Vietnamese switching, and console errors.

## [Documentation setup] - 2026-09-09

### Added

- Added repository-wide development rules in `AGENTS.md`.
- Added concise current-system, data-model, and change-history context for future Codex tasks and repository-independent ChatGPT handoff.

### Changed

- Established documentation impact checks so future tasks update only affected context files.

## [Build 2026.09.08.3900] - 2026-09-08

### Changed

- Dispatch line headings use A/B/C line names; product choices show product code, complete name, and specification without a duplicate detail card.
- Shared-state polling applies new server data in the background instead of forcing a full-page reload.
- Automatic cloud and Windows host backup is disabled by default and can be enabled by ADMIN.
- A disabled host backup no longer probes or writes to the configured backup drive merely because the backup page or website is opened.

### Fixed

- Newly approved production stages now receive usable default process templates when none exist.
- Existing process editor workspaces add newly required approved route stages instead of silently omitting them.
- Background shared-state updates refresh dependent master, process, approval, and dispatch data without interrupting the active editor.
- The ADMIN backup screen remains usable when host backup is disabled and the configured drive is not currently writable.

### Verification

- Production build completed successfully.
- Process consistency, data-safety, and local backup/restore test suites passed for this build.

## Earlier history

Reliable Git history exists for earlier work, including public access timing, secure host backup/restore, ADMIN session fixes, master-data synchronization, dispatch validation, duplicate prevention, and Vietnamese backup labels. Those changes are summarized in current-state form in `AI_CONTEXT.md`; detailed reconstruction is intentionally omitted here where a build-to-commit mapping was not verified.
