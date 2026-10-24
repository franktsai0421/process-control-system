import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {need, sha, stable, equal, isHash, parents, readFile, readPin, hashFile, writeJSON} from './u1-files.mjs';

// All three candidate files are installed together in project/scripts. No
// development-machine fallback is allowed in the employee entry point.
export const CODE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const canonical = name => import(pathToFileURL(path.join(CODE_ROOT, name)).href);
const metadata = value => Object.fromEntries(Object.entries(value||{}).map(([k,v])=>[k,v instanceof Date?v.toISOString():v]));
let auditRootBound=null;
// Private per-command SDK ownership. Unknown construction/disposal retains the
// actual update lease; no caller boolean or environment override can release it.
const bindingLifetimes=new Map();
export async function withStorageLeaseLifetime(root,lease,fn){
  need(!bindingLifetimes.has(root)&&lease?.purpose==='update'&&lease.root===root&&typeof lease.release==='function','U1_STORAGE_LIFETIME');
  const state={pending:0,shortPending:false,lease,shortStage:null};bindingLifetimes.set(root,state);
  try{return await fn();}finally{bindingLifetimes.delete(root);if(state.pending===0&&!state.shortPending)lease.release();}
}
export function assertBindingsClosed(root){need(bindingLifetimes.get(root)?.pending===0,'U1_SDK_CLOSURE_UNKNOWN');}

// Bound to this reviewed Miniflare D1/R2 layout; physical Win32 paths, no \\?\ override.
export function assertPinnedSDKLayout(root){
  for(const [relative,sha256,bytes]of [['node_modules/miniflare/dist/src/index.js','9584409d464f6c21d720b20da3c5dc6e5bdab0393f9cb19b36cb960beaf0958b',3866506],['node_modules/wrangler/wrangler-dist/cli.js','fc1aa72afc91906759a3555e76e6dae1b13504f71dec6d3bbfa0fe24c351ebd7',12595865]])need(equal(hashFile(path.join(root,relative)),{bytes,sha256}),'U1_NATIVE_SDK_LAYOUT_UNSUPPORTED');
}
export function assertNativePersistBudget(root){
  const suffixes=['d1/miniflare-D1DatabaseObject/','r2/miniflare-R2BucketObject/'].flatMap(d=>['a'.repeat(64)+'.sqlite','metadata.sqlite'].flatMap(n=>['','-wal','-shm','-journal'].map(t=>d+n+t)));
  suffixes.push('r2/site-creator-r2/blobs/'+'a'.repeat(80));
  for(const base of [path.join(root,'.wrangler/state/v3'),path.join(root,'.u1s')])for(const suffix of suffixes)need(path.join(base,suffix).length<260,'U1_NATIVE_STORAGE_PATH_TOO_LONG');
}
export function shortDirectoryIdentity(file){parents(file);const s=fs.lstatSync(file,{bigint:true});need(s.isDirectory()&&!s.isSymbolicLink(),'U1_SHORT_SDK_DIRECTORY');return{dev:String(s.dev),ino:String(s.ino)};}
export async function withShortStagePersist(root,lease,stageRoot,intentPin,backedPin,fn){
  const state=bindingLifetimes.get(root);need(state&&state.lease===lease&&state.pending===0&&!state.shortStage,'U1_SHORT_SDK_LEASE');
  const intent=readPin(intentPin),tx=path.join(root,'.process-update/transactions',intent.transactionId),event=readPin(backedPin);
  need(intent.format==='PROCESS_OS_U1_SHORT_SDK_INTENT_V1'&&intent.targetRoot===root&&intent.shortRoot===path.join(root,'.u1s')&&intent.preparedRoot===path.join(tx,'short-sdk-state')&&intentPin.path===path.join(tx,'short-sdk-intent.json')&&stageRoot===path.join(tx,'staged'),'U1_SHORT_SDK_INTENT');
  need(event.format==='PROCESS_OS_OFFLINE_UPDATE_EVENT_V1'&&event.targetRoot===root&&event.transactionId===intent.transactionId&&event.phase==='BACKED_UP'&&equal(event.data.shortSDKIntentPin,intentPin)&&backedPin.path===path.join(tx,'events',String(event.sequence).padStart(6,'0')+'.json'),'U1_SHORT_SDK_JOURNAL_PIN');
  const pointer=JSON.parse(readFile(path.join(root,'.process-update/transaction.json'))),actualLease=readFile(lease.leaseFile,16384);
  need(pointer.targetRoot===root&&pointer.transactionId===intent.transactionId&&pointer.transactionDirectory===tx&&intent.storageLease.leaseId===lease.leaseId&&intent.storageLease.ownerPid===lease.ownerPid&&intent.storageLease.sha256===sha(actualLease),'U1_SHORT_SDK_OWNER');
  assertNativePersistBudget(root);state.shortPending=true;state.shortStage={stageRoot,persist:intent.shortRoot};
  try{const result=await fn(intent);assertBindingsClosed(root);need(!fs.existsSync(intent.shortRoot),'U1_SHORT_SDK_RETAINED');state.shortPending=false;return result;}finally{state.shortStage=null;}
}

