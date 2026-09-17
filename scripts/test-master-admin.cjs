const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const clone=x=>JSON.parse(JSON.stringify(x));
const a={name:'AB',products:[{code:'A1',name:'Alpha',category:'SHARED',line:'A',unit:'PCS',specification:'',stages:['A-CUT']},{code:'B1',name:'Beta',category:'SHARED',line:'B',unit:'PCS',specification:'',stages:['B-CUT']}],lines:[{code:'A',name:'A line',stages:[{code:'A-CUT',name:'Cut'},{code:'A-END',name:'Finish'}]},{code:'B',name:'B line',stages:[{code:'B-CUT',name:'Cut B'}]}]};
const c={name:'C',products:[{code:'C1',name:'Component',category:'TURN',line:'C',unit:'PCS',stages:['C-TURN']}],lines:[{code:'C',name:'C line',stages:[{code:'C-TURN',name:'Turn'}]}]};
const version=(scope,number,status,snapshot)=>({id:scope+number,scope,number,status,snapshot:clone(snapshot),createdAt:'2026-09-03T01:00:00Z',updatedAt:'2026-09-03T01:00:00Z',history:[],warnings:[]});
const control={active:{AB:clone(a),C:clone(c)},versions:[version('AB',1,'approved',a),version('AB',2,'draft',a),version('C',1,'approved',c),version('C',2,'draft',c)]};
const nodes=new Map(),lists=new Map();let activeDialog=null,writes=0;
class Element{
 constructor(){this.handlers={};this.innerHTML='';this.value='';this.dataset={};this.isConnected=true;this.children=new Map();}
 addEventListener(n,f){this.handlers[n]=f;}
 querySelector(s){if(!this.children.has(s)){const e=new Element();if(s==='[name=line]')e.value='A';this.children.set(s,e);}return this.children.get(s);}
 querySelectorAll(){return [];}
 setAttribute(){} insertAdjacentHTML(position,html){this.innerHTML=html;this.position=position;} showModal(){this.open=true;} close(){this.open=false;this.handlers.close?.();} remove(){this.isConnected=false;if(activeDialog===this)activeDialog=null;} focus(){} scrollIntoView(){}
}
function node(s){if(s==='#master-edit-dialog')return activeDialog;if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s);}
const sandbox={console,state:{masterScope:'AB'},data:{products:clone(a.products),categories:['SHARED']},routing:{lines:clone(a.lines),productRoutes:{A1:{line:'A',stages:['A-CUT']},B1:{line:'B',stages:['B-CUT']}}},lines:[],approvalVersions:[],processMaster:{'A-CUT':[]},ensureProcessMasterStages:()=>false,currentUser:{id:'admin',role:'admin',name:'Admin'},LINE_C_MASTER:{products:c.products,stages:c.lines[0].stages},LineStageExcel:{exportFile(){},readFile:async()=>[],merge(){}},ApprovalTabs:{mount({page,masterHTML,onSelect}){page.innerHTML=masterHTML;page.position='tabs';page.onSelect=onSelect;}},readStore:()=>control,localStorage:{setItem(){writes++;}},escapeHtml:v=>String(v),toast(){},render(){},dataView(){},bindData(){},bomTable(){},processMasterView(){},userManagementView(){},bindDataInner(){},canApprove:()=>true,confirm:()=>true,FormData:class{constructor(f){this.values=f.values;}get(k){return this.values[k]??'';}},MutationObserver:class{observe(){}},document:{documentElement:{lang:'zh-Hant'},querySelector:node,querySelectorAll:s=>lists.get(s)||[],createElement:()=>new Element(),body:{appendChild(e){activeDialog=e;}},activeElement:null},addEventListener(){}};
sandbox.URL=URL;sandbox.location={href:'http://localhost/process/'};sandbox.history={state:null,pushState(){}};
sandbox.window=sandbox;vm.createContext(sandbox);
for(const f of ['master-admin-ui.js','master-review.js','master-data.js'])vm.runInContext(fs.readFileSync(path.join(base,f),'utf8'),sandbox,{filename:f});
writes=0;
assert.match(sandbox.dataView(),/master-version-choice/);
assert.match(sandbox.dataView(),/A 線/);assert.match(sandbox.dataView(),/B 線/);
sandbox.bindData();
// Changing selected historical version is read-only and never replaces active data.
node('#master-version-choice').handlers.change({target:{value:'AB1'}});
assert.doesNotMatch(node('#data-content').innerHTML,/id="master-add-product"/);
assert.equal(control.active.AB.products[0].name,'Alpha');
node('#master-version-choice').handlers.change({target:{value:'AB2'}});
assert.match(node('#data-content').innerHTML,/id="master-add-product"/);
const categoryButton=new Element();categoryButton.dataset={categoryEdit:'SHARED',categoryLine:'A'};lists.set('[data-category-edit]',[categoryButton]);sandbox.bindData();
const before=JSON.stringify(control);categoryButton.onclick();assert.ok(activeDialog.open);assert.match(activeDialog.innerHTML,/Esc/);activeDialog.close();assert.equal(JSON.stringify(control),before);assert.equal(writes,0);
// Saving an A category must not rename the B category with the same name.
categoryButton.onclick();activeDialog.querySelector('form').onsubmit({preventDefault(){},target:{values:{line:'A',name:'A-GROUP'}}});
const draft=control.versions.find(v=>v.id==='AB2');
assert.equal(draft.snapshot.products[0].category,'A-GROUP');assert.equal(draft.snapshot.products[1].category,'SHARED');assert.equal(control.active.AB.products[0].category,'SHARED');
node('#add-master-category').handlers.click();activeDialog.querySelector('form').onsubmit({preventDefault(){},target:{values:{line:'A',name:'EMPTY'}}});
assert.equal(draft.snapshot.products.length,2);assert.ok(draft.snapshot.categoryGroups.some(g=>g.name==='EMPTY'));
// Product dialog constrains route choices, and changing line clears prior route.
node('#master-add-product').handlers.click();let dialog=activeDialog;
assert.match(dialog.innerHTML,/select name="unit"/);assert.match(dialog.innerHTML,/select name="category"/);
const lineInput=dialog.querySelector('[name=line]'),choices=dialog.querySelector('[name=stage-choice]');
assert.match(choices.innerHTML,/A-CUT/);assert.doesNotMatch(choices.innerHTML,/B-CUT/);
choices.value='A-CUT';dialog.querySelector('[data-route-add]').onclick();
lineInput.value='B';lineInput.onchange();assert.match(choices.innerHTML,/B-CUT/);assert.doesNotMatch(choices.innerHTML,/A-CUT/);
choices.value='B-CUT';dialog.querySelector('[data-route-add]').onclick();
dialog.querySelector('form').onsubmit({preventDefault(){},target:{values:{code:'B2',name:'New beta',line:'B',category:'SHARED',unit:'PCS',specification:''}}});
assert.deepEqual(clone(draft.snapshot.products.find(p=>p.code==='B2').stages),['B-CUT']);
assert.equal(control.active.AB.products.length,2);
// Unit-model validation rejects duplicate identifiers and cross-line routes.
assert.equal(sandbox.MasterAdminUI.validProduct(draft.snapshot,{code:'B2',name:'Dup',line:'B',stages:[]}), 'duplicate');
assert.equal(sandbox.MasterAdminUI.validProduct(draft.snapshot,{code:'N',name:'N',line:'B',stages:['A-CUT']}), 'route');
sandbox.state.masterScope='C';assert.match(sandbox.dataView(),/C-TURN/);assert.doesNotMatch(sandbox.dataView(),/A-CUT/);
sandbox.document.documentElement.lang='vi';assert.match(sandbox.dataView(),/Chọn phiên bản/);assert.match(sandbox.dataView(),/Thêm sản phẩm/);
console.log('PASS: grouped AB/C categories, empty categories, cancel-without-write, draft/history selection, line-specific ordered route choices, bilingual rendering.');
// Independent line tab, separate product action, and precise minimal submission validation.
sandbox.document.documentElement.lang='zh-Hant';sandbox.state.masterScope='AB';sandbox.state.masterSection='lines';
let markup=sandbox.dataView();assert.match(markup,/data-tab="bom">BOM 資料<\/button><button[^>]+data-tab="line-admin"/);
assert.match(markup,/id="add-master-line"/);assert.match(markup,/id="master-line-import"/);assert.match(markup,/id="master-line-export"/);assert.doesNotMatch(markup,/id="master-add-product"/);assert.doesNotMatch(markup,/class="master-category-box"/);
sandbox.state.masterSection='products';markup=sandbox.dataView();assert.doesNotMatch(markup,/class="master-line-editor"/);
assert.ok(markup.indexOf('id="master-add-product"')>markup.indexOf('class="master-products-heading"'));
sandbox.bindData();draft.snapshot.products[0].name=' ';draft.snapshot.products[0].stages=[];
node('#master-submit').handlers.click();assert.equal(draft.status,'draft');assert.equal(sandbox.state.masterValidationErrors.length,2);assert.ok(sandbox.state.masterValidationErrors.every(e=>e.code===draft.snapshot.products[0].code));
// Correcting the stored values and using just ONE valid stage is sufficient.
draft.snapshot.products[0].name='Filled';draft.snapshot.products[0].stages=['B-CUT'];node('#master-submit').handlers.click();
assert.equal(draft.status,'pending');assert.equal(sandbox.state.masterValidationErrors.length,0);assert.equal(sandbox.state.masterReviewId,draft.id);
sandbox.state.view='approval';sandbox.render();assert.equal(node('.approval-page').position,'tabs');assert.match(node('.approval-page').innerHTML,/B2/);assert.match(node('.approval-page').innerHTML,/修改前後內容/);
const liveBefore=JSON.stringify(control.active),allBefore=JSON.stringify(control),writtenBefore=writes;
sandbox.state.masterReviewId='MD-SAMPLE-PREVIEW';sandbox.render();assert.match(node('.approval-page').innerHTML,/SAMPLE 示範產品（已修改）/);
node('#approve-master').handlers.click();assert.equal(JSON.stringify(control),allBefore);assert.equal(writes,writtenBefore);assert.equal(JSON.stringify(control.active),liveBefore);
// Withdrawing an actual submission removes it from the queue and returns the same draft.
sandbox.state.masterReviewId=draft.id;sandbox.render();node('#withdraw-master-review').handlers.click();assert.equal(draft.status,'draft');assert.doesNotMatch(node('.approval-page').innerHTML,/data-master-review="AB2"/);
// Actual approval applies the submitted snapshot only when explicitly confirmed.
sandbox.state.masterScope='AB';sandbox.state.masterSection='products';sandbox.dataView();sandbox.bindData();node('#master-submit').handlers.click();sandbox.state.view='approval';sandbox.render();node('#approve-master').handlers.click();assert.equal(draft.status,'approved');assert.ok(control.active.AB.products.some(p=>p.code==='B2'));
console.log('PASS: separate line tab/product button, whitespace checks, one-stage submission, received diff at top, isolated SAMPLE, withdraw and approve lifecycle.');
const tabsSource=fs.readFileSync(path.join(base,'approval-tabs.js'),'utf8');assert.match(tabsSource,/\['master','process'\]/);assert.match(tabsSource,/data-review-tab/);assert.match(tabsSource,/ArrowRight/);assert.match(tabsSource,/aria-selected/);assert.match(tabsSource,/textContent!==value/);assert.match(tabsSource,/getAttribute\(name\)!==value/);
const workflowSource=fs.readFileSync(path.join(base,'version-workflow.js'),'utf8');assert.match(workflowSource,/approvalTab\s*!==\s*'process'/);assert.match(fs.readFileSync(path.join(base,'master-data.js'),'utf8'),/masterHTML:\s*masterActive\s*\?\s*approvalSection\(\)\s*:\s*''/);
console.log('PASS: approval platform has separate accessible master-data and process-version tabs.');
