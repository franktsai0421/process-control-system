import fs from 'node:fs';
const state=JSON.parse(fs.readFileSync('work/release-7000/browser-state.json'));
const versions=JSON.parse(state.values.approvalVersions);
let updated=0;
for(const v of versions){
 if(v.status!=='draft')continue;
 const workspace=state.values[`processEditor:${v.category}:${v.line}`];
 if(!workspace)continue;
 const current=JSON.parse(workspace);
 if(JSON.stringify(v.stages)!==JSON.stringify(current.stages)){
  v.stages=current.stages;v.updatedAt=new Date().toISOString();updated++;
 }
}
state.values.approvalVersions=JSON.stringify(versions);
fs.writeFileSync('work/release-7000/release-state.json',JSON.stringify(state));
console.log({draftsUpdatedFromCurrentWorkspace:updated,approvedVersionsUnchanged:true});
