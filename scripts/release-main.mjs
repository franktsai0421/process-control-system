import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import {
  readPackage,
  materialize,
  stable,
  serialize,
  sha256,
  differences,
} from '../lib/canonical-data.mjs';
import {
  importWebImages,
  readWebImage,
  imageUrl,
  hydrateWebImages,
  validateImageTransition,
} from '../lib/canonical-images.mjs';
import { encodeLocalValues } from '../lib/local-snapshot.mjs';
import { createDemoUsers, isDemoUser } from '../lib/demo-identities.mjs';
import { loadTypeScript } from '../scripts/local-init.mjs';

export let target = Object.freeze({
  environment: 'staging',
  name: 'central-control-staging',
  account_id: '96402aa3bc5977b35430a8affe8c9aab',
  database_id: '9e569e58-c1fc-4854-a801-b77de2cb02e8',
  database_name: 'control-staging-d1',
  bucket_name: 'control-staging-r2',
  url: 'https://central-control-staging.franktsai0421.workers.dev',
});
export const productionTarget = Object.freeze({
  ...target,
  environment: 'production',
  name: 'central-control-production',
  database_id: 'ae145b34-6d35-4c6d-87c6-4442433eb429',
  database_name: 'control-production-d1',
  bucket_name: 'control-production-r2',
  url: 'https://central-control-production.franktsai0421.workers.dev',
});
const stagingTarget = target;
const fail = (code) => {
  throw new Error(code);
};
const same = (a, b) => serialize(a) === serialize(b);
export const hostedImageUrl = (r) =>
  `/process/assets/canonical/${r.web.sha256}.webp#asset-${r.sha256}`;
