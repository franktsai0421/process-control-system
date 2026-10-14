/* oxlint-disable typescript/no-require-imports -- transport unit test without a browser or service. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{randomUUID}=require('node:crypto');
(async()=>{
 const notices=[],root={prepend:n=>{n.isConnected=true;notices.push(n);}};
 const controls=Object.fromEntries(['save','delete'].map(k=>[k,{disabled:false,setAttribute(){},closest:()=>root}]));
 let permissions={save:true,delete:false};
 const document={documentElement:{lang:'zh-TW'},querySelectorAll:s=>[controls[s]],querySelector:()=>root,createElement:()=>({setAttribute(){}})};
 const window={ProcessSync:{identity:{id:'employee'}},addEventListener(){}};
 const context={window,document,sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},crypto:{randomUUID},AbortController,setTimeout,clearTimeout,fetch:async()=>({ok:true,status:200,json:async()=>({permissions})})};
 vm.runInNewContext(fs.readFileSync('public/process/shared-draft-client.js','utf8'),context);
 const client=window.createSharedDraftClient({endpoint:'/fixture',actorId:'employee',headers:()=>({}),permissionGates:{save:'save',delete:'delete'}});
 await client.read();assert.equal(controls.delete.disabled,true);assert.equal(controls.save.disabled,false);assert.equal(notices.length,0);
 controls.delete.disabled=false;client.gatePermissions();assert.equal(notices.length,0);
 permissions={save:false,delete:false};await client.read();assert.equal(controls.save.disabled,true);assert.equal(notices.length,1);assert.match(notices[0].textContent,/權限已變更/);assert.doesNotMatch(notices[0].textContent,/Quyền/);
 window.ProcessSync.identity={id:'another'};await assert.rejects(client.read(),/ACCOUNT_CHANGED_REOPEN_REQUIRED/);
 console.log('PASS initial denied controls stay disabled without a false revocation alert; real revocation blocks Save and shows localized notice; stale account read rejected');
})().catch(e=>{console.error(e);process.exitCode=1;});
