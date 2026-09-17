# PROCESS OS - Current Data Model

Last verified: 2026-09-17. This document describes only the current repository implementation.

## Persistence Overview

### Hosted D1 / SQLite

`db/schema.ts` and the Drizzle migrations define two tables:

#### `shared_state`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | integer PK | Singleton row; current code uses `1`. |
| `revision` | integer | Optimistic-concurrency version for the whole logical state. |
| `values` | text/JSON | Map of allowed shared-state keys to serialized JSON strings. |
| `updated_at` | text | ISO timestamp of the latest accepted write. |

#### `state_backups`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | text PK | UUID, hourly key, or scheduled-backup key. |
| `revision` | integer | Source shared-state revision. |
| `values` | text/JSON | Complete `shared_state.values` snapshot. |
| `reason` | text | Backup trigger/reason. |
| `actor` | text | Platform user ID or `system`. |
| `created_at` | text | ISO creation timestamp. |

The database does **not** currently have normalized tables for products, BOM rows, process nodes, users, roles, SOPs, QC results, dispatch records, or media.

### Browser and sync layer

The SPA retains its legacy `localStorage` call sites, but `public/process/shared-state.js` intercepts every allowed shared key into an in-memory mirror, batches changes, and sends them to `/api/shared-state`. Server reads populate that mirror from D1/R2 before the application scripts run. New business writes and embedded media never enter native `localStorage`; it stores device-local preferences and preserved preexisting process-draft recovery copies. D1/R2 remains the durable shared source.

All writes include a base revision. HTTP 401/403/409 blocks writes for login/conflict handling and preserves unsynced updates in memory, with a best-effort `sessionStorage` copy under `process-unsynced-recovery` when it fits. A network/temporary failure pauses automatic writes; an explicit Save retries it once. Concurrent Saves share the same pending operation and drain later dirty updates before reporting success. There is no polling or automatic failure retry. Failed initial loading refuses writes until data is reloaded.

An old native `processEditor:<category>:<line>` cache is validated against its envelope and stage-array shape and is never deleted merely by loading. When its server key is absent, the valid cached workspace remains readable and is staged for an authenticated editor. A differing server snapshot remains authoritative until explicit legacy recovery and Save. Clearing the cache requires a successful API echo of the current write, identical complete stage content to the old cache, an unchanged native copy, and no later queued update. Modified or invalid caches are retained. Reopening a draft uses its saved workspace when `savedAt` is at least its version's `updatedAt`/`createdAt`; protected version snapshots keep their existing authority. This uses the existing workspace/version JSON and adds no shared-state key, table, entity, SQL schema change or migration.

## Allowed Shared-State Keys

- `platformUsers`
- `processCustomRoles`
- `processRoleTemplateOverrides`
- `approvalVersions`
- `dispatchBoard`
- `publishedProcess`
- `processMasterData`
- `masterDataControl`
- `bomOverrides`
- `versionSampleSeed4`
- `backupSettings`
- any key beginning with `processEditor:`

The server rejects other shared keys and rejects values that are not valid JSON strings (or explicit deletion).

## Core Entities

### Platform User

Stored in `platformUsers`.

- `id`: login identifier and stable user key.
- `name`: display name.
- `authMode: "demo"`: marks the three fixed test identities (`demo-admin`, `demo-rd`, `demo-staff`); these users contain neither `password` nor `passwordHash`. Names are Demo Admin / Demo RD / Demo Staff.
- `password`: legacy formal-account verification value; absent from demo users and seed, stripped from public responses. Formal hashing is outside this change.
- `role`: `admin`, `rd`, `staff`, or a custom role ID. User ID `admin` is forced to role `admin`.
- `enabled`: whether login and authenticated operations are allowed.
- `inheritRole`: when true, the role template supplies the user's scope; when false, individual scope fields are used.
- `lines[]`: allowed production-line codes.
- `views[]`: allowed page IDs.
- `permissions[]`: allowed action keys.

User IDs are canonicalized to lowercase for storage and compared case-insensitively. The ADMIN-only `/api/users` route applies optimistic shared-state revision updates, preserves password values when ordinary edits omit them, and returns only sanitized users. Historical or audited users are archived with deletedAt and deletedBy, hidden from the active list and blocked from login; records retain their identity. Unreferenced users can be removed. Current-user deletion and final enabled ADMIN removal/demotion are prohibited.

