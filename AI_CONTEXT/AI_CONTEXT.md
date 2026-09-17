# PROCESS OS - AI Development Context

Last verified against repository code: 2026-09-17. Current application build: `2026.09.15.7100`.

Product Status renders an isolated approved snapshot and restores the editor workspace afterward; switching pages does not replace unsaved draft nodes or photos.

## System Purpose

PROCESS OS is a bilingual Traditional Chinese/Vietnamese manufacturing process-control portal. It connects approved A/B/C production-line master data and BOM information to process authoring, version approval, product dispatch, line playback, status inspection, user permissions, and whole-site backup/restore.

## Runtime and Architecture

- Private Git collaboration uses GitHub Free. Frank and employees must use work branch/PR/CI/Frank review/Frank merge; direct or force main push, main deletion and employee merge are prohibited company rules, currently not enforced by GitHub. Versioned `.githooks/pre-push` checks both the current branch and pushed refs. `npm install` postinstall safely installs the versioned hook/guard into `.git/hooks` and sets repository-local `core.hooksPath` to `.git/hooks`, retaining protection across branch switches. `collaboration:setup` verifies/repeats setup and refuses existing custom hooks. This guard does not affect normal web PR merge or replace server-side protection. CODEOWNERS identifies Frank as final code/Canonical reviewer without mandatory approval under this plan. Employee invitations wait until Frank merges PR #1 and explicitly authorizes them.

- The formal Git working copy is the repository root. The older site source is a readonly recovery copy. Tracked files contain no workstation-specific absolute paths. Browser regressions resolve optional installed tooling through `PLAYWRIGHT_MODULE`/`CHROME_PATH`; missing dependencies fail without downloading. Host backups default to ignored `.local-backups` under the repository, with `PROCESS_BACKUP_PATH` for an explicit local override. `test:portable` verifies these defaults without performing a real backup.

- Vinext `1.0.0-beta.5`, React 19, TypeScript, Vite, and Cloudflare Workers-compatible server routes.
- `app/page.tsx` redirects `/` to the client application at `/process/index.html`.
- The primary UI is an existing JavaScript SPA under `public/process`; React currently supplies the host shell rather than the process screens.
- Hosted persistence uses Cloudflare D1/SQLite through the logical binding `DB` and private R2 snapshot storage through `STATE_ARCHIVE`.
- Canonical images: 205 real metadata-stripped WebP images (~7.92 MiB) are versioned under data/canonical/assets/web. Startup imports verified immutable objects into Local STATE_ARCHIVE; data:export packages approved image changes and tombstones, data:sync applies them with existing conflict/backup safeguards. /api/canonical-assets is loopback-only and requires PROCESS_LOCAL_IMAGES=true from the Local Vite config. Original asset IDs and business associations are preserved; originals/videos/blobs remain private.
- Canonical collaboration uses domain files under `data/canonical/`, stable IDs/hashes, Local export and conflict-aware three-way sync with verified backups/rollback. Task commands guide local branches and review without automatic network/Git upload. Quality records are CLI collaboration data; no new quality UI has been added. See `LOCAL_DATA_COLLABORATION.md`.
- `npm run dev` first verifies Local-only mode and the existing Drizzle migrations, then bootstraps only an empty Local schema from Canonical with passwordless demo users. Installed Miniflare uses its supported built-in Request.cf fixture, telemetry is disabled and Node outbound guard allows only loopback. It rejects remote/Production overrides and refuses incomplete existing schemas, missing demo setup or ID conflicts without overwriting existing business data. Vite and the initializer share `.wrangler/state`; remote bindings are disabled. Windows host backup support remains separate.
- `.openai/hosting.json` binds the existing Sites project and D1 database. A saved source version is not necessarily the currently deployed public version.

## Main Modules / Pages

### Process equipment catalog

