import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {need,sha,equal,isHash,parents,ordinary,readFile,readPin,hashFile,pin,writeNew,writeJSON,tree,copyTree} from './u1-files.mjs';
import {CODE_ROOT,ownedRoot,verifyPackage,assertNoActiveDrafts,withBindings,withStorageLeaseLifetime,assertBindingsClosed,assertPinnedSDKLayout,assertNativePersistBudget,shortDirectoryIdentity,withShortStagePersist,inspectBindings,verifyOriginalI1,materializePackage} from './u1-package.mjs';

const FORMAT='PROCESS_OS_INSTALLED_FULL_SNAPSHOT_V1';
const ownedLeases=new Map();
const ownedRecoveryProofs=new Map();
const canonical = name => import(pathToFileURL(path.join(CODE_ROOT,name)).href);
const phases=['PREPARED','BACKED_UP','STAGED','OLD_MOVED','NEW_ACTIVE','VERIFIED','COMMITTED','ROLLING_BACK','RECOVERED','HOLD'];
const terminal=p=>p==='COMMITTED'||p==='RECOVERED';
const installFile=root=>path.join(root,'.wrangler/local-only/installed-package.json');
const home=root=>path.join(root,'.process-update');
const lockFile=root=>path.join(home(root),'lock');
const pointerFile=root=>path.join(home(root),'transaction.json');
const txnDir=(root,id)=>path.join(home(root),'transactions',id);
const uuid = id => typeof id==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
function createDir(p) { parents(path.dirname(p)); need(!fs.existsSync(p),'U1_DIRECTORY_EXISTS'); fs.mkdirSync(p); }
function mkdirContainer(p) { if(!fs.existsSync(p))createDir(p); else parents(p); }
function pointer(root,id) { return {format:'PROCESS_OS_OFFLINE_UPDATE_POINTER_V1',targetRoot:root,transactionId:id,transactionDirectory:txnDir(root,id)}; }
function events(root,id) {
  const dir=txnDir(root,id), folder=path.join(dir,'events'); parents(folder);
  const names=fs.readdirSync(folder).sort();need(names.length>0&&names.length<=64&&names.every((n,i)=>n===String(i+1).padStart(6,'0')+'.json'),'U1_JOURNAL_SEQUENCE');
  let previousHash=null, previousPhase=null;const rows=[];
  for(let i=0;i<names.length;i++){const b=readFile(path.join(folder,names[i]),16384),e=JSON.parse(b);need(equal(Object.keys(e).sort(),['format','transactionId','targetRoot','sequence','previousHash','phase','data'].sort())&&e.format==='PROCESS_OS_OFFLINE_UPDATE_EVENT_V1'&&e.transactionId===id&&e.targetRoot===root&&e.sequence===i+1&&e.previousHash===previousHash&&phases.includes(e.phase)&&e.data&&typeof e.data==='object'&&!Array.isArray(e.data)&&!terminal(previousPhase),'U1_JOURNAL_CHAIN');
    if(i===0)need(e.phase==='PREPARED','U1_JOURNAL_PHASE');else need(validTransition(previousPhase,e.phase),'U1_JOURNAL_PHASE');
    previousHash=sha(b);previousPhase=e.phase;rows.push({event:e,sha256:previousHash});}
  return rows;
}
export function validTransition(a,b){return ({PREPARED:['BACKED_UP','ROLLING_BACK','HOLD'],BACKED_UP:['STAGED','ROLLING_BACK','HOLD'],STAGED:['OLD_MOVED','ROLLING_BACK','HOLD'],OLD_MOVED:['NEW_ACTIVE','ROLLING_BACK','HOLD'],NEW_ACTIVE:['VERIFIED','ROLLING_BACK','HOLD'],VERIFIED:['COMMITTED','ROLLING_BACK','HOLD'],ROLLING_BACK:['RECOVERED','HOLD'],HOLD:['ROLLING_BACK']})[a]?.includes(b)===true;}
function append(tx,phase,data={}) {
  need(phases.includes(phase),'U1_JOURNAL_PHASE');const existing=fs.readdirSync(path.join(tx.dir,'events')).length,previous=existing?events(tx.root,tx.id).at(-1):null;
  need(existing<64&&(!previous?phase==='PREPARED':validTransition(previous.event.phase,phase)),'U1_JOURNAL_PHASE');
  const e={format:'PROCESS_OS_OFFLINE_UPDATE_EVENT_V1',transactionId:tx.id,targetRoot:tx.root,sequence:existing+1,previousHash:previous?.sha256||null,phase,data};const bytes=Buffer.from(JSON.stringify(e,null,2)+'\n');need(bytes.length<=16384,'U1_JOURNAL_BOUND');writeNew(path.join(tx.dir,'events',String(e.sequence).padStart(6,'0')+'.json'),bytes);tx.last=e;return e;
}
function validateTerminal(root,p) {
  need(p.format==='PROCESS_OS_OFFLINE_UPDATE_POINTER_V1'&&p.targetRoot===root&&uuid(p.transactionId)&&p.transactionDirectory===txnDir(root,p.transactionId),'U1_POINTER');
  const rows=events(root,p.transactionId),last=rows.at(-1),c=JSON.parse(readFile(path.join(p.transactionDirectory,'completion.json'),16384));
  need(terminal(last.event.phase)&&c.format==='PROCESS_OS_OFFLINE_UPDATE_COMPLETION_V1'&&c.transactionId===p.transactionId&&c.targetRoot===root&&c.phase===last.event.phase&&c.sequence===last.event.sequence&&c.eventSHA256===last.sha256&&c.verified===true&&hashFile(installFile(root)).sha256===c.activeManifestSHA256,'U1_INCOMPLETE_UPDATE');parents(path.join(root,'.wrangler/state'));
}
function noIncomplete(root){need(!fs.existsSync(lockFile(root)),'U1_UPDATE_LOCKED');if(fs.existsSync(pointerFile(root)))validateTerminal(root,JSON.parse(readFile(pointerFile(root),16384)));}
function acquire(root,operation,inputPin) {
  noIncomplete(root);mkdirContainer(home(root));mkdirContainer(path.join(home(root),'transactions'));
  const id=crypto.randomUUID(),dir=txnDir(root,id);writeJSON(lockFile(root),{format:'PROCESS_OS_OFFLINE_UPDATE_LOCK_V1',transactionId:id,targetRoot:root});
  createDir(dir);createDir(path.join(dir,'events'));const tx={root,id,dir};
  const p=pointer(root,id),temp=path.join(home(root),'pointer-'+id+'.json');writeJSON(temp,p);fs.renameSync(temp,pointerFile(root));need(equal(JSON.parse(readFile(pointerFile(root))),p),'U1_POINTER_WRITE');
  const lease=ownedLeases.get(root);need(lease&&lease.purpose==='update'&&lease.root===root,'U1_OWNED_STORAGE_LEASE');const leaseBytes=readFile(lease.leaseFile,16384),leaseRecord=JSON.parse(leaseBytes);need(leaseRecord.leaseId===lease.leaseId&&leaseRecord.ownerPid===lease.ownerPid&&leaseRecord.targetRoot===root,'U1_OWNED_STORAGE_LEASE');
  append(tx,'PREPARED',{operation,inputPin,storageLease:{leaseId:lease.leaseId,sha256:sha(leaseBytes),ownerPid:lease.ownerPid}});return tx;
}
function exactLock(tx){const l=JSON.parse(readFile(lockFile(tx.root),16384));need(equal(l,{format:'PROCESS_OS_OFFLINE_UPDATE_LOCK_V1',transactionId:tx.id,targetRoot:tx.root}),'U1_LOCK_IDENTITY');}
function complete(tx,phase){const prior=events(tx.root,tx.id).at(-1);if(!terminal(prior.event.phase))append(tx,phase);else need(prior.event.phase===phase,'U1_TERMINAL_PHASE');const last=events(tx.root,tx.id).at(-1),value={format:'PROCESS_OS_OFFLINE_UPDATE_COMPLETION_V1',transactionId:tx.id,targetRoot:tx.root,phase,sequence:last.event.sequence,eventSHA256:last.sha256,verified:true,activeManifestSHA256:hashFile(installFile(tx.root)).sha256};const file=path.join(tx.dir,'completion.json');if(fs.existsSync(file))need(equal(JSON.parse(readFile(file)),value),'U1_COMPLETION_CHANGED');else writeJSON(file,value);exactLock(tx);fs.unlinkSync(lockFile(tx.root));}
async function stopped(root){const {assertDevStopped}=await canonical('lib/local-data.mjs');assertDevStopped(root);}
function fixedInput(p) {
  need(p?.format==='PROCESS_OS_U1_REVIEWED_COMMAND_V1'&&p.rootApproved===true&&p.executionReady===true,'U1_REVIEWED_INPUT_REQUIRED');const root=ownedRoot(p.targetRoot);need(ownedRoot(p.sourceRoot)===root&&ownedRoot(CODE_ROOT)===root,'U1_TARGET_SOURCE_ROOT');need(p.unsavedBrowserInputsCleared===true,'U1_UNSAVED_INPUT_UNKNOWN');
  for(const key of ['NODE_OPTIONS','NODE_PATH','NODE_DEBUG','NODE_DEBUG_NATIVE','NODE_V8_COVERAGE','NODE_REDIRECT_WARNINGS','NODE_USE_ENV_PROXY'])need(!process.env[key],'U1_NODE_INJECTION');
  need(process.execArgv.length===0,'U1_NODE_INJECTION');
  need(Array.isArray(p.codePins)&&p.codePins.length>=3,'U1_CODE_PINS');for(const row of p.codePins)readPin(row,false);
  const sameFile=(a,b)=>fs.realpathSync.native(a).toLowerCase()===fs.realpathSync.native(b).toLowerCase();
  for(const name of ['u1-files.mjs','u1-package.mjs','dev-package-update.mjs'])need(p.codePins.some(r=>sameFile(r.path,path.join(path.dirname(fileURLToPath(import.meta.url)),name))&&hashFile(r.path).sha256===r.sha256),'U1_OWN_CODE_PIN');
  for(const name of ['lib/local-runtime.mjs','lib/local-data.mjs','lib/local-network-guard.mjs','lib/local-snapshot.mjs','lib/local-schema.mjs','scripts/local-init.mjs','lib/local-storage-lease.mjs','lib/local-update-guard.mjs','lib/local-storage-lease-reclaim.mjs'])need(p.codePins.some(r=>sameFile(r.path,path.join(root,name))),'U1_CANONICAL_CODE_PIN');
  return root;
}
async function getLive(root){return withBindings(root,root,env=>inspectBindings(env),root);}
function localSecurity(root,bootstrapId){
  const names=['session.json','features.json','private-development-login.json','wrangler.json'];const files={};
  for(const n of names){const p=path.join(root,'.wrangler/local-only',n),b=readFile(p,1024*1024);files[n]={bytes:b.length,sha256:sha(b),base64:b.toString('base64')};}
  need(JSON.parse(Buffer.from(files['private-development-login.json'].base64,'base64')).id===bootstrapId,'U1_BOOTSTRAP_CONFIG');
  need(typeof JSON.parse(Buffer.from(files['session.json'].base64,'base64')).secret==='string','U1_SESSION_CONFIG');return files;
}
function verifySecurityFiles(files,bootstrapId){
  need(equal(Object.keys(files).sort(),['session.json','features.json','private-development-login.json','wrangler.json'].sort()),'U1_SECURITY_FILE_SET');
  for(const v of Object.values(files)){need(typeof v.base64==='string'&&Number.isSafeInteger(v.bytes)&&v.bytes<=1024*1024&&isHash(v.sha256),'U1_SECURITY_FILE');const b=Buffer.from(v.base64,'base64');need(b.length===v.bytes&&sha(b)===v.sha256,'U1_SECURITY_FILE');JSON.parse(b);}
  need(JSON.parse(Buffer.from(files['private-development-login.json'].base64,'base64')).id===bootstrapId,'U1_BOOTSTRAP_CONFIG');
}
function securityHashes(files){return Object.fromEntries(Object.entries(files).map(([k,v])=>[k,{bytes:v.bytes,sha256:v.sha256}]));}
function verifyLocalSecurity(root,baseline){const files=localSecurity(root,baseline.bootstrapId);need(equal(securityHashes(files),baseline.localSecurityFiles),'U1_LOCAL_SECURITY_CHANGED');return files;}
function baseline(root){const b=JSON.parse(readFile(installFile(root)));need(b.format===FORMAT&&b.targetRoot===root&&typeof b.releaseId==='string'&&isHash(b.logicalFingerprint)&&uuid(b.transactionId),'U1_INSTALLED_BASELINE');return b;}
function checkLive(live,b){need(live.fingerprint===b.logicalFingerprint,'U1_LOCAL_BUSINESS_CHANGED');assertNoActiveDrafts(live.decoded.values);need(JSON.parse(live.decoded.values.platformUsers).some(u=>u.id===b.bootstrapId),'U1_BOOTSTRAP_IDENTITY');}
function makeBaseline(root,tx,pack,result,bootstrapId,files,installOrigin){return {format:FORMAT,targetRoot:root,transactionId:tx.id,releaseId:pack.release.releaseId,sequence:pack.release.sequence,kind:pack.release.kind,releasePin:pack.releasePin,manifestPin:pack.manifestPin,logicalFingerprint:result.fingerprint,bootstrapId,localSecurityFiles:securityHashes(files),installOrigin,verifiedFullPackageObjects:pack.manifest.objects.length,verifiedFullObjectBytes:pack.verifiedObjectBytes};}
function replaceStageBaseline(stageRoot,b){const p=installFile(stageRoot);if(fs.existsSync(p)){ordinary(p);fs.unlinkSync(p);}writeJSON(p,b);}
function restoreLocalOnly(root,stageRoot){
  const source=path.join(root,'.wrangler/local-only'),dest=path.join(stageRoot,'.wrangler/local-only');
  // Preserve opaque local configuration and cached metadata; no credential is
  // logged/normalized, and the only generated settings are the installed receipt.
  const original=tree(source),fresh=tree(dest);need(fresh.rows.every(r=>r.path==='wrangler.json'||/^(?:logs|registry|cf-cache)\//.test(r.path)),'U1_STAGE_LOCAL_ONLY');
  for(const rel of original.directories.filter(Boolean).sort((a,b)=>a.split('/').length-b.split('/').length)){const d=path.join(dest,rel);if(!fs.existsSync(d))createDir(d);else parents(d);}
  for(const r of original.rows){const from=path.join(source,r.path),to=path.join(dest,r.path);if(fs.existsSync(to)){ordinary(to);fs.unlinkSync(to);}writeNew(to,readFile(from));need(equal(hashFile(to),{bytes:r.bytes,sha256:r.sha256}),'U1_SECURITY_COPY');}
  need(tree(source).hash===original.hash,'U1_LOCAL_ONLY_RACE');
}

export function assertSameReleasePins(pack,installed){need(equal(pack.manifestPin,installed.manifestPin)&&equal(pack.releasePin,installed.releasePin),'U1_RELEASE_ID_REUSED');}
async function plan(input) {
  const root=fixedInput(input);noIncomplete(root);await stopped(root);const b=baseline(root),pack=await verifyPackage(root,input.packageDirectory,input.targetRelease,input.targetManifest);
  need(pack.release.releaseId===b.releaseId||pack.release.sequence>b.sequence,'U1_RELEASE_NOT_NEWER');
  const live=await getLive(root);checkLive(live,b);verifyLocalSecurity(root,b);
  if(pack.release.releaseId===b.releaseId)assertSameReleasePins(pack,b);
  return {status:pack.release.releaseId===b.releaseId?'ALREADY_APPLIED_VERIFIED':'PLAN_READY_NOT_APPLIED',releaseId:pack.release.releaseId,baselineReleaseId:b.releaseId,packageObjects:pack.manifest.objects.length,verifiedObjectBytes:pack.verifiedObjectBytes,logicalFingerprint:live.fingerprint};
}
async function apply(input,inputPin){
  const root=fixedInput(input);noIncomplete(root);await stopped(root);const b=baseline(root),pack=await verifyPackage(root,input.packageDirectory,input.targetRelease,input.targetManifest);
  need(pack.release.releaseId===b.releaseId||pack.release.sequence>b.sequence,'U1_RELEASE_NOT_NEWER');
  let live=await getLive(root);checkLive(live,b);const files=verifyLocalSecurity(root,b);
  if(pack.release.releaseId===b.releaseId){assertSameReleasePins(pack,b);return{status:'ALREADY_APPLIED_VERIFIED',releaseId:b.releaseId,accountsAdded:0};}
  const tx=acquire(root,'apply',inputPin);let touched=false;
  try {
    await stopped(root);live=await getLive(root);checkLive(live,b);verifyLocalSecurity(root,b);
    const before=tree(path.join(root,'.wrangler'));writeJSON(path.join(tx.dir,'before.json'),before);writeJSON(path.join(tx.dir,'baseline.json'),b);
    copyTree(path.join(root,'.wrangler'),path.join(tx.dir,'backup'),before);const shortSDKIntentPin=prepareShortSDKIntent(tx);append(tx,'BACKED_UP',{beforePin:pin(path.join(tx.dir,'before.json')),baselinePin:pin(path.join(tx.dir,'baseline.json')),shortSDKIntentPin});
    const stageRoot=path.join(tx.dir,'staged');createDir(stageRoot);const result=await materializeThroughShortSDK(tx,shortSDKIntentPin,()=>materializePackage(root,stageRoot,pack,JSON.parse(live.decoded.values.platformUsers),b.bootstrapId,live.tables.process_revoked_sessions,root,live.state.revision));
    restoreLocalOnly(root,stageRoot);const next=makeBaseline(root,tx,pack,result,b.bootstrapId,files,b.installOrigin);replaceStageBaseline(stageRoot,next);
    const staged=tree(path.join(stageRoot,'.wrangler'));writeJSON(path.join(tx.dir,'staged.json'),staged);append(tx,'STAGED',{stagedPin:pin(path.join(tx.dir,'staged.json')),newBaselineSHA256:hashFile(installFile(stageRoot)).sha256});
    await stopped(root);need(tree(path.join(root,'.wrangler')).hash===before.hash,'U1_PREACTIVATION_CAS');need(tree(path.join(tx.dir,'backup')).hash===before.hash,'U1_BACKUP_CHANGED');
    // The retained directory plus verified independent backup are never removed.
    // Write-ahead event includes expected paths before the first rename.
    writeJSON(path.join(tx.dir,'activation-intent.json'),{format:'PROCESS_OS_U1_ACTIVATION_INTENT_V1',transactionId:tx.id,oldHash:before.hash,newHash:staged.hash});
    fs.renameSync(path.join(root,'.wrangler'),path.join(tx.dir,'retained'));touched=true;append(tx,'OLD_MOVED');
    fs.renameSync(path.join(stageRoot,'.wrangler'),path.join(root,'.wrangler'));append(tx,'NEW_ACTIVE');
    need(tree(path.join(root,'.wrangler')).hash===staged.hash,'U1_ACTIVE_PHYSICAL_VERIFY');
    // Do not reopen the active DB before terminal commit: even a read binding
    // can modify WAL/cache files. The exact physical image just activated is
    // the closed stage whose complete logical state/R2/overlay was verified.
    verifyLocalSecurity(root,next);
    append(tx,'VERIFIED',{logicalFingerprint:result.fingerprint,proofBoundary:'VERIFIED_CLOSED_STAGE_AND_EXACT_ACTIVE_PHYSICAL_IMAGE'});complete(tx,'COMMITTED');return{status:'UPDATED_FULL_SNAPSHOT_VERIFIED',transactionId:tx.id,releaseId:pack.release.releaseId,accountsAdded:0,backupRetained:true,objects:pack.manifest.objects.length,verifiedObjectBytes:pack.verifiedObjectBytes};
  }catch(error){try{if(touched)await recoverTransaction(root,tx.id);else append(tx,'HOLD',{safeCode:safeCode(error)});}catch{try{append(tx,'HOLD',{safeCode:'U1_RECOVERY_FAILED'});}catch{}}throw error;}
}


function absent(p,code){try{fs.lstatSync(p);need(false,code);}catch(e){if(e.code!=='ENOENT')throw e;}}
function prepareShortSDKIntent(tx){
  const shortRoot=path.join(tx.root,'.u1s'),preparedRoot=path.join(tx.dir,'short-sdk-state');absent(shortRoot,'U1_SHORT_SDK_EXISTS');createDir(preparedRoot);
  const rows=events(tx.root,tx.id),storageLease=rows[0].event.data.storageLease,lease=ownedLeases.get(tx.root);
  need(lease&&storageLease.leaseId===lease.leaseId&&storageLease.ownerPid===lease.ownerPid&&sha(readFile(lease.leaseFile,16384))===storageLease.sha256,'U1_SHORT_SDK_LEASE');
  const intent={format:'PROCESS_OS_U1_SHORT_SDK_INTENT_V1',targetRoot:tx.root,transactionId:tx.id,shortRoot,preparedRoot,directoryIdentity:shortDirectoryIdentity(preparedRoot),storageLease};
  writeJSON(path.join(tx.dir,'short-sdk-intent.json'),intent);return pin(path.join(tx.dir,'short-sdk-intent.json'));
}
async function materializeThroughShortSDK(tx,intentPin,make){
  const rows=events(tx.root,tx.id),backed=rows.at(-1);need(backed.event.phase==='BACKED_UP'&&equal(backed.event.data.shortSDKIntentPin,intentPin),'U1_SHORT_SDK_JOURNAL_PIN');
  const backedPin=pin(path.join(tx.dir,'events',String(backed.event.sequence).padStart(6,'0')+'.json')),stageRoot=path.join(tx.dir,'staged');
  return withShortStagePersist(tx.root,ownedLeases.get(tx.root),stageRoot,intentPin,backedPin,async intent=>{
    need(equal(shortDirectoryIdentity(intent.preparedRoot),intent.directoryIdentity)&&fs.readdirSync(intent.preparedRoot).length===0,'U1_SHORT_SDK_PREPARED_CHANGED');absent(intent.shortRoot,'U1_SHORT_SDK_EXISTS');
    fs.renameSync(intent.preparedRoot,intent.shortRoot);need(equal(shortDirectoryIdentity(intent.shortRoot),intent.directoryIdentity),'U1_SHORT_SDK_IDENTITY');
    const result=await make();assertBindingsClosed(tx.root);need(equal(shortDirectoryIdentity(intent.shortRoot),intent.directoryIdentity),'U1_SHORT_SDK_IDENTITY');const closedPersist=tree(intent.shortRoot);
    const state=path.join(stageRoot,'.wrangler/state'),dest=path.join(state,'v3');if(!fs.existsSync(state))createDir(state);else parents(state);absent(dest,'U1_STAGE_STATE_EXISTS');
    // Whole persisted d1+r2+metadata/blobs moves only after fulfilled public SDK
    // disposal (pinned runtime awaits its native process exit). No DB reopened.
    need(tree(intent.shortRoot).hash===closedPersist.hash,'U1_SHORT_SDK_MOVE_CAS');fs.renameSync(intent.shortRoot,dest);need(equal(shortDirectoryIdentity(dest),intent.directoryIdentity)&&tree(dest).hash===closedPersist.hash,'U1_SHORT_SDK_MOVE_IDENTITY');return result;
  });
}
function preserveShortSDKForRecovery(tx,rows){
  const shortRoot=path.join(tx.root,'.u1s');try{fs.lstatSync(shortRoot);}catch(e){if(e.code==='ENOENT')return;throw e;}
  const backed=rows.find(r=>r.event.phase==='BACKED_UP'),intentPin=backed?.event.data.shortSDKIntentPin;
  need(intentPin?.path===path.join(tx.dir,'short-sdk-intent.json'),'U1_SHORT_SDK_INTENT');const intent=readPin(intentPin),proof=ownedRecoveryProofs.get(tx.root);
  need(proof&&proof.transactionId===tx.id,'U1_SHORT_SDK_CLOSURE_PROOF_REQUIRED');
  need(intent.format==='PROCESS_OS_U1_SHORT_SDK_INTENT_V1'&&intent.targetRoot===tx.root&&intent.transactionId===tx.id&&intent.shortRoot===shortRoot&&equal(intent.storageLease,rows[0].event.data.storageLease)&&equal(shortDirectoryIdentity(shortRoot),intent.directoryIdentity),'U1_SHORT_SDK_OWNER');
  const dest=path.join(tx.dir,'failed-short-sdk');absent(dest,'U1_SHORT_SDK_PRESERVATION_EXISTS');
  const image=tree(shortRoot);writeJSON(path.join(tx.dir,'failed-short-sdk-preservation-intent.json'),{format:'PROCESS_OS_U1_SHORT_SDK_PRESERVATION_V1',transactionId:tx.id,intentPin,closureProof:proof.pin,directoryIdentity:intent.directoryIdentity,treeHash:image.hash,destination:dest});
  need(equal(shortDirectoryIdentity(shortRoot),intent.directoryIdentity)&&tree(shortRoot).hash===image.hash,'U1_SHORT_SDK_RACE');fs.renameSync(shortRoot,dest);need(equal(shortDirectoryIdentity(dest),intent.directoryIdentity)&&tree(dest).hash===image.hash,'U1_SHORT_SDK_PRESERVE_VERIFY');
}

function safeCode(error){return typeof error?.code==='string'&&/^U1_[A-Z0-9_]+$/.test(error.code)?error.code:'U1_INTERNAL_FAILURE';}
export function assertRecoveryIntentBinding(intent,stagedManifest,eventData,id,oldHash){
  need(intent&&intent.format==='PROCESS_OS_U1_ACTIVATION_INTENT_V1'&&intent.transactionId===id&&intent.oldHash===oldHash&&isHash(stagedManifest?.hash)&&isHash(eventData?.newBaselineSHA256)&&intent.newHash===stagedManifest.hash,'U1_RECOVERY_INTENT');
}
async function recoverTransaction(root,id){
  assertBindingsClosed(root);
  const tx={root,id,dir:txnDir(root,id)},rows=events(root,id),first=rows[0].event,last=rows.at(-1).event;need(first.data.operation==='apply','U1_RECOVERY_SCOPE');
  preserveShortSDKForRecovery(tx,rows);
  if(terminal(last.phase)){
    need(!fs.existsSync(lockFile(root))&&fs.existsSync(path.join(tx.dir,'completion.json')),'U1_TERMINAL_COMPLETION_INCOMPLETE');
    const {assertNoIncompleteUpdate}=await canonical('lib/local-update-guard.mjs');assertNoIncompleteUpdate(root);
    const stagedEvent=rows.find(r=>r.event.phase==='STAGED'),backedEvent=rows.find(r=>r.event.phase==='BACKED_UP'),expectedPin=last.phase==='COMMITTED'?stagedEvent?.event.data.stagedPin:backedEvent?.event.data.beforePin;
    need(expectedPin?.path===path.join(tx.dir,last.phase==='COMMITTED'?'staged.json':'before.json'),'U1_TERMINAL_PHYSICAL_PIN');const expected=readPin(expectedPin);need(tree(path.join(root,'.wrangler')).hash===expected.hash,'U1_TERMINAL_CONTENT_CHANGED');if(last.phase==='COMMITTED')need(hashFile(installFile(root)).sha256===stagedEvent.event.data.newBaselineSHA256,'U1_TERMINAL_BASELINE_CHANGED');
    const installed=baseline(root),live=await getLive(root);checkLive(live,installed);verifyLocalSecurity(root,installed);assertNoIncompleteUpdate(root);
    return{status:'TERMINAL_COMPLETION_REVERIFIED_NO_ROLLBACK',transactionId:id,phase:last.phase,logicalFingerprint:live.fingerprint};
  }
  exactLock(tx);
  const b=JSON.parse(readFile(path.join(tx.dir,'baseline.json'))),before=JSON.parse(readFile(path.join(tx.dir,'before.json')));need(b.format===FORMAT&&b.targetRoot===root,'U1_RECOVERY_BASELINE');
  const backed=rows.find(r=>r.event.phase==='BACKED_UP');need(backed,'U1_RECOVERY_NOT_BACKED_UP');need(backed.event.data.beforePin?.path===path.join(tx.dir,'before.json')&&backed.event.data.baselinePin?.path===path.join(tx.dir,'baseline.json'),'U1_RECOVERY_METADATA_BOUNDARY');readPin(backed.event.data.beforePin);readPin(backed.event.data.baselinePin);need(tree(path.join(tx.dir,'backup')).hash===before.hash,'U1_BACKUP_CHANGED');await stopped(root);
  const active=path.join(root,'.wrangler'),retained=path.join(tx.dir,'retained'),stage=path.join(tx.dir,'staged/.wrangler');
  const oldExists=fs.existsSync(retained),activeExists=fs.existsSync(active),intent=fs.existsSync(path.join(tx.dir,'activation-intent.json'))?JSON.parse(readFile(path.join(tx.dir,'activation-intent.json'))):null;
  let stagedManifest=null;const stagedEvent=rows.find(r=>r.event.phase==='STAGED');
  if(intent){need(stagedEvent?.event.data.stagedPin?.path===path.join(tx.dir,'staged.json'),'U1_RECOVERY_STAGED_PIN');stagedManifest=readPin(stagedEvent.event.data.stagedPin);need(isHash(stagedManifest.hash)&&isHash(stagedEvent.event.data.newBaselineSHA256),'U1_RECOVERY_STAGED_PIN');}
  if(intent)assertRecoveryIntentBinding(intent,stagedManifest,stagedEvent.event.data,id,before.hash);
  if(intent&&activeExists&&tree(active).hash===stagedManifest.hash)need(hashFile(installFile(root)).sha256===stagedEvent.event.data.newBaselineSHA256,'U1_RECOVERY_NEW_BASELINE');
  if(intent&&fs.existsSync(stage)){need(tree(stage).hash===stagedManifest.hash&&hashFile(installFile(path.dirname(stage))).sha256===stagedEvent.event.data.newBaselineSHA256,'U1_RECOVERY_STAGE_CHANGED');}
  if(activeExists){const current=tree(active);need(current.hash===before.hash||intent&&current.hash===intent.newHash,'U1_RECOVERY_ACTIVE_CHANGED');}
  if(oldExists)need(tree(retained).hash===before.hash,'U1_RETAINED_CHANGED');
  if(last.phase!=='ROLLING_BACK')append(tx,'ROLLING_BACK');
  if(oldExists){if(activeExists){const failed=path.join(tx.dir,'failed-active');need(!fs.existsSync(failed),'U1_FAILED_ACTIVE_EXISTS');fs.renameSync(active,failed);}fs.renameSync(retained,active);}
  else if(!(activeExists&&tree(active).hash===before.hash)){
    // The verified full backup is actually restorable, not merely hashed.
    // Unknown active contents were refused above. A missing retained original
    // never authorizes overwrite of a later/foreign image.
    need(intent&&isHash(intent.newHash),'U1_RECOVERY_OLD_UNAVAILABLE');const restoreId=crypto.randomUUID(),restore=path.join(tx.dir,'restore-'+restoreId);
    writeJSON(path.join(tx.dir,'recovery-copy-intent-'+restoreId+'.json'),{format:'PROCESS_OS_U1_PHYSICAL_BACKUP_RECOVERY_V1',transactionId:id,backupHash:before.hash,restoreDirectory:restore});
    copyTree(path.join(tx.dir,'backup'),restore,before);
    need(!fs.existsSync(retained)&&(!fs.existsSync(active)||tree(active).hash===intent.newHash),'U1_RECOVERY_ACTIVATION_CAS');
    if(fs.existsSync(active)){const failed=path.join(tx.dir,'failed-active-'+restoreId);fs.renameSync(active,failed);}fs.renameSync(restore,active);
  }
  need(tree(active).hash===before.hash&&hashFile(installFile(root)).sha256===hashFile(path.join(tx.dir,'backup/local-only/installed-package.json')).sha256,'U1_RECOVERY_VERIFY');
  complete(tx,'RECOVERED');return {status:'RECOVERED_VERIFIED_BASELINE',transactionId:id,releaseId:b.releaseId,backupRetained:true,privateQueueClaim:false};
}
async function recover(input){const root=fixedInput(input);need(uuid(input.transactionId),'U1_RECOVERY_ID');const p=JSON.parse(readFile(pointerFile(root),16384));need(equal(p,pointer(root,input.transactionId)),'U1_RECOVERY_POINTER');return recoverTransaction(root,input.transactionId);}
function status(input){const root=ownedRoot(input.targetRoot);if(!fs.existsSync(pointerFile(root)))return{status:fs.existsSync(lockFile(root))?'HOLD_ORPHAN_LOCK':'NO_UPDATE_TRANSACTION'};const p=JSON.parse(readFile(pointerFile(root),16384));need(equal(p,pointer(root,p.transactionId)),'U1_POINTER');const rows=events(root,p.transactionId),last=rows.at(-1).event;return{status:terminal(last.phase)&&!fs.existsSync(lockFile(root))?'TERMINAL_REQUIRES_BASELINE_VERIFICATION':'INCOMPLETE_UPDATE_STARTUP_REFUSED',transactionId:p.transactionId,phase:last.phase,sequence:last.sequence};}

// TEST-only installation from the original I1 opaque security overlay. It is
// not an I1 receipt forgery and creates no new identity, password or session key.
async function installTest(input,inputPin){
  const root=fixedInput(input);noIncomplete(root);need(!fs.existsSync(path.join(root,'.wrangler')),'U1_TEST_TARGET_NOT_FRESH');await stopped(root);
  const pack=await verifyPackage(root,input.packageDirectory,input.targetRelease,input.targetManifest);need(pack.release.kind==='TEST','U1_TEST_RELEASE_ONLY');
  const overlay=readPin(input.securityOverlay);need(overlay.format==='PROCESS_OS_U1_SECURITY_OVERLAY_V1'&&ownedRoot(overlay.targetRoot)===root&&typeof overlay.bootstrapId==='string'&&Array.isArray(overlay.users)&&Array.isArray(overlay.revocations),'U1_OPAQUE_OVERLAY');
  const origin=readPin(overlay.originI1Receipt);need(origin.status==='PASS_ACTUAL_MINIFLARE_D1_R2_RESTORE'&&origin.bootstrapAccountsAdded===1&&origin.originalBusinessValuesUnchanged===true&&origin.manifestSha256===pack.manifest.testFixtureProof.originalManifestSHA256,'U1_I1_ORIGIN');
  verifySecurityFiles(overlay.localFiles,overlay.bootstrapId);const tx=acquire(root,'install-test',inputPin);
  try{const stageRoot=path.join(tx.dir,'staged');createDir(stageRoot);const shortSDKIntentPin=prepareShortSDKIntent(tx);append(tx,'BACKED_UP',{freshTargetNoExistingStorage:true,shortSDKIntentPin});const result=await materializeThroughShortSDK(tx,shortSDKIntentPin,()=>materializePackage(root,stageRoot,pack,overlay.users,overlay.bootstrapId,overlay.revocations,root));
    for(const [name,record]of Object.entries(overlay.localFiles)){const dest=path.join(stageRoot,'.wrangler/local-only',name);if(fs.existsSync(dest)){ordinary(dest);fs.unlinkSync(dest);}writeNew(dest,Buffer.from(record.base64,'base64'));}
    const installOrigin={format:'PROCESS_OS_TEST_INSTALL_ORIGIN_V1',originI1Receipt:overlay.originI1Receipt,securityOverlay:input.securityOverlay,releasePin:pack.releasePin,manifestPin:pack.manifestPin};
    const b=makeBaseline(root,tx,pack,result,overlay.bootstrapId,overlay.localFiles,installOrigin);writeJSON(installFile(stageRoot),b);
    const stage=tree(path.join(stageRoot,'.wrangler'));writeJSON(path.join(tx.dir,'test-install-manifest.json'),stage);need(!fs.existsSync(path.join(root,'.wrangler')),'U1_TEST_TARGET_RACE');
    append(tx,'STAGED',{stagedPin:pin(path.join(tx.dir,'test-install-manifest.json'))});append(tx,'OLD_MOVED',{oldStorageAbsentVerified:true});
    fs.renameSync(path.join(stageRoot,'.wrangler'),path.join(root,'.wrangler'));append(tx,'NEW_ACTIVE');need(tree(path.join(root,'.wrangler')).hash===stage.hash,'U1_TEST_INSTALL_VERIFY');verifyLocalSecurity(root,b);append(tx,'VERIFIED',{logicalFingerprint:result.fingerprint});
    const receipt={format:'PROCESS_OS_TEST_FULL_SNAPSHOT_INSTALL_V1',status:'PASS_ACTUAL_TEST_FULL_SNAPSHOT_MATERIALIZATION_NO_NEW_ACCOUNTS',targetRoot:root,transactionId:tx.id,releasePin:pack.releasePin,manifestPin:pack.manifestPin,originI1Receipt:overlay.originI1Receipt,securityOverlay:input.securityOverlay,logicalFingerprint:result.fingerprint,bootstrapId:overlay.bootstrapId,accountsAdded:0,objects:pack.manifest.objects.length,verifiedObjectBytes:pack.verifiedObjectBytes};writeJSON(path.join(tx.dir,'test-install-receipt.json'),receipt);complete(tx,'COMMITTED');return {...receipt,receiptPin:pin(path.join(tx.dir,'test-install-receipt.json'))};
  }catch(error){try{append(tx,'HOLD',{safeCode:safeCode(error)});}catch{}throw error;}
}
async function register(input,inputPin){
  const root=fixedInput(input);noIncomplete(root);await stopped(root);const receipt=readPin(input.installReceipt);
  if(!fs.existsSync(installFile(root))){
    need(path.resolve(input.installReceipt.path)===path.join(root,'.wrangler/local-only/development-package-receipt.json'),'U1_I1_RECEIPT_PATH');const pack=await verifyPackage(root,input.packageDirectory,input.targetRelease,input.targetManifest);
    // Preflight rejection must not create a transaction/HOLD that disables the
    // still-valid original install. The outer update lease remains held.
    const live=await withBindings(root,root,env=>verifyOriginalI1(env,pack,receipt),root),files=localSecurity(root,live.bootstrapId);readPin(input.installReceipt);
    const tx=acquire(root,'register-I1',inputPin);
    try{const b=makeBaseline(root,tx,pack,live,live.bootstrapId,files,{format:'PROCESS_OS_VERIFIED_I1_ORIGIN_V1',originI1Receipt:input.installReceipt,releasePin:pack.releasePin,manifestPin:pack.manifestPin});
      append(tx,'BACKED_UP',{registrationOnlyNoBusinessWrite:true});append(tx,'STAGED',{verifiedFullPackage:true});append(tx,'OLD_MOVED',{noStorageRenameRegistrationOnly:true});writeJSON(installFile(root),b);append(tx,'NEW_ACTIVE',{baselineMetadataOnly:true});append(tx,'VERIFIED',{logicalFingerprint:live.fingerprint});complete(tx,'COMMITTED');return{status:'REGISTERED_VERIFIED_ORIGINAL_I1_NO_BUSINESS_WRITE',releaseId:b.releaseId,logicalFingerprint:live.fingerprint,accountsAdded:0};
    }catch(error){try{append(tx,'HOLD',{safeCode:safeCode(error)});}catch{}throw error;}
  }
  const b=baseline(root);need(receipt.format==='PROCESS_OS_TEST_FULL_SNAPSHOT_INSTALL_V1'&&receipt.status==='PASS_ACTUAL_TEST_FULL_SNAPSHOT_MATERIALIZATION_NO_NEW_ACCOUNTS'&&receipt.targetRoot===root&&receipt.transactionId===b.transactionId&&receipt.logicalFingerprint===b.logicalFingerprint&&receipt.accountsAdded===0&&equal(receipt.manifestPin,b.manifestPin)&&equal(receipt.releasePin,b.releasePin),'U1_GENUINE_INSTALL_REQUIRED');
  const pack=await verifyPackage(root,input.packageDirectory,input.targetRelease,input.targetManifest);need(pack.release.releaseId===b.releaseId&&equal(pack.manifestPin,b.manifestPin),'U1_BASELINE_RELEASE');const live=await getLive(root);checkLive(live,b);verifyLocalSecurity(root,b);return{status:'REGISTERED_GENUINE_TEST_INSTALL_REVERIFIED',releaseId:b.releaseId,logicalFingerprint:live.fingerprint};
}
export async function run(command,input,inputPin){
  need(['plan','register','apply','recover','status','install-test'].includes(command),'U1_COMMAND');
  need(!Object.hasOwn(input,'leaseReclaimProof')||command==='recover','U1_RECLAIM_RECOVER_ONLY');
  need(inputPin&&equal(readPin(inputPin),input),'U1_REVIEWED_INPUT_PIN');
  if(command==='status')return status(input);
  const root=fixedInput(input);assertPinnedSDKLayout(root);assertNativePersistBudget(root);if(command!=='recover')absent(path.join(root,'.u1s'),'U1_SHORT_SDK_EXISTS');await stopped(root);
  // Enable is explicit, target-owned and happens before any binding. Existing
  // unknown control files are never deleted to make a target usable.
  mkdirContainer(home(root));const enable=path.join(home(root),'enable'),enabled={format:'PROCESS_OS_OFFLINE_UPDATE_ENABLED_V1',targetRoot:root};
  if(fs.existsSync(enable))need(equal(JSON.parse(readFile(enable)),enabled),'U1_ENABLE_CHANGED');else {need(!fs.existsSync(pointerFile(root))&&!fs.existsSync(lockFile(root)),'U1_ENABLE_UNKNOWN_TRANSACTION');writeJSON(enable,enabled);}
  let lease;
  if(Object.hasOwn(input,'leaseReclaimProof')){const proof=readPin(input.leaseReclaimProof);need(proof.transactionId===input.transactionId,'U1_RECLAIM_TRANSACTION');const {reclaimLocalStorageLease}=await canonical('lib/local-storage-lease-reclaim.mjs');const reclaimed=reclaimLocalStorageLease(root,{proofPath:input.leaseReclaimProof.path,proofSHA256:input.leaseReclaimProof.sha256});lease=reclaimed.lease;ownedRecoveryProofs.set(root,{transactionId:reclaimed.transactionId,pin:input.leaseReclaimProof});}
  else{const {acquireLocalStorageLease}=await canonical('lib/local-storage-lease.mjs');lease=acquireLocalStorageLease(root,{purpose:'update'});}
  ownedLeases.set(root,lease);try{return await withStorageLeaseLifetime(root,lease,async()=>{need(lease.purpose==='update'&&lease.root===root,'U1_OWNED_STORAGE_LEASE');return ({plan,register,apply,recover,'install-test':installTest})[command](input,inputPin);});}finally{ownedLeases.delete(root);ownedRecoveryProofs.delete(root);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const [command,flag,file,hashFlag,hash]=process.argv.slice(2);need(process.argv.length===7&&flag==='--input'&&hashFlag==='--sha256'&&isHash(hash),'U1_CLI_ARGUMENTS');const p={path:path.resolve(file),...hashFile(file)};need(p.sha256===hash,'U1_INPUT_HASH');const input=readPin(p);need(typeof input.receiptPath==='string'&&path.dirname(path.resolve(input.receiptPath))===path.dirname(p.path)&&!fs.existsSync(input.receiptPath),'U1_RECEIPT_PATH');const result=await run(command,input,p);writeJSON(input.receiptPath,result);console.log(JSON.stringify({status:result.status,accountsAdded:result.accountsAdded??null}));}
  catch(error){console.error(safeCode(error));process.exitCode=1;}
}
