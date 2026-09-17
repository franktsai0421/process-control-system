const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(':memory:');
for (const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort()) db.exec(fs.readFileSync(path.join('drizzle',name),'utf8'));
const env = {
  DB: {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) {
          args = values;
          return this;
        },
        async run() {
          const result = db.prepare(sql).run(...args);
          return { meta: { changes: Number(result.changes) } };
        },
        async first() {
          return db.prepare(sql).get(...args) || null;
        },
        async all() {
          return { results: db.prepare(sql).all(...args) };
        },
      };
    },
  },
};
const presets = [
  'entry',
  'manual',
  'manual-inspection',
  'machine-assembly',
  'exit',
];
const catalog = (withCustom) => ({
  A1: [
    ...presets.map((presetKey, index) => ({
      id: `A1-${index + 1}`,
      name: presetKey,
      presetKey,
      mediaItems: [],
    })),
    ...(withCustom ? [{ id: 'A1-CUSTOM', name: 'Custom', mediaItems: [] }] : []),
  ],
});
const ab = {
  products: [{ code: 'P1', name: 'Product', stages: ['A1'] }],
  lines: [{ code: 'A', stages: [{ code: 'A1' }] }],
};
const c = { products: [], lines: [] };
const oldProcess = catalog(true);
const nextProcess = catalog(false);
const version = (id, number, status, snapshot) => ({
  id,
  scope: 'PROCESS',
  number,
  status,
  snapshot,
  creatorId: 'admin',
  creatorName: 'Admin',
  createdAt: '2026-09-10T00:00:00.000Z',
  updatedAt: '2026-09-10T00:00:00.000Z',
  history: [],
  warnings: [],
});
const priorMaster = {
  active: { AB: ab, C: c, PROCESS: oldProcess },
  versions: [
    version('PROCESS-1', 1, 'approved', oldProcess),
    version('PROCESS-2', 2, 'pending', nextProcess),
  ],
};
const seed = {
  revision: 1,
  values: {
    platformUsers: JSON.stringify([
      {
        id: 'admin',
        name: 'Admin',
        role: 'admin',
        password: 'secret',
        enabled: true,
        permissions: ['*'],
        views: ['data', 'approval'],
      },
    ]),
    processCustomRoles: '[]',
    processRoleTemplateOverrides: '{}',
    masterDataControl: JSON.stringify(priorMaster),
    processMasterData: JSON.stringify(oldProcess),
  },
};
db.prepare('INSERT INTO shared_state(id,revision,"values",updated_at) VALUES(1,?,?,?)').run(seed.revision,JSON.stringify(seed.values),'fixture');
const cache = {};
function load(file) {
  if (cache[file]) return cache[file];
  const module = { exports: {} };
  cache[file] = module.exports;
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    require: (id) =>
      id.endsWith('.mjs') ? require(path.resolve('lib/demo-identities.mjs')) : id === 'cloudflare:workers'
        ? { env }
        : id === '@/db/seed.json'
          ? seed
          : load(
              path.resolve(
                id.includes('user-access')
                  ? 'lib/user-access.ts'
                  : 'lib/process-state.ts',
              ),
            ),
    Response,
    Request,
    URL,
    crypto,
    TextEncoder, atob, btoa,
    Date,
    console,
  });
  return module.exports;
}

(async () => {
  const api = load(path.resolve('app/api/shared-state/route.ts'));
  const headers = {
    Origin: 'https://example.test',
    'Content-Type': 'application/json',
    'X-Process-Admin-Id': 'admin',
    'X-Process-Admin-Password': 'secret',
  };
  const request = (updates, baseRevision) =>
    new Request('https://example.test/api/shared-state', {
      method: 'POST',
      headers,
      body: JSON.stringify({ updates, baseRevision }),
    });

  const approvedMaster = JSON.parse(JSON.stringify(priorMaster));
  approvedMaster.active.PROCESS = nextProcess;
  approvedMaster.versions[0].status = 'superseded';
  approvedMaster.versions[1].status = 'approved';
  approvedMaster.versions[1].reviewedAt = '2026-09-10T01:00:00.000Z';
  const approval = await api.POST(
    request(
      {
        masterDataControl: JSON.stringify(approvedMaster),
        processMasterData: JSON.stringify(nextProcess),
      },
      1,
    ),
  );
  assert.equal(approval.status, 200);
  const approvedState = await approval.json();
  assert.deepEqual(
    JSON.parse(approvedState.values.processMasterData),
    nextProcess,
  );

  const bypass = await api.POST(
    request({ processMasterData: JSON.stringify(oldProcess) }, 2),
  );
  assert.equal(bypass.status, 403);
  assert.match((await bypass.json()).error, /先送審並由主管核准/);

  const malformed = JSON.parse(JSON.stringify(approvedMaster));
  malformed.versions.push(
    version('PROCESS-3', 3, 'draft', {
      A1: [{ id: 'ONLY-ONE', name: 'incomplete', presetKey: 'entry' }],
    }),
  );
  const rejected = await api.POST(
    request({ masterDataControl: JSON.stringify(malformed) }, 2),
  );
  assert.equal(rejected.status, 400);
  assert.match((await rejected.json()).error, /流程資料版本結構不完整/);
  const badEquipment = JSON.parse(JSON.stringify(approvedMaster));
  const equipmentSnapshot = catalog(false);
  equipmentSnapshot.A1.find(t => t.presetKey === 'machine-assembly').equipment = [{id:'EQ-test',number:'M001',name:'Machine',line:'A1',stageCode:'WRONG',kind:'machine-assembly',mediaItems:[]}];
  badEquipment.versions.push(version('PROCESS-3',3,'draft',equipmentSnapshot));
  const equipmentRejected = await api.POST(request({masterDataControl:JSON.stringify(badEquipment)},2));
  assert.equal(equipmentRejected.status,400,'equipment cannot claim a different stage');
  console.log(
    'PASS: PROCESS master approval can atomically apply deletions, while malformed process versions are rejected.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
