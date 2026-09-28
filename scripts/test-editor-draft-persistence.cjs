/* oxlint-disable typescript/no-require-imports -- This isolated VM fixture uses the repository's CommonJS test harness. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
process.chdir(require('node:path').resolve(__dirname,'..'));

const workflow = fs.readFileSync('public/process/version-workflow.js', 'utf8');
const guard = fs.readFileSync('public/process/editor-version-guard.js', 'utf8');
const stored = new Map(), messages = [];
const state = {category:'DTLN',editorLine:'A',editorVersionId:null,editorByCategory:{}};
let release, success = true, calls = 0;
const button = {disabled:false};
const workflowDrafts = {
  save:async(kind,scope,payload)=>{
    calls++;
    if(release)await release.promise;
    if(!success)throw new Error('fixture save failed');
    const prior=stored.get(scope);
    const draft={id:prior?.id||`workflow-${scope}`,kind,scope,version:(prior?.version||0)+1,payload:JSON.parse(JSON.stringify(payload))};
    stored.set(scope,draft);
    return {draft};
  },
};
const context = vm.createContext({
  changingVersion:false,
  state, crypto:{randomUUID}, currentUser:{id:'fixture',name:'Fixture'},
  document:{querySelector:()=>button}, console,
  deepCopy:value=>JSON.parse(JSON.stringify(value)),
  editorKey:()=>`${state.category}:${state.editorLine}`,
  ensureCategoryEditor:()=>state.editorByCategory[`${state.category}:${state.editorLine}`],
  toast:text=>messages.push(text), render(){},
  window:{WorkflowDrafts:workflowDrafts,ProcessSync:{saveFailureMessage:()=>"草稿尚未完成伺服器儲存，內容保留在目前頁面。"}},
});
vm.runInContext(workflow.slice(workflow.indexOf('  let savingEditorVersion='),workflow.indexOf('  async function submitEditorVersion()')),context);
const stages = line => Object.fromEntries(['CUT','ASSY','PACKING','FINAL'].map((code,i)=>[`${line}-${code}`,[{
  id:randomUUID(),stageCode:`${line}-${code}`,number:`${line}-${code}-01`,
  nextIds:[],productCodes:[],mediaItems:[{src:'data:image/webp;base64,'+'A'.repeat(1024),type:'image/webp'}],
  instructions:`fixture ${i}`,
}]]));

(async()=>{
  for(const line of ['A','B','C']){
    state.editorLine=line;state.editorVersionId=null;
    const key=`DTLN:${line}`, snapshot=stages(line);state.editorByCategory[key]=snapshot;
    release={};release.promise=new Promise(resolve=>{release.resolve=resolve;});
    const saving=context.saveEditorVersion();
    assert.equal(button.disabled,true);
    const before=messages.length;
    await context.saveEditorVersion();
    assert.equal(messages.length,before,'no premature success or duplicate Save');
    release.resolve();await saving;release=null;
    const saved=stored.get(`DTLN|${line}`);
    assert.equal(saved.kind,'process');
    assert.deepEqual(saved.payload,snapshot,'all stages, graph relations and media are saved');
    assert.equal(state.editorVersionId,saved.id);
    await context.saveEditorVersion();
    assert.equal(stored.get(`DTLN|${line}`).id,saved.id,'repeated Save updates the same personal draft');
    assert.equal(stored.get(`DTLN|${line}`).version,2,'server draft version advances on repeated Save');
  }
  state.category='OTHER';state.editorVersionId=null;state.editorByCategory['OTHER:C']=stages('C');
  await context.saveEditorVersion();assert.equal(stored.size,4,'category and line do not overwrite each other');
  const beforeFailure=JSON.parse(JSON.stringify(state.editorByCategory['OTHER:C']));
  success=false;await context.saveEditorVersion();
  assert.match(messages.at(-1),/尚未完成伺服器儲存/);assert.equal(button.disabled,false);
  assert.equal(stored.size,4,'failed Save remains retryable without duplicate drafts');
  assert.deepEqual(state.editorByCategory['OTHER:C'],beforeFailure,'failed Save keeps the employee workspace intact');

  const latest={id:'draft',status:'draft',createdAt:'2026-01-01',updatedAt:'2026-01-01',stages:{'A-CUT':[]}};
  const newer={category:'DTLN',line:'A',savedAt:'2026-01-02',stages:stages('A')};
  let loaded=0;
  const reopen=vm.createContext({state:{view:'editor',category:'DTLN',editorLine:'A',editorVersionId:null},currentUser:{id:'fixture'},
    versionsForRoute:()=>[latest],readStore:()=>newer,editorKey:()=> 'DTLN:A',render(){},loadVersion:()=>{loaded++;}});
  vm.runInContext(guard.slice(guard.indexOf('  function autoOpenCurrentVersion()'),guard.indexOf('  function lockEditor(')),reopen);
  assert.equal(reopen.autoOpenCurrentVersion(),true);assert.equal(loaded,0,'newer workspace is not replaced by older draft and controls are rerendered');
  assert.equal(reopen.state.editorVersionId,'draft');
  for(const status of ['approved','pending']){
    latest.status=status;latest.creatorId='fixture';reopen.state.editorVersionId=null;
    assert.equal(reopen.autoOpenCurrentVersion(),true,'approved/pending version remains authoritative');
  }
  latest.status='pending';latest.creatorId='another-employee';reopen.state.editorVersionId=null;
  assert.equal(reopen.autoOpenCurrentVersion(),false,'another employee pending case does not replace or lock this workspace');
  latest.status='draft';newer.savedAt='2025-01-01';reopen.state.editorVersionId=null;
  assert.equal(reopen.autoOpenCurrentVersion(),true,'older workspace cannot replace a newer version');
  const app=fs.readFileSync('public/process/app.js','utf8');
  const image='https://fixture.invalid/reviewed.webp',draftImage='https://fixture.invalid/unapproved.webp';
  const media=vm.createContext({state:{category:'BORUAXE1021',editorLine:'A'},
    demoMediaByStage:{'A-CUT':{index:0,name:'hose-cutting.png',src:'assets/demo-process/hose-cutting.png'}},
    operationMediaItems:operation=>operation.mediaItems||[],
    approvalVersions:[{category:'BORUAXE1021',line:'A',number:2,status:'approved',stages:{'A-CUT':[{mediaItems:[{name:'hose-cutting.png',src:image,type:'image/webp'}]}]}},
      {category:'BORUAXE1021',line:'A',number:3,status:'draft',stages:{'A-CUT':[{mediaItems:[{name:'hose-cutting.png',src:draftImage,type:'image/webp'}]}]}},
      {category:'BORUAXE1021',line:'B',number:4,status:'approved',stages:{'A-CUT':[{mediaItems:[{name:'hose-cutting.png',src:draftImage,type:'image/webp'}]}]}},
      {category:'BORUAXE1021',line:'A',number:5,status:'superseded',stages:{'A-CUT':[{mediaItems:[{name:'hose-cutting.png',src:draftImage,type:'image/webp'}]}]}}]});
  vm.runInContext(app.slice(app.indexOf('function applyDemoMedia('),app.indexOf('function ensureCategoryEditor(')),media);
  const empty={'A-CUT':[{mediaItems:[]}]};media.applyDemoMedia(empty);
  assert.equal(empty['A-CUT'][0].media,image,'use already resolved approved media rather than missing legacy demo files');
  assert.equal(empty['A-CUT'][0].mediaType,'image/webp');
  const custom={'A-CUT':[{mediaItems:[{src:'fixture-custom'}]}]};media.applyDemoMedia(custom);
  assert.equal(custom['A-CUT'][0].mediaItems[0].src,'fixture-custom','existing private/custom photos are preserved');
  console.log(`PASS: complete A/B/C personal draft snapshots, media, category/version isolation, awaited Save, no duplicate drafts, failure feedback and newer draft reopening (${calls} writes)`);
})().catch(error=>{console.error(error);process.exitCode=1;});