async function installUpdaterNetworkGuard(root) {
  const audit=path.join(root,'.process-update/observations/network');
  need(!globalThis[Symbol.for('process.local.network.guard')]||auditRootBound===audit,'U1_FOREIGN_NETWORK_GUARD');
  for(const rel of ['.process-update','.process-update/observations','.process-update/observations/network','.process-update/observations/network/.wrangler','.process-update/observations/network/.wrangler/local-only']){const dir=path.join(root,rel);if(!fs.existsSync(dir)){parents(path.dirname(dir));fs.mkdirSync(dir);}else parents(dir);}
  const {installLocalNetworkGuard}=await canonical('lib/local-network-guard.mjs');installLocalNetworkGuard(audit);auditRootBound=audit;
}
export const columns = Object.freeze({shared_state:['id','revision','values','updated_at'],state_backups:['id','revision','values','reason','actor','created_at'],web_feedback_store:['id','revision','payload'],process_revoked_sessions:['token_digest','expires_at','revoked_at']});
export function validateRelease(r, manifestPin) {
  need(r?.format === 'PROCESS_OS_APPROVED_FULL_SNAPSHOT_RELEASE_V1' && ['TEST','PUBLISHED'].includes(r.kind) && Number.isSafeInteger(r.sequence) && r.sequence > 0 && /^[A-Za-z0-9._-]{1,100}$/.test(r.releaseId) && r.approved === true && r.manifestSha256 === manifestPin.sha256 && isHash(r.manifestSha256) && Number.isFinite(Date.parse(r.snapshotAt)) && Number.isSafeInteger(r.sourceRevision) && r.sourceRevision >= 0, 'U1_RELEASE_CONTRACT');
  need(r.sourceCompatibility && Object.keys(r.sourceCompatibility).includes('package.json') && Object.keys(r.sourceCompatibility).includes('package-lock.json'), 'U1_RELEASE_SOURCE_COMPATIBILITY');
  for (const [name, hash] of Object.entries(r.sourceCompatibility)) need(/^(?:package(?:-lock)?\.json|(?:lib|app|public)\/[A-Za-z0-9_./-]+)$/.test(name) && !name.split('/').includes('..') && isHash(hash), 'U1_RELEASE_SOURCE_COMPATIBILITY');
  return r;
}
export function validatePackageShape(m, database, release) {
  const production = release?.kind === 'PUBLISHED' && m.distributionStatus === 'READY_PRIVATE_LOGICAL_DATA_FOR_REVIEWED_RUNTIME_IMPORT' && m.status === 'PASS_PRIVATE_LOGICAL_PACKAGE_SCRUB_AND_SOURCE_COMPARISON' && m.verification?.businessIDsRolesUserOverridesOwnershipAndHistoryRetained === true && m.credentialPolicy?.sourcePasswordHashesNeverExported === true;
  const test = release?.kind === 'TEST' && m.distributionStatus === 'TEST_ONLY_VERIFIED_FIXTURE' && m.status === 'PASS_TEST_LOGICAL_PACKAGE' && isHash(m.testFixtureProof?.originalManifestSHA256) && isHash(m.testFixtureProof?.generatedProofSHA256) && equal(m.testFixtureProof, release.testFixtureProof) && m.credentialPolicy?.sourcePasswordHashesNeverExported === true;
  need(m?.format === 'PROCESS_OS_PRIVATE_DEV_PACKAGE_V1_PROTOTYPE' && (production || test), 'U1_PACKAGE_CONTRACT');
  need(equal(Object.keys(database.tables || {}).sort(),Object.keys(columns).sort()), 'U1_TABLE_COVERAGE');
  for (const [table, rows] of Object.entries(database.tables)) {
    need(Array.isArray(rows), 'U1_ROW_SHAPE'); const ids = new Set();
    for (const row of rows) { const key = table === 'process_revoked_sessions' ? row.token_digest : row.id; need(equal(Object.keys(row).sort(), columns[table].slice().sort()) && Object.values(row).every(v => typeof v === 'string' || typeof v === 'number' && Number.isFinite(v)) && !ids.has(key), 'U1_ROW_SHAPE'); ids.add(key); }
  }
  need(database.tables.shared_state.length === 1 && database.tables.shared_state[0].id === 1 && Number.isSafeInteger(database.tables.shared_state[0].revision) && database.tables.shared_state[0].revision === m.sourceRevision && database.tables.state_backups.length === m.historyRows && database.tables.web_feedback_store.length === m.feedbackRows && database.tables.process_revoked_sessions.length === 0, 'U1_TABLE_COVERAGE');
  need(Array.isArray(m.objects) && m.objects.length === m.outputObjects && m.outputObjects === m.sourceObjects, 'U1_OBJECT_COVERAGE'); const keys = new Set();
  for (const o of m.objects) { need(typeof o.key === 'string' && o.key.length > 0 && !o.key.includes('\0') && !keys.has(o.key) && isHash(o.sha256) && Number.isSafeInteger(o.bytes) && o.bytes >= 0 && o.bytes <= 64 * 1024 * 1024, 'U1_OBJECT_SHAPE'); keys.add(o.key); }
}
export async function verifyPackage(root, packageDirectory, releasePin, manifestPin) {
  parents(root); parents(packageDirectory); const release = validateRelease(readPin(releasePin),manifestPin), m = readPin(manifestPin);
  need(fs.realpathSync.native(manifestPin.path) === fs.realpathSync.native(path.join(packageDirectory,'manifest.json')), 'U1_MANIFEST_PATH');
  need(release.sourceRevision === m.sourceRevision, 'U1_RELEASE_REVISION');
  for (const [name, expected] of Object.entries(release.sourceCompatibility)) need(hashFile(path.join(root,name)).sha256 === expected, 'U1_SOURCE_INCOMPATIBLE');
  need(Object.keys(m.productionDependencyHashes || {}).length > 0, 'U1_DEPENDENCY_COVERAGE');
  for (const [name, expected] of Object.entries(m.productionDependencyHashes)) need(release.sourceCompatibility[name] === expected, 'U1_DEPENDENCY_COVERAGE');
  const raw = readFile(path.join(packageDirectory,'database.json')); need(sha(raw) === m.databaseSha256,'U1_DATABASE_HASH'); const database = JSON.parse(raw); validatePackageShape(m,database,release);
  parents(path.join(packageDirectory,'objects')); const expectedNames = new Set(m.objects.map(o=>o.sha256));
  const actualNames = fs.readdirSync(path.join(packageDirectory,'objects')); need(actualNames.length === expectedNames.size && actualNames.every(n=>expectedNames.has(n)), 'U1_OBJECT_INVENTORY');
  let bytes = 0; for (const o of m.objects) { need(equal(hashFile(path.join(packageDirectory,'objects',o.sha256)),{bytes:o.bytes,sha256:o.sha256}), 'U1_OBJECT_HASH'); bytes += o.bytes; }
  return {release, releasePin, manifestPin, manifest:m,database, directory:path.resolve(packageDirectory),verifiedObjectBytes:bytes};
}

