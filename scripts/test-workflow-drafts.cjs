/* oxlint-disable typescript/no-require-imports -- CommonJS is required by the isolated VM API fixture. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE shared_state(id INTEGER PRIMARY KEY,revision INTEGER,"values" TEXT,updated_at TEXT);
  CREATE TABLE state_backups(id TEXT PRIMARY KEY,revision INTEGER,"values" TEXT,reason TEXT,actor TEXT,created_at TEXT)
`);
const env = {
  DB: {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async run() {
          const result = db.prepare(sql).run(...args);
          return { meta: { changes: Number(result.changes) } };
        },
        async first() { return db.prepare(sql).get(...args) || null; },
        async all() { return { results: db.prepare(sql).all(...args) }; },
      };
    },
  },
};

const passwords = {
  a: crypto.randomUUID(),
  b: crypto.randomUUID(),
  rd: crypto.randomUUID(),
  admin: crypto.randomUUID(),
};
const users = [
  ['staff.a', '員工 A', 'staff', passwords.a],
  ['staff.b', '員工 B', 'staff', passwords.b],
  ['rd', 'RD 主管', 'rd', passwords.rd],
  ['admin', 'ADMIN', 'admin', passwords.admin],
].map(([id, name, role, password]) => ({
  id, name, role, password, enabled: true, inheritRole: true,
}));
const original = {
  S1: [
    { id: 'OP-1', name: '原始名稱', note: '原始備註' },
    { id: 'OP-2', name: '其他流程', note: '' },
  ],
};
const values = {
  platformUsers: JSON.stringify(users),
  processCustomRoles: '[]',
  processRoleTemplateOverrides: '{}',
  approvalVersions: JSON.stringify([
    {
      id: 'PV-1', number: 1, category: 'CAT', line: 'A', status: 'approved',
      stages: original, creatorId: 'admin', creatorName: 'ADMIN',
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ]),
  'processEditor:CAT:A': JSON.stringify({ category: 'CAT', line: 'A', stages: original }),
  masterDataControl: JSON.stringify({
    active: {
      AB: {
        name: 'AB',
        products: [{ code: 'P-1', name: '產品', stages: ['S1'] }],
        lines: [{ code: 'A', name: 'A', stages: [{ code: 'S1', name: '工段' }] }],
      },
      C: { name: 'C', products: [], lines: [] },
      PROCESS: original,
    },
    versions: [],
  }),
  processMasterData: JSON.stringify(original),
  bomOverrides: JSON.stringify({
    SKU1: [{ level: 0, levelLabel: 'L0', itemCode: '', itemName: 'SKU1' }],
  }),
};
db.prepare('INSERT INTO shared_state(id,revision,"values",updated_at) VALUES(1,?,?,?)')
  .run(1, JSON.stringify(values), 'fixture');

const cache = new Map();
function resolveModule(id, from) {
  if (id === 'cloudflare:workers') return id;
  if (id === '@/db/seed.json') return id;
  if (id.startsWith('@/')) return path.resolve(id.slice(2)) + (path.extname(id) ? '' : '.ts');
  if (id.startsWith('.')) {
    const target = path.resolve(path.dirname(from), id);
    if (fs.existsSync(target)) return target;
    if (fs.existsSync(`${target}.ts`)) return `${target}.ts`;
    if (fs.existsSync(`${target}.mjs`)) return `${target}.mjs`;
  }
  return id;
}
function load(file) {
  if (file === 'cloudflare:workers') return { env };
  if (file === '@/db/seed.json') return { revision: 1, values };
  if (!path.isAbsolute(file)) return require(file);
  if (file.endsWith('demo-identities.mjs')) return require(file);
  if (cache.has(file)) return cache.get(file).exports;
  const loadedModule = { exports: {} };
  cache.set(file, loadedModule);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(source, {
    module: loadedModule,
    exports: loadedModule.exports,
    require: (id) => load(resolveModule(id, file)),
    Response, Request, URL, crypto, Date, console, TextEncoder, TextDecoder,
    atob, btoa, structuredClone, setTimeout, clearTimeout,
  }, { filename: file });
  return loadedModule.exports;
}

const api = load(path.resolve('app/api/workflow-drafts/route.ts'));
const auth = (id, password) => ({
  Origin: 'https://example.test',
  'Content-Type': 'application/json',
  'X-Process-Admin-Id': id,
  'X-Process-Admin-Password': password,
});
const post = (id, password, body) => api.POST(new Request(
  'https://example.test/api/workflow-drafts',
  { method: 'POST', headers: auth(id, password), body: JSON.stringify(body) },
));
const get = (id, password) => api.GET(new Request(
  'https://example.test/api/workflow-drafts',
  { headers: auth(id, password) },
));
const body = async (response, status = 200) => {
  const result = await response.json();
  assert.equal(response.status, status, JSON.stringify(result));
  return result;
};
const processScope = 'CAT|A';
const processSave = (payload, current) => ({
  action: 'save', kind: 'process', scope: processScope, payload,
  draftId: current?.id, expectedVersion: current?.version || 0,
});

(async () => {
  const aPayload = structuredClone(original);
  aPayload.S1[0].name = '員工 A 版本';
  let a = await body(await post('staff.a', passwords.a, processSave(aPayload)));
  assert.equal(a.draft.ownerId, 'staff.a');

  let reopen = await body(await get('staff.a', passwords.a));
  assert.equal(reopen.drafts.length, 1);
  assert.equal(reopen.drafts[0].draft.payload.S1[0].name, '員工 A 版本');
  assert.ok(!JSON.stringify(await body(await get('staff.b', passwords.b))).includes('員工 A 版本'));

  const staleVersion = a.draft.version;
  aPayload.S1[0].note = 'A 新備註';
  a = await body(await post('staff.a', passwords.a, processSave(aPayload, a.draft)));
  const stale = await body(
    await post('staff.a', passwords.a, {
      ...processSave(aPayload, a.draft), expectedVersion: staleVersion,
    }),
    409,
  );
  assert.equal(stale.code, 'DRAFT_VERSION_CONFLICT');
  const submittedA = await body(await post('staff.a', passwords.a, {
    action: 'submit', kind: 'process', scope: processScope,
    draftId: a.draft.id, expectedVersion: a.draft.version,
  }));
  assert.equal(submittedA.draft.status, 'locked');

  const bPayload = structuredClone(original);
  bPayload.S1[0].name = '員工 B 版本';
  bPayload.S1[1].note = 'B 獨立變更';
  let b = await body(await post('staff.b', passwords.b, processSave(bPayload)));
  bPayload.S1[0].note = 'B 可繼續儲存';
  b = await body(await post('staff.b', passwords.b, processSave(bPayload, b.draft)));
  assert.ok(b.analysis.waiting.length > 0);
  const waiting = await body(await post('staff.b', passwords.b, {
    action: 'submit', kind: 'process', scope: processScope,
    draftId: b.draft.id, expectedVersion: b.draft.version,
  }), 409);
  assert.equal(waiting.code, 'WAITING_REVIEW');

  const stolen = await body(await post('staff.b', passwords.b, {
    action: 'save', kind: 'process', scope: processScope, payload: bPayload,
    draftId: submittedA.draft.id, expectedVersion: submittedA.draft.version,
  }), 403);
  assert.match(stolen.error, /其他員工/);
  await body(await post('staff.b', passwords.b, {
    action: 'save', kind: 'process', scope: processScope, payload: bPayload,
    draftId: 'WD-missing', expectedVersion: b.draft.version,
  }), 404);

  await body(await post('rd', passwords.rd, {
    action: 'approve', kind: 'process', scope: processScope,
    caseId: submittedA.case.id, note: 'A 確認',
  }));
  reopen = await body(await get('staff.b', passwords.b));
  b = reopen.drafts[0];
  assert.ok(b.analysis.conflicts.length > 0);
  const conflict = b.analysis.conflicts.find((item) => item.location.field === 'name');
  assert.ok(conflict, JSON.stringify(b.analysis.conflicts));
  assert.equal(conflict.baseValue, '原始名稱');
  assert.equal(conflict.currentValue, '員工 A 版本');
  assert.equal(conflict.mineValue, '員工 B 版本');
  b = await body(await post('staff.b', passwords.b, {
    action: 'resolve', kind: 'process', scope: processScope,
    draftId: b.draft.id, expectedVersion: b.draft.version,
    changeId: conflict.id, strategy: 'mine',
  }));
  assert.equal(b.analysis.conflicts.find((item) => item.id === conflict.id).resolved, true);
  for (const unresolved of b.analysis.conflicts.filter((item) => !item.resolved)) {
    b = await body(await post('staff.b', passwords.b, {
      action: 'resolve', kind: 'process', scope: processScope,
      draftId: b.draft.id, expectedVersion: b.draft.version,
      changeId: unresolved.id, strategy: 'mine',
    }));
  }
  const submittedB = await body(await post('staff.b', passwords.b, {
    action: 'submit', kind: 'process', scope: processScope,
    draftId: b.draft.id, expectedVersion: b.draft.version,
  }));
  assert.equal(submittedB.draft.status, 'locked');
  await body(await post('staff.b', passwords.b, processSave(bPayload, submittedB.draft)), 409);
  await body(await post('rd', passwords.rd, {
    action: 'approve', kind: 'process', scope: processScope,
    caseId: submittedB.case.id, note: 'B 確認',
  }));

  const current = JSON.parse(db.prepare('SELECT "values" FROM shared_state WHERE id=1').get().values);
  const approved = JSON.parse(current.approvalVersions).find((item) => item.status === 'approved');
  assert.equal(approved.stages.S1[0].name, '員工 B 版本');
  assert.equal(approved.stages.S1[1].note, 'B 獨立變更');

  const conflictPayload = structuredClone(approved.stages);
  conflictPayload.S1[0].name = 'A 第二次';
  a = await body(await post('staff.a', passwords.a, processSave(conflictPayload)));
  const conflictCase = await body(await post('staff.a', passwords.a, {
    action: 'submit', kind: 'process', scope: processScope,
    draftId: a.draft.id, expectedVersion: a.draft.version,
  }));
  const outside = JSON.parse(db.prepare('SELECT "values" FROM shared_state WHERE id=1').get().values);
  const outsideVersions = JSON.parse(outside.approvalVersions);
  const live = outsideVersions.find((item) => item.status === 'approved');
  live.stages.S1[0].name = '外部新值';
  outside['processEditor:CAT:A'] = JSON.stringify({ category: 'CAT', line: 'A', stages: live.stages });
  outside.approvalVersions = JSON.stringify(outsideVersions);
  const revision = db.prepare('SELECT revision FROM shared_state WHERE id=1').get().revision;
  db.prepare('UPDATE shared_state SET revision=?,"values"=?,updated_at=? WHERE id=1')
    .run(revision + 1, JSON.stringify(outside), 'outside-change');
  const stopped = await body(await post('rd', passwords.rd, {
    action: 'approve', kind: 'process', scope: processScope,
    caseId: conflictCase.case.id,
  }), 409);
  assert.equal(stopped.code, 'REVIEW_VERSION_CONFLICT');
  const afterStopped = JSON.parse(db.prepare('SELECT "values" FROM shared_state WHERE id=1').get().values);
  assert.equal(JSON.parse(afterStopped.approvalVersions).find((item) => item.status === 'approved').stages.S1[0].name, '外部新值');
  await body(await post('rd', passwords.rd, {
    action: 'reject', kind: 'process', scope: processScope,
    caseId: conflictCase.case.id, note: '請重新比對',
  }));
  reopen = await body(await get('staff.a', passwords.a));
  assert.equal(reopen.drafts[0].draft.status, 'draft');

  const masterPayload = {
    name: 'AB',
    products: [{ code: 'P-1', name: '產品修改', stages: ['S1'] }],
    lines: [{ code: 'A', name: 'A', stages: [{ code: 'S1', name: '工段' }] }],
  };
  const master = await body(await post('staff.b', passwords.b, {
    action: 'save', kind: 'master', scope: 'AB', payload: masterPayload,
    expectedVersion: 0,
  }));
  assert.equal(master.draft.kind, 'master');

  const bomPayload = {
    SKU1: [{ level: 0, levelLabel: 'L0', itemCode: '', itemName: 'SKU1 草稿' }],
  };
  const bom = await body(await post('admin', passwords.admin, {
    action: 'save', kind: 'bom', scope: 'BOM', payload: bomPayload,
    expectedVersion: 0,
  }));
  assert.equal(bom.draft.kind, 'bom');
  const invalidBom = await body(await post('admin', passwords.admin, {
    action: 'save', kind: 'bom', scope: 'BOM', payload: { SKU1: {} },
    draftId: bom.draft.id, expectedVersion: bom.draft.version,
  }), 400);
  assert.match(invalidBom.error, /結構/);

  assert.ok(Number(db.prepare('SELECT COUNT(*) count FROM state_backups').get().count) >= 10);
  console.log('PASS: isolated D1 per-user process/master/BOM drafts, two-account ownership, reopen, stale-version guard, wait, three-way conflict, resolution, lock, supervisor conflict stop, rejection unlock, and backups.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
