// Isolated production-helper tests: Canvas call contract and continuation guards.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('public/process/photo-upload.js','utf8');
const png=new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64')],'test.png',{type:'image/png'});
// Minimal valid RIFF envelope; the injected decoder supplies dimensions.
const data=Buffer.alloc(20);data.write('RIFF');data.writeUInt32LE(12,4);data.write('WEBP',8);data.write('VP8 ',12);
const calls=[],listeners={};let width=3200,height=1800,closed=0,fail=false;
const document={documentElement:{lang:'zh-TW',nodeType:1,matches:()=>false,querySelectorAll:()=>[]},querySelectorAll:()=>[],addEventListener:(name,fn)=>listeners[name]=fn,createElement:tag=>{
 assert.equal(tag,'canvas');return {width:0,height:0,getContext(){return {drawImage(){}};},toBlob(done,type,quality){calls.push({width:this.width,height:this.height,type,quality});done(fail?null:new Blob([data],{type}));}};
}};
const ctx={window:{},document,File,Blob,URL,Uint8Array,DataView,Map,WeakMap,Object,Promise,Math,Date,Error,MutationObserver:class{observe(){}},createImageBitmap:async()=>({width,height,close(){closed++;}})};
vm.runInNewContext(source,ctx);const helper=ctx.window.ProcessPhotoUpload;
const output=await helper.prepare(png);assert.equal(output.type,'image/webp');assert.equal(output.name,'test.webp');assert.deepEqual(calls[0],{width:1600,height:900,type:'image/webp',quality:.82});
assert.equal(await helper.prepare(png),output,'retry must reuse exact prepared File');
await helper.prepare(png,{profile:'hd'});assert.deepEqual(calls[1],{width:2400,height:1350,type:'image/webp',quality:.90});
assert.equal(await helper.prepare(png,{profile:'fidelity'}),png,'fidelity preserves original bytes/object');
width=80;height=120;await helper.prepare(new File([png],'small.png',{type:'image/png'}));assert.equal(calls.at(-1).width,80);assert.equal(calls.at(-1).height,120);
const untyped=await helper.prepare(new File([png],'untyped',{type:''}),{profile:'fidelity'});assert.equal(untyped.type,'image/png');assert.deepEqual(Buffer.from(await untyped.arrayBuffer()),Buffer.from(await png.arrayBuffer()));
assert.throws(()=>helper.assertInput({size:40_000_001}));width=10_000;height=6_000;await assert.rejects(helper.prepare(new File([png],'huge.png',{type:'image/png'})),/5000|50 triệu/);width=80;height=120;
await assert.rejects(helper.prepare(new File(['text'],'bad.png',{type:'image/png'})));
await assert.rejects(helper.prepare(new File([png],'wrong.jpg',{type:'image/jpeg'})));
await assert.rejects(helper.prepare(png,{profile:'unknown'}));
fail=true;const retry=new File([png],'retry.png',{type:'image/png'});await assert.rejects(helper.prepare(retry));fail=false;assert.equal((await helper.prepare(retry)).type,'image/webp','failed conversion may be retried; never silently upload original');
assert.ok(closed>=6,'decode resources released on success/failure');
ctx.window.ProcessSync={identity:{id:'a'},identityGeneration:()=>1};
const stale=helper.prepare(new File([png],'stale.png',{type:'image/png'}));ctx.window.ProcessSync.identity={id:'b'};await assert.rejects(stale,/身分|Tài khoản/,'actor change while processing must not reach uploader');
for(const name of ['app','fqc-master','iqc-master','ipqc-ab','ipqc-c','routine-equipment','tooling','routine-fqc','web-feedback'])assert.match(fs.readFileSync(`public/process/${name}.js`,'utf8'),/ProcessPhotoUpload\.prepare\(/,name+' uses common preparation');
const html=fs.readFileSync('public/process/index.html','utf8');assert.ok(html.indexOf('src="photo-upload.js')<html.indexOf('src="shared-state.js'),'helper loads before app/feature loaders');
for(const name of ['iqc-master','routine-equipment'])assert.match(fs.readFileSync(`public/process/${name}.js`,'utf8'),/preserveSource: true/,'source restoration preserves source hashes');
console.log('PASS photo-upload: exact profile parameters, no upscale, byte-preserving fidelity, retry, malformed/MIME rejection, resource release, 9 integrations and source-import compatibility');