- `public/process/process-equipment.js` adds one grouped Equipment Master below the unified Machine Setting card. It groups equipment by line and stage, provides search/filtering and thumbnail rows, and opens add/edit/photo controls in a dialog. The existing PROCESS save/submit/approve/history permissions apply; only approved equipment is offered to the editor.
- The supplied 2026-09-10 workbook was read without modification: LINE A, LINE B + LINE C + C-TIEN produce 165 assembly records; C-PREP produces 25 setting records. Multi-number cells become separate machine choices with shared source photos. A-ASSY 1 maps to A-ASSY; C-TIỆN maps to C-TIEN. Eight unlabeled fixtures retain blank numbers and their source names/photos. The unrequested multi-stage sheet is not imported. The source-load action appends by stable ID without overwriting existing records, into the current draft only.
- Equipment choices are filtered by the operation's line, stage and preset kind. Thumbnails and physical machine numbers identify each choice; the selector simultaneously marks the current block and lists every other operation using the same machine. Reuse is allowed, unlike exclusive BOM assignments. Legacy selections remain visible/removable; saved `machineDetails` preserve their historical display.
- Equipment photo thumbnails open a common image viewer. The operation selector uses a dense responsive grid, labels a saved or draft selection as the current block, and lists only the other operation numbers that reuse the same machine. Approved-usage summaries in the catalog likewise show concise operation numbers.
- Process-master Excel v3 exchanges the entire selected version, with six sheets: format, templates, template photos, equipment, equipment photos, and deduplicated photo content. The single import control remains visible when no draft exists and creates a draft before opening the workbook picker; import still never approves data. Equipment export omits the retired quantity/manual-process fields and includes currently approved process usage. Local image bytes are included, not only URLs. Import verifies photo chunks and restores local assets only when bytes match; v1/v2 remain readable.

The left navigation exposes seven views, subject to role permissions:

1. **總覽 / Dashboard** - overall counts, current A/B/C dispatch state, line load indicators, and shortcuts.
2. **產線播放台 / Line player** - displays the approved process for products dispatched to the selected line and stage.
3. **發送介面 / Dispatch** - up to three products per line; category-first product selection; readiness validation before publishing.
4. **產品製程狀態 / Product status** - approved route, process nodes, BOM, equipment, instructions, IPQC content, and media for a selected product.
5. **版本確認平台 / Approval** - master-data and process-version review, validation, comparison, history, approval, rejection, withdrawal, and revision flows.
6. **製程編輯台 / Process builder** - category/line/stage workspaces containing connected process nodes and an inspector.
7. **資料後台 / Master data** - AB/C product catalogs, BOM, line/stage management, process templates, users/roles, and ADMIN backup/restore.

Important implementation areas:

- `public/process/app.js`: SPA state, routing, editor canvas, dashboard, player, dispatch, status, login, and base master-data UI.
- `public/process/master-data.js` and `master-admin-ui.js`: approved master catalog, draft/review lifecycle, line/category/product/stage synchronization.
- `public/process/version-workflow.js`: process versions, validation, approval actions, production rendering, and dispatch readiness.
- `public/process/permission-controls.js` and `system-upgrade.js`: role templates, complete user administration, page/line/action scope, responsive editor controls, modal editing, pointer movement, and connection mode.
- `public/process/shared-state.js`: in-memory shared-state mirror, explicit browser-to-D1/R2 writes, revision conflict handling, and local recovery state. Automatic cross-tab polling/retry is disabled.
- `public/process/bom-search-engine.js`, `bom-search.js`, and `bom-excel.js`: BOM lookup, tree selection, and Excel exchange.
- `public/process/master-page-excel.js` and `line-stage-excel.js`: complete-page, versioned Excel exchange for product/category and line/stage master pages, with legacy partial-import compatibility.
- `public/process/data-safety-ui.js`, `app/api/backups/route.ts`, and `lib/local-backup.mjs`: cloud snapshots and host ZIP backup/restore.

### Process presentation

- Process-builder cards use a 360 x 270 base size and remain readable at the 50% minimum zoom. Strong borders, tinted headers, and type badges distinguish Entry, Manual, Inspection, Machine, Exit, and custom processes. The template thumbnail is the compact left-side process cue; machine, work, and product photos appear as labelled classified previews on the right. One or two categories use stable full-height slots, while a third category uses the compact second row; adding more photos to a category changes only its total-count badge and never repositions or overflows its preview. Each classification shows its first photo and a total-count badge such as `+2` or `+3`; opening it provides previous/next navigation through every photo in that classification. Duplicate operation/type labels are suppressed, while product-specific content remains available from a separate bottom action. Each card shows assigned/root BOM counts.
- The inspector uses wide step text areas without the former empty column. Product-specific media is added from the media header, and applying an operation closes the dialog immediately while background persistence finishes.
- Product Status, Dispatch monitoring, and Line Player render the same selected-product presentation from its approved process version. All three use auto-arranged connected graphs with distinct curved routes, flow counts, 50% minimum auto-fit, zoom controls and left-button blank-canvas panning. Their compact production headers show only the operation number, non-duplicate name, equipment/media counts, and process-type badge; process-template photos are intentionally omitted. Node content is ordered BOM, machine photos, common guidance with its media, then product-specific guidance with its media. Media areas without photos are omitted, so normal short nodes fit without an inner scrollbar; exceptional long content retains contained scrolling. Short nodes shrink to their content, long strings wrap inside the card, and guidance media has a larger viewing area; machine names display only the active Chinese or Vietnamese value.
- Product chips show assigned/root BOM counts and open a focused BOM dialog. This presentation is derived at render time from existing operation, product, equipment, and media fields. Build 6200 adds no database table, shared-state key, or schema migration.

