const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict'), ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const { randomBytes, webcrypto, createHmac } = require('node:crypto');
const db = new DatabaseSync(':memory:');
for (const file of fs.readdirSync('drizzle').filter(n => n.endsWith('.sql')).sort()) db.exec(fs.readFileSync(path.join('drizzle', file), 'utf8'));
const env = { PROCESS_SESSION_SECRET: randomBytes(48).toString('hex'), DB: { prepare(sql) {
  let args = []; return { bind(...values) { args = values; return this; },
    async run() { return { meta: { changes: Number(db.prepare(sql).run(...args).changes) } }; },
    async first() { return db.prepare(sql).get(...args) || null; },
    async all() { return { results: db.prepare(sql).all(...args) }; } };
} } };
const seed = JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'..','db','seed.json'), 'utf8')), cache = new Map();
db.prepare('INSERT INTO shared_state (id,revision,"values",updated_at) VALUES (1,?,?,?)').run(seed.revision,JSON.stringify(seed.values),'fixture');
function load(file) {
  file = path.resolve(file); if (cache.has(file)) return cache.get(file);
  const module = { exports: {} }; cache.set(file, module.exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const localRequire = id => {
    if (id === 'cloudflare:workers') return { env };
    if (id === '@/db/seed.json') return seed;
    let target = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(file), id);
    if (target.endsWith('.mjs')) return require(target);
    return load(target.endsWith('.ts') ? target : target + '.ts');
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire,
    Request, Response, URL, crypto: webcrypto, Date, TextEncoder, atob, btoa });
  cache.set(file, module.exports); return module.exports;
}
const state = load('lib/process-state.ts'), access = load('lib/user-access.ts');
const login = load('app/api/platform-login/route.ts'), usersApi = load('app/api/users/route.ts');
const shared = load('app/api/shared-state/route.ts'), backups = load('app/api/backups/route.ts');
const request = (body, cookie = '', url = 'https://example.test/api/platform-login') => new Request(url, {
  method: 'POST', headers: { Origin: new URL(url).origin, 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(body) });
function inspect(value) {
  if (typeof value === 'string') { try { inspect(JSON.parse(value)); } catch (e) { if (e instanceof assert.AssertionError) throw e; } }
  else if (Array.isArray(value)) value.forEach(inspect);
  else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    assert.ok(!/^(password|passwordHash)$/i.test(key), 'seed contains a credential field'); inspect(child);
  }
}
(async () => {
  inspect(seed); let current = await state.readState();
  const demoUsers = JSON.parse(current.values.platformUsers);
  assert.equal(demoUsers.length, 3); assert.ok(!demoUsers.some(u => u.id === 'admin'));
  for (const flag of [undefined, 'true']) {
    if (flag === undefined) delete env.DEMO_LOGIN_ENABLED; else env.DEMO_LOGIN_ENABLED = flag;
    for (const role of ['admin', 'rd', 'staff']) {
      const response = await login.POST(request({ demoRole: role })); assert.equal(response.status, 200);
      const result = await response.json(), cookie = response.headers.get('set-cookie').split(';')[0];
      assert.equal(result.user.id, 'demo-' + role); assert.equal(result.user.authMode, 'demo'); assert.equal(result.user.sessionType, 'demo');
      const expected = access.effectiveAccess(demoUsers.find(u => u.role === role), current.values);
      for (const key of ['lines', 'views', 'permissions']) assert.equal(JSON.stringify(result.user[key]), JSON.stringify(expected[key]));
      const payload = JSON.parse(atob(cookie.split('=')[1].split('.')[0]));
      assert.equal(payload.sessionType, 'demo'); assert.ok(payload.expires > Date.now()); assert.ok(!('password' in payload));
      const signed = new Request('https://example.test/api/shared-state', { headers: { Cookie: cookie } });
      assert.equal((await state.identity(signed, current)).role, role);
      assert.equal(await state.can(signed, current, 'approval.approve'), role !== 'staff');
      assert.equal(await state.can(signed, current, 'view:dispatch'), role === 'admin');
      const tampered = new Request(signed.url, { headers: { Cookie: cookie.slice(0, -1) + (cookie.endsWith('a') ? 'b' : 'a') } });
      assert.equal(await state.identity(tampered, current), null);
      for (const patch of [{ enabled: false }, { deletedAt: 'fixture' }, { authMode: 'platform' }, { role: 'custom' }]) {
        const invalid = { ...current, values: { ...current.values, platformUsers: JSON.stringify(demoUsers.map(u => u.role === role ? { ...u, ...patch } : u)) } };
        assert.equal(await state.identity(signed, invalid), null);
      }
      env.DEMO_LOGIN_ENABLED = 'false';
      assert.equal(await state.identity(signed, current), null);
      assert.equal((await login.POST(request({ demoRole: role }))).status, 403);
      assert.equal((await shared.POST(request({ updates: {}, baseRevision: current.revision }, cookie, signed.url))).status, 401);
      assert.equal((await usersApi.POST(request({ action: 'update', id: 'demo-rd', baseRevision: current.revision }, cookie, 'https://example.test/api/users'))).status, 403);
      assert.equal((await backups.GET(new Request('https://example.test/api/backups', { headers: { Cookie: cookie } }))).status, 403);
      if (flag === undefined) delete env.DEMO_LOGIN_ENABLED; else env.DEMO_LOGIN_ENABLED = flag;
    }
  }
  for (const body of [null, [], { demoRole: 'custom' }, { demoRole: 'ADMIN' }, { demoRole: 'admin', id: 'other' }, { demoRole: 'admin', permissions: ['master.delete'] }, { demoRole: 'staff', lines: ['B'] }, { demoRole: 'staff', role: 'admin' }])
    assert.equal((await login.POST(request(body))).status, 400);
  const signedRequest = value => {
    const payload = btoa(JSON.stringify(value));
    const token = payload + '.' + createHmac('sha256', env.PROCESS_SESSION_SECRET).update(payload).digest('hex');
    return new Request('https://example.test', { headers: { Cookie: 'process_demo=' + token } });
  };
  for (const value of [{version:2,id:'demo-admin',sessionType:'demo',expires:Date.now()-1},
    {id:'demo-admin',demo:true,expires:Date.now()+10000},
    {version:2,id:'other',sessionType:'demo',expires:Date.now()+10000}])
    assert.equal(await state.identity(signedRequest(value), current), null);
  const formal = { ...current, values: { ...current.values, platformUsers: JSON.stringify([{id:'formal-fixture',name:'Formal Fixture',role:'rd',enabled:true}]) } };
  env.DEMO_LOGIN_ENABLED = 'false';
  assert.equal((await state.identity(signedRequest({id:'formal-fixture',demo:false,expires:Date.now()+10000}), formal)).role, 'rd');
  delete env.DEMO_LOGIN_ENABLED;
  const adminResponse = await login.POST(request({demoRole:'admin'}));
  const adminCookie = adminResponse.headers.get('set-cookie').split(';')[0];
  assert.equal((await usersApi.POST(request({action:'reset-password',id:'demo-rd',password:randomBytes(16).toString('hex'),baseRevision:current.revision},adminCookie,'https://example.test/api/users'))).status,400);
  const cross = request({ demoRole: 'admin' }); const crossed = new Request(cross, { headers: { Origin: 'https://other.test' } });
  assert.equal((await login.POST(crossed)).status, 403);
  db.prepare('UPDATE shared_state SET "values"=? WHERE id=1').run(JSON.stringify({ ...seed.values, platformUsers: '[]' }));
  current = await state.readState(); assert.equal(current.values.platformUsers, '[]', 'readState silently inserted an administrator');
  assert.equal((await login.POST(request({ demoRole: 'admin' }))).status, 403);
  db.exec('DELETE FROM shared_state');
  await assert.rejects(()=>state.readState(),/explicit initialization/);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM shared_state').get().count,0);
  console.log('PASS: demo flags, signed sessions, revocation, fixed identities, existing role rules, protected APIs, seed and readState');
})().catch(() => { console.error('FAIL: isolated demo authentication check (sensitive details suppressed)'); process.exitCode = 1; }).finally(() => db.close());
