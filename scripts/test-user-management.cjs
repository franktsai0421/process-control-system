const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE shared_state(id INTEGER PRIMARY KEY,revision INTEGER,"values" TEXT,updated_at TEXT); CREATE TABLE state_backups(id TEXT PRIMARY KEY,revision INTEGER,"values" TEXT,reason TEXT,actor TEXT,created_at TEXT)');
const env = { DB: { prepare(sql) { let args = []; return { bind(...value) { args = value; return this; }, async run() { const result = db.prepare(sql).run(...args); return { meta: { changes: Number(result.changes) } }; }, async first() { return db.prepare(sql).get(...args) || null; }, async all() { return { results: db.prepare(sql).all(...args) }; } }; } } };
const adminPassword = crypto.randomUUID(), staffPassword = crypto.randomUUID(), resetPassword = crypto.randomUUID();
const seed = { revision: 1, values: { platformUsers: JSON.stringify([{ id: 'admin', name: 'Existing Admin', role: 'admin', password: adminPassword, enabled: true, lines: ['A','B','C'], views: ['dashboard','data'], permissions: [] }]), processCustomRoles: '[]', processRoleTemplateOverrides: '{}', approvalVersions: '[]' } };
db.prepare('INSERT INTO shared_state(id,revision,"values",updated_at) VALUES(1,?,?,?)').run(seed.revision,JSON.stringify(seed.values),'fixture');
const cache = {};
function load(file) {
  if (cache[file]) return cache[file];
  const module = { exports: {} }; cache[file] = module.exports;
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require: (id) => id.endsWith('.mjs') ? require(path.resolve('lib/demo-identities.mjs')) : id === 'cloudflare:workers' ? { env } : id === '@/db/seed.json' ? seed : load(path.resolve(id.includes('user-access')?'lib/user-access.ts':'lib/process-state.ts')), Response, Request, URL, crypto, Date, console, TextEncoder, atob, btoa });
  return module.exports;
}
const usersApi = load(path.resolve('app/api/users/route.ts'));
const loginApi = load(path.resolve('app/api/platform-login/route.ts'));
const headers = { Origin: 'https://example.test', 'Content-Type': 'application/json', 'X-Process-Admin-Id': 'Admin', 'X-Process-Admin-Password': adminPassword };
const post = (body) => usersApi.POST(new Request('https://example.test/api/users', { method: 'POST', headers, body: JSON.stringify(body) }));