### Role Template

Built-in defaults live in code; custom roles are stored in `processCustomRoles`, and built-in role changes are stored in `processRoleTemplateOverrides`.

- `id`, `name` for custom roles.
- `lines[]`, `views[]`, `permissions[]` define shared scope.
- Users relate to a template by `user.role`. Role changes reset inheritRole=true and replace old individual scopes; custom mode uses only the user's arrays. Role edits affect followers dynamically. ADMIN is fixed. Role/user writes use /api/users with the existing shared-state revision. Demo Sessions are versioned HMAC-signed HttpOnly cookies containing a fixed identity ID, `sessionType: "demo"`, nonce and eight-hour expiry, never passwords. Every protected use validates `DEMO_LOGIN_ENABLED`, demo mode, fixed role and live account status. Local signing secrets are random and persisted outside Git.

### Master Data Control

Stored in `masterDataControl`.

- `active.AB` and `active.C`: currently approved catalog snapshots.
- `versions[]`: historical/draft/pending master snapshots.

Each master version contains:

- `id`, `scope` (`AB` or `C`), `number`, `status`.
- `snapshot`: catalog content.
- `creatorId`, `creatorName`, `createdAt`, `updatedAt`.
- optional `parentVersionId`, reviewer fields, warnings, and history entries.

Only approval copies a version snapshot into `active[scope]`. Typical statuses are `draft`, `pending`, `approved`, and `superseded`.

### Catalog Snapshot

- `name`.
- `products[]`.
- `lines[]`.
- optional `categoryGroups[]`, allowing an empty category to exist independently of products.

Product fields used by current code include:

- `code`: unique SKU/product identifier across scopes.
- `name`, `category`, `specification`, `unit`.
- `line`: A/B/C line code.
- `stages[]`: ordered route stage codes.

Line fields:

- `code`, `name`.
- `stages[]`.

Stage fields include `code`, `name`, and optional operator/machine metadata used by the UI. Product `stages[]` entries must refer to stages belonging to the selected line.

### Process Template Master

Stored in `processMasterData` as a map:

```text
stageCode -> ProcessTemplate[]
```

A template contains `id`, optional `presetKey`/`presetVersion`, optional shared `catalogKey`, `name`, compatibility fields `mode`, `people`, and `machineIds[]`, plus `media`, `mediaName`, `mediaType`, and `mediaItems[]`. Every valid stage retains the same ordered five required presets: Entry, Manual, Manual Inspection, Machine Setting (internal compatibility key `machine-assembly`), and Exit; user-created templates without a preset key may follow them. The master-data UI presents one global catalog instead of a stage selector: standard/custom names, photos, additions, and deletions propagate to every stage through the shared preset or catalog key. Static curated images provide the initial preset media. Additional uploads are stored in the existing template JSON after client-side photo compression. Selecting a template copies its media items into the operation, after which operation media is independent. The preset version keeps required-template migration idempotent, migrates legacy Machine Setting equipment into the unified machine preset, and does not rewrite approved history.

The authoritative process-template version set now lives in the existing `masterDataControl` JSON alongside AB/C versions. `active.PROCESS` is the approved stage-to-template map; version records with `scope: PROCESS` contain the usual `id`, `number`, `status`, `snapshot`, creator/reviewer timestamps, warnings, and history. Draft and pending snapshots never alter the editor. On approval, `active.PROCESS` is updated and projected to the existing `processMasterData` shared-state key for backward-compatible editor reads. The API validates required presets, template identity, duplicate IDs, media-array shape, approval authority, and deletion rules.

