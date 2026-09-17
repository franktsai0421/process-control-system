(function(host){
  'use strict';
  const copy=v=>JSON.parse(JSON.stringify(v)), h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const t=(zh,vi)=>document.documentElement.lang==='vi'?vi:zh;
  function processSnapshot(catalog){return catalog&&typeof catalog==='object'&&!Array.isArray(catalog)&&!Array.isArray(catalog.products)&&!Array.isArray(catalog.lines);}
  function rows(catalog){if(processSnapshot(catalog))return Object.entries(catalog||{}).flatMap(([stage,templates])=>(templates||[]).flatMap(template=>[
    {key:'process:'+stage+':'+template.id,kind:t('流程','Quy trình'),code:stage+' · '+template.id,value:[template.name,(template.mediaItems||[]).length+t(' 張照片',' ảnh')].join(' · '),fingerprint:JSON.stringify({...template,equipment:undefined})},
    ...(template.equipment||[]).map(e=>({key:'equipment:'+e.id,kind:t('設備','Thiết bị'),code:stage+' · '+(e.number||e.id),value:[template.name,e.number||t('待補編號','Chưa có mã'),e.name,e.nameVi,e.process,e.purpose,e.purposeVi,e.note,(e.mediaItems||[]).length+t(' 張照片',' ảnh')].filter(Boolean).join(' · '),fingerprint:JSON.stringify(e)}))
  ]));return [
    ...(catalog.products||[]).map(p=>({key:'product:'+p.code,kind:t('產品','Sản phẩm'),code:p.code,value:[p.name,p.category,p.line,p.specification,p.unit,(p.stages||[]).join(' → ')].join(' · ')})),
    ...(catalog.lines||[]).flatMap(l=>[{key:'line:'+l.code,kind:t('線別','Chuyền'),code:l.code,value:l.name},...l.stages.map(s=>({key:'stage:'+l.code+':'+s.code,kind:t('工段','Công đoạn'),code:s.code,value:[s.name,s.machine,s.assetNumber,s.operators].filter(v=>v!=null).join(' · ')}))]),
    ...(host.MasterAdminUI?.categoryEntries(catalog)||[]).map(g=>({key:'category:'+g.line+':'+g.name,kind:t('類別','Nhóm'),code:g.line,value:g.name}))
  ];}
  function diff(next,previous){const before=new Map(rows(previous).map(r=>[r.key,r])),after=new Map(rows(next).map(r=>[r.key,r]));return [...new Set([...before.keys(),...after.keys()])].flatMap(key=>{const a=before.get(key),b=after.get(key);if(a&&b&&(a.fingerprint||a.value)===(b.fingerprint||b.value))return [];const mediaOnly=a&&b&&a.value===b.value;return [{kind:(b||a).kind,code:(b||a).code,type:!a?'add':!b?'delete':'edit',before:a?.value||'—',after:(b?.value||'—')+(mediaOnly?t('（照片或詳細內容已更新）',' (Đã cập nhật ảnh hoặc chi tiết)'):'')}];});}
  function install({state,control,persist,record,validateCatalog,applyActive,showVersion}){
    const created=new Date().toISOString();
    const demoBase={name:'SAMPLE',products:[{code:'SAMPLE-AB-001',name:'SAMPLE 示範產品',category:'SAMPLE',line:'A',unit:'PCS',stages:['A-SAMPLE']}],lines:[{code:'A',name:'SAMPLE A 線',stages:[{code:'A-SAMPLE',name:'SAMPLE 示範工段'}]}]};
    let demo;
    function resetDemo(){demo={id:'MD-SAMPLE-PREVIEW',scope:'AB',number:'SAMPLE',status:'pending',isSample:true,snapshot:copy(demoBase),creatorName:'SAMPLE',updatedAt:created,createdAt:created,warnings:[],history:[]};demo.snapshot.products[0].name='SAMPLE 示範產品（已修改）';}
    resetDemo();
    const statuses=()=>({pending:t('待確認','Chờ duyệt'),approved:t('已確認','Đã duyệt'),draft:t('已取消送審','Đã hủy gửi duyệt'),superseded:t('歷史版本','Phiên bản trước')});
    function items(){return control.versions.filter(v=>v.status!=='draft').sort((a,b)=>(a.status==='pending'?0:1)-(b.status==='pending'?0:1)||new Date(b.updatedAt)-new Date(a.updatedAt));}
    function selected(){return state.masterReviewId===demo.id?demo:items().find(v=>v.id===state.masterReviewId)||items().find(v=>v.status==='pending')||demo;}
    function base(item){if(item.isSample)return demoBase;return control.versions.find(v=>v.id===item.parentVersionId)?.snapshot||control.versions.filter(v=>v.scope===item.scope&&v.number<item.number).sort((a,b)=>b.number-a.number)[0]?.snapshot||(item.scope==='PROCESS'?{}:{products:[],lines:[]});}
    function scopeLabel(item){return item.scope==='PROCESS'?t('流程資料','Dữ liệu quy trình'):item.scope;}
    function validationErrors(item){return item.scope==='PROCESS'?(host.ProcessMasterVersioning?.validate(item.snapshot)||[]):validateCatalog(item.snapshot);}
    function canWithdraw(item){return item.isSample||item.creatorId===currentUser?.id||currentUser?.role==='admin'||host.hasPermission?.('approval.withdraw');}
    function returnCheck(item){return host.VersionReturnPolicy?.check(control.versions.filter(v=>v.scope===item.scope),item)||{allowed:false,reason:t('無法檢查返回條件。','Không thể kiểm tra điều kiện hoàn tác.')};}
    function view(){
      const item=selected(),changes=diff(item.snapshot,base(item)),labels={add:t('新增','Thêm'),delete:t('刪除','Xóa'),edit:t('修改','Sửa')};state.masterReviewId=item.id;
      const time=new Date(item.updatedAt).toLocaleString(document.documentElement.lang==='vi'?'vi-VN':'zh-TW');
      const back=!item.isSample&&item.status==='approved'?returnCheck(item):null;
      const process=processSnapshot(item.snapshot),summary=process?`<div class="master-change-grid"><span><b>${Object.keys(item.snapshot).length}</b><br>${t('工段','Công đoạn')}</span><span><b>${Object.values(item.snapshot).flat().length}</b><br>${t('流程','Quy trình')}</span><span><b>${Object.values(item.snapshot).flat().reduce((sum,template)=>sum+(template.mediaItems||[]).length,0)}</b><br>${t('照片','Ảnh')}</span></div>`:'';
      return `<section class="master-pending master-review-top" data-i18n-skip="true"><header><div><h2>${t('主資料送審案件','Hồ sơ duyệt dữ liệu gốc')}</h2><p>${t('AB、C 產品、線別、工段與流程資料修改','Thay đổi sản phẩm, chuyền, công đoạn và dữ liệu quy trình AB / C')}</p></div><span>${items().filter(v=>v.status==='pending').length} ${t('件待確認','hồ sơ chờ duyệt')}</span></header><div class="master-review-grid"><aside class="master-review-list">${items().map(v=>`<button data-master-review="${h(v.id)}" class="${item.id===v.id?'active':''}"><b>${h(v.scope==='PROCESS'?t('流程資料','Dữ liệu quy trình'):v.scope)} · V${v.number}</b><span class="master-status ${v.status}">${statuses()[v.status]||v.status}</span><small>${h(v.creatorName)} · ${new Date(v.updatedAt).toLocaleString()}</small></button>`).join('')}<button data-master-review="${demo.id}" class="${item.isSample?'active':''}"><b>SAMPLE · ${t('送審示範','Ví dụ gửi duyệt')}</b><small>${t('練習用，不變更正式資料','Thực hành, không đổi dữ liệu thật')}</small></button></aside><div class="master-review-detail">${item.isSample?`<div class="master-sample-note"><b>SAMPLE</b> ${t('這是獨立示範；確認或取消只影響示範，不會套用到產線。','Ví dụ độc lập; duyệt hoặc hủy không áp dụng vào chuyền.')}<button class="master-small" id="master-demo-reset">${t('重新示範','Làm lại ví dụ')}</button></div>`:''}<header><h3>${h(scopeLabel(item))} · ${item.isSample?'SAMPLE':'V'+item.number} <span class="master-status ${item.status}">${statuses()[item.status]}</span></h3><small>${h(item.creatorName)} · ${time}</small></header>${summary}<h4>${t('修改前後內容','Nội dung trước và sau')} · ${changes.length}</h4><div class="master-diff-scroll"><table><thead><tr>${[t('動作','Thao tác'),t('項目','Mục'),t('修改前','Trước'),t('修改後','Sau')].map(s=>`<th>${s}</th>`).join('')}</tr></thead><tbody>${changes.map(d=>`<tr class="master-diff-${d.type}"><td>${labels[d.type]}</td><td>${h(d.kind)}<br><code>${h(d.code)}</code></td><td>${h(d.before)}</td><td>${h(d.after)}</td></tr>`).join('')||`<tr><td colspan="4">${t('本版本沒有資料差異。','Phiên bản không có thay đổi dữ liệu.')}</td></tr>`}</tbody></table></div>${item.warnings?.length?`<div class="master-danger-list">${item.warnings.map(w=>`<p>${h(w)}</p>`).join('')}</div>`:''}${back?`<div class="approval-return-note ${back.allowed?'allowed':'blocked'}"><b>${t('主管返回確認','Quản lý hoàn tác phê duyệt')}</b><span>${h(back.reason)}</span></div>`:''}<div class="master-version-actions">${!item.isSample?`<button class="button ghost" id="master-review-open">${t('查閱完整版本','Xem toàn bộ phiên bản')}</button>`:''}${item.status==='pending'&&(item.isSample||canApprove())?`<button class="button signal" id="approve-master">${item.isSample?t('SAMPLE 確認示範','SAMPLE Duyệt thử'):t('確認版本','Duyệt phiên bản')}</button>`:''}${item.status==='approved'&&canApprove()?`<button class="button ghost danger" id="return-master-approval" ${back?.allowed?'':'disabled'}>${t('返回確認','Hoàn tác phê duyệt')}</button>`:''}${item.status==='pending'&&canWithdraw(item)?`<button class="button ghost" id="withdraw-master-review">${t('解除送審，繼續修改','Hủy gửi duyệt, sửa tiếp')}</button>`:''}</div></div></div></section>`;
    }
    function bind(){
      document.querySelectorAll('[data-master-review]').forEach(b=>b.onclick=()=>{state.masterReviewId=b.dataset.masterReview;render();});
      document.querySelector('#master-demo-reset')?.addEventListener('click',()=>{resetDemo();state.masterReviewId=demo.id;render();});
      document.querySelector('#master-review-open')?.addEventListener('click',()=>{const item=selected();if(!item.isSample)showVersion(item.scope,item.id);});
      document.querySelector('#approve-master')?.addEventListener('click',()=>{
        const item=selected();if(item.status!=='pending'||(!item.isSample&&!canApprove()))return;
        if(!item.isSample){const errors=validationErrors(item);if(errors.length){toast(t('此版本仍有未完成資料，請解除送審修改。','Phiên bản vẫn còn dữ liệu chưa hoàn tất. Hãy hủy gửi duyệt để sửa.'));return;}}
        if(item.isSample){item.status='approved';toast(t('SAMPLE 已確認，正式資料未變更。','Đã duyệt SAMPLE; dữ liệu thật không đổi.'));}
        else{control.versions.filter(v=>v.scope===item.scope&&v.status==='approved').forEach(v=>v.status='superseded');item.status='approved';item.reviewerName=currentUser?.name||'主管';item.reviewedAt=new Date().toISOString();record(item,'確認主資料版本');control.active[item.scope]=copy(item.snapshot);persist();applyActive();toast(t('版本已確認並套用。','Đã duyệt và áp dụng phiên bản.'));}
        render();
      });
      document.querySelector('#return-master-approval')?.addEventListener('click',()=>{
        const item=selected(),check=returnCheck(item);if(!check.allowed){toast(check.reason);return;}
        if(!confirm(t(`返回確認 V${item.number}？產線會先恢復 V${check.fallback.number}，本版回到主管審核中。`,`Hoàn tác V${item.number}? Chuyền sẽ tạm dùng V${check.fallback.number}, phiên bản này quay lại chờ duyệt.`)))return;
        check.fallback.status='approved';item.status='pending';item.reviewNote=t('主管返回確認，等待重新確認。','Quản lý hoàn tác; chờ duyệt lại.');record(check.fallback,'恢復為目前生效版本',`V${item.number} 返回確認`);record(item,'主管返回確認',`暫時恢復 V${check.fallback.number}`);control.active[item.scope]=copy(check.fallback.snapshot);persist();applyActive();toast(t('已安全返回確認，上一版已恢復使用。','Đã hoàn tác an toàn; phiên bản trước được khôi phục.'));render();
      });
      document.querySelector('#withdraw-master-review')?.addEventListener('click',()=>{
        const item=selected();if(item.status!=='pending'||!canWithdraw(item))return;
        item.status='draft';if(!item.isSample){record(item,'解除送審，繼續修改');persist();state.masterReviewId=null;}
        toast(t('已解除送審，不再列入待確認案件。','Đã hủy gửi duyệt, không còn trong danh sách chờ.'));render();
      });
    }
    return {view,bind};
  }
  host.MasterReview={install,diff};
})(typeof window==='undefined'?globalThis:window);