## User Roles

- **ADMIN**: full platform access; manages users, roles, permissions, master data, process templates, and both backup modes. Backend always treats user ID `admin` as the `admin` role.
- **RD 主管 (`rd`)**: configurable access centered on review/approval, version comparison, status visibility, editor viewing, and selected master-data operations.
- **製程人員 (`staff`)**: configurable line-scoped editing, submission, withdrawal, comparison, and status access.
- **產線設備 (`device`)**: enters a selected line/stage directly and sees only the player.
- **公開查看者 (`viewer`)**: read-only access while the configured public window is open; no protected writes or ADMIN management.
- ADMIN can create custom role templates. Each role has separate `views`, `lines`, and `permissions`; disabling a view also disables that view's action permissions.

## Important User Flows

### Authentication and session

- The platform login posts an ID/password to `/api/platform-login`; the server verifies against the current `platformUsers` stored in shared state.
- Protected writes use signed demo cookies or the existing formal identity headers and are rechecked server-side. Public data removes password fields.
- A remembered browser user is accepted on hosted pages only when the server also confirms the signed session. An expired or absent session returns to the login/public-viewer path instead of opening an editor that later receives HTTP 403 on save.
- Sites authenticated-user headers can identify the configured site owner; `manage=1` grants preview ADMIN behavior only on `localhost` or `127.0.0.1`.
- ADMIN/RD/STAFF quick login uses fixed passwordless demo identities. A single backend `demoEnabled` function reads `DEMO_LOGIN_ENABLED`: unset/true allows, false rejects login and all existing demo Sessions. Frontend visibility cannot override enforcement. 測試階段快捷入口預設開放；正式營運前必須由Frank明確確認關閉。

### Master-data lifecycle

1. ADMIN or an authorized role creates an AB or C master-data draft from the currently approved catalog.
2. The draft may edit products, categories, lines, ordered routes, and stages, or import/export Excel data.
   The AB/C product page exports one complete workbook containing products, empty categories, lines, stages, extra fields, and read-only version history. The line/stage page has its own single complete Excel pair for the selected AB/C scope. Reimporting a system-exported workbook replaces that draft page scope; legacy workbooks continue to merge only their included rows.
3. Submission validates identifiers, names, and routes. Deletions are recorded as warnings and require deletion permission.
4. A permitted reviewer approves the exact snapshot. Only approval replaces `masterDataControl.active`.
5. Approved master data updates the product catalog, routing, editor workspaces, stage templates, BOM slots, status, dispatch, and player inputs.

### Process-version lifecycle

1. An editor selects a category and line, then creates or modifies nodes for only the stages used by products in that category/line.
2. Saving creates or updates a `draft`; submission changes it to `pending` only after validation.
3. Reviewers compare versions and may approve, reject with a reason, request a revision, revoke approval when a safe fallback exists, or let the author withdraw a pending version.
4. Approval supersedes the previous approved version. Dispatch and production screens consume the current approved version.

### Dispatch and playback

- Each A/B/C line accepts at most three unique products. Every slot selects a product category first, then a product from that line/category.
- Dispatch validation uses the latest approved master route and BOM. A route stage is required only when that product actually includes it; every required stage needs a complete process applying to the product.
- Products already selected in another slot on the same line are removed from the remaining choices.
- Line playback and dispatch monitoring show only the stages relevant to currently dispatched products. For a selected stage not belonging to a product, the UI explicitly marks that stage as not applicable.

## Process Builder

