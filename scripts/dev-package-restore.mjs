import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { assertLocalMode, configureOfflineLocal, localWorkerConfig, LocalSetupError, localFailureMessage } from '../lib/local-runtime.mjs';
import { installLocalNetworkGuard } from '../lib/local-network-guard.mjs';
import { decodeLocalSnapshot, encodeLocalValues } from '../lib/local-snapshot.mjs';
import { loadTypeScript, inspectMigrations } from './local-init.mjs';
import { verifyLocalSchema } from '../lib/local-schema.mjs';

const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = message => { throw new LocalSetupError(message); };
const columns = {
  shared_state: ['id', 'revision', 'values', 'updated_at'],
  state_backups: ['id', 'revision', 'values', 'reason', 'actor', 'created_at'],
  web_feedback_store: ['id', 'revision', 'payload'],
  process_revoked_sessions: ['token_digest', 'expires_at', 'revoked_at'],
};
async function hashFile(file) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
function regular(file) {
  if (!fs.existsSync(file) || !fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) fail('Package files must be regular files');
}

// Private data is an explicit input, never a repository seed. Existing storage is
// refused even if it appears empty; a failed target remains available for review.
export async function restoreDevelopmentPackage(root, directory, expectedManifestSha256) {
  assertLocalMode([], process.env);
  if (!/^[a-f0-9]{64}$/.test(expectedManifestSha256 || '')) fail('An independently reviewed manifest hash is required');
  const paths = configureOfflineLocal(root);
  if (fs.existsSync(path.join(paths.project, '.wrangler'))) fail('Existing Local storage refused; use a fresh clone');
  const pack = fs.realpathSync(directory);
  if (fs.lstatSync(directory).isSymbolicLink() || fs.lstatSync(path.join(pack, 'objects')).isSymbolicLink()) fail('Linked package roots refused');
  regular(path.join(pack, 'manifest.json')); regular(path.join(pack, 'database.json'));
  const manifestRaw = fs.readFileSync(path.join(pack, 'manifest.json'));
  if (digest(manifestRaw) !== expectedManifestSha256) fail('Package manifest checksum mismatch');
  const manifest = JSON.parse(manifestRaw);
  if (manifest.format !== 'PROCESS_OS_PRIVATE_DEV_PACKAGE_V1_PROTOTYPE' ||
      manifest.distributionStatus !== 'READY_PRIVATE_LOGICAL_DATA_FOR_REVIEWED_RUNTIME_IMPORT' ||
      manifest.status !== 'PASS_PRIVATE_LOGICAL_PACKAGE_SCRUB_AND_SOURCE_COMPARISON' ||
      !manifest.verification?.businessIDsRolesUserOverridesOwnershipAndHistoryRetained ||
      !manifest.credentialPolicy?.sourcePasswordHashesNeverExported) fail('Package has no reviewed distribution status');
  for (const [name, expected] of Object.entries(manifest.productionDependencyHashes || {})) {
    if (!/^(lib|app|public)\/[a-zA-Z0-9_./-]+$/.test(name) || name.split('/').includes('..') ||
        digest(fs.readFileSync(path.join(paths.project, name))) !== expected) fail('Package source dependency mismatch');
  }
  const databaseRaw = fs.readFileSync(path.join(pack, 'database.json'));
  if (digest(databaseRaw) !== manifest.databaseSha256) fail('Package database checksum mismatch');
  const database = JSON.parse(databaseRaw);
  if (Object.keys(database.tables || {}).sort().join() !== Object.keys(columns).sort().join() ||
      database.tables.shared_state.length !== 1 || database.tables.shared_state[0].id !== 1 ||
      database.tables.state_backups.length !== manifest.historyRows ||
      database.tables.web_feedback_store.length !== manifest.feedbackRows ||
      database.tables.process_revoked_sessions.length !== 0) fail('Package table coverage mismatch');
  for (const [table, rows] of Object.entries(database.tables)) {
    const ids = new Set();
    for (const row of rows) {
      if (Object.keys(row).sort().join() !== columns[table].slice().sort().join() ||
          Object.values(row).some(value => !['string', 'number'].includes(typeof value)) || ids.has(row.id)) fail('Invalid package row');
      ids.add(row.id);
    }
  }
  const objects = manifest.objects;
  if (!Array.isArray(objects) || objects.length !== manifest.outputObjects || manifest.outputObjects !== manifest.sourceObjects) fail('Package object coverage mismatch');
  const keys = new Set();
  for (const object of objects) {
    if (typeof object.key !== 'string' || keys.has(object.key) || object.key.includes('\0') ||
        !/^[a-f0-9]{64}$/.test(object.sha256) || !Number.isSafeInteger(object.bytes) || object.bytes < 0 || object.bytes > 64 * 1024 * 1024) fail('Invalid package object or unsupported object size');
    keys.add(object.key);
    const file = path.join(pack, 'objects', object.sha256); regular(file);
    if (fs.statSync(file).size !== object.bytes || await hashFile(file) !== object.sha256) fail('Package object checksum mismatch');
  }
  // All inputs are checked before the first target write. SQL comes from the
  // checkout migrations and the two existing opt-in schemas, never the package.
  const schema = inspectMigrations(paths.project);
  console.log('Package checksums verified; acquiring fresh Local target.');
  try { fs.mkdirSync(path.join(paths.project, '.wrangler')); }
  catch { fail('Fresh target ownership could not be acquired; existing storage refused'); }
  fs.mkdirSync(paths.directory);
  installLocalNetworkGuard(paths.project);
  fs.writeFileSync(paths.config, JSON.stringify(localWorkerConfig(), null, 2), { flag: 'wx' });
  fs.writeFileSync(path.join(paths.directory, 'development-package-incomplete.json'), JSON.stringify({ manifestSha256: expectedManifestSha256, startedAt: new Date().toISOString() }), { flag: 'wx' });
  let proxy;
  try {
    const { getPlatformProxy } = createRequire(path.join(paths.project, 'package.json'))('wrangler');
    console.log('Starting isolated Miniflare bindings with remote access disabled.');
    proxy = await getPlatformProxy({ configPath: paths.config, persist: { path: path.join(paths.state, 'v3') }, remoteBindings: false, envFiles: [] });
    console.log('Isolated Miniflare D1/R2 bindings ready.');
    const db = proxy.env.DB, bucket = proxy.env.STATE_ARCHIVE;
    const tables = (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%'").all()).results;
    if (tables.length) fail('Target database is not empty');
    const initialFeedbackSeed = 'INSERT INTO `web_feedback_store` (`id`, `revision`, `payload`) VALUES (1, 0, \'{"issues":[],"attachments":[],"batches":[],"handoffs":[]}\')';
    const statements = schema.migrations.flatMap(migration => migration.sql.split(';').map(sql => sql.replace(/--[^\n]*(?:\n|$)/g, '').trim()).filter(Boolean))
      .filter(sql => sql.replace(/\s+/g, ' ') !== initialFeedbackSeed);
    if (statements.some(sql => !/^CREATE (TABLE|INDEX)\b/i.test(sql))) fail('Unexpected migration data operation; restore stopped');
    await db.batch(statements.map(sql => db.prepare(sql)));
    await verifyLocalSchema(db, schema.tables);
    for (const [table, rows] of Object.entries(database.tables)) {
      for (let i = 0; i < rows.length; i++) {
        await db.prepare(`INSERT INTO "${table}" (${columns[table].map(name => `"${name}"`).join(',')}) VALUES (${columns[table].map(() => '?').join(',')})`).bind(...columns[table].map(name => rows[i][name])).run();
      }
    }
    for (let i = 0; i < objects.length; i++) {
      const object = objects[i];
      // Miniflare requires a known-length body. Individual objects are bounded
      // above before writes; the full package is never loaded into memory.
      await bucket.put(object.key, fs.readFileSync(path.join(pack, 'objects', object.sha256)), { httpMetadata: object.httpMetadata, customMetadata: object.customMetadata });
      const stored = await bucket.get(object.key);
      const hash = crypto.createHash('sha256');
      if (!stored || stored.size !== object.bytes) fail('Restored object size mismatch');
      for await (const chunk of stored.body) hash.update(chunk);
      if (hash.digest('hex') !== object.sha256) fail('Restored object checksum mismatch');
      const metadata = value => Object.entries(value || {}).map(([key, item]) => [key, item instanceof Date ? item.toISOString() : item]).sort(([a], [b]) => a.localeCompare(b));
      if (JSON.stringify(metadata(stored.httpMetadata)) !== JSON.stringify(metadata(object.httpMetadata)) ||
          JSON.stringify(metadata(stored.customMetadata)) !== JSON.stringify(metadata(object.customMetadata))) fail('Restored object metadata mismatch');
      if ((i + 1) % 100 === 0) console.log(`Verified private R2 objects: ${i + 1}/${objects.length}`);
    }
    for (const [table, rows] of Object.entries(database.tables)) {
      const actual = (await db.prepare(`SELECT * FROM "${table}"`).all()).results;
      const ordered = list => list.map(row => JSON.stringify(columns[table].map(name => row[name]))).sort();
      if (JSON.stringify(ordered(actual)) !== JSON.stringify(ordered(rows))) fail('Restored table content mismatch');
    }
    const row = await db.prepare('SELECT * FROM shared_state WHERE id = 1').first();
    const decoded = await decodeLocalSnapshot(bucket, JSON.parse(row.values));
    const users = JSON.parse(decoded.values.platformUsers);
    if (!Array.isArray(users) || users.length !== manifest.accounts.original || users.some(user => user.password || user.passwordHash)) fail('Original identities or credential exclusion mismatch');
    const passwords = loadTypeScript(paths.project, 'lib/passwords.ts');
    const id = `dev-bootstrap-${crypto.randomUUID()}`, password = crypto.randomBytes(24).toString('base64url');
    const bootstrap = { id, name: 'Private Development Bootstrap', role: 'admin', inheritRole: true, authMode: 'password', enabled: true, authEpoch: 0, passwordHash: await passwords.passwordHash(password) };
    const values = { ...decoded.values, platformUsers: JSON.stringify([...users, bootstrap]) };
    const encoded = await encodeLocalValues(bucket, values, { ...decoded, forceR2: !!JSON.parse(row.values).__processR2 });
    const changed = await db.prepare('UPDATE shared_state SET revision = ?, "values" = ?, updated_at = ? WHERE id = 1 AND revision = ? AND "values" = ?').bind(row.revision + 1, encoded, new Date().toISOString(), row.revision, row.values).run();
    if (changed.meta.changes !== 1) fail('Bootstrap revision conflict');
    const after = await decodeLocalSnapshot(bucket, JSON.parse((await db.prepare('SELECT "values" FROM shared_state WHERE id = 1').first()).values));
    const original = JSON.parse(after.values.platformUsers).filter(user => user.id !== id);
    if (JSON.stringify(original) !== JSON.stringify(users) || Object.keys(decoded.values).some(key => key !== 'platformUsers' && decoded.values[key] !== after.values[key])) fail('Bootstrap changed original business state');
    fs.writeFileSync(paths.session, JSON.stringify({ secret: crypto.randomBytes(48).toString('hex') }), { flag: 'wx', mode: 0o600 });
    fs.writeFileSync(path.join(paths.directory, 'features.json'), JSON.stringify({ webFeedback: true, sessionRevocation: true }), { flag: 'wx' });
    fs.writeFileSync(path.join(paths.directory, 'private-development-login.json'), JSON.stringify({ id, password }), { flag: 'wx', mode: 0o600 });
    const receipt = { status: 'PASS_ACTUAL_MINIFLARE_D1_R2_RESTORE', manifestSha256: expectedManifestSha256, sourceRevision: manifest.sourceRevision, restoredObjects: objects.length, verifiedObjectBytes: objects.reduce((n, object) => n + object.bytes, 0), historyRows: database.tables.state_backups.length, feedbackRows: database.tables.web_feedback_store.length, originalAccounts: users.length, bootstrapAccountsAdded: 1, originalBusinessValuesUnchanged: true, actualSessionMiddleware: 'NOT_RUN', GUI: 'NOT_RUN', completedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(paths.directory, 'development-package-receipt.json'), JSON.stringify(receipt, null, 2), { flag: 'wx' });
    fs.unlinkSync(path.join(paths.directory, 'development-package-incomplete.json'));
    return receipt;
  } finally { await proxy?.dispose(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--package' || args[2] !== '--manifest-sha256') { console.error('Usage: node scripts/dev-package-restore.mjs --package <private-directory> --manifest-sha256 <reviewed-hash>'); process.exitCode = 1; }
  else restoreDevelopmentPackage(process.cwd(), args[1], args[3]).then(receipt => console.log(JSON.stringify(receipt))).catch(error => {
    console.error(localFailureMessage(error));
    const causes = []; let cause = error;
    for (let i = 0; cause && i < 4; i++, cause = cause.cause) causes.push({ name: cause.name, code: cause.code || null, category: String(cause.message || '').match(/too large|UNIQUE constraint failed|CHECK constraint failed|SQLITE_TOOBIG|SQLITE_ERROR|D1_ERROR|no such table|database is locked|read.only|known.length|stream|bind|fetch failed/i)?.[0] || 'unclassified' });
    console.error(JSON.stringify({ causes, frames: String(error.stack || '').split('\n').slice(1, 4) }));
    process.exitCode = 1;
  });
}
