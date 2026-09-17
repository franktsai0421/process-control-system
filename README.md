# PROCESS OS Local development

Requires Node.js 22.13 or later and npm. In a fresh clone:

```sh
npm install
npm run dev
```

Open the printed loopback URL followed by `/process/`. ADMIN、RD、製程人員（STAFF）快捷入口沿用既有畫面及角色規則，不需要帳號密碼、Cloudflare Token 或 Production 設定。

**測試階段快捷入口預設開放；正式營運前必須由Frank明確確認關閉。**

## Local initialization

`scripts/local-dev.mjs` runs `scripts/local-init.mjs` before starting Vinext. An empty Local D1 schema is created using only the existing files listed in `drizzle/meta/_journal.json`. No table definitions are added to ordinary reads or login APIs. The initializer compares migrations with `db/schema.ts`, validates SQLite rowid primary-key semantics and refuses incomplete or destructive migrations. Valid legacy TEXT backup primary keys report LEGACY_SCHEMA_WARNING without schema changes.

Local D1/R2 persists under ignored `.wrangler/state`; a generated Local-only Wrangler configuration and random Session signing secret live under ignored `.wrangler/local-only`. Remote bindings are disabled. Production environments, Cloudflare credentials and remote/config/binding CLI overrides are refused. Only `--host localhost` / `--host 127.0.0.1` and `--port <number>` are accepted.

Only an empty Local schema receives the latest verified `data/canonical/` business package plus three fixed passwordless users: `demo-admin` / Demo Admin, `demo-rd` / Demo RD and `demo-staff` / Demo Staff. They have `authMode: "demo"` and inherit the existing role templates. Restarting verifies rather than re-seeding. Existing business state is never overwritten. Existing databases missing tables or the complete demo setup, or containing conflicting demo IDs, stop initialization; they require a separately reviewed transition. An interrupted initializer lock must be reviewed before manually removing it.

## Demo authentication

One backend function interprets `DEMO_LOGIN_ENABLED`: unset or `true` permits demo login; `false` denies both new login and previously issued demo Sessions. Set this variable in the shell before `npm run dev`; Local requires no environment file. No hostname, hosting platform or Production detection disables demo automatically.

The login request accepts only the fixed role selector, with no account, permissions or line overrides. Sessions are HMAC-signed, expire after eight hours, are stored in an HttpOnly/SameSite cookie (Secure on HTTPS), and contain `sessionType: "demo"`, never a password. Every protected request verifies the flag, current account mode, role, enabled status and archival status. Demo users cannot receive password resets. Formal password login and loopback `manage=1` remain existing separate mechanisms; formal password hashing and Frank's administrator setup are outside this change.

```sh
npm run test:demo
npm run test:local-init
npm run build
```

Never copy `.env*`, `.dev.vars`, `.wrangler`, Local databases, R2 blobs, backup archives or secrets into a clone or repository. `.openai/hosting.json` retains the existing Sites mapping; Local initialization does not use its resource IDs or contact hosted storage. This change does not deploy or convert existing Production accounts. A future deployment needs a separately authorized account/data transition and Frank's explicit operating-mode decision. Existing Git history may still contain legacy credentials; source cleanup does not clean Git history.

## Shared business baseline and Local collaboration

`data/canonical/` is the reviewed Git baseline. Local D1/R2 remains private; Git merge never writes Cloudflare storage. Stop dev before `npm run data:export` or `npm run data:sync`. Export is stable and validates fixed-ID relations. Sync verifies a recoverable physical backup, compares Local/last-base/incoming data, refuses unexported edits and conflicts, and rolls back failed writes.

Use `npm run task:status`, `npm run task:start -- data/work-name`, and `npm run task:submit`. Without a remote, tools explicitly say 尚未連接GitHub and never pretend to pull. No automatic upload or deployment occurs.

See [Local collaboration, versions, assets, safety and future Staging](AI_CONTEXT/LOCAL_DATA_COLLABORATION.md). Clones intentionally use offline placeholder images; original approved Local asset bytes remain outside Git in a controlled asset package. Existing Frank Local is preserved and requires separately authorized account conversion.

```sh
npm run data:validate
npm run safety:scan
npm run test:local-schema
npm run test:canonical
```