The process-master page exchanges its complete selected snapshot using `PROCESS_OS_PROCESS_MASTER_EXCEL` format version `3` (v1/v2 imports remain supported). Sheets are `格式說明`, `流程資料`, `照片資料`, `設備資料`, `設備照片`, and `照片內容`. Template and equipment fields are editable rows with unknown fields retained in `其他資料JSON`. Version 3 removes the obsolete equipment quantity and manually entered process columns, adds machine type and an informational approved-usage column, and maps legacy machine assembly/setting rows into the unified machine preset. Photo metadata references a deduplicated content ID; image bytes are split into ordered chunks of at most 28,000 characters. Import rejects missing/duplicate chunks, unsupported versions, invalid associations and duplicate equipment IDs. A bundled asset URL is reused only after byte comparison with embedded content, otherwise the embedded image is retained. Import replaces only the current draft after confirmation, never the approved catalog.

The unified Machine Setting template may contain `equipment[]`. A record has a stable `id`, physical `number` (blank if unknown), `line`, `stageCode`, compatibility `kind` (`machine-assembly`), `name`, `nameVi`, optional `machineType`, `purpose`, `purposeVi`, `note`, `mediaItems[]`, and optional `source` metadata (sheet, row, photo code, original stage/number and source cells). Quantity and manually maintained process are not stored. The displayed process usage is derived dynamically from approved `approvalVersions` snapshots, so an approved block rename or reassignment is reflected without editing equipment. Source records use deterministic IDs and line/stage/number deduplication so repeat imports replace the source catalog without duplicating physical machines while preserving manually created records. API validation enforces ID uniqueness, stage/line/preset association and array shape; removing equipment uses the existing master-delete permission. `operation.machineIds[]` may contain these stable IDs or legacy machine IDs; `machineDetails[]` stores selected equipment snapshots. The same physical machine may be selected by multiple operations. No new D1 table or shared-state key is added.

### Process Editor Workspace

Stored under `processEditor:<category>:<line>`.

- `category`, `line`, `savedAt`.
- `stages`: map of `stageCode -> ProcessOperation[]`.

The corresponding in-memory workspace key is `<category>:<line>`. Only stages required by approved routes in that category/line are added.

### Process Operation / Node

Important current fields:

- Identity and placement: `id`, `stageCode`, `number`, `templateId`, `name`, `x`, `y`.
- Graph relation: `nextIds[]` references other operation IDs in the same stage graph.
- Applicability: `productCodes[]` references catalog product codes. Their union is the participating-product set for the current `category:line` workspace.
- Selecting or removing a product in one node applies that workspace choice to every existing node whose stage belongs to the product's approved route. New nodes inherit the same union filtered by target stage. Products not selected on any node are excluded from submission-level route and BOM checks. This uses existing fields only; temporary validation placeholders are UI state and are never persisted. Saved sample versions are not normalized/relinked on startup.
- BOM: `bomProductCode`, `bomItems[]`, and/or `bomSelections` keyed by product. Every operation editor displays the complete root BOM for each selected product. Authoring enforces one owning operation per normalized product/item combination: an item assigned elsewhere remains visible with its owning operation number/name, but its checkbox is disabled until the original operation clears it. The owning operation remains editable so the assignment can be removed before selecting it in another block. Validation still uses the union of that product's assignments across operations whose stages belong to its formal route; one occurrence satisfies completeness, while assignments outside the formal route do not. Inside one operation, an available selected item code is mirrored across enabled `bomSelections` rows of selected products that contain the same normalized code; products without that code, different item codes, and rows owned elsewhere are unchanged. When the category/line participating-product set is propagated along formal route stages, each affected operation performs the same intersection-based inheritance so a newly added product receives only codes already assigned in that operation and present in its own root BOM. Existing legacy duplicate assignments are not deleted automatically and remain removable from their owning operations. Storage still uses the existing arrays; no new field or schema is introduced.
- Labor/equipment: `mode`, `people`, `machineId`, `machineIds[]`.
- Work instruction/QC: `instructionSteps[]`, `productInstructionSteps`, `instructions`, product-specific instruction text, and `ipqc`.
- Media: operation-level media URL/data, name, MIME type, and `mediaItems[]`; optional `productMediaItems` maps each assigned product code to its own media-item array. New raster-photo uploads are normalized client-side to WebP with a maximum 1600-pixel edge before being stored in those existing arrays; video, GIF, SVG, and existing saved media retain their original representation. This remains inside the existing operation JSON and adds no D1 table or shared-state key. Product-specific media is read only for the selected/dispatched product.

