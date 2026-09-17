import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createDemoUsers, demoIdentities, isDemoUser } from '../lib/demo-identities.mjs';
import { assertLocalMode, localPaths, localWorkerConfig, readLocalSession, LocalSetupError, localFailureMessage, configureOfflineLocal } from '../lib/local-runtime.mjs';
import { verifyLocalSchema } from '../lib/local-schema.mjs';
import { installLocalNetworkGuard } from '../lib/local-network-guard.mjs';
import {readPackage,materialize,serialize,sha256,stable} from '../lib/canonical-data.mjs';
import {encodeLocalValues}from'../lib/local-snapshot.mjs';

// Load existing Drizzle definitions rather than duplicating table definitions.
export function loadTypeScript(root, relative) {
  const require = createRequire(path.join(root, 'package.json'));
  const ts = require('typescript');
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require }, { filename: relative });
  return module.exports;
}

export function inspectMigrations(root) {
  const require = createRequire(path.join(root, 'package.json'));
  const { getTableConfig } = require('drizzle-orm/sqlite-core');
  const tables = Object.values(loadTypeScript(root, 'db/schema.ts')).map(getTableConfig);
  const journal = JSON.parse(fs.readFileSync(path.join(root, 'drizzle/meta/_journal.json'), 'utf8'));
  const migrations = journal.entries.map(entry => ({ name: `${entry.tag}.sql`,
    sql: fs.readFileSync(path.join(root, 'drizzle', `${entry.tag}.sql`), 'utf8') }));
  if (migrations.some(migration => /\b(DROP|DELETE|ALTER|TRUNCATE|UPDATE)\b/i.test(migration.sql)))
    throw new LocalSetupError('Existing migration contains destructive operations; initialization stopped');
  const definitions = migrations.map(migration => migration.sql).join('\n');
  for (const table of tables) {
    const match = definitions.match(new RegExp('CREATE TABLE [`"]?' + table.name + '[`"]?\\s*\\(([\\s\\S]*?)\\);', 'i'));
    if (!match) throw new LocalSetupError('Existing migrations do not cover the Drizzle schema');
    const columns = [...match[1].matchAll(/[`"](\w+)[`"]\s+(integer|text)([^,]*)/gi)];
    if (columns.length !== table.columns.length || table.columns.some(column => {
      const found = columns.find(match => match[1] === column.name);
      return !found || found[2].toLowerCase() !== column.getSQLType().toLowerCase()
        || /PRIMARY KEY/i.test(found[3]) !== column.primary
        || /NOT NULL/i.test(found[3]) !== column.notNull;
    })) throw new LocalSetupError('Migration columns differ from the Drizzle schema');
  }
  return { tables, migrations };
}

export async function initializeLocal(root, args = [], environment = process.env) {
  assertLocalMode(args, environment);
  const schema = inspectMigrations(root);
  const paths = configureOfflineLocal(root);
  installLocalNetworkGuard(root);
  fs.mkdirSync(paths.directory, { recursive: true });
  const lock = path.join(paths.directory, 'initializing.lock');
  try { fs.mkdirSync(lock); }
  catch { throw new LocalSetupError('Local initialization lock exists or is unavailable; startup stopped for review'); }
  let proxy;
  try {
    const config = localWorkerConfig();
    fs.writeFileSync(paths.config, JSON.stringify(config, null, 2));
    // Explicit config and false remoteBindings prevent auto-discovery or remote access.
    const { getPlatformProxy } = createRequire(path.join(root,'package.json'))('wrangler');
    proxy = await getPlatformProxy({ configPath: paths.config,
      persist: { path: path.join(paths.state, 'v3') }, remoteBindings: false, envFiles: [] });
    const db = proxy.env.DB;
    const names = (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%'").all()).results.map(row => row.name);
    const wasEmpty = names.length === 0;
    if (wasEmpty) {
      // Apply the exact existing files only to an empty Local schema.
      const statements = schema.migrations.flatMap(migration => migration.sql.split(';').map(sql => sql.trim()).filter(Boolean));
      await db.batch(statements.map(sql => db.prepare(sql)));
    } else if (schema.tables.some(table => !names.includes(table.name))) {
      throw new LocalSetupError('Existing Local schema is incomplete; it was not migrated or re-seeded');
    }
    for (const warning of await verifyLocalSchema(db, schema.tables)) console.warn(warning);
    const row = await db.prepare('SELECT revision, "values" FROM shared_state WHERE id = 1').first();
    if (!row) {
      if (!wasEmpty) throw new LocalSetupError('Existing Local state is missing; automatic bootstrap was refused');
      const backups = await db.prepare('SELECT COUNT(*) AS count FROM state_backups').first();
      if (Number(backups.count) !== 0) throw new LocalSetupError('Existing Local backup data has no current state; automatic seed was refused');
      const canonical = readPackage(root);
      const roles = loadTypeScript(root, 'lib/user-access.ts').roleDefaults;
      const values = { ...materialize({},canonical.domains), platformUsers: JSON.stringify(createDemoUsers(roles)) };
      await db.prepare('INSERT INTO shared_state (id, revision, "values", updated_at) VALUES (1, ?, ?, ?)')
        .bind(1, await encodeLocalValues(proxy.env.STATE_ARCHIVE,values), new Date().toISOString()).run();
      fs.writeFileSync(path.join(paths.directory,'canonical-base.json'),serialize({bootstrapVersion:canonical.manifest.bootstrapVersion,dataVersion:canonical.manifest.dataVersion,baseDomains:canonical.domains,lastExportHash:sha256(stable(canonical.domains))}));
    } else {
      // Existing business state is never overwritten or re-seeded.
      const stored = JSON.parse(row.values);
      let values = stored;
      if (stored.__processR2) {
        const reference = stored.__processR2;
        if (!/^snapshots\/[a-f0-9]{64}\.json$/.test(reference.key)) throw new LocalSetupError('Invalid Local snapshot reference');
        const object = await proxy.env.STATE_ARCHIVE.get(reference.key);
        if (!object) throw new LocalSetupError('Local snapshot is missing; initialization stopped');
        const raw = await object.text();
        if (crypto.createHash('sha256').update(raw).digest('hex') !== reference.sha256) throw new LocalSetupError('Local snapshot verification failed');
        values = JSON.parse(raw);
      }
      const users = JSON.parse(values.platformUsers || '[]');
      if (!Array.isArray(users)) throw new LocalSetupError('Local users are invalid; initialization stopped');
      for (const identity of demoIdentities) {
        const matching = users.filter(user => String(user.id).toLowerCase() === identity.id);
        if (matching.length > 1) throw new LocalSetupError('Local demo account ID conflict; existing accounts were not modified');
        const found = matching[0];
        if (found && !isDemoUser(found)) throw new LocalSetupError('Local demo account ID conflict; existing accounts were not modified');
      }
      // Do not append accounts to an existing state silently. A prepared clone is idempotent.
      if (demoIdentities.some(identity => !users.some(user => user.id === identity.id)))
        throw new LocalSetupError('Existing Local state has no complete demo setup; automatic changes were refused');
    }
    if (!fs.existsSync(paths.session)) fs.writeFileSync(paths.session,
      JSON.stringify({ secret: crypto.randomBytes(48).toString('hex') }), { mode: 0o600, flag: 'wx' });
    readLocalSession(root);
    console.log('Local initialization verified: existing migrations, passwordless demo accounts, remote bindings disabled.');
  } finally {
    if (proxy) await proxy.dispose();
    fs.rmdirSync(lock);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.env.WRANGLER_SEND_METRICS = 'false';
  process.env.WRANGLER_WRITE_LOGS = 'false';
  initializeLocal(process.cwd(), process.argv.slice(2)).catch(error => {
    console.error(localFailureMessage(error));
    console.error('Local initialization failed; dev server was not started.');
    process.exitCode = 1;
  });
}