- A **process group** is the editor workspace for one product category and production line (`category:line`).
- Stage groups are derived from approved product routes; a newly approved stage is added to matching workspaces and receives default process templates when no template exists.
- A **process node/operation** contains a stable ID, stage code, display number, template reference, name, product assignments, BOM selections, human/machine mode, people count, machine IDs, outgoing node IDs, canvas coordinates, media, common instructions, product-specific instructions, and IPQC text.
- Nodes are positioned on a canvas, can be auto-arranged, and connect through `nextIds`; cycle creation is rejected.
- The number picker offers at most four unused process numbers. Existing numbers are not offered again.
- Nodes use one 360×270 layout with a small template cue, large work/machine photo areas, and a separate product-media action; density controls and the fixed inspector are removed. Canvas zoom reaches 50%. Editing uses a native wide dialog, near full screen on phones. Cancel restores the operation snapshot; revision conflicts retain input.
- Desktop uses the established one-button gesture: drag a node body onto another node to connect it, or release on blank canvas to keep the new position. Circular endpoints also drag to connect; touch uses icon-only move/link handles. Shared Pointer Events provide arrow preview/highlighting and reject self/duplicate/cycle targets. The existing one-successor rule is retained: replacing an outgoing link requires confirmation. Creating a connection immediately applies the graph layout so connected nodes follow arrows from left to right and route lines through reserved gaps. Ordinary position moves are silent. Overlapping drops are rejected; legacy coordinates with overlaps or insufficient connector clearance are repaired in memory when rendered. Submitted, approved, and historical versions are normalized on first display so review cannot reintroduce touching blocks or merged routes. Blank canvas pans. Mouse movement/body-drop linking, endpoint linking and CDP-emulated touch were tested; physical phones remain unverified.
- A category/line workspace has one participating-product set derived from products selected on any node. Adding or removing a product in one operation synchronizes that choice to every existing operation on the product's formal route; new nodes inherit the same route-filtered set. For each affected operation, a newly participating product also inherits already assigned BOM item codes when its own root BOM contains the same normalized codes. Existing and product-unique selections are preserved, and BOM selections are removed only when a product leaves the workspace set. After creation the stage is arranged and the new node is brought into the visible canvas without moving the page scrollbar.
- Process master data for every valid stage retains an ordered set of five photo-first choices: Entry, Manual, Manual Inspection, Machine Setting, and Exit, and may also contain user-created custom templates. The former Machine Assembly key is retained internally as the unified machine template for compatibility; the separate legacy Machine Setting template is retired and its equipment is migrated into the unified template. The master-data page presents one global catalog without a stage selector and applies name/photo/custom-flow changes to every stage. Template media is rendered from the selected template in a dedicated area and is not copied into operation-instruction media. Existing legacy copies are recognized and hidden from the work-media area without rewriting saved history.
- Process-master changes now use the same controlled lifecycle as AB/C master data: create a draft, save, submit to the approval platform, optionally withdraw, and apply only after a user with approval permission confirms it. Approved, superseded, pending, and draft versions remain selectable for read-only history; the process editor reads only `active.PROCESS` projected to `processMasterData`.
- Full-page Excel v3 includes all template/equipment fields and portable photos as described under Process equipment catalog. Import is permission-controlled, draft-only, validates associations and photo content, restores required presets, and still requires approval before the editor changes.
- Submission issues start collapsed, grouped by type and product. Only participating products are checked across their required route stages; unselected catalog products do not create missing-stage or BOM errors. Every product group exposes a direct correction action even while its details remain collapsed. Content and BOM actions open the exact operation editor; missing-stage actions show a temporary non-persisted node, while connection actions highlight source/target nodes and draw a non-persisted example drag line. BOM validation normalizes unique item codes, accepts legacy single-product fields, and unions selections only from operations on the product's formal route. For C-line semi-finished products without their own root BOM (for example `3100101`), the direct child requirements from their occurrence in a parent BOM are treated as the selectable root requirements. A root item may be assigned in any applicable stage/block and only needs to appear once in that union; missing-item details list the exact code and name. Selecting all BOM immediately recalculates the visible issue list. Each selected product group in every operation always lists its complete root BOM. The same product/item combination can be assigned to only one operation: rows assigned elsewhere stay visible, identify the owning operation, and are locked until the editor first clears the item in that original operation. The current operation's assignment remains editable and is marked as the current block. Within one operation, selecting or clearing an available BOM item mirrors that state only to enabled rows of other selected products that expose the same normalized item code; different, unavailable, or externally assigned rows remain untouched. Legacy duplicate assignments are not deleted automatically and remain removable from their owning operations. BOM issue product rows show the real number of missing root item codes rather than the number of error records. Full renders preserve page and canvas scrollbar positions during add-menu, creation, connection and movement actions.
- Master-data tab state is shared by content/active styling and URL history. User creation has a standalone heading, responsive fields and inline API errors; successful creation clears its password and updates the list.
- Approved, superseded, and rejected versions are read-only in the editor; RD review access is also locked against editing.

