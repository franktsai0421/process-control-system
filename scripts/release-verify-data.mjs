import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const state=JSON.parse(fs.readFileSync(process.argv[2]||'work/release-7000/browser-state.json'));
const urls=new Set(), counts={embedded:0,remote:0,static:0}, missing=[];
function visit(value,key=''){
 if(typeof value==='string'){
  if(value.startsWith('data:')){urls.add(value);return;}
  if(['src','url','media','photo'].includes(key)&&value){urls.add(value);}
 }else if(Array.isArray(value))value.forEach(v=>visit(v));
 else if(value&&typeof value==='object')Object.entries(value).forEach(([k,v])=>visit(v,k));
}
Object.values(state.values).forEach(raw=>visit(JSON.parse(raw)));
for(const url of urls){
 if(url.startsWith('data:')){counts.embedded++;continue;}
 if(/^https?:/.test(url)){counts.remote++;continue;}
 if(/^(blob:|file:)/.test(url)){missing.push(url.split(':')[0]+': unsupported durable URL');continue;}
 const file=url.startsWith('/process/')?'public'+url:'public/process/'+url;
 if(!fs.existsSync(path.resolve(file.split('?')[0])))missing.push(url);else counts.static++;
}
const master=JSON.parse(state.values.masterDataControl||'{}');
const editors=Object.fromEntries(Object.entries(state.values).filter(([k])=>k.startsWith('processEditor:')).map(([k,v])=>[k,Object.values(JSON.parse(v).stages||{}).flat().length]));
const report={revision:state.revision,sha256:crypto.createHash('sha256').update(JSON.stringify(state.values)).digest('hex'),bytes:Buffer.byteLength(JSON.stringify(state)),keys:Object.keys(state.values),versions:JSON.parse(state.values.approvalVersions||'[]').map(v=>({number:v.number||v.version,status:v.status,nodes:Object.values(v.stages||v.snapshot?.stages||{}).flat().length})),editors,masterScopes:Object.keys(master.active||{}),media:counts,missing};
fs.writeFileSync('work/release-7000/data-verification.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(missing.length)process.exitCode=1;
