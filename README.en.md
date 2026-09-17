[Tiếng Việt](README.md) | [繁體中文](README.zh-TW.md) | [English](README.en.md)

# PROCESS OS — Process control system

## Purpose

An internal portal connects approved manufacturing master data, BOMs and process versions. Canonical is the reviewable Git baseline; each colleague works in separate Local storage.

## Main features

Product/equipment catalogs, BOMs, process graphs, version approval, dispatch, line playback, product status, roles and backups. The interface supports Vietnamese and Traditional Chinese.

## Architecture

React/Vinext/TypeScript provide the shell and APIs; the existing interface is under public/process. Vite/Miniflare run Local. D1 holds state and R2 holds large snapshots; migrations are under drizzle.

## Canonical versus Local

data/canonical contains 16 domain files and a manifest, initially 7,971 approved records. It is not a database file. Local D1/R2 are private working storage excluded from Git. Merge updates Canonical without writing Cloudflare.

## First clone

Clone the Private repository using an authorized GitHub account, then enter repository root. Do not import older copies or backups.

```sh
git clone https://github.com/franktsai0421/process-control-system.git
cd process-control-system
```

## Install dependencies

Use Node satisfying package.json engines (>=22.13.0) and npm. Dependency installation uses registry networking separately from Local runtime. No Cloudflare Token or Frank password is needed.

```sh
npm install
```

## Start Local

Run the command and open the printed 127.0.0.1 URL with /process/. Initialization failure stops startup.

```sh
npm run dev
```

## First data initialization

Only an empty Local DB receives the two existing migrations, latest Canonical and demo-admin/demo-rd/demo-staff. Initial schema/bootstrap are 1; the manifest verifies digests. Restart neither reimports nor resets data.

## Demo shortcuts

ADMIN, RD and STAFF retain names, positions and existing access. No default password is used. The backend selects three fixed identities; signed eight-hour Sessions use demo authMode/sessionType.

## Demo switch

DEMO_LOGIN_ENABLED unset/true permits demo; false rejects new logins and old demo Sessions. Hostname does not disable it automatically. Testing shortcuts are open by default; Frank must explicitly approve closure before formal operation.

## Export data

Stop dev before export. Export only approved collaborative data with stable IDs/order, excluding accounts, history and private values. No changes means identical files/versions. The tool does not commit or push.

```sh
npm run data:export
```

## Sync data

After pull, stop dev and sync. Three-way comparison uses the previous base; unexported edits and same-ID conflicts block it. Invalid references are rejected and deletions require deletedAt. A verified physical backup precedes application; failed verification restores it.

```sh
git switch main
git pull --ff-only
npm run data:sync
```

## Branches and Pull Requests

Use task:status first. task:start can create a local branch without a remote; with a remote it refuses automatic networking, so update main and sync manually first. task:submit exports/checks without merging. Commit/push a work branch for Frank review; do not directly or force push main.

```sh
npm run task:status
git switch -c data/work-name
npm run task:submit
git add <reviewed-files>
git commit -m "Describe reviewed changes"
git push -u origin data/work-name
```

## Build and tests

CI uses Local fixtures without deployment. These scripts exist in package.json. Legacy browser tests require installed Playwright; PLAYWRIGHT_MODULE/CHROME_PATH provide optional tooling without automatic downloads.

```sh
npm run build
npx --no-install tsc --noEmit
npm run test:demo
npm run test:local-schema
npm run test:local-init
npm run test:canonical
npm run test:data-merge
npm run test:task-safety
npm run test:portable
npm run data:validate
npm run github:preflight
```

## Never commit

Never commit passwords/hashes, tokens, Sessions/cookies, real accounts, personal data, .env/.dev.vars, D1/SQLite/WAL/SHM, R2 blobs, backups, archives, logs or diagnostics. .local-backups is ignored. Scanners do not guarantee arbitrary text is safe; review new content.

```sh
npm run safety:scan
```

## Production isolation

Local is loopback-only with remote bindings disabled; tools reject Production overrides and require no formal secret. Staging is not created/connected; future mirrors and isolated PR previews are separate pipelines. Production never changes automatically on merge.

## Known limitations

Git contains 205 asset indexes; original media stays in a private package and clone uses placeholders. FQC/IQC/IPQC are CLI collaboration records, not a new quality UI. Old Local conversion, formal accounts/hashes and a full dependency audit remain future work. Main enforcement depends on the GitHub plan; workflow guidance is not technical enforcement.

## Working copy and documentation

repository root is the formal Git working copy; the older readonly copy is retained for recovery without importing its history/data. This is an internal Private repository. Company terms are unconfirmed and no open-source LICENSE is created.

[COLLABORATION](COLLABORATION.en.md) · [BACKUP_AND_RESTORE](BACKUP_AND_RESTORE.en.md) · [BOM_SEARCH](BOM_SEARCH.en.md) · [MASTER_ADMIN_UI](MASTER_ADMIN_UI.en.md)