An instruction step has `text` and `standard`. This is the current SOP/QC representation; there is no separate SOP or QC table.

### Process Version

Stored in `approvalVersions`.

- `id`, `number`, `category`, `line`, `status`.
- `stages`: complete stage-to-operation snapshot.
- creator/timestamps and optional `parentVersionId`.
- review fields such as `reviewNote`, `reviewerName`, `reviewedAt`, `changeRequested`.
- `history[]` entries with action/label, actor, timestamp, and optional note.

Statuses used by current workflow: `draft`, `pending`, `approved`, `superseded`, and `rejected`. At most one version per category/line is treated as current approved production data; approving a replacement supersedes the previous approved version.

### Product and BOM Source Data

- Base product/BOM data is generated into `public/process/data/imported-data.js` as `window.IMPORTED_DATA`.
- Base line, stage, and product-route data is in `public/process/data/line-process-data.js` as `window.LINE_PROCESS_DATA`.
- C-line master input is in `public/process/data/line-c-master.js`.
- Approved `masterDataControl.active` is applied over these sources at runtime and becomes the authoritative operational catalog.
- `bomOverrides` stores imported/replaced root BOM structures. Legacy values remain a plain SKU map and overlay the generated source. A complete-page BOM Excel import stores `{ __format, replaceAll: true, data }`; runtime loading clears the generated BOM before applying `data`, so omitted SKUs remain omitted after reload.

BOM rows retain source identifiers, names, levels, quantities, units, specifications, waste, and source type as available. Tree relationships are determined by preorder level and contiguous descendants, not by a normalized parent foreign key.

System-exported AB/C master workbooks use `PROCESS_OS_MASTER_PAGE_EXCEL` v2 and include format metadata, products, category groups (including empty groups), lines/stages, unknown-field JSON, and a read-only version-history sheet. Line/stage-only workbooks use `PROCESS_OS_LINE_STAGE_EXCEL` v2. BOM workbooks use `PROCESS_OS_BOM_EXCEL` v2. The format marker distinguishes full-scope replacement from backward-compatible legacy partial updates.

### Dispatch Board

Stored in `dispatchBoard`:

```text
{ A: productCode[], B: productCode[], C: productCode[] }
```

Each line is limited by UI/business logic to three unique product codes. A dispatched product must belong to the line and have a current approved process version consistent with the latest approved route and BOM.

### Backup Settings and Backups

`backupSettings` stores cloud schedule state: `enabled`, weekly frequency, Saturday day number, time, and `Asia/Ho_Chi_Minh` timezone. The local ADMIN backup page can switch its active endpoint between host ZIP backup and this cloud snapshot API; that mode choice is browser session UI state and is not persisted in D1. When cloud scheduling is enabled, an allowed shared-state GET performs an idempotent missed-run check, so the due snapshot can be created when the site is opened even if the backup page is not open.

Cloud snapshots use `state_backups`. Host ZIP backup settings are stored separately in `local-backup.settings.json`; schedule state, audit logs, locks, and the encryption key live under the configured backup directory's `.system` folder. The Windows default is `.local-backups`, overridable with `PROCESS_BACKUP_PATH`. A path-picker capability is reported by the local backend only when the host can safely open one; manual server paths remain available and are validated and created by the backend.

## Source of Truth and Data Flow

1. `data/canonical/` is the shared reviewed collaboration baseline. New Local bootstraps from it; bundled product/BOM files remain legacy adapters, not the latest baseline.
2. `masterDataControl.active` is the approved source of truth for operational products, categories, lines, stages, and routes.
3. Master approval reconciliation updates runtime product/routing data, process templates, editor stage sets, BOM slots, and removes invalid dispatch/editor references when required.
4. `approvalVersions` is the source for approved process content. Draft workspaces do not affect line playback until approved.
5. `dispatchBoard` selects which approved products appear on each line.
6. Shared changes are written as a new singleton-state revision. Cloud and host backups snapshot that state before protected mutations/restores.

## File and Media Storage