## SOP / Work Instruction

- Implemented instructions are stored inside process operations, not as a separate SOP database table.
- Each operation supports ordered common instruction steps with a required operation description and completion standard.
- Product-specific supplemental steps and `productMediaItems` can be stored separately for each assigned product.
- Common work media remains operation-level. Process-template media is a separate read-only source area in the editor and a compact type cue in builder cards, but is omitted from production-card headers. Product-specific media appears only for that product in product status, dispatch monitoring, and line playback; editor nodes show a compact product-supplement entry point instead of embedding those photos.
- New photos from operation or process-template media entry points are resized to a maximum 1600-pixel edge and encoded as WebP before entering the existing media arrays. Videos, animated GIFs, SVG files, static preset assets, and existing saved media remain unchanged.
- Legacy free-text instruction fields remain compatible, while the current UI edits structured steps.

## QC

- QC is implemented as operation-level standards/IPQC content, approval validation, and status/player presentation.
- Submission and approval checks require applicable processes to have complete steps/standards and the required BOM/connection data.
- There is no standalone QC entity, dedicated QC page, inspection-result transaction table, or statistical quality module in the current repository.

## Mobile Behavior

- The sidebar becomes an off-canvas menu below 720 px; major grids collapse to one column and dialogs constrain themselves to viewport height/width.
- The process inspector is a wide modal on desktop and near full screen on phones. User rows become readable cards, editor actions remain reachable, and status/dispatch layouts stack.
- Wide tables and process canvases use contained scrolling rather than forcing the entire page wider.
- Traditional Chinese and Vietnamese have dedicated responsive adjustments.
- The application language selector supports Traditional Chinese and Vietnamese only; English application mode is not implemented. Draft-save, legacy-recovery and load-error notices have complete Vietnamese translations.
- Known limitation: the graph canvas is still materially easier to use on a tablet or desktop. Every editor change still requires a mobile overflow and action-access check.

## Authentication / Permissions

- Backend write authorization is enforced in `app/api/shared-state/route.ts`; frontend hiding alone is not the security boundary.
- `/api/users` provides ADMIN-only create, update, password reset, enable/disable, and deletion. IDs are normalized case-insensitively; historical users are archived with deletedAt/deletedBy and disabled; unreferenced users are removed. Self-deletion and final enabled ADMIN removal/demotion are blocked. Roles and users are written only through this API, not bulk shared-state updates.
- Permission families include approval actions, status visibility/media, master delete/import/export, and view access.
- The shared-state API allows only an explicit key allowlist and uses optimistic `revision` checks. Same-origin checks protect writes.
- Shared business JSON and new uploaded photos are held in memory and sent to the protected revision-checked API; large snapshots use private R2 with D1 references. Device preferences remain in `localStorage`. Existing browser process drafts are retained on load: a valid draft missing from the backend is staged after authentication, while a conflicting draft can be explicitly recovered from the editor. A legacy cache is cleared only after the returned complete stage content matches it and no later update is queued; changed or invalid old caches remain preserved. Save waits for all queued writes, including changes made during a write, and cannot report success before the server accepts them. A temporary failure retains the in-page data and best-effort session recovery, pauses background writes, and can be retried by pressing Save; 401/403/409 remain blocked for login/conflict handling. There is no polling or automatic failure retry.
- Reopening a draft keeps a saved workspace at least as recent as its draft-version snapshot, including operation Apply and coordinate changes; approved/pending versions retain their existing locks. Initial shared-data failure refuses writes and displays a reloadable error state. Rendering errors also display an error state instead of an empty content area. Raster files that cannot be decoded are rejected rather than retained as broken photos; valid images can still fall back to their original bytes if compression fails.
- Legacy BORUAXE demo-photo defaults reuse matching media from approved versions of the same route before falling back to legacy static paths; existing operation photos are preserved. Image acceptance must verify decoded pixels and actual response content, because a successfully loaded placeholder is not proof that the image exists. The separately merged canonical-image baseline is required for Fresh Clone real-image availability.
- Master active-data changes require approval permission. Deleting master records or process templates requires `master.delete` and is blocked while review cases are pending.
- Backup APIs and host backup controls are ADMIN-only. Restore/delete operations require secondary confirmation; host restore also re-verifies the ADMIN password.
- Documentation must never include real passwords or backup encryption keys.

