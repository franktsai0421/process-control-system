import fs from 'node:fs';
import crypto from 'node:crypto';
const origin=process.argv[2],apply=process.argv.includes('--apply');
if(!['http://localhost:4174','https://process-control-20260829.franktsai0421.chatgpt.site'].includes(origin))throw Error('Unknown release destination');
const local=origin.startsWith('http://localhost'),label=local?'local':'hosted';
const headers={'Content-Type':'application/json',Origin:origin,...(!local?{'X-Process-Release-Token':process.env.PROCESS_RELEASE_TOKEN||''}:{})};
const endpoint=origin+'/api/release-state'+(local?'?manage=1':'');
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
async function request(url,options={}){const r=await fetch(url,{headers,...options});if(!r.ok)throw Error(`Release request HTTP ${r.status}`);return r.json();}
const before=await request(endpoint),directory='work/release-7000';
fs.mkdirSync(directory,{recursive:true});
const oldFile=`${directory}/${label}-before-state.json`;
if(!fs.existsSync(oldFile))fs.writeFileSync(oldFile,JSON.stringify(before),{flag:'wx'});
if(!apply){console.log({destination:label,revision:before.revision,sha256:digest(before.values),exported:true});process.exit(0);}
const desired=JSON.parse(fs.readFileSync(`${directory}/release-state.json`));
if(digest(before.values)===digest(desired.values)){console.log({destination:label,alreadyApplied:true,revision:before.revision});process.exit(0);}
const imported=await request(endpoint,{method:'POST',body:JSON.stringify({action:'replace',values:desired.values,baseRevision:before.revision,confirm:'REPLACE_WITH_LOCAL_SNAPSHOT'})});
const after=await request(endpoint),backup=await request(endpoint+(local?'&':'?')+'backup='+encodeURIComponent(imported.newBackupId));
if(digest(after.values)!==digest(desired.values)||digest(backup.values)!==digest(desired.values))throw Error('Post-release content mismatch');
fs.writeFileSync(`${directory}/${label}-after-state.json`,JSON.stringify(after));fs.writeFileSync(`${directory}/${label}-new-backup.json`,JSON.stringify(backup));
fs.writeFileSync(`${directory}/${label}-transfer-result.json`,JSON.stringify({...imported,sha256:digest(after.values)},null,2));
console.log({destination:label,revision:after.revision,sha256:digest(after.values),oldBackupId:imported.oldBackupId,newBackupId:imported.newBackupId,verified:true});