- Static application assets are tracked under `public/process`; legacy demo PNG references are not proof that their files exist. Saved template photos live in the process-version snapshot and, after approval, in the existing `processMasterData` projection. Fresh Clone real-image availability requires the separately reviewed Canonical image package rather than browser caches or untracked files.
- Existing BORUAXE demo defaults first reuse matching operation media from approved versions of the same category, line and stage, preferring current approval over historical superseded versions. This changes fallback resolution only, introduces no image field/entity, and never replaces existing operation media.
- R2 binding `STATE_ARCHIVE` stores content-addressed `snapshots/<sha256>.json` objects when a serialized state reaches 512 KiB. The D1 `values` column then contains a `__processR2` reference, digest, platformUsers metadata for host-backup authentication, and an optional maintenance-mode overlay. The public API always expands the snapshot and removes account passwords; it never exposes a bucket URL or maintenance credential. Legacy inline JSON is still supported, with no schema migration.
- Every shared-state, user, backup, scheduled-backup and release write uses the same serializer; R2 is written before the D1 compare-and-swap. A failed D1 write can leave an unreferenced immutable R2 object, never a missing referenced object. Reads verify the hash and fail closed if unavailable. Current objects are retained, including older backup references.
- Local full ZIP backups include consistent SQLite snapshots of the R2 metadata plus its blob files. Restore copies blobs and replaces metadata rows transactionally, avoiding overwriting a live SQLite/WAL file. Portable maintenance exports expand all business JSON and embedded media and must be paired with the static asset package.

## Integrity and Security Constraints

- Shared keys are allowlisted and must contain valid JSON.
- Server permissions gate protected key families and approval/deletion operations.
- Active master-data changes require approval; deletion requires `master.delete` and is blocked while relevant reviews are pending.
- Restore enters maintenance mode and prevents normal writes.
- Public API responses remove user passwords.
- Current password values are not modeled as hashes; improving credential storage would be a future data-model and migration change, not an existing capability.

## Local schema and seed initialization

Only existing Drizzle migrations create `shared_state` and `state_backups` in an empty Local D1. Startup checks schema, primary keys and nullability; ordinary reads do not create tables or silently add administrators. The initializer never re-seeds an existing singleton or replaces business data. Existing incomplete demo setup or ID conflicts stop startup for separate review. Non-authentication legacy seed values remain unchanged, but new Local bootstraps from Canonical rather than that legacy seed. Missing current state in a nonempty schema is refused. Local-only config and state are ignored under `.wrangler`; no Production binding is used. 測試階段快捷入口預設開放；正式營運前必須由Frank明確確認關閉。

## Canonical collaboration persistence

Schema/bootstrap versions are 1. Domain files have fixed-ID records, optional explicit deletedAt tombstones, stable ordering, and file SHA-256 indexes. Manifest dataVersion is content-derived; generatedAt is unchanged without domain changes. No accounts, identities, passwords, sessions or audit history enter Canonical. Local quality collaboration uses canonicalQuality with separate fqc/iqc/ipqc records and fixed product/part/stage references; existing process-node IPQC fields are preserved separately. No quality screen or new SQL schema is introduced.

Ignored `.wrangler/local-only/canonical-base.json` holds last-synced domain values/version and last-export hash. Three-way sync rejects unexported or conflicting Local edits. Physical backups preserve complete D1/WAL/SHM/R2 and Local session/base settings; CAS updates revision, retains old R2 snapshots, verifies projection and rolls back failure. Unchanged domains retain Local serialized contents; existing accounts and private version history stay Local. Assets retain source-content IDs/hashes and add web metadata (relative path, SHA-256/content version, MIME, bytes, width and height). assets/web-manifest.json is hashed in the main manifest and includes image tombstones/package version. Verified WebP files enter Git; original content remains outside Git. Local R2 keeps immutable canonical-images/<source-sha>/<web-sha>.webp objects. The Local-only image route streams these objects; bootstrap/sync resolve Canonical references to that route while preserving private uploads and drafts. Unreferenced image objects are retained for recovery, not physically deleted. No SQL schema or bootstrap-version change.

Four layers: Canonical in reviewed main, individual Local D1/R2, future separate Staging mirror, and out-of-scope Production. Git merge only changes Canonical. See LOCAL_DATA_COLLABORATION.md for implemented commands and future-only Staging specification.
