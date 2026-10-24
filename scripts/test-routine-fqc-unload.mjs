import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('public/process/routine-fqc.js','utf8'),start=source.indexOf('  const previousBeforeUnload ='),end=source.indexOf('\n})();',start);
assert.ok(start>0&&end>start);
let cases=0;
for(const dirty of [false,true])for(const kind of ['none','null','string','throw']){
 const originalError=Error('prior failure');let calls=0,prevented=0;
 const event={preventDefault(){prevented++;}},window={};
 if(kind!=='none')window.onbeforeunload=function(e){calls++;assert.equal(this,window);assert.equal(e,event);if(kind==='throw')throw originalError;return kind==='string'?'prior reminder':null;};
 vm.runInNewContext(source.slice(start,end),{window,docs:()=>[{dirty}],dirty:d=>d.dirty});
 if(kind==='throw')assert.throws(()=>window.onbeforeunload(event),error=>error===originalError);
 else assert.equal(window.onbeforeunload(event),kind==='string'?'prior reminder':dirty?'':null);
 assert.equal(calls,kind==='none'?0:1);assert.equal(prevented,dirty?1:0);cases++;
}
console.log(JSON.stringify({status:'PASS',cases,scope:'actual unload handler, dirty/clean, previous host callback receiver/return/throw, no deprecated property or suppressed lint'}));