(async () => {
  let response = await post({ action: 'create', id: 'New.Staff', name: 'New Staff', password: staffPassword, role: 'staff', baseRevision: 1 });
  assert.equal(response.status, 200);
  let state = await response.json(), listed = JSON.parse(state.values.platformUsers), staff = listed.find((user) => user.id === 'new.staff');
  assert.ok(staff); assert.equal(staff.role, 'staff'); assert.equal(staff.enabled, true); assert.equal(staff.inheritRole, true); assert.ok(!('password' in staff));
  response = await post({ action: 'create', id: 'NEW.STAFF', name: 'Duplicate', password: staffPassword, baseRevision: state.revision });
  assert.equal(response.status, 409);
  response = await post({ action: 'update', id: 'NEW.STAFF', name: 'Updated Staff', role: 'staff', enabled: true, inheritRole: false, lines: ['B'], views: ['dashboard'], permissions: [], baseRevision: state.revision });
  assert.equal(response.status, 200); state = await response.json(); staff = JSON.parse(state.values.platformUsers).find((user) => user.id === 'new.staff'); assert.deepEqual(staff.lines, ['B']); assert.equal(staff.inheritRole, false);
  response = await post({ action: 'reset-password', id: 'new.staff', password: resetPassword, baseRevision: state.revision });
  assert.equal(response.status, 200); state = await response.json(); assert.ok(!state.values.platformUsers.includes(resetPassword));
  let login = await loginApi.POST(new Request('https://example.test/api/platform-login', { method: 'POST', headers: { Origin: 'https://example.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'NEW.STAFF', password: resetPassword }) }));
  assert.equal(login.status, 200);
  response = await post({ action: 'update', id: 'new.staff', enabled: false, role: 'staff', baseRevision: state.revision });
  assert.equal(response.status, 200); state = await response.json();
  login = await loginApi.POST(new Request('https://example.test/api/platform-login', { method: 'POST', headers: { Origin: 'https://example.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'new.staff', password: resetPassword }) }));
  assert.equal(login.status, 403); assert.equal((await login.json()).code, 'ACCOUNT_DISABLED');
  response = await post({ action: 'delete', id: 'new.staff', baseRevision: state.revision }); assert.equal(response.status, 200); state = await response.json();
  response = await post({ action: 'create', id: 'history.staff', name: 'History Staff', password: staffPassword, role: 'staff', baseRevision: state.revision }); assert.equal(response.status, 200); state = await response.json();
  const stored = JSON.parse(db.prepare('SELECT "values" FROM shared_state WHERE id=1').get().values); stored.approvalVersions = JSON.stringify([{ id: 'v1', creatorId: 'history.staff' }]); db.prepare('UPDATE shared_state SET revision=?,"values"=?,updated_at=? WHERE id=1').run(state.revision + 1, JSON.stringify(stored), new Date().toISOString()); state.revision += 1;
  response = await post({ action: 'delete', id: 'history.staff', baseRevision: state.revision }); assert.equal(response.status, 200);state=await response.json();assert.ok(JSON.parse(state.values.platformUsers).find(user=>user.id==='history.staff').deletedAt);
  response = await post({ action: 'update', id: 'admin', role: 'admin', enabled: false, baseRevision: state.revision }); assert.equal(response.status, 409);
  assert.equal(Number(db.prepare('SELECT COUNT(*) count FROM state_backups').get().count) >= 5, true);
  const access=load(path.resolve('lib/user-access.ts'));
  response=await post({action:'role-create',name:'Line B',lines:['B'],views:['dashboard'],permissions:['approval.submit'],baseRevision:state.revision});assert.equal(response.status,200);state=await response.json();
  const role=JSON.parse(state.values.processCustomRoles)[0].id;
  response=await post({action:'create',id:'role.test',name:'Role Test',password:staffPassword,role,baseRevision:state.revision});assert.equal(response.status,200);state=await response.json();
  response=await post({action:'role-delete',id:role,baseRevision:state.revision});assert.equal(response.status,409);
  response=await post({action:'role-save',id:role,name:'Line C',lines:['C'],views:['editor'],permissions:[],baseRevision:state.revision});assert.equal(response.status,200);state=await response.json();
  let u=JSON.parse(state.values.platformUsers).find(u=>u.id==='role.test');assert.equal(access.effectiveAccess(u,state.values).lines.join(), 'C');
  response=await post({action:'update',id:u.id,role,inheritRole:false,lines:['B'],views:['dashboard'],permissions:[],baseRevision:state.revision});assert.equal(response.status,200);state=await response.json();
  response=await post({action:'role-save',id:role,name:'Line A',lines:['A'],views:['editor'],permissions:[],baseRevision:state.revision});state=await response.json();u=JSON.parse(state.values.platformUsers).find(u=>u.id==='role.test');assert.equal(access.effectiveAccess(u,state.values).lines.join(),'B');
  response=await post({action:'update',id:u.id,role:'staff',inheritRole:false,lines:['B'],views:['player'],permissions:[],baseRevision:state.revision});state=await response.json();u=JSON.parse(state.values.platformUsers).find(u=>u.id==='role.test');assert.equal(u.inheritRole,true);assert.equal(access.effectiveAccess(u,state.values).lines.join(),'A');
  response=await post({action:'role-delete',id:role,baseRevision:state.revision});assert.equal(response.status,200);state=await response.json();
  response=await post({action:'role-save',id:'admin',name:'No',lines:[],baseRevision:state.revision});assert.equal(response.status,403);
  response=await post({action:'delete',id:'admin',baseRevision:state.revision});assert.equal(response.status,409);
  for(const id of ['admin','Admin'])assert.equal((await loginApi.POST(new Request('https://example.test/api/platform-login',{method:'POST',headers,body:JSON.stringify({id,password:adminPassword})}))).status,200);
  const local=(body,cookie='')=>new Request('http://localhost/api/platform-login',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
  const beforeDemo = JSON.parse(db.prepare('SELECT "values" FROM shared_state WHERE id=1').get().values);
  beforeDemo.platformUsers = JSON.stringify([...JSON.parse(beforeDemo.platformUsers), {id:'demo-admin',name:'Demo Admin',role:'admin',authMode:'demo',enabled:true,inheritRole:true}]);
  db.prepare('UPDATE shared_state SET "values"=? WHERE id=1').run(JSON.stringify(beforeDemo));
  for(let i=0;i<3;i++){
   const demo=await loginApi.POST(local({demoRole:'admin'}));assert.equal(demo.status,200);const cookie=demo.headers.get('set-cookie').split(';')[0];
   const processState=load(path.resolve('lib/process-state.ts'));assert.equal(await processState.demoSession(local({},cookie)),'demo-admin');
   const logout=await loginApi.POST(local({action:'logout'},cookie));assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);assert.ok(!await processState.demoSession(local({})));
  }
  env.DEMO_LOGIN_ENABLED='false';
  assert.equal((await loginApi.POST(new Request('https://example.test/api/platform-login',{method:'POST',headers,body:JSON.stringify({demoRole:'admin'})}))).status,403);
  console.log('PASS: isolated D1 user lifecycle, role templates/inheritance/custom/reset, archive/delete guards, case-insensitive login, local demo/logout/reenter, revision and redaction.');
})().catch((error) => { console.error(error); process.exit(1); });
