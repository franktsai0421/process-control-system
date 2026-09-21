# Complete release procedure

## Data-preserving maintenance releases

When Frank explicitly requests a code repair while preserving Production data, do not run the Canonical/seed synchronization described below. First identify the actual employee URL and its bindings: `process-control-20260829.franktsai0421.chatgpt.site` is the existing Sites publication bound by `.openai/hosting.json`, and is distinct from `central-control-production.franktsai0421.workers.dev`. A passing Workers deployment does not update the Sites URL.

For this maintenance path, restore-test a complete target backup before release, retain the previous deployed version and all R2 objects, verify that no migration changed, and validate the candidate on the existing isolated Staging target before merging. Verify the merged SHA again and publish that exact source to the identified Production site. Preserve its bindings, audience, secrets, credentials, records and media; do not seed or replace its business data. Check source hashes, real login/reload, existing content/media and timing on the same public URL. Temporary maintenance access used for backup must be disabled and removed afterward. A failed check blocks publication; a truncated database preview is not a valid backup.

When the target Sites project has public demo login enabled, a code-only Sites publish does not prepare its separate D1. Before publishing, confirm that `demo-admin`, `demo-rd`, and `demo-staff` are valid `isDemoUser` records. If any are missing, first export and restore-test the complete current state, then append only missing identities from `createDemoUsers(roleDefaults)` through the existing D1/R2 serializer and exact revision check. Stop on duplicate IDs, invalid existing records, or a concurrent revision; never overwrite, re-enable, or repair an existing account implicitly. The write must retain every other state value and create verified before/after server backups. Run `npm run test:sites-demo` against Staging and again against the fixed Sites URL after deployment; it verifies all three signed sessions, effective permissions, refresh/logout/re-login, and critical live asset hashes without changing business data.

For full data releases (not the explicitly data-preserving maintenance path above), a Git merge or Worker upload changes code only. The complete procedure below additionally verifies migrations, Canonical business data, passwordless demo identities, images and smoke checks against the same reviewed main commit.

## Staging

The current complete main dataset requires more than the Workers Free 10 ms CPU allowance. The generated target Worker config sets a 1,000 ms CPU ceiling and requires an already approved Workers Paid subscription; the runner never upgrades a plan or changes account billing. After Frank subscribed to Paid on 2026-09-18, Staging accepted the 1,000 ms ceiling and the same reviewed main SHA was redeployed after a fresh restore-tested D1 backup. Migration, full Canonical/seed/image checks, repeated shared-state API requests and all desktop/iPhone login/page/image smoke checks passed. The earlier Free-plan `exceededCpu`/503 blocker is resolved for this validated release. Production data/deployment remains unchanged; Frank's manual Staging acceptance and separate Production approval are still required.

Stop Staging business edits for the release. Authenticate using the project-local Wrangler version, switch to clean main, fetch and fast-forward origin/main. The release refuses a different branch, dirty tracked/untracked source, or HEAD that differs from freshly fetched origin/main.

```sh
git switch main
git pull --ff-only
npm run release:staging
```

The command has a fixed Staging-only account, Worker, D1 `DB` and R2 `STATE_ARCHIVE`. It performs:

1. Export the entire target D1 to ignored `.wrangler/staging-release/backups/`; restore the SQL into isolated SQLite and verify the singleton/backup tables before any deployment or migration.
2. Validate main's Canonical manifest and every packaged image. Build main, package verified Canonical WebP as generated immutable static assets, dry-run and deploy only `central-control-staging`. Publish the source commit and Canonical version in `/staging-release.json`; retain existing secrets and environment variables.
3. Apply all pending main migrations only to `control-staging-d1`.
4. Materialize all Canonical domains through the existing converter: catalogs, routes, templates, approved versions, BOM, roles, dispatch and quality. Preserve non-managed keys, editor drafts, non-approved versions, account credentials and private identity/audit fields. Main is the reviewed mirror baseline; the initial authorized synchronization replaces managed approved data only. Later runs refuse managed target edits that differ from the recorded last synchronization instead of overwriting them silently. Recorded Canonical domains enforce explicit tombstones and existing image-transition integrity checks.
5. Append only missing `demo-admin`, `demo-rd`, `demo-staff` using existing `createDemoUsers(roleDefaults)`. Never copy accounts from Local or Production, add a password to demo users, overwrite an ID conflict, reset existing accounts or duplicate users. Permissions inherit the reviewed Canonical role templates.
6. Verify/import active Canonical WebP into Staging R2 under existing immutable content keys. Keep historical snapshots, private uploads, unreferenced images and backups. The web uses generated static copies of exactly the same validated bytes; Legacy template/equipment/demo image paths are derived only from Canonical names and matching source hashes and packaged as compatible aliases; this requires no change to main's Local-only image API and exposes no private bucket. Canonical image references use these generated URLs; other private media remain unchanged.
7. Create and verify a pre-write logical backup, serialize the complete state through the existing D1/R2 serializer, then compare-and-swap the singleton revision and original stored bytes. Images are prepared before publishing references. Re-read and compare every value, count/hash BOM and verify a second plan is unchanged. On verification failure, restore only if no newer writer has changed the state; otherwise stop for manual recovery. Retain newly uploaded immutable objects.
8. Verify deployed commit equals origin/main, static code hashes, all managed Canonical values, all three signed demo sessions, every image's HTTP bytes/hash and protected APIs. Run desktop/iPhone browser checks of login/reload, primary pages, current BOM and decoded template/equipment images without modifying business data. Save only non-sensitive results to ignored `.wrangler/staging-release/result.json`.

```sh
npm run sync:staging
```

This repeats backup, migration check, Canonical/seed/image sync and the same smoke checks without redeploying code. It still requires clean current main and a matching deployed commit. Identical data does not bump the singleton revision or create duplicate domain records/accounts/images; each operation may create a separate protective backup. A conflict or failed smoke is a failed release, never reported as success. The CLI provides no account/resource overrides. Production requires an explicit approval SHA matching clean current main before it can access any target resource.

After Staging smoke passes, provide its URL, main SHA, Canonical dataVersion/generatedAt, BOM roots/rows, image count and backup/migration results for Frank's manual acceptance.

## Production approval and release

Production is never changed by either Staging command. Wait for Frank's explicit applicable Production approval after manual Staging acceptance. The same complete runner has a fixed Production target; its entrypoint refuses execution without the exact approved main SHA. Use `npm run release:production -- --approved-sha <accepted-main-SHA>` only after approval. This change validates the Production refusal guard with isolated tests; no live Production release or database mutation was performed. The runner uses separate verified IDs, `.wrangler/production-release` backups/checkpoints and `/production-release.json`, retains dashboard variables/secrets, and follows the same ordered checklist. Do not reuse Staging IDs/config/result files or bypass approval gates. Record the approved main SHA and verify it has not changed before starting. If main has advanced since acceptance, repeat Staging acceptance for that exact commit first.

Before an approved Production data synchronization, review the managed-data plan against current Production and retain non-managed records, accounts, credentials, private drafts, history and all historical R2 references. Never copy formal passwords between environments. Passwordless demo seed must use the same fixed identities and collision checks; retain the explicitly approved `DEMO_LOGIN_ENABLED` setting (Frank decides test-phase cutover). Do not silently enable or disable it. Execute code deployment, pending migrations, reviewed Canonical sync, safe demo seed, immutable image sync and complete smoke validation as one release; any missing stage leaves the release incomplete. Keep the existing public Production URL and bindings unchanged.

## Recovery

D1 SQL exports contain private account/state information and are ignored artifacts, never commits, PR attachments or diagnostic output. The SQL backup plus retained original R2 snapshot objects supports target-only recovery. Logical `state_backups` captures the exact previous singleton. Full D1 restoration and schema rollback require a separately reviewed target-only plan; Worker rollback alone does not roll back data or migrations. Never restore over a newer writer or use Production for fixtures.
