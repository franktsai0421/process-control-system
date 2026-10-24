// Production upload functions with isolated File/API stubs; no browser or Local DB.
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function extract(file,name){const s=fs.readFileSync('public/process/'+file,'utf8'),tree=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let found;function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)found=n;ts.forEachChild(n,visit);}visit(tree);assert.ok(found);return s.slice(found.getStart(tree),found.end);}
(async()=>{
 const original={name:'original.png',type:'image/png',size:8_000_000},converted={name:'original.webp',type:'image/webp',size:20_000},id='a'.repeat(64);
 for(const [file,name,call]of [['iqc-master.js','upload','single'],['ipqc-c.js','upload','single'],['routine-equipment.js','uploadImage','single'],['ipqc-ab.js','upload','batch']]){
  const requests=[];let conversionCalls=0;
  const item={id:'item',standardPhotos:[],methodPhotos:[]};
  const ctx={window:{ProcessPhotoUpload:{async prepare(f){assert.equal(f,original);conversionCalls++;return converted;}},ProcessSync:{platformHeaders:()=>({})}},headers:()=>({}),photoUrl:'/photo',API:'/api',api:'/equipment',query:'',t:a=>a,working:{items:[item]},modal:{id:'item'},fetch:async(url,options)=>{requests.push(options);return{ok:true,json:async()=>({id,url:'/photo?id='+id})};}};
  vm.createContext(ctx);vm.runInContext(extract(file,name)+';this.uploadFixture='+name,ctx);
  await ctx.uploadFixture(call==='batch'?[original]:original,'standard');assert.equal(conversionCalls,1,file);assert.equal(requests[0].body,converted,file+' normalized bytes sent');assert.equal(requests[0].headers['Content-Type'],'image/webp');
  if(call==='batch')assert.equal(item.standardPhotos[0].name,'original.webp');
  if(file==='iqc-master.js'||file==='routine-equipment.js'){requests.length=0;const source={...original,size:1000};await ctx.uploadFixture(source,{preserveSource:true});assert.equal(requests[0].body,source,'verified source import preserves SHA');assert.equal(conversionCalls,1);}
 }
 // Closing/switching the AB modal during conversion must not upload or attach.
 let complete;const item={id:'item',standardPhotos:[]},requests=[];
 const ctx={window:{ProcessPhotoUpload:{prepare:()=>new Promise(r=>complete=r)}},headers:()=>({}),API:'/api',working:{items:[item]},modal:{id:'item'},fetch:async(...args)=>{requests.push(args);throw Error('unexpected');}};
 vm.createContext(ctx);vm.runInContext(extract('ipqc-ab.js','upload')+';this.uploadFixture=upload;',ctx);const pending=ctx.uploadFixture([original],'standard');ctx.modal=null;complete(converted);await pending;assert.equal(requests.length,0);assert.equal(item.standardPhotos.length,0);
 // Feedback now awaits encoding: concurrent batches cannot exceed six or append
 // into a canceled/account-switched draft, and Submit waits for processing.
 const resolvers=[],messages=[];let saved=0;
 const feedback={window:{ProcessPhotoUpload:{profileFor:()=> 'standard',prepare:()=>new Promise(r=>resolvers.push(r))}},panel:{querySelector:()=>({})},busy:false,draft:{markers:[{images:Array.from({length:5},()=>({id:'old'}))}]},index:0,epoch:0,imageTasks:0,uid:()=>String(Math.random()),message:m=>messages.push(m),t:a=>a,persist:async()=>{saved++;},draw:()=>{}};
 vm.createContext(feedback);vm.runInContext(extract('web-feedback.js','addImages')+';this.addFixture=addImages;'+extract('web-feedback.js','submit')+';this.submitFixture=submit;',feedback);
 const a=feedback.addFixture([original]),b=feedback.addFixture([original]);assert.equal(feedback.imageTasks,2);await feedback.submitFixture();assert.match(messages.at(-1),/處理中/);
 resolvers.shift()(converted);await a;resolvers.shift()(converted);await b;assert.equal(feedback.draft.markers[0].images.length,6);assert.equal(feedback.imageTasks,0);
 feedback.draft.markers[0].images=[];saved=0;const canceled=feedback.addFixture([original]);feedback.epoch++;resolvers.shift()(converted);await canceled;assert.equal(feedback.draft.markers[0].images.length,0);assert.equal(saved,0);assert.equal(feedback.imageTasks,0);
 console.log('PASS actual photo clients: final MIME/bytes, normalize before 5 MB limit, source SHA exceptions, modal cancellation, feedback concurrent six-photo limit, epoch/Submit guards');
})().catch(error=>{console.error(error);process.exitCode=1;});
