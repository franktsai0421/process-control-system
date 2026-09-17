const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const base=path.resolve(process.argv[2]||path.join(__dirname,'..','public','process'));
const editor=fs.readFileSync(path.join(base,'editor-line-selection.js'),'utf8');
const i18n=fs.readFileSync(path.join(base,'i18n.js'),'utf8');
const walk=i18n.slice(i18n.indexOf('  function walk('),i18n.indexOf('  function makeSwitch('));
let language='zh-Hant',callback,queue=[],writes=0;
const elements=new Map();
function element(value=''){return {get textContent(){return value},set textContent(v){value=v;writes++;queue.push(()=>sandbox.walk({nodeType:3}));}};}
for(const [selector,value] of [['[for="editor-line-select"]','1　選擇產品線別'],['[for="category-select"]','2　選擇產品類型'],['.path-result small','3　工段流程'],['.path-result b','5 個工段 · 16 個流程']])elements.set(selector,element(value));
const html={get lang(){return language},set lang(v){language=v;queue.push(()=>callback());}};
const sandbox={document:{documentElement:html,body:{classList:{toggle(){}}},title:'製程標準播放系統',querySelector:s=>s==='.editor-line-first'?{querySelector:s=>elements.get(s)||null}:null,createTreeWalker:()=>({nextNode:()=>null})},Node:{TEXT_NODE:3},NodeFilter:{SHOW_ELEMENT:1,SHOW_TEXT:4},MutationObserver:class{constructor(fn){callback=fn}observe(){}},applyText(){},applyAttributes(){},updateSwitches(){},observer:{takeRecords(){}},applying:false,language:'zh'};
vm.createContext(sandbox);vm.runInContext(editor,sandbox);vm.runInContext(walk,sandbox);
function drain(){let steps=0;while(queue.length){assert.ok(++steps<30,'Language observers must settle, not starve browser');queue.shift()();}return steps;}
// A save/submit redraw must settle in both languages, and repeated refreshes must not rewrite labels.
sandbox.walk({nodeType:3});assert.equal(drain(),0);callback();assert.equal(writes,0);
sandbox.language='vi';sandbox.walk({nodeType:3});assert.ok(drain()<10);assert.equal(elements.get('.path-result b').textContent,'5 công đoạn · 16 bước');
const previous=writes;for(let i=0;i<100;i++)sandbox.walk({nodeType:3});drain();assert.equal(writes,previous);
sandbox.language='zh';sandbox.walk({nodeType:3});drain();assert.equal(elements.get('.path-result b').textContent,'5 個工段 · 16 個流程');
console.log('PASS: redraw, repeated refresh, Chinese/Vietnamese changes settle without mutation loop');