export function hostedReferences(values, records) {
  const urls = new Map(
    records
      .filter((r) => !r.deletedAt && r.web)
      .map((r) => [imageUrl(r), hostedImageUrl(r)]),
  );
  function walk(v) {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object')
      return Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, walk(x)]),
      );
    return typeof v === 'string' && urls.has(v) ? urls.get(v) : v;
  }
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => {
      try {
        return [k, JSON.stringify(walk(JSON.parse(v)))];
      } catch {
        return [k, v];
      }
    }),
  );
}
export function planState(root, current, pkg) {
  const { roleDefaults } = loadTypeScript(root, 'lib/user-access.ts');
  let values = materialize(
    hydrateWebImages(current, pkg.domains.assets),
    pkg.domains,
    { root },
  );
  values = hostedReferences(values, pkg.domains.assets);
  for (const key of Object.keys(current))
    if (
      key === 'platformUsers' ||
      key.startsWith('processEditor:') ||
      ![
        'masterDataControl',
        'approvalVersions',
        'processMasterData',
        'dispatchBoard',
        'processRoleTemplateOverrides',
        'processCustomRoles',
        'bomOverrides',
        'canonicalQuality',
        'versionSampleSeed4',
      ].includes(key)
    )
      values[key] = current[key];
  const users = JSON.parse(current.platformUsers || '[]');
  if (!Array.isArray(users)) fail('INVALID_USERS');
  const added = [];
  for (const demo of createDemoUsers(roleDefaults)) {
    const matches = users.filter(
      (u) => String(u.id).trim().toLowerCase() === demo.id,
    );
    if (matches.length > 1 || (matches.length === 1 && !isDemoUser(matches[0])))
      fail('DEMO_ID_CONFLICT');
    if (!matches.length) {
      users.push(demo);
      added.push(demo.id);
    }
  }
  values.platformUsers = added.length
    ? JSON.stringify(users)
    : current.platformUsers || '[]';
  return { values, added };
}
export async function decodeState(bucket, raw) {
  const stored = JSON.parse(raw);
  if (!stored.__processR2) return stored;
  const ref = stored.__processR2;
  if (!/^snapshots\/[a-f0-9]{64}\.json$/.test(ref.key))
    fail('INVALID_SNAPSHOT');
  const object = await bucket.get(ref.key);
  if (!object) fail('MISSING_SNAPSHOT');
  const text = await object.text();
  if (sha256(text) !== ref.sha256) fail('SNAPSHOT_HASH_FAILED');
  const values = JSON.parse(text);
  if (stored.maintenanceMode !== undefined)
    values.maintenanceMode = stored.maintenanceMode;
  return values;
}
export function boundedBucket(bucket, { timeoutMs = 60000, retries = 1 } = {}) {
  async function read(fn) {
    let last;
    for (let attempt = 0; attempt <= retries; attempt++) {
      let timer;
      try {
        return await Promise.race([
          fn(attempt),
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(Error('REMOTE_R2_READ_TIMEOUT')),
              timeoutMs,
            );
          }),
        ]);
      } catch (error) {
        last = error;
      } finally {
        clearTimeout(timer);
      }
    }
    throw last;
  }
  return {
    async get(key) {
      const object = await read(() => bucket.get(key));
      if (!object) return null;
      return {
        size: object.size,
        customMetadata: object.customMetadata,
        text: () =>
          read(async (attempt) => {
            const next = attempt ? await bucket.get(key) : object;
            if (!next) fail('R2_OBJECT_DISAPPEARED');
            return next.text();
          }),
        arrayBuffer: () =>
          read(async (attempt) => {
            const next = attempt ? await bucket.get(key) : object;
            if (!next) fail('R2_OBJECT_DISAPPEARED');
            return next.arrayBuffer();
          }),
      };
    },
    put: (...args) => bucket.put(...args),
  };
}
export function counts(pkg) {
  return Object.fromEntries(
    Object.entries(pkg.domains).map(([key, records]) => [
      key,
      records.filter((r) => !r.deletedAt).length,
    ]),
  );
}
export async function syncState(
  root,
  db,
  bucket,
  pkg,
  { exportBackup, afterWrite, progress = () => {} } = {},
) {
  const row = await db
    .prepare('SELECT revision,"values",updated_at FROM shared_state WHERE id=1')
    .first();
  if (!row) fail('EXISTING_STATE_REQUIRED');
  const current = await decodeState(bucket, row.values);
  if (current.maintenanceMode === '1') fail('MAINTENANCE_ACTIVE');
  const checkpoint = await bucket.get(
    `${target.environment}-canonical/latest.json`,
  );
  if (checkpoint) {
    const prior = JSON.parse(await checkpoint.text());
    if (prior.domains) {
      if (differences(prior.domains, pkg.domains).conflicts.length)
        fail('MISSING_EXPLICIT_TOMBSTONE');
      validateImageTransition(prior.domains.assets, pkg.domains.assets);
    }
    for (const [key, hash] of Object.entries(prior.managedHashes))
      if (sha256(current[key] ?? null) !== hash)
        fail('MANAGED_STAGING_EDIT_CONFLICT');
  }
  const plan = planState(root, current, pkg);
  const changed = !same(plan.values, current);
  const backup = exportBackup ? await exportBackup(row) : null;
  const backupId = crypto.randomUUID();
  const protection = await db
    .prepare(
      'INSERT INTO state_backups (id,revision,"values",reason,actor,created_at) SELECT ?,revision,"values",?,?,? FROM shared_state WHERE id=1 AND revision=? AND "values"=?',
    )
    .bind(
      backupId,
      `${target.environment} complete Canonical sync safeguard`,
      `${target.environment}-release`,
      new Date().toISOString(),
      row.revision,
      row.values,
    )
    .run();
  if (protection.meta.changes !== 1) fail('BACKUP_REVISION_CONFLICT');
  const saved = await db
    .prepare('SELECT "values" FROM state_backups WHERE id=?')
    .bind(backupId)
    .first();
  if (saved?.values !== row.values) fail('BACKUP_VERIFICATION_FAILED');
  progress({ phase: 'backup', revision: row.revision, backupId });
  let written = false,
    encoded;
  try {
    const chunks = Array.from({ length: 4 }, (_, i) =>
      pkg.domains.assets.filter((_, index) => index % 4 === i),
    );
    const results = await Promise.allSettled(
      chunks.map(async (records, index) => {
        const result = await importWebImages(root, records, bucket);
        progress({ phase: 'image-batch', batch: index + 1, ...result });
        return result;
      }),
    );
    const rejected = results.find((r) => r.status === 'rejected');
    if (rejected) throw rejected.reason;
    const images = results.reduce(
      (total, r) => ({
        imported: total.imported + r.value.imported,
        present: total.present + r.value.present,
        tombstones: total.tombstones + r.value.tombstones,
      }),
      { imported: 0, present: 0, tombstones: 0 },
    );
    progress({ phase: 'images', ...images });
    if (changed) {
      encoded = await encodeLocalValues(bucket, plan.values, {
        forceR2: !!JSON.parse(row.values).__processR2,
      });
      await decodeState(bucket, encoded);
      const result = await db
        .prepare(
          'UPDATE shared_state SET revision=?,"values"=?,updated_at=? WHERE id=1 AND revision=? AND "values"=?',
        )
        .bind(
          row.revision + 1,
          encoded,
          new Date().toISOString(),
          row.revision,
          row.values,
        )
        .run();
      if (result.meta.changes !== 1) fail('STAGING_REVISION_CONFLICT');
      written = true;
    }
    await afterWrite?.();
    const verify = await db
      .prepare(
        'SELECT revision,"values",updated_at FROM shared_state WHERE id=1',
      )
      .first();
    if (
      verify.revision !== row.revision + Number(changed) ||
      (changed && verify.values !== encoded) ||
      (!changed && verify.values !== row.values)
    )
      fail('POST_SYNC_REVISION_CHANGED');
    const values = await decodeState(bucket, verify.values);
    if (!same(values, plan.values)) fail('POST_SYNC_VERIFY_FAILED');
    const repeat = planState(root, values, pkg);
    if (!same(repeat.values, values)) fail('NON_IDEMPOTENT_PLAN');
    const bom = JSON.parse(values.bomOverrides);
    const roots = Object.keys(bom).length,
      rows = Object.values(bom).reduce((n, v) => n + v.length, 0);
    if (rows !== counts(pkg).bom) fail('BOM_COUNT_FAILED');
    const managed = [
      'masterDataControl',
      'approvalVersions',
      'processMasterData',
      'dispatchBoard',
      'processRoleTemplateOverrides',
      'processCustomRoles',
      'bomOverrides',
      'canonicalQuality',
      'versionSampleSeed4',
    ];
    await bucket.put(
      `${target.environment}-canonical/revisions/${verify.revision}-${sha256(verify.values)}.json`,
      JSON.stringify({
        dataVersion: pkg.manifest.dataVersion,
        generatedAt: pkg.manifest.generatedAt,
        domains: pkg.domains,
        managedHashes: Object.fromEntries(
          managed.map((k) => [k, sha256(values[k])]),
        ),
      }),
      { httpMetadata: { contentType: 'application/json' } },
    );
    const checkpointBody = await bucket.get(
      `${target.environment}-canonical/revisions/${verify.revision}-${sha256(verify.values)}.json`,
    );
    await bucket.put(
      `${target.environment}-canonical/latest.json`,
      await checkpointBody.text(),
      { httpMetadata: { contentType: 'application/json' } },
    );
    return {
      changed,
      revision: verify.revision,
      updatedAt: verify.updated_at,
      dataVersion: pkg.manifest.dataVersion,
      generatedAt: pkg.manifest.generatedAt,
      counts: counts(pkg),
      bom: { roots, rows, sha256: sha256(stable(bom)) },
      seedAdded: plan.added,
      images,
      backup,
      backupId,
    };
  } catch (error) {
    if (written) {
      const restored = await db
        .prepare(
          'UPDATE shared_state SET revision=revision+1,"values"=?,updated_at=? WHERE id=1 AND revision=? AND "values"=?',
        )
        .bind(row.values, new Date().toISOString(), row.revision + 1, encoded)
        .run();
      if (restored.meta.changes !== 1)
        fail('ROLLBACK_CONFLICT_MANUAL_RECOVERY_REQUIRED');
      error.restored = true;
    }
    throw error;
  }
}