// Inspect only current aggregate envelopes. Historical cases/saves/versions do
// not become live drafts merely because an old snapshot contains that word.
export function assertNoActiveDrafts(values) {
  let controls = 0;
  function control(c) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return;
    if (c.workflowScopes !== undefined) { need(c.workflowScopes && typeof c.workflowScopes === 'object' && !Array.isArray(c.workflowScopes),'U1_WORKFLOW_UNKNOWN'); for (const w of Object.values(c.workflowScopes)) flow(w); }
    if (c.workflow !== undefined && c.workflow !== null) flow(c.workflow);
    else if (Array.isArray(c.versions)) {
      const active = c.versions.find(v=>v.id===c.activeVersionId);
      const content=v=>{if(v&&Object.hasOwn(v,'snapshot')){need(v.snapshot&&typeof v.snapshot==='object','U1_WORKFLOW_UNKNOWN');return v.snapshot;}const keys=['equipment','groups','categories','subcategories','issues'];need(v&&keys.every(k=>Array.isArray(v[k])),'U1_WORKFLOW_UNKNOWN');return Object.fromEntries(keys.map(k=>[k,v[k]]));};
      for (const v of c.versions) if (['draft','pending','pending-test'].includes(v.status)) {need(v.status==='draft'&&active,'U1_ACTIVE_DRAFT_OR_PENDING');need(equal(content(v),content(active)),'U1_ACTIVE_DRAFT_OR_PENDING');}
    }
    if (c.pendingId) need(false,'U1_ACTIVE_DRAFT_OR_PENDING');
    for(const k of ['libraries','scopes'])if(c[k]!==undefined){need(c[k]&&typeof c[k]==='object'&&!Array.isArray(c[k]),'U1_WORKFLOW_UNKNOWN');for(const child of Object.values(c[k]))control(child);}
    if(c.moduleDraft)control(c.moduleDraft);
    if(c.documents!==undefined){need(Array.isArray(c.documents),'U1_WORKFLOW_UNKNOWN');for(const d of c.documents){need(d&&typeof d==='object'&&d.flow,'U1_WORKFLOW_UNKNOWN');if(!d.cancelled)flow(d.flow);}}
  }
  function flow(w) {
    controls++; need(w && w.schemaVersion === 3 && typeof w.generation === 'string' && Number.isSafeInteger(w.revision) && w.active && Object.hasOwn(w.active,'content') && Object.hasOwn(w,'working') && Array.isArray(w.cases) && Array.isArray(w.saves), 'U1_WORKFLOW_UNKNOWN');
    need(!w.pendingId && !w.cases.some(c=>c.status==='pending') && equal(w.working,w.active.content), 'U1_ACTIVE_DRAFT_OR_PENDING');
    // A save of changed content remains an unsubmitted draft even if working
    // was independently reverted. Closed historic saves do not block.
    if (w.saved && w.saved.revision === w.revision) need(equal(w.saved.content,w.active.content), 'U1_ACTIVE_DRAFT_OR_PENDING');
  }
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== 'string') { need(value === null || typeof value !== 'object','U1_VALUES_SHAPE'); continue; }
    let c; try { c=JSON.parse(value); } catch { need(!key.endsWith('Control'),'U1_WORKFLOW_UNKNOWN'); continue; }
    control(c);
    // Routine FQC maintains current domain controls in explicit collections.
    if (c && !Array.isArray(c) && typeof c === 'object') for (const k of ['plans','reports','retests','disposals','improvements']) if (Array.isArray(c[k])) for (const row of c[k]) {
      if (row?.workflow || row?.workflowScopes || row?.versions) control(row);
      else if (row && ['draft','pending','pending-test','returned'].includes(row.status) && !row.isDeleted) need(false,'U1_ACTIVE_DRAFT_OR_PENDING');
    }
    if (key.endsWith('Control')) need(c && typeof c === 'object' && !Array.isArray(c),'U1_WORKFLOW_UNKNOWN');
  }
  return {checkedControls:controls};
}
export function overlayUsers(incoming, local, bootstrapId) {
  need(Array.isArray(incoming) && Array.isArray(local) && incoming.every(u=>u && typeof u.id==='string' && !Object.hasOwn(u,'password') && !Object.hasOwn(u,'passwordHash')), 'U1_ACCOUNT_SHAPE');
  const ids = new Set(incoming.map(u=>u.id)), current = new Map(local.map(u=>[u.id,u])); need(ids.size === incoming.length && current.size===local.length, 'U1_ACCOUNT_SHAPE');
  const extra = local.filter(u=>!ids.has(u.id)); need(extra.length===1 && extra[0].id===bootstrapId && /^dev-bootstrap-[a-f0-9-]{36}$/.test(bootstrapId) && extra[0].authMode==='password' && typeof extra[0].passwordHash==='string', 'U1_LOCAL_BOOTSTRAP_IDENTITY');
  need(incoming.every(u=>current.has(u.id)),'U1_ACCOUNT_SET_CHANGED');
  const publicIdentity=u=>Object.fromEntries(Object.entries(u).filter(([k])=>!['passwordHash','authEpoch'].includes(k)));
  return [...incoming.map(u=>{const old=current.get(u.id); need(!Object.hasOwn(old,'password') && (!Object.hasOwn(old,'passwordHash') || typeof old.passwordHash==='string') && (old.authEpoch===undefined || Number.isSafeInteger(old.authEpoch) && old.authEpoch>=0), 'U1_SECURITY_SHAPE');need(equal(publicIdentity(u),publicIdentity(old)),'U1_UNLISTED_IDENTITY_OR_ROLE_CHANGE'); return {...u,...(Object.hasOwn(old,'passwordHash')?{passwordHash:old.passwordHash}:{}),authEpoch:Math.max(u.authEpoch||0,old.authEpoch||0)};}),structuredClone(extra[0])];
}
export function ownedRoot(root) {
  need(typeof root==='string'&&path.isAbsolute(root),'U1_EXPLICIT_ROOT');parents(root);
  const real=fs.realpathSync.native(root);parents(real);const nominal=fs.lstatSync(root,{bigint:true}),physical=fs.lstatSync(real,{bigint:true});
  need(['dev','ino','size','nlink','mtimeNs','ctimeNs'].every(k=>nominal[k]===physical[k]),'U1_ROOT_IDENTITY');return path.resolve(real);
}
export async function withBindings(sourceRoot, storageRoot, fn, targetRoot) {
  targetRoot = ownedRoot(targetRoot); assertBindingsClosed(targetRoot); const lifetime=bindingLifetimes.get(targetRoot); storageRoot=path.resolve(storageRoot);
  const stageParent=path.join(targetRoot,'.process-update','transactions');
  need(storageRoot===targetRoot || storageRoot.startsWith(stageParent+path.sep) && path.basename(storageRoot)==='staged' && path.dirname(path.dirname(storageRoot))===stageParent && /^[a-f0-9-]{36}$/.test(path.basename(path.dirname(storageRoot))), 'U1_STORAGE_CAPABILITY_BOUNDARY');
  const {assertLocalMode,localWorkerConfig} = await canonical('lib/local-runtime.mjs');
  for(const key of ['NODE_OPTIONS','NODE_PATH','NODE_DEBUG','NODE_DEBUG_NATIVE','NODE_V8_COVERAGE','NODE_REDIRECT_WARNINGS','NODE_USE_ENV_PROXY'])need(!process.env[key],'U1_NODE_INJECTION');
  assertLocalMode([],process.env); const paths={directory:path.join(storageRoot,'.wrangler/local-only'),state:path.join(storageRoot,'.wrangler/state'),config:path.join(storageRoot,'.wrangler/local-only/wrangler.json')};
  parents(paths.directory); need(equal(JSON.parse(readFile(paths.config)),localWorkerConfig()),'U1_BINDING_CONFIG');
  // Explicit owned transaction storage: never call a normal opener to bypass
  // the external journal guard. No source/dependency copy is needed.
  process.env.CLOUDFLARE_CF_FETCH_ENABLED='false';process.env.WRANGLER_SEND_METRICS='false';process.env.WRANGLER_SEND_ERROR_REPORTS='false';process.env.WRANGLER_WRITE_LOGS='false';
  await installUpdaterNetworkGuard(targetRoot);const scratch=path.join(targetRoot,'.process-update/observations/runtime');if(!fs.existsSync(scratch)){parents(path.dirname(scratch));fs.mkdirSync(scratch);}else parents(scratch);
  process.env.WRANGLER_LOG_PATH=path.join(scratch,'logs');process.env.MINIFLARE_CACHE_DIR=path.join(scratch,'cf-cache');process.env.MINIFLARE_REGISTRY_PATH=path.join(scratch,'registry');process.env.WRANGLER_REGISTRY_PATH=path.join(scratch,'registry');
  const {getPlatformProxy}=createRequire(path.join(sourceRoot,'package.json'))('wrangler');
  const persist=storageRoot===targetRoot?path.join(paths.state,'v3'):lifetime.shortStage?.stageRoot===storageRoot?lifetime.shortStage.persist:null;
  need(persist&&((storageRoot===targetRoot&&!fs.existsSync(path.join(targetRoot,'.u1s')))||storageRoot!==targetRoot),'U1_SHORT_SDK_CAPABILITY');assertNativePersistBudget(targetRoot);
  lifetime.pending++;
  const proxy=await getPlatformProxy({configPath:paths.config,persist:{path:persist},remoteBindings:false,envFiles:[]});
  try { return await fn(proxy.env,paths,localWorkerConfig); } finally { await proxy.dispose(); lifetime.pending--; }
}
export async function inspectBindings(env) {
  const tables={}; for (const [name, cols] of Object.entries(columns)) {
    const rows=(await env.DB.prepare(`SELECT * FROM "${name}"`).all()).results;
    need(rows.every(r=>equal(Object.keys(r).sort(),cols.slice().sort())),'U1_LIVE_SCHEMA'); tables[name]=rows;
  }
  const names=(await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%'").all()).results.map(r=>r.name).sort(); need(equal(names,Object.keys(columns).sort()),'U1_LIVE_TABLE_COVERAGE');
  const objects=[]; let cursor;
  do { const page=await env.STATE_ARCHIVE.list({limit:1000,...(cursor?{cursor}:{})}); for (const o of page.objects) {const value=await env.STATE_ARCHIVE.get(o.key); need(value && value.size===o.size,'U1_LIVE_OBJECT'); const h=crypto.createHash('sha256'); for await(const b of value.body)h.update(b);objects.push({key:o.key,bytes:o.size,sha256:h.digest('hex'),httpMetadata:metadata(value.httpMetadata),customMetadata:metadata(value.customMetadata)});} need(objects.length<=1000000,'U1_LIVE_OBJECT_BOUND'); cursor=page.truncated?page.cursor:null; need(!page.truncated || typeof cursor==='string'&&cursor.length>0,'U1_LIVE_OBJECT_CURSOR'); } while(cursor);
  objects.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
  const {decodeLocalSnapshot}=await canonical('lib/local-snapshot.mjs'); need(tables.shared_state.length===1,'U1_LIVE_STATE'); const state=tables.shared_state[0];const decoded=await decodeLocalSnapshot(env.STATE_ARCHIVE,JSON.parse(state.values));
  const projected=Object.fromEntries(Object.entries(tables).filter(([k])=>k!=='process_revoked_sessions').map(([k,rows])=>[k,rows.map(r=>stable(r)).sort()]));
  return {fingerprint:sha(stable({tables:projected,objects})),tables,objects,decoded,state};
}
export function assertOriginalBootstrap(user){
  need(user&&equal(Object.keys(user).sort(),['id','name','role','inheritRole','authMode','enabled','authEpoch','passwordHash'].sort())&&/^dev-bootstrap-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(user.id)&&user.name==='Private Development Bootstrap'&&user.role==='admin'&&user.inheritRole===true&&user.authMode==='password'&&user.enabled===true&&user.authEpoch===0&&typeof user.passwordHash==='string'&&user.passwordHash.length>0,'U1_I1_BOOTSTRAP_CHANGED');
}
export async function verifyOriginalI1(env,pack,receipt) {
  need(pack.release.kind==='PUBLISHED'&&receipt.status==='PASS_ACTUAL_MINIFLARE_D1_R2_RESTORE'&&receipt.manifestSha256===pack.manifestPin.sha256&&receipt.bootstrapAccountsAdded===1&&receipt.originalBusinessValuesUnchanged===true&&receipt.originalAccounts===pack.manifest.accounts.original&&receipt.restoredObjects===pack.manifest.objects.length&&receipt.verifiedObjectBytes===pack.verifiedObjectBytes,'U1_GENUINE_I1_REQUIRED');
  const live=await inspectBindings(env),{decodeLocalSnapshot,encodeLocalValues}=await canonical('lib/local-snapshot.mjs');const sourceRow=pack.database.tables.shared_state[0],original=await decodeLocalSnapshot(env.STATE_ARCHIVE,JSON.parse(sourceRow.values));
  const sourceUsers=JSON.parse(original.values.platformUsers),users=JSON.parse(live.decoded.values.platformUsers),ids=new Set(sourceUsers.map(u=>u.id)),extras=users.filter(u=>!ids.has(u.id));
  need(sourceUsers.every(u=>!Object.hasOwn(u,'password')&&!Object.hasOwn(u,'passwordHash'))&&extras.length===1&&/^dev-bootstrap-[a-f0-9-]{36}$/.test(extras[0].id)&&extras[0].authMode==='password'&&typeof extras[0].passwordHash==='string'&&users.length===sourceUsers.length+1,'U1_I1_IDENTITY_SHAPE');
  assertOriginalBootstrap(extras[0]);
  const expectedValues={...original.values,platformUsers:JSON.stringify([...sourceUsers,extras[0]])};const updated=Date.parse(live.state.updated_at),completed=Date.parse(receipt.completedAt),sourceAt=Date.parse(sourceRow.updated_at);need(equal(live.decoded.values,expectedValues)&&live.state.revision===sourceRow.revision+1&&Number.isFinite(updated)&&Number.isFinite(completed)&&Number.isFinite(sourceAt)&&updated>=sourceAt&&updated<=completed,'U1_I1_BUSINESS_CHANGED');assertNoActiveDrafts(live.decoded.values);
  for(const name of ['state_backups','web_feedback_store'])need(equal(live.tables[name].map(stable).sort(),pack.database.tables[name].map(stable).sort()),'U1_I1_HISTORY_CHANGED');
  const expectedKeys=new Set(pack.manifest.objects.map(o=>o.key));
  for(const o of pack.manifest.objects){const actual=live.objects.find(a=>a.key===o.key);need(actual&&actual.bytes===o.bytes&&actual.sha256===o.sha256&&equal(actual.httpMetadata,metadata(o.httpMetadata))&&equal(actual.customMetadata,metadata(o.customMetadata)),'U1_I1_OBJECT_CHANGED');}
  const dryBucket={async get(key){const v=await env.STATE_ARCHIVE.get(key);if(v)expectedKeys.add(key);return v;},async put(key,value,options){expectedKeys.add(key);const actual=await env.STATE_ARCHIVE.get(key);need(actual&&actual.size===Buffer.byteLength(value)&&sha(await actual.text())===sha(value)&&equal(metadata(actual.httpMetadata),metadata(options?.httpMetadata)),'U1_I1_SECURITY_OBJECT');return {};}};
  const encoded=await encodeLocalValues(dryBucket,expectedValues,{...original,forceR2:!!JSON.parse(sourceRow.values).__processR2});need(encoded===live.state.values&&live.objects.length===expectedKeys.size&&live.objects.every(o=>expectedKeys.has(o.key)),'U1_I1_EXTRA_STATE');
  return {...live,bootstrapId:extras[0].id};
}
export async function materializePackage(sourceRoot, stageRoot, pack, localUsers, bootstrapId, revocations, targetRoot, currentRevision=null) {
  parents(stageRoot); need(!fs.existsSync(path.join(stageRoot,'.wrangler')),'U1_STAGE_EXISTS'); fs.mkdirSync(path.join(stageRoot,'.wrangler')); fs.mkdirSync(path.join(stageRoot,'.wrangler/local-only'));
  const {localWorkerConfig}=await canonical('lib/local-runtime.mjs'); writeJSON(path.join(stageRoot,'.wrangler/local-only/wrangler.json'),localWorkerConfig());
  return withBindings(sourceRoot,stageRoot,async env=>{
    const {inspectMigrations}=await canonical('scripts/local-init.mjs'), {verifyLocalSchema}=await canonical('lib/local-schema.mjs'); const schema=inspectMigrations(sourceRoot);
    need((await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%'").all()).results.length===0,'U1_STAGE_NOT_EMPTY');
    const seed='INSERT INTO `web_feedback_store` (`id`, `revision`, `payload`) VALUES (1, 0, \'{"issues":[],"attachments":[],"batches":[],"handoffs":[]}\')';
    const statements=schema.migrations.flatMap(m=>m.sql.split(';').map(s=>s.replace(/--[^\n]*(?:\n|$)/g,'').trim()).filter(Boolean)).filter(s=>s.replace(/\s+/g,' ')!==seed); need(statements.every(s=>/^CREATE (TABLE|INDEX)\b/i.test(s)),'U1_MIGRATION_OPERATION');
    await env.DB.batch(statements.map(s=>env.DB.prepare(s)));await verifyLocalSchema(env.DB,schema.tables);
    for (const [table,rows] of Object.entries(pack.database.tables)) for (const row of rows) await env.DB.prepare(`INSERT INTO "${table}" (${columns[table].map(c=>`"${c}"`).join(',')}) VALUES (${columns[table].map(()=>'?').join(',')})`).bind(...columns[table].map(c=>row[c])).run();
    for (const o of pack.manifest.objects) {const file=path.join(pack.directory,'objects',o.sha256),b=readFile(file,64*1024*1024);need(b.length===o.bytes&&sha(b)===o.sha256,'U1_PACKAGE_CHANGED'); await env.STATE_ARCHIVE.put(o.key,b,{httpMetadata:o.httpMetadata,customMetadata:o.customMetadata});const saved=await env.STATE_ARCHIVE.get(o.key);need(saved&&saved.size===o.bytes,'U1_STAGE_OBJECT');const h=crypto.createHash('sha256');for await(const c of saved.body)h.update(c);need(h.digest('hex')===o.sha256&&equal(metadata(saved.httpMetadata),metadata(o.httpMetadata))&&equal(metadata(saved.customMetadata),metadata(o.customMetadata)),'U1_STAGE_OBJECT');}
    for(const [table,rows]of Object.entries(pack.database.tables)){const actual=(await env.DB.prepare(`SELECT * FROM "${table}"`).all()).results;need(equal(actual.map(stable).sort(),rows.map(stable).sort()),'U1_STAGE_TABLE');}
    const {decodeLocalSnapshot,encodeLocalValues}=await canonical('lib/local-snapshot.mjs');const old=pack.database.tables.shared_state[0],decoded=await decodeLocalSnapshot(env.STATE_ARCHIVE,JSON.parse(old.values));
    assertNoActiveDrafts(decoded.values);const values={...decoded.values,platformUsers:JSON.stringify(overlayUsers(JSON.parse(decoded.values.platformUsers),localUsers,bootstrapId))};
    const encoded=await encodeLocalValues(env.STATE_ARCHIVE,values,{...decoded,forceR2:!!JSON.parse(old.values).__processR2});
    const nextRevision=currentRevision===null?old.revision:Math.max(old.revision,currentRevision)+1;need(Number.isSafeInteger(nextRevision),'U1_REVISION_BOUND');
    const r=await env.DB.prepare('UPDATE shared_state SET "values"=?,revision=? WHERE id=1 AND revision=? AND "values"=?').bind(encoded,nextRevision,old.revision,old.values).run();need(r.meta.changes===1,'U1_STAGE_CAS');
    for(const r of revocations){need(isHash(r.token_digest)&&Number.isSafeInteger(r.expires_at)&&Number.isSafeInteger(r.revoked_at),'U1_REVOCATION_SHAPE'); await env.DB.prepare('INSERT INTO process_revoked_sessions(token_digest,expires_at,revoked_at) VALUES(?,?,?) ON CONFLICT(token_digest) DO UPDATE SET expires_at=MAX(expires_at,excluded.expires_at),revoked_at=MAX(revoked_at,excluded.revoked_at)').bind(r.token_digest,r.expires_at,r.revoked_at).run();}
    const after=await inspectBindings(env);need(equal(after.decoded.values,values),'U1_STAGE_VALUES');for(const r of revocations)need(after.tables.process_revoked_sessions.some(a=>a.token_digest===r.token_digest&&a.expires_at>=r.expires_at&&a.revoked_at>=r.revoked_at),'U1_REVOCATION_LOST');
    return {fingerprint:after.fingerprint,releaseId:pack.release.releaseId,objects:after.objects.length,packageObjects:pack.manifest.objects.length,verifiedObjectBytes:pack.verifiedObjectBytes};
  },targetRoot);
}