## Backup / Restore

- **Cloud snapshot**: D1 `state_backups` stores whole shared-state snapshots, capped at the latest 100. On a local ADMIN screen, the Backup & Restore page has explicit Host ZIP and Cloud Snapshot mode tabs, so cloud schedule time, immediate backup, restore, and deletion remain accessible without deploying first. The selected mode is session-local UI state only.
- **Host ZIP**: default path `.local-backups` on Windows, configurable by ADMIN UI or `PROCESS_BACKUP_PATH`. The asynchronous native picker reports errors/cancellation, but Windows execution timed out without an observable dialog in this run; actual selection/cancel remains unverified. Validated manual server-path entry remains available. The backend creates safe missing directories, checks write access/free space, and rejects roots, sensitive system paths, and traversal. Archives retain the manifest and AES-256-GCM encrypted payload safeguards.
- Automatic backup is disabled by default. When enabled, the schedule is Saturday 12:00 in `Asia/Ho_Chi_Minh`, with persistent weekly de-duplication and missed-run catch-up whenever an allowed site state read occurs; the backup screen does not need to remain open.
- Restore validates archive structure, hashes, version compatibility, path safety, and unpacked-size limits; it creates a safety backup and uses maintenance mode/rollback protections.
- Windows task/startup registration is an external host setup step, not guaranteed merely by deploying the Site.

## Current Important Limitations

- Most business records are stored as serialized JSON inside one `shared_state` row rather than normalized tables. Large writes replace the whole logical state and depend on revision conflict handling.
- Platform passwords are currently represented in the protected shared-state JSON for verification; the public response strips them, but the repository does not implement password hashing or a dedicated session/token table.
- Product/BOM/routing seed datasets are large browser-loaded JavaScript assets. Approved master data and overrides update the runtime catalog, but there is no normalized server-side product/BOM schema.
- `STATE_ARCHIVE` R2 stores immutable SHA-256-checked JSON snapshots above 512 KiB; D1 keeps their reference, revision and local-backup account metadata. Small and legacy inline records remain readable. Media remains in the same business JSON or static assets, but shared business data no longer consumes `localStorage`; new uploads are still bounded by client-side processing and Worker request/runtime limits. R2 objects are private and retained for recovery, not automatically garbage-collected.
- Demo identities are `demo-admin`, `demo-rd`, `demo-staff`, with `authMode: "demo"`. HMAC-signed HttpOnly/SameSite cookies have `sessionType: "demo"` and an eight-hour expiry; hosted HTTPS uses Secure. Every protected request checks the current flag and live account status. Local signing keys are randomly generated under ignored `.wrangler/local-only`; formal authentication is unchanged.
- `/api/release-state` is a maintenance-only snapshot export/import endpoint, guarded by a separate temporary secret (or local management URL), never by public demo ADMIN. Replacement requires an exact revision and confirmation, preserves the old state, then creates the new-state backup transactionally. Remove the hosted maintenance secret after release. The local recovery page preserves browser work before source-of-truth replacement.
- Several older Markdown files describe earlier builds and can become stale; this file and verified code take precedence for current state.

## Implemented vs Planned

Implemented now:

- A/B/C master catalog and route approval, BOM search/import/export, process graph editing, structured instructions, process version review, dispatch readiness checks, line playback/status, configurable roles, bilingual UI, shared D1 synchronization, cloud snapshots, and secure local ZIP backup/restore.

Not implemented in the current repository:

- A normalized relational product/process/SOP/QC schema, hashed-password identity service, per-token revocation, a standalone QC workflow, or guaranteed Windows service installation on every host.

Do not describe a planned capability as implemented until verified in current code and tests.