export async function packageImageAssets(root, pkg) {
  const images = pkg.domains.assets.filter((r) => !r.deletedAt && r.web),
    byId = new Map(images.map((r) => [r.id, r])),
    aliases = new Map();
  const add = (relative, record) => {
    const old = aliases.get(relative);
    if (old && old.web.sha256 !== record.web.sha256)
      fail('LEGACY_IMAGE_ALIAS_CONFLICT');
    aliases.set(relative, record);
  };
  for (const r of images)
    add('equipment-20260910/' + r.sha256.slice(0, 20) + '.webp', r);
  function walk(value) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') {
      if (
        value.presetKey &&
        typeof value.mediaName === 'string' &&
        /^[a-z-]+\.png$/.test(value.mediaName) &&
        byId.has(value.media)
      )
        add('process-templates/' + value.mediaName, byId.get(value.media));
      if (
        typeof value.name === 'string' &&
        /^hose-[a-z-]+\.png$/.test(value.name) &&
        byId.has(value.src)
      )
        add('demo-process/' + value.name, byId.get(value.src));
      Object.values(value).forEach(walk);
    }
  }
  walk(pkg.domains);
  const sharp = (await import('sharp')).default;
  for (const r of images) {
    const file = path.join(
      root,
      'dist/client/process/assets/canonical',
      r.web.sha256 + '.webp',
    );
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, readWebImage(root, r));
  }
  for (const [relative, r] of aliases) {
    const file = path.join(root, 'dist/client/process/assets', relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const raw = readWebImage(root, r);
    fs.writeFileSync(
      file,
      relative.endsWith('.png') ? await sharp(raw).png().toBuffer() : raw,
    );
  }
  return { images: images.length, aliases: aliases.size };
}
const git = (args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
async function command(args, { quiet = false, releaseUrl } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, args, {
      env: {
        ...process.env,
        WRANGLER_WRITE_LOGS: 'false',
        WRANGLER_SEND_METRICS: 'false',
        CLOUDFLARE_CF_FETCH_ENABLED: 'false',
        ...(releaseUrl ? { PROCESS_RELEASE_URL: releaseUrl } : {}),
      },
      stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
    let output = '';
    if (quiet) {
      p.stdout.on('data', (d) => (output += d));
      p.stderr.on('data', () => {});
    }
    p.on('error', () => reject(Error('COMMAND_START_FAILED')));
    p.on('exit', (code) =>
      code === 0
        ? resolve(output)
        : reject(Error('COMMAND_FAILED_' + args.slice(0, 3).join('_'))),
    );
  });
}
export async function runRelease(
  root,
  { syncOnly = false, productionApprovedSha } = {},
) {
  if (!productionApprovedSha) target = stagingTarget;
  if (productionApprovedSha) {
    if (
      !/^[a-f0-9]{40}$/.test(productionApprovedSha) ||
      productionApprovedSha !== git(['rev-parse', 'HEAD'])
    )
      fail('PRODUCTION_MAIN_APPROVAL_REQUIRED');
    target = productionTarget;
  }
  if (
    git(['branch', '--show-current']) !== 'main' ||
    git(['status', '--porcelain'])
  )
    fail('CLEAN_MAIN_REQUIRED');
  await new Promise((resolve, reject) => {
    const p = spawn('git', ['fetch', 'origin'], { stdio: 'inherit' });
    p.on('exit', (c) => (c === 0 ? resolve() : reject(Error('FETCH_FAILED'))));
  });
  const sha = git(['rev-parse', 'HEAD']);
  if (sha !== git(['rev-parse', 'origin/main'])) fail('MAIN_NOT_CURRENT');
  if (syncOnly) {
    const existing = await fetch(
      target.url + `/${target.environment}-release.json`,
    );
    if (existing.status !== 200 || (await existing.json()).commit !== sha)
      fail('DEPLOYED_SHA_MISMATCH');
  }
  const pkg = readPackage(root);
  for (const r of pkg.domains.assets)
    if (!r.deletedAt && r.web) readWebImage(root, r);
  const dir = path.join(root, `.wrangler/${target.environment}-release`);
  fs.mkdirSync(dir, { recursive: true });
  const lock = path.join(dir, 'lock');
  try {
    fs.mkdirSync(lock);
  } catch {
    fail('STAGING_RELEASE_LOCKED');
  }
  let proxy;
  try {
    const config = {
      name: target.name,
      account_id: target.account_id,
      compatibility_date: '2026-05-15',
      compatibility_flags: ['nodejs_compat'],
      d1_databases: [
        {
          binding: 'DB',
          database_name: target.database_name,
          database_id: target.database_id,
          migrations_dir: '../../drizzle',
        },
      ],
      r2_buckets: [
        { binding: 'STATE_ARCHIVE', bucket_name: target.bucket_name },
      ],
    };
    const cfg = path.join(dir, 'wrangler.json');
    fs.writeFileSync(cfg, JSON.stringify(config));
    const wrangler = ['node_modules/wrangler/bin/wrangler.js'];
    const backupDir = path.join(
      dir,
      'backups',
      new Date().toISOString().replaceAll(':', '-'),
    );
    fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `${target.environment}-d1.sql`);
    await command(
      [
        ...wrangler,
        'd1',
        'export',
        'DB',
        '--remote',
        '--config',
        cfg,
        '--output',
        backupFile,
        '--skip-confirmation',
      ],
      { quiet: true },
    );
    const sql = fs.readFileSync(backupFile, 'utf8'),
      sqlite = new DatabaseSync(':memory:');
    sqlite.exec(sql);
    const exported = sqlite
      .prepare('SELECT revision,"values" FROM shared_state WHERE id=1')
      .get();
    const backupCount = sqlite
      .prepare('SELECT COUNT(*) AS n FROM state_backups')
      .get().n;
    sqlite.close();
    console.log(
      JSON.stringify({
        phase: 'full-d1-backup',
        file: backupFile,
        sha256: sha256(sql),
        revision: exported.revision,
        backupRows: backupCount,
      }),
    );
    if (!syncOnly) {
      await command(['scripts/local-build.mjs'], { quiet: true });
      console.log(
        JSON.stringify({
          phase: 'package-images',
          ...(await packageImageAssets(root, pkg)),
        }),
      );
      fs.writeFileSync(
        path.join(root, `dist/client/${target.environment}-release.json`),
        JSON.stringify({
          commit: sha,
          dataVersion: pkg.manifest.dataVersion,
          images: counts(pkg).assets,
        }),
      );
      const built = JSON.parse(fs.readFileSync('dist/server/wrangler.json'));
      Object.assign(built, {
        name: target.name,
        topLevelName: target.name,
        account_id: target.account_id,
        keep_vars: true,
        limits: { ...built.limits, cpu_ms: 1000 },
        d1_databases: [
          { ...config.d1_databases[0], migrations_dir: '../../drizzle' },
        ],
        r2_buckets: config.r2_buckets,
        vars:
          target.environment === 'staging'
            ? { PROCESS_PUBLIC_DEMO: 'false', PROCESS_RELEASE_DISABLED: 'true' }
            : {},
      });
      const deployConfig = path.join(
        root,
        `dist/server/wrangler.${target.environment}.json`,
      );
      fs.writeFileSync(deployConfig, JSON.stringify(built));
      await command(
        [...wrangler, 'deploy', '--config', deployConfig, '--dry-run'],
        { quiet: true },
      );
      await command(
        [
          ...wrangler,
          'deploy',
          '--config',
          deployConfig,
          '--tag',
          sha.slice(0, 8),
          '--message',
          `${target.environment} complete main ${sha}`,
        ],
        { quiet: true },
      );
      console.log(JSON.stringify({ phase: 'code-deployed', commit: sha }));
    }
    await command(
      [
        ...wrangler,
        'd1',
        'migrations',
        'apply',
        'DB',
        '--remote',
        '--config',
        cfg,
      ],
      { quiet: true },
    );
    console.log('PASS Staging migrations');
    const remoteCfg = path.join(dir, 'remote.json');
    fs.writeFileSync(
      remoteCfg,
      JSON.stringify({
        ...config,
        d1_databases: config.d1_databases.map((b) => ({ ...b, remote: true })),
        r2_buckets: config.r2_buckets.map((b) => ({ ...b, remote: true })),
      }),
    );
    process.env.WRANGLER_WRITE_LOGS = 'false';
    process.env.WRANGLER_SEND_METRICS = 'false';
    process.env.CLOUDFLARE_CF_FETCH_ENABLED = 'false';
    const { getPlatformProxy } = await import('wrangler');
    proxy = await getPlatformProxy({
      configPath: remoteCfg,
      remoteBindings: true,
      persist: false,
      envFiles: [],
    });
    const db = proxy.env.DB,
      bucket = boundedBucket(proxy.env.STATE_ARCHIVE);
    const result = await syncState(root, db, bucket, pkg, {
      exportBackup: async (row) => {
        if (
          row.revision !== exported.revision ||
          row.values !== exported.values
        )
          fail('D1_CHANGED_AFTER_EXPORT');
        return backupFile;
      },
      progress: (x) => console.log(JSON.stringify(x)),
    });
    console.log(
      JSON.stringify({ phase: 'data-complete', commit: sha, ...result }),
    );
    await proxy.dispose();
    proxy = undefined;
    await smokeRelease(root, pkg, sha);
    await command(
      [
        path.join(
          path.dirname(fileURLToPath(import.meta.url)),
          'test-release-main-browser.cjs',
        ),
      ],
      { releaseUrl: target.url },
    );
    fs.writeFileSync(
      path.join(dir, 'result.json'),
      JSON.stringify({ commit: sha, url: target.url, ...result }, null, 2),
    );
    return result;
  } finally {
    await proxy?.dispose();
    fs.rmdirSync(lock);
  }
}
export async function smokeRelease(root, pkg, sha) {
  const marker = await fetch(
    target.url + `/${target.environment}-release.json`,
  );
  if (marker.status !== 200 || (await marker.json()).commit !== sha)
    fail('DEPLOYED_SHA_MISMATCH');
  for (const file of ['app.js', 'shared-state.js', 'styles.css']) {
    const r = await fetch(target.url + '/process/' + file);
    if (
      r.status !== 200 ||
      sha256(Buffer.from(await r.arrayBuffer())) !==
        sha256(fs.readFileSync(path.join(root, 'public/process', file)))
    )
      fail('STATIC_MAIN_MISMATCH');
  }
  const response = await fetch(target.url + '/api/shared-state');
  if (response.status !== 200) fail('STATE_API_FAILED');
  const state = await response.json();
  const planned = planState(root, state.values, pkg);
  for (const k of [
    'bomOverrides',
    'masterDataControl',
    'processMasterData',
    'dispatchBoard',
    'processRoleTemplateOverrides',
    'processCustomRoles',
    'canonicalQuality',
    'approvalVersions',
  ])
    if (!same(JSON.parse(state.values[k]), JSON.parse(planned.values[k])))
      fail('CANONICAL_API_MISMATCH_' + k);
  for (const role of ['admin', 'rd', 'staff']) {
    const r = await fetch(target.url + '/api/platform-login', {
      method: 'POST',
      headers: { Origin: target.url, 'Content-Type': 'application/json' },
      body: JSON.stringify({ demoRole: role }),
    });
    if (r.status !== 200) fail('DEMO_LOGIN_FAILED_' + role);
    const user = (await r.json()).user;
    if (user.id !== 'demo-' + role || user.role !== role)
      fail('DEMO_ROLE_FAILED');
    const signed = await fetch(target.url + '/api/shared-state', {
      headers: { Cookie: r.headers.get('set-cookie').split(';')[0] },
    });
    if (signed.status !== 200 || (await signed.json()).identity?.id !== user.id)
      fail('DEMO_SESSION_FAILED');
    console.log('PASS demo login and session ' + role);
  }
  const imageRecords = pkg.domains.assets.filter((r) => !r.deletedAt && r.web);
  let images = 0;
  for (let offset = 0; offset < imageRecords.length; offset += 8) {
    const checked = await Promise.allSettled(
      imageRecords.slice(offset, offset + 8).map(async (record) => {
        const r = await fetch(
          target.url + hostedImageUrl(record).split('#')[0],
        );
        if (
          r.status !== 200 ||
          sha256(Buffer.from(await r.arrayBuffer())) !== record.web.sha256
        )
          fail('HOSTED_IMAGE_FAILED');
      }),
    );
    const rejected = checked.find((r) => r.status === 'rejected');
    if (rejected) throw rejected.reason;
    images += checked.length;
  }
  for (const route of ['/', '/process/', '/api/release-state']) {
    const r = await fetch(target.url + route);
    if (r.status !== (route === '/api/release-state' ? 403 : 200))
      fail('ROUTE_SMOKE_FAILED');
  }
  console.log(
    JSON.stringify({
      phase: 'smoke-pass',
      commit: sha,
      imagesVerified: images,
      canonicalCounts: counts(pkg),
    }),
  );
}
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const args = process.argv.slice(2);
  let syncOnly = false,
    environment = 'staging',
    approvedSha;
  try {
    while (args.length) {
      const arg = args.shift();
      if (arg === '--sync-only') syncOnly = true;
      else if (arg === '--target') environment = args.shift();
      else if (arg === '--approved-sha') approvedSha = args.shift();
      else fail('UNSUPPORTED_RELEASE_OVERRIDE');
    }
    if (!['staging', 'production'].includes(environment))
      fail('UNKNOWN_RELEASE_TARGET');
    if (environment === 'production' && !approvedSha)
      fail('PRODUCTION_MAIN_APPROVAL_REQUIRED');
    if (environment === 'staging' && approvedSha)
      fail('UNEXPECTED_PRODUCTION_APPROVAL');
    await runRelease(process.cwd(), {
      syncOnly,
      productionApprovedSha:
        environment === 'production' ? approvedSha : undefined,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        error: /^[A-Z0-9_]+$/.test(error.message)
          ? error.message
          : 'TARGET_RELEASE_FAILED_DETAILS_SUPPRESSED',
        restored: error.restored || false,
      }),
    );
    process.exitCode = 1;
  }
}
