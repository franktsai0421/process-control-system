/* Isolated regression of the actual UI readers; no browser, service or daily writes. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=name=>fs.readFileSync('public/process/'+name,'utf8');
const between=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
async function bom(){
 const initial={workflow:{generation:'g',revision:3,working:{bom:{X:[{id:'x',itemName:'old'}]}}}},ctx={readEpoch:0,control:initial,actor:'a',pending:[],edit:null,editor:{local:true},base:{},copy:structuredClone,window:{ProcessSync:{identity:{id:'a'}}}};
 let reply,resolve,access=true,token;
 const client={hasUnknown:()=>false,permission:()=>access,read:async t=>{token=t;return typeof reply==='function'?reply():reply;}};
 Object.assign(ctx,{client,transport:()=>client,flow:()=>ctx.control?.workflow,active:()=>null});vm.createContext(ctx);
 vm.runInContext(between(source('bom-workspace.js'),' async function read(', '\n async function command')+';this.readBom=read;',ctx);
 reply={unchanged:true};await ctx.readBom(true);assert.equal(token,'g:3');assert.equal(ctx.control,initial);assert.deepEqual(ctx.editor,{local:true});
 reply=()=>{access=false;return {unchanged:true};};assert.equal((await ctx.readBom(true)).permissionsChanged,true);
 ctx.pending=[{local:'unsaved'}];reply={control:{workflow:{generation:'g',revision:4,working:{bom:{X:[]}}}}};await ctx.readBom();assert.deepEqual(ctx.editor,{local:true});assert.equal(ctx.control.workflow.revision,4);
 reply=()=>new Promise(r=>resolve=r);const slow=ctx.readBom();reply={control:{workflow:{generation:'g2',revision:1,working:{bom:{NEW:[]}}}}};await ctx.readBom();resolve({control:initial});await slow;assert.equal(ctx.control.workflow.generation,'g2');
 const kept=ctx.control;reply=()=>new Promise(r=>resolve=r);const request=ctx.readBom();ctx.window.ProcessSync.identity.id='b';resolve({control:{workflow:{working:{bom:{LEAK:[]}}}}});await request;assert.equal(ctx.control,kept);
 console.log('PASS BOM conditional read, permissions change, unsaved preservation and stale-account fence');
}
function bomDraftActions(){
 const s=source('bom-workspace.js'),ctx={t:(a,b)=>a,index:()=>({search:()=>[],occurrences:()=>[],byId:new Map()}),ui:{code:'',position:'',query:''},permission:()=>true,editable:()=>true,flow:()=>({saved:{id:'s'},working:{referenceIssues:[]}}),version:()=>({status:'draft'}),pending:[],edit:null,batch:null,error:'',busy:false,editor:{},editedFieldsChanged:()=>false,saveCommand:null,btn:(id,label,disabled)=>'<button data-id="'+id+'" disabled="'+disabled+'">'+label+'</button>',h:String,comparison:()=>'',detail:()=>''};
 vm.createContext(ctx);vm.runInContext(between(s,' function contentHTML()', '\n function remember')+';this.html=contentHTML;',ctx);
 assert.match(ctx.html(),/data-id="submit" disabled="false"/);ctx.pending=[{}];assert.match(ctx.html(),/data-id="submit" disabled="true"/);ctx.pending=[];ctx.edit={};assert.match(ctx.html(),/data-id="submit" disabled="true"/);ctx.edit=null;ctx.error='conflict';assert.match(ctx.html(),/data-id="submit" disabled="true"/);
 vm.runInContext(between(s,' const errorText=', '\n const pathText=')+';this.errorText=errorText;',ctx);assert.match(ctx.errorText(Error('DEPENDENCY_CHANGED_RECONFIRM')),/輸入已保留/);ctx.t=(a,b)=>b;assert.match(ctx.errorText(Error('DEPENDENCY_CHANGED_RECONFIRM')),/Nội dung/);
 console.log('PASS dirty/conflicted BOM cannot submit old save; conflict messages localized');
}
async function feedback(){
 let resolve;const shell={querySelector:()=>({textContent:''})},host={isConnected:true,innerHTML:'',querySelector:()=>shell};
 const ctx={board:null,boardActor:'',epoch:0,issues:[],isAdmin:false,t:a=>a,request:()=>new Promise(r=>resolve=r),renders:0,renderBoard(){ctx.renders++;},document:{}};
 vm.createContext(ctx);vm.runInContext(between(source('web-feedback.js'),' async function admin(', '\n const filters=')+';this.open=admin;',ctx);
 let task=ctx.open(host,{id:'a'});host.querySelector=()=>null;resolve({issues:[{id:'late'}],admin:true});await task;assert.equal(ctx.renders,0);assert.equal(ctx.issues.length,0);
 host.querySelector=()=>shell;task=ctx.open(host,{id:'a'},true);ctx.epoch++;resolve({issues:[{id:'old-account'}],admin:true});await task;assert.equal(ctx.renders,0);
 task=ctx.open(host,{id:'a'},true);resolve({issues:[{id:'current'}],admin:false});await task;assert.equal(ctx.renders,1);assert.equal(ctx.issues[0].id,'current');
 console.log('PASS feedback late route/account responses cannot replace current page');
}
function approval(){
 const ctx={window:{ProcessAuthoringV3:{enabled:()=>true}},state:{approvalTab:'process'},approvalVersions:new Proxy([],{get(){throw Error('Legacy history must not be visited');}})};
 vm.createContext(ctx);const s=source('version-workflow.js'),start=s.indexOf('  function approvalPage(){'),end=s.indexOf('\n  function ',start+20);assert(end>start);vm.runInContext(s.slice(start,end)+';this.page=approvalPage;',ctx);assert.match(ctx.page(),/approval-page-lazy/);
 console.log('PASS adopted review avoids legacy history expansion, validation and diff');
}
async function effective(){
 const load=require('./ipqc-ab-import-harness.cjs')(),ids=load('app/api/effective-versions/route.ts').effectiveVersionIds;
 const values={bomMasterControl:JSON.stringify({activeVersionId:'bom-v1',workflow:{secret:'private'}}),toolingMasterControl:JSON.stringify({activeVersionId:'tools-v2',workflow:{secret:'private'}})};
 const result=ids(values);assert.equal(result.bomMasterControl,'bom-v1');assert.equal(result.toolingMasterControl,'tools-v2');assert(!JSON.stringify(result).includes('private'));assert.equal(values.bomMasterControl.includes('private'),true);
 console.log('PASS BOM/tooling effective IDs included without exposing private drafts');
 const {DatabaseSync}=require('node:sqlite'),{randomUUID}=require('node:crypto'),db=new DatabaseSync(':memory:'),objects=new Map();
 try{db.exec('CREATE TABLE shared_state(id INTEGER PRIMARY KEY,revision INTEGER,"values" TEXT,updated_at TEXT)');
  const env={PROCESS_SESSION_SECRET:randomUUID(),STATE_ARCHIVE:{async put(k,v){objects.set(k,v);},async get(k){return objects.has(k)?{text:async()=>objects.get(k)}:null;}},DB:{prepare(sql){let args=[];return{bind(...v){args=v;return this;},async first(){return db.prepare(sql).get(...args)||null;}};}}};
  const apiLoad=require('./ipqc-ab-import-harness.cjs')(env),data={...values,platformUsers:JSON.stringify([{id:'viewer',role:'rd',enabled:true,inheritRole:false,views:['player'],lines:['A'],permissions:[]}])};
  db.prepare('INSERT INTO shared_state VALUES(1,1,?,?)').run(await apiLoad('lib/state-records.ts').encodeRecordValues(env.STATE_ARCHIVE,data),'fixture');
  const before=db.prepare('SELECT * FROM shared_state').get(),api=apiLoad('app/api/effective-versions/route.ts');assert.equal((await api.GET(new Request('http://fixture/api/effective-versions'))).status,403);
  const cookie='process_demo='+await apiLoad('lib/process-state.ts').demoSession(new Request('http://fixture'),'viewer',false),response=await api.GET(new Request('http://fixture/api/effective-versions',{headers:{Cookie:cookie}})),body=await response.json();
  assert.equal(response.status,200);assert.equal(body.effective.bomMasterControl,'bom-v1');assert.equal(body.effective.toolingMasterControl,'tools-v2');assert.deepEqual(Object.keys(body).sort(),['effective','revision']);assert(!JSON.stringify(body).includes('private'));assert.deepEqual(db.prepare('SELECT * FROM shared_state').get(),before);
  console.log('PASS effective notification API authorization, read-only state and private-body exclusion');
 }finally{db.close();}
}
async function processReview(){
 let target=null,buttons=[],sent=[];const parent={querySelector:()=>target,replaceChildren:n=>{target=n;}};
 const document={querySelector:()=>parent,createElement:()=>({dataset:{},set innerHTML(value){this.markup=value;buttons=[...value.matchAll(/data-process-review="([^"]+)"/g)].map(m=>({dataset:{processReview:m[1]},disabled:false}));},querySelectorAll:()=>buttons})};
 const pending={id:'fixed-case',actor:{id:'self',name:'Reviewer'},reason:'Reason'},ctx={document,host:{VersionDraftUI:{preserveView:()=>()=>{},confirmReview:async()=>({reason:'Confirmed',selfReviewConfirmed:true})},openSharedDraftHistory:async()=>{}},flow:()=>({pendingId:pending.id,cases:[pending]}),control:{activeVersionId:'v1',versions:[{id:'v1',number:1}]},permissions:{approve:true,return:true,withdraw:true,history:true},loadError:'',busy:false,actorId:'self',t:a=>a,escapeHtml:String,client:()=>({}),inspection:{review:{issues:[{kind:'missing',message:'advisory'}]}},inspect:async()=>{},confirm:()=>true,action:async(name,detail)=>sent.push({name,detail}),error:e=>{throw e;},load:async()=>{}};
 vm.createContext(ctx);vm.runInContext(between(source('process-authoring-v3.js'),' function reviewPanel(){','\n function panel(){')+';this.draw=reviewPanel;',ctx);ctx.draw();assert.deepEqual(buttons.map(b=>b.dataset.processReview),['view','approve','return','withdraw','history','reload']);await buttons.find(b=>b.dataset.processReview==='approve').onclick();assert.equal(sent[0].detail.caseId,'fixed-case');assert.equal(sent[0].detail.selfReviewConfirmed,true);assert.equal(sent[0].detail.acknowledgedContentIssues[0].message,'advisory');
 ctx.host.VersionDraftUI.confirmReview=async()=>null;await buttons.find(b=>b.dataset.processReview==='return').onclick();assert.equal(sent.length,1);
 ctx.permissions={history:true};ctx.draw();assert(!buttons.some(b=>['approve','return','withdraw','save','submit','begin'].includes(b.dataset.processReview)));
 console.log('PASS process review fixed case, self-review/content acknowledgment, cancel and role visibility');
}
async function feedbackAssets(){
 const nodes=[],ctx={loading:null,window:{},t:a=>a,document:{createElement:tag=>({tag,remove(){this.removed=true;}}),head:{append:n=>nodes.push(n)}}};vm.createContext(ctx);vm.runInContext(between(source('web-feedback-loader.js'),'  const load =','  // The immediate shell')+';this.loadAssets=load;',ctx);
 const failed=ctx.loadAssets();nodes[0].onerror();await assert.rejects(failed,/樣式載入失敗/);assert(nodes.every(n=>n.removed));
 ctx.window.WebFeedback={ready:true};const retry=ctx.loadAssets();assert.equal(nodes.length,3);nodes[2].onload();assert.equal((await retry).ready,true);
 console.log('PASS failed feedback assets can retry without duplicating the loaded controller');
}
(async()=>{await bom();bomDraftActions();await feedback();await feedbackAssets();approval();await effective();await processReview();})().catch(e=>{console.error(e);process.exitCode=1;});
