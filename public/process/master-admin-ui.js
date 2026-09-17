(function (host) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const t = (zh, vi) => document.documentElement.lang === 'vi' ? vi : zh;
  const val = value => h(!value || value === '待補' ? t('待補','Cần bổ sung') : value);
  function categoryEntries(catalog) {
    const groups = new Map();
    [...(catalog.categoryGroups || []), ...catalog.products.map(p => ({line:p.line || '待補',name:p.category || '待補'}))].forEach(g => groups.set(JSON.stringify([g.line,g.name]), {...g}));
    return [...groups.values()].sort((a,b) => a.line.localeCompare(b.line) || a.name.localeCompare(b.name));
  }
  function validProduct(catalog, product, originalCode) {
    if (!product.code || !product.name) return 'required';
    if (catalog.products.some(p => p !== catalog.products.find(x => x.code === originalCode) && p.code === product.code)) return 'duplicate';
    const line = catalog.lines.find(l => l.code === product.line);
    if (!line || product.stages.some(code => !line.stages.some(s => s.code === code))) return 'route';
    return '';
  }
  function install(api) {
    const confirm=message=>String(message).startsWith('刪除')||String(message).startsWith('Xóa')?window.confirmMasterDeletion(message):window.confirm(message);
    const {state,control,versions,draft,pending,persist,record,beginDraft,saveDraft,submitDraft,importExcel,exportExcel,validateCatalog} = api;
    const ui = {scope:state.masterScope,line:'',search:'',category:'',versions:{},linesOpen:true};
    const permitted=key=>typeof window.hasPermission==='function'?window.hasPermission(key):currentUser?.role==='admin';
    const hasPendingReview=()=>control.versions.some(version=>version.status==='pending');
    const canDelete=()=>!!editable()&&permitted('master.delete')&&!hasPendingReview();
    const deletionNote=()=>!permitted('master.delete')?t('只有主管可刪除主資料。','Chỉ quản lý được xóa dữ liệu gốc.'):hasPendingReview()?t('目前有主資料正在送審，為避免版本衝突，暫停刪除。','Đang có dữ liệu chờ duyệt; tạm khóa xóa để tránh xung đột.') : '';
    function deletionAccess(){
      if(!permitted('master.delete'))return '';
      if(hasPendingReview())return `<section class="master-delete-access locked"><b>${t('刪除功能已暫停','Chức năng xóa đang tạm khóa')}</b><span>${deletionNote()}</span></section>`;
      if(editable())return `<section class="master-delete-access ready"><b>${t('修改／刪除模式已開啟','Đã bật chế độ sửa / xóa')}</b><span>${t('類別、產品、線別與工段旁已顯示刪除按鈕；所有變更仍需主管核准才會生效。','Nút xóa đã hiển thị cạnh nhóm, sản phẩm, chuyền và công đoạn; thay đổi chỉ có hiệu lực sau khi duyệt.')}</span></section>`;
      return `<section class="master-delete-access"><b>${t('您有刪除主資料權限','Bạn có quyền xóa dữ liệu gốc')}</b><span>${t('按上方「開始修改／刪除資料」建立安全草稿，刪除按鈕就會顯示。','Nhấn “Bắt đầu sửa / xóa dữ liệu” phía trên để tạo bản nháp an toàn và hiện các nút xóa.')}</span></section>`;
    }
    function deletionImpact({products=[],stages=[]}) {
      const productCodes=new Set(products.map(p=>typeof p==='string'?p:p.code)),categories=new Set(products.map(p=>typeof p==='string'?'':p.category).filter(Boolean)),stageCodes=new Set(stages);
      const bomGroups=[...productCodes].filter(code=>typeof data!=='undefined'&&data.bom?.[code]?.length),bomRows=bomGroups.reduce((sum,code)=>sum+(data.bom[code]?.length||0),0);
      const draftSets=typeof state!=='undefined'?Object.entries(state.editorByCategory||{}):[],draftOperations=draftSets.flatMap(([,set])=>Object.values(set||{}).flat());
      const affectedDrafts=draftOperations.filter(op=>stageCodes.has(op.stageCode)||op.productCodes?.some(code=>productCodes.has(code))||Object.keys(op.bomSelections||{}).some(code=>productCodes.has(code))).length;
      const categoryEditors=draftSets.filter(([key])=>[...categories].some(category=>key.startsWith(`${category}:`))).length;
      const versionList=typeof approvalVersions==='undefined'?[]:approvalVersions;
      const affectedVersions=versionList.filter(version=>categories.has(version.category)||Object.keys(version.stages||{}).some(code=>stageCodes.has(code))||Object.values(version.stages||{}).flat().some(op=>op.productCodes?.some(code=>productCodes.has(code)))).length;
      const templateCount=typeof processMaster==='undefined'?0:[...stageCodes].reduce((sum,code)=>sum+(processMaster[code]?.length||0),0);
      const dispatched=typeof dispatchBoard==='undefined'?0:Object.values(dispatchBoard).flat().filter(code=>productCodes.has(code)).length;
      const routeCount=products.filter(product=>typeof product!=='string'&&(product.stages||[]).length).length;
      const zh=[`製程編輯台：${productCodes.size} 個產品選項、${routeCount} 條產品路線`,`${categoryEditors||affectedDrafts?`編輯中草稿：${categoryEditors} 個類別工作區、${affectedDrafts} 個流程引用`:'編輯中草稿：目前沒有引用'}`,`BOM 資料：${bomGroups.length} 組主件 BOM、${bomRows} 筆零件`,`工段流程資料：${templateCount} 個流程範本`,`發送介面：${dispatched} 個正在發送的產品`, `歷史／送審版本：${affectedVersions} 版（保留紀錄，不會刪除）`];
      const vi=[`Trình chỉnh sửa: ${productCodes.size} sản phẩm, ${routeCount} tuyến sản phẩm`,`Bản nháp đang sửa: ${categoryEditors} vùng nhóm, ${affectedDrafts} tham chiếu quy trình`,`BOM: ${bomGroups.length} BOM gốc, ${bomRows} linh kiện`,`Dữ liệu công đoạn: ${templateCount} mẫu quy trình`,`Điều phối: ${dispatched} sản phẩm đang gửi`,`Phiên bản lịch sử/chờ duyệt: ${affectedVersions} (giữ lại, không xóa)`];
      const lines=document.documentElement.lang==='vi'?vi:zh;
      return {message:`${t('此刪除會影響下列資料：','Thao tác xóa ảnh hưởng dữ liệu sau:')}\n• ${lines.join('\n• ')}`,warning:zh.join('；')};
    }
    function selected() { return versions().find(v => v.id === ui.versions[state.masterScope]) || draft() || pending() || versions()[0]; }
    function current() { return selected()?.snapshot || control.active[state.masterScope]; }
    function editable() { return selected()?.status === 'draft' ? selected().snapshot : null; }
    const stamp = value => value ? new Date(value).toLocaleString(document.documentElement.lang === 'vi' ? 'vi-VN' : 'zh-TW') : '—';
    const status = value => ({draft:t('草稿 · 未送審','Bản nháp · Chưa gửi'),pending:t('主管審核中','Đang chờ duyệt'),approved:t('已核准','Đã duyệt'),superseded:t('歷史核准','Bản đã duyệt trước')})[value] || value;
    function commit(label,note,action) {
      if (!editable()) return false;
      const before = copy(selected().snapshot), history = copy(selected().history || []), updated = selected().updatedAt;
      try { action(editable()); record(selected(),label,note); if(state.masterValidationErrors?.length)state.masterValidationErrors=validateCatalog(editable()); persist(); return true; }
      catch(error) { selected().snapshot = before; selected().history = history; selected().updatedAt = updated; toast(t('儲存失敗，請重試。','Không lưu được, vui lòng thử lại.')); return false; }
    }
    const small = (label,attrs='') => `<button type="button" class="master-small" ${attrs}>${label}</button>`;
    const options = (values,selectedValue) => values.map(v => `<option value="${h(typeof v === 'string' ? v : v.value)}" ${(typeof v === 'string' ? v : v.value) === selectedValue ? 'selected' : ''}>${val(typeof v === 'string' ? v : v.label)}</option>`).join('');
    function redraw() { const content = document.querySelector('#data-content'); if(content) {content.innerHTML = masterView(); bindMaster();} }
    function modal(title,body,onSave,setup) {
      document.querySelector('#master-edit-dialog')?.close();
      const previous = document.activeElement, dialog = document.createElement('dialog');
      dialog.id = 'master-edit-dialog'; dialog.className = 'master-edit-dialog'; dialog.dataset.i18nSkip = 'true';
      dialog.setAttribute('aria-labelledby','master-dialog-title');
      dialog.innerHTML = `<form><header><h2 id="master-dialog-title">${title}</h2>${small('×','data-cancel aria-label="'+t('取消','Hủy')+'"')}</header><div class="master-dialog-body">${body}<p class="master-dialog-error" role="alert"></p></div><footer><small>${t('Esc 取消，不儲存變更','Esc để hủy, không lưu thay đổi')}</small>${small(t('取消','Hủy'),'data-cancel')}<button class="button signal" type="submit">${t('儲存到草稿','Lưu vào bản nháp')}</button></footer></form>`;
      document.body.appendChild(dialog);
      dialog.addEventListener('close',() => {dialog.remove(); if(previous?.isConnected) previous.focus({preventScroll:true});});
      dialog.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => dialog.close());
      // Native dialog cancel (Escape) closes without ever invoking onSave.
      dialog.querySelector('form').onsubmit = event => {event.preventDefault(); const error = onSave(new FormData(event.target),dialog); if(error) dialog.querySelector('.master-dialog-error').textContent = error; else {dialog.close(); redraw(); toast(t('已儲存到草稿','Đã lưu vào bản nháp'));}};
      setup?.(dialog); dialog.showModal();
      return dialog;
    }
    const field = (label,name,value='',extra='') => `<label>${label}<input name="${name}" value="${h(value)}" ${extra}></label>`;
    const select = (label,name,items,value) => `<label>${label}<select name="${name}">${options(items,value)}</select></label>`;
    function editCategory(group) {
      if(!editable()) return;
      const line = group?.line || ui.line || current().lines[0]?.code || '待補';
      modal(group ? t('修改產品類別','Sửa nhóm sản phẩm') : t('新增產品類別','Thêm nhóm sản phẩm'),
        select(t('線別','Chuyền'),'line',current().lines.map(l=>({value:l.code,label:`${l.code} · ${l.name}`})),line)+field(t('類別名稱','Tên nhóm'),'name',group?.name,'required maxlength="100"'), form => {
          const name = form.get('name').trim(), nextLine = form.get('line');
          if(!name || !nextLine) return t('請填寫類別與線別。','Nhập nhóm và chuyền.');
          if(categoryEntries(current()).some(g => g.name===name && g.line===nextLine && !(group?.name===name && group?.line===nextLine))) return t('這個線別已有同名類別。','Chuyền này đã có nhóm cùng tên.');
          if(group && nextLine !== group.line && current().products.some(p=>p.line===group.line&&p.category===group.name)) return t('此類別已有產品，請先調整產品線別再移動類別。','Nhóm đang có sản phẩm. Hãy đổi chuyền của sản phẩm trước.');
          return commit(group?'修改產品類別':'新增產品類別',`${nextLine} · ${name}`, catalog=>{
            catalog.categoryGroups=categoryEntries(catalog).filter(g=>!(group&&g.line===group.line&&g.name===group.name));
            catalog.categoryGroups.push({line:nextLine,name});
            if(group) catalog.products.forEach(p=>{if(p.line===group.line&&p.category===group.name)p.category=name;});
          }) ? '' : t('無法儲存。','Không lưu được.');
        });
    }
    function removeCategory(group) {
      if(!canDelete()){toast(deletionNote());return;}
      const products=current().products.filter(p=>p.line===group.line&&p.category===group.name),count=products.length,impact=deletionImpact({products});
      if(!confirm(`${t(`刪除 ${group.line} 線「${group.name}」及其 ${count} 筆產品？`,`Xóa nhóm ${group.name} của chuyền ${group.line} và ${count} sản phẩm?`)}\n\n${impact.message}\n\n${t('此變更只會先加入草稿，主管核准後才套用。確定繼續？','Thay đổi chỉ được thêm vào bản nháp và áp dụng sau khi quản lý duyệt. Tiếp tục?')}`))return;
      if(commit('刪除產品類別',`${group.line} · ${group.name}`,catalog=>{
        catalog.categoryGroups=categoryEntries(catalog).filter(g=>!(g.line===group.line&&g.name===group.name));
        catalog.products=catalog.products.filter(p=>!(p.line===group.line&&p.category===group.name));
        selected().warnings.push(`刪除類別 ${group.line} / ${group.name}（${count} 筆產品）｜${impact.warning}`);
      })) {ui.category='';redraw();}
    }
    function editProduct(original) {
      if(!editable()) return;
      const catalog = current(), product = copy(original || {code:'',name:'',specification:'',unit:'待補',line:ui.line || catalog.lines[0]?.code,category:ui.category || '待補',stages:[]});
      let route = [...product.stages];
      const units=[...new Set(['待補','CAI','BO','KG','M','TO','SET','PCS','個','組','件',...catalog.products.map(p=>p.unit||'待補')])];
      modal(original?t('修改產品','Sửa sản phẩm'):t('新增產品','Thêm sản phẩm'), `<div class="master-form-grid">${field(t('產品編號','Mã sản phẩm'),'code',product.code,'required maxlength="100"')}${field(t('產品名稱','Tên sản phẩm'),'name',product.name,'required maxlength="200"')}${select(t('線別','Chuyền'),'line',catalog.lines.map(l=>({value:l.code,label:`${l.code} · ${l.name}`})),product.line)}<label>${t('產品類別','Nhóm sản phẩm')}<select name="category"></select></label>${field(t('規格','Quy cách'),'specification',product.specification)}${select(t('單位','Đơn vị'),'unit',units,product.unit)}</div><section class="master-route-picker"><h3>${t('製程路線','Tuyến quy trình')}</h3><p>${t('按順序加入工段；可調整順序或移除。','Thêm công đoạn theo thứ tự; có thể đổi thứ tự hoặc bỏ.')}</p><div class="master-route-add"><select name="stage-choice" aria-label="${t('可選工段','Công đoạn có sẵn')}"></select>${small(t('加入工段','Thêm công đoạn'),'data-route-add')}</div><ol data-route-list></ol></section>`, (form,dialog)=>{
        const next={...product,code:form.get('code').trim(),name:form.get('name').trim(),line:form.get('line'),category:form.get('category')||'待補',unit:form.get('unit')||'待補',specification:form.get('specification').trim()||'待補',stages:route};
        const error=validProduct(catalog,next,original?.code);
        const removedStages=(original?.stages||[]).filter(code=>!route.includes(code));
        if(removedStages.length){if(!canDelete())return deletionNote();if(!window.confirmMasterDeletion(`刪除產品 ${original.code} 路線中的工段：${removedStages.join('、')}。\n核准後將更新製程編輯台、產品狀態與產線播放的適用路線。`))return t('已取消路線刪除。','Đã hủy xóa tuyến.');}
        if(control.active[state.masterScope==='AB'?'C':'AB'].products.some(p=>p.code===next.code))return t('另一個產線頁籤已使用此產品編號。','Mã sản phẩm đã dùng ở thẻ chuyền khác.');
        if(error) return error==='duplicate'?t('產品編號重複，請使用其他編號。','Mã sản phẩm đã tồn tại.'):error==='route'?t('請選擇有效線別及該線工段。','Chọn chuyền và công đoạn hợp lệ.'):t('請填寫產品編號與名稱。','Nhập mã và tên sản phẩm.');
        return commit(original?'修改產品':'新增產品',next.code,c=>{if(original)c.products[c.products.indexOf(original)]=next;else c.products.unshift(next);})?'':t('無法儲存。','Không lưu được.');
      }, dialog=>{
        const lineInput=dialog.querySelector('[name=line]'), cat=dialog.querySelector('[name=category]'), choice=dialog.querySelector('[name=stage-choice]');
        function paintRoute() {
          const stages=catalog.lines.find(l=>l.code===lineInput.value)?.stages||[];
          const available=stages.filter(s=>!route.includes(s.code));
          choice.innerHTML=options([{value:'',label:t('選擇工段','Chọn công đoạn')},...available.map(s=>({value:s.code,label:`${s.code} · ${s.name}`}))],'');
          dialog.querySelector('[data-route-add]').disabled=!available.length;
          dialog.querySelector('[data-route-list]').innerHTML=route.map((code,index)=>`<li><span><code>${h(code)}</code> ${val(stages.find(s=>s.code===code)?.name)}</span>${small('↑',`data-route-up="${index}" ${index===0?'disabled':''} aria-label="${t('向前移','Chuyển lên')}"`)}${small('↓',`data-route-down="${index}" ${index===route.length-1?'disabled':''} aria-label="${t('向後移','Chuyển xuống')}"`)}${small('×',`data-route-remove="${index}" aria-label="${t('移除工段','Bỏ công đoạn')}"`)}</li>`).join('')||`<p>${t('尚未選擇工段，可先儲存草稿。','Chưa chọn công đoạn; vẫn có thể lưu nháp.')}</p>`;
          dialog.querySelectorAll('[data-route-up]').forEach(b=>b.onclick=()=>{const i=+b.dataset.routeUp;[route[i-1],route[i]]=[route[i],route[i-1]];paintRoute();});
          dialog.querySelectorAll('[data-route-down]').forEach(b=>b.onclick=()=>{const i=+b.dataset.routeDown;[route[i+1],route[i]]=[route[i],route[i+1]];paintRoute();});
          dialog.querySelectorAll('[data-route-remove]').forEach(b=>b.onclick=()=>{route.splice(+b.dataset.routeRemove,1);paintRoute();});
        }
        function paintCategories(value) {cat.innerHTML=options([...new Set(['待補',...categoryEntries(catalog).filter(g=>g.line===lineInput.value).map(g=>g.name),...(value?[value]:[])])],value||'待補');}
        lineInput.onchange=()=>{route=[];paintCategories('待補');paintRoute();};
        dialog.querySelector('[data-route-add]').onclick=()=>{if(choice.value&&!route.includes(choice.value))route.push(choice.value);paintRoute();};
        paintCategories(product.category);paintRoute();
      });
    }
    function editLine(original) {
      if(!editable())return;
      modal(original?t('修改線別','Sửa chuyền'):t('新增線別','Thêm chuyền'),field(t('線別代碼','Mã chuyền'),'code',original?.code,'required pattern="[A-Za-z0-9_-]+"')+field(t('線別名稱','Tên chuyền'),'name',original?.name,'required'),form=>{
        const code=form.get('code').trim().toUpperCase(),name=form.get('name').trim();
        if(current().lines.some(l=>l!==original&&l.code===code))return t('線別代碼重複。','Mã chuyền đã tồn tại.');
        const other=control.active[state.masterScope==='AB'?'C':'AB'];
        if(other.lines.some(l=>l.code===code))return t('此線別已由另一個產線頁籤管理。','Chuyền được quản lý ở thẻ khác.');
        return commit(original?'修改線別':'新增線別',code,c=>{
          c.categoryGroups=categoryEntries(c);
          if(original){const old=original.code;original.code=code;original.name=name;c.products.forEach(p=>{if(p.line===old)p.line=code;});c.categoryGroups.forEach(g=>{if(g.line===old)g.line=code;});if(ui.line===old)ui.line=code;}
          else c.lines.push({code,name,stages:[]});
        })?'':t('無法儲存。','Không lưu được.');
      });
    }
    function editStage(line,original) {
      if(!editable())return;
      modal(original?t('修改工段','Sửa công đoạn'):t('新增工段','Thêm công đoạn'),`<p>${h(line.code)} · ${val(line.name)}</p><div class="master-form-grid">${field(t('工段編號','Mã công đoạn'),'code',original?.code||`${line.code}-`,'required pattern="[A-Za-z0-9_-]+"')}${field(t('工段名稱','Tên công đoạn'),'name',original?.name,'required')}</div>`,form=>{
        const code=form.get('code').trim().toUpperCase(),name=form.get('name').trim();
        if(current().lines.flatMap(l=>l.stages).some(s=>s!==original&&s.code===code)||control.active[state.masterScope==='AB'?'C':'AB'].lines.flatMap(l=>l.stages).some(s=>s.code===code))return t('工段編號重複。','Mã công đoạn đã tồn tại.');
        return commit(original?'修改工段':'新增工段',code,c=>{const next={...(original||{}),code,name};if(!original){next.machine='待補';next.assetNumber='待補';next.operators=null;}if(original){const old=original.code;line.stages[line.stages.indexOf(original)]=next;c.products.forEach(p=>p.stages=p.stages.map(s=>s===old?code:s));}else line.stages.push(next);})?'':t('無法儲存。','Không lưu được.');
      });
    }
    function versionBar() {
      const item=selected(), active=versions().find(v=>v.status==='approved'), historical=!!ui.versions[state.masterScope]&&item?.status!=='draft';
      return `<section class="master-version-bar"><div><small>${t('目前查閱','Đang xem')}</small><h3>${state.masterScope} · V${item?.number||1} <span class="master-status ${item?.status}">${status(item?.status)}</span></h3><p>${item?.status==='draft'?t('先儲存草稿，再送主管審核。','Lưu bản nháp trước khi gửi duyệt.'):t('唯讀查閱，不會替換平台正在使用的資料。','Chỉ xem; không thay dữ liệu đang sử dụng.')} ${t('目前生效','Đang sử dụng')}: V${active?.number||1}</p></div><label class="master-version-select">${t('選擇版本／草稿','Chọn phiên bản / bản nháp')}<select id="master-version-choice">${versions().map(v=>`<option value="${h(v.id)}" ${v.id===item?.id?'selected':''}>V${v.number} · ${status(v.status)} · ${stamp(v.updatedAt)}</option>`).join('')}</select></label><div class="master-version-actions">${!draft()&&!pending()?`<button class="button signal" id="master-new-draft">${t('建立新版本草稿','Tạo bản nháp mới')}</button>`:''}${editable()?`<button class="button ghost" id="master-save-draft">${t('儲存草稿','Lưu bản nháp')}</button><button class="button signal" id="master-submit">${t('送出主管審核','Gửi quản lý duyệt')}</button>`:''}${item?.status==='pending'&&(item.creatorId===currentUser?.id||permitted('approval.withdraw'))?`<button class="button ghost" id="master-withdraw">${t('解除送審，繼續修改','Hủy gửi duyệt, sửa tiếp')}</button>`:''}${item?.status==='pending'?small(t('查看送審案件','Xem hồ sơ duyệt'),'id="master-view-review"'):''}${historical&&draft()?small(t('回到草稿','Về bản nháp'),'id="master-return-draft"'):''}</div></section><details class="master-history"><summary>${t('版本紀錄與操作歷程','Lịch sử phiên bản và thao tác')} · ${versions().length}</summary><div>${versions().map(v=>`<button data-history-pick="${h(v.id)}"><b>V${v.number} · ${status(v.status)}</b><small>${stamp(v.createdAt)} · ${h(v.creatorName)}</small></button>`).join('')}</div><ol>${(item?.history||[]).slice(-20).reverse().map(e=>`<li>${h(e.label)} ${h(e.note)} <small>${h(e.actor)} · ${stamp(e.at)}</small></li>`).join('')}</ol></details>${!historical&&(state.masterValidationErrors||[]).length?`<div class="master-danger-list">${t('送審前需修正','Cần sửa trước khi gửi')}${state.masterValidationErrors.map(e=>`<p>${h(e.message)} ${small(t("前往修改","Đến sửa"),`data-fix-master="${e.index}"`)}</p>`).join('')}</div>`:''}${item?.warnings?.length?`<div class="master-danger-list"><b>${t('刪除變更：核准後才生效','Thay đổi xóa: chỉ hiệu lực sau khi duyệt')}</b>${item.warnings.map(w=>`<div>${h(w)}</div>`).join('')}</div>`:''}`;
    }
    function categoryBox() {
      const catalog=current(),groups=categoryEntries(catalog),lineCodes=[...new Set([...catalog.lines.map(l=>l.code),...groups.map(g=>g.line)])].filter(l=>!ui.line||l===ui.line);
      return `<section class="master-category-box"><header><h3>${t('產品類別管理','Quản lý nhóm sản phẩm')}</h3>${editable()?small(t('＋ 加入類別','＋ Thêm nhóm'),'id="add-master-category"'):''}</header>${editable()&&deletionNote()?`<p class="master-permission-note">${deletionNote()}</p>`:''}<div class="master-category-groups">${lineCodes.map(line=>`<section class="master-category-group"><header><b>${h(line)} ${t('線','chuyền')}</b><small>${groups.filter(g=>g.line===line).length} ${t('個類別','nhóm')}</small></header><div>${groups.filter(g=>g.line===line).map(g=>`<article><button class="master-category-filter" data-category-pick="${h(g.name)}" data-category-line="${h(line)}"><span>${val(g.name)}</span><small>${catalog.products.filter(p=>p.line===line&&p.category===g.name).length} ${t('產品','sản phẩm')}</small></button>${editable()?`${small('✎',`data-category-edit="${h(g.name)}" data-category-line="${h(line)}" aria-label="${t('修改類別','Sửa nhóm')} ${h(g.name)}"`)}${canDelete()?small('×',`data-category-delete="${h(g.name)}" data-category-line="${h(line)}" aria-label="${t('刪除類別','Xóa nhóm')} ${h(g.name)}"`):''}`:''}</article>`).join('')||`<p>${t('尚未建立類別','Chưa có nhóm')}</p>`}</div></section>`).join('')}</div></section>`;
    }
    function lineExcelToolbar(){return `<section class="master-line-excel"><b>${t('本頁完整 Excel 資料','Dữ liệu Excel đầy đủ của trang')}</b><div><input hidden type="file" id="master-line-import-file" accept=".xlsx,.xls,.csv">${permitted('master.import')?small(t('匯入 Excel','Nhập Excel'),'id="master-line-import"'):''}${permitted('master.export')?small(t('匯出全部 Excel','Xuất toàn bộ Excel'),'id="master-line-export"'):''}</div><p>${permitted('master.import')||permitted('master.export')?t('匯出包含所選範圍全部線別與工段；匯回同格式檔案可完整還原。','Tệp xuất chứa toàn bộ chuyền và công đoạn trong phạm vi đã chọn; nhập lại để khôi phục đầy đủ.'):t('只有主管可以匯入或匯出資料。','Chỉ quản lý được nhập hoặc xuất dữ liệu.')}</p></section>`;}
    function lineEditor() {
      return `<details class="master-line-editor" ${ui.linesOpen?'open':''}><summary>${t('線別與工段管理','Quản lý chuyền và công đoạn')} · ${current().lines.length}</summary><div class="master-lines-toolbar">${editable()?small(t('＋ 新增線別','＋ Thêm chuyền'),'id="add-master-line"'):t('建立草稿後可新增、修改。','Tạo bản nháp để thêm hoặc sửa.')}</div>${editable()&&deletionNote()?`<p class="master-permission-note">${deletionNote()}</p>`:''}${current().lines.filter(l=>!ui.line||l.code===ui.line).map(line=>`<section class="master-line-block"><div class="master-line-head"><b>${h(line.code)} · ${val(line.name)}</b><div>${editable()?`${small(t('修改','Sửa'),`data-line-edit="${h(line.code)}"`)}${small(t('＋ 新增工段','＋ Thêm công đoạn'),`data-stage-add="${h(line.code)}"`)}${canDelete()?small(t('刪除線別','Xóa chuyền'),`data-line-delete="${h(line.code)}"`):''}`:''}</div></div><div class="master-stage-grid">${line.stages.map(stage=>`<article class="master-stage-card"><span><code>${h(stage.code)}</code><b>${val(stage.name)}</b></span>${editable()?`<div>${small(t('修改','Sửa'),`data-stage-edit="${h(stage.code)}" data-parent-line="${h(line.code)}"`)}${canDelete()?small('×',`data-stage-delete="${h(stage.code)}" data-parent-line="${h(line.code)}" aria-label="${t('刪除工段','Xóa công đoạn')}"`):''}</div>`:''}</article>`).join('')||`<p>${t('尚無工段，請新增。','Chưa có công đoạn, hãy thêm mới.')}</p>`}</div></section>`).join('')}</details>`;
    }
    function filtered() {const q=ui.search.trim().toLocaleLowerCase();return current().products.filter(p=>(!ui.line||p.line===ui.line)&&(!ui.category||p.category===ui.category)&&(!q||Object.values(p).flat().join(' ').toLocaleLowerCase().includes(q)));}
    function productRows() {const bad=new Set((state.masterValidationErrors||[]).map(e=>e.code));return filtered().map(p=>`<tr class="${bad.has(p.code)?'master-invalid-row':''}"><td>${val(p.category)}</td><td><code>${h(p.code)}</code></td><td>${val(p.name)}</td><td>${val(p.specification)}</td><td>${val(p.unit)}</td><td><span class="master-line-tag">${val(p.line)}</span></td><td><div class="master-route-tags">${p.stages.map(code=>`<span title="${h(current().lines.flatMap(l=>l.stages).find(s=>s.code===code)?.name)}">${h(code)}</span>`).join('<i>→</i>')||val('待補')}</div></td><td>${editable()?`<div class="master-row-actions">${small(t('修改','Sửa'),`data-product-edit="${h(p.code)}"`)}${canDelete()?small(t('刪除','Xóa'),`data-product-delete="${h(p.code)}"`):''}</div>`:t('唯讀','Chỉ xem')}</td></tr>`).join('')||`<tr><td colspan="8">${t('沒有符合的產品','Không có sản phẩm phù hợp')}</td></tr>`;}
    function masterView() {
      if(ui.scope!==state.masterScope){ui.scope=state.masterScope;ui.line='';ui.category='';ui.search='';}
      const catalog=current(),cats=categoryEntries(catalog).filter(g=>!ui.line||g.line===ui.line);
      if(state.masterSection==='lines')return `<div class="master-shell master-organized" data-i18n-skip="true">${versionBar()}${deletionAccess()}<label class="master-lines-scope">${t('管理範圍','Phạm vi quản lý')}<select id="master-lines-scope">${options([{value:'AB',label:t('A B 產線','Chuyền A B')},{value:'C',label:t('C 產線','Chuyền C')}],state.masterScope)}</select></label>${lineExcelToolbar()}${lineEditor()}</div>`;
      if(ui.category&&!cats.some(g=>g.name===ui.category))ui.category='';
      return `<div class="master-shell master-organized" data-i18n-skip="true">${versionBar()}${deletionAccess()}<section class="master-toolbar"><label>${t('線別','Chuyền')}<select id="master-line-filter">${options([{value:'',label:t('全部線別','Tất cả chuyền')},...catalog.lines.map(l=>({value:l.code,label:`${l.code} · ${l.name}`}))],ui.line)}</select></label><label>${t('產品類別','Nhóm sản phẩm')}<select id="master-category-filter">${options([{value:'',label:t('全部類別','Tất cả nhóm')},...[...new Set(cats.map(g=>g.name))]],ui.category)}</select></label><label>${t('搜尋產品','Tìm sản phẩm')}<input type="search" id="master-product-search" value="${h(ui.search)}" placeholder="${t('編號或名稱','Mã hoặc tên')}"></label><div class="actions"><input hidden type="file" id="master-import-file" accept=".xlsx,.xls,.csv">${permitted('master.import')?small(t('匯入 Excel','Nhập Excel'),'id="master-import"'):''}${permitted('master.export')?small(t('匯出全部 Excel','Xuất toàn bộ Excel'),'id="master-export"'):''}</div>${!permitted('master.import')&&!permitted('master.export')?`<p class="master-permission-note">${t('只有主管可以匯入或匯出資料。','Chỉ quản lý được nhập hoặc xuất dữ liệu.')}</p>`:''}</section>${categoryBox()}<div class="master-products-heading"><h3>${t('產品與製程路線','Sản phẩm và tuyến quy trình')}</h3><div class="master-products-actions">${editable()?small(t('＋ 新增產品','＋ Thêm sản phẩm'),'id="master-add-product"'):''}<span id="master-result-count">${filtered().length} / ${catalog.products.length}</span></div></div><div class="master-table-wrap"><table class="master-table"><thead><tr>${[t('類別','Nhóm'),t('產品編號','Mã sản phẩm'),t('名稱','Tên'),t('規格','Quy cách'),t('單位','Đơn vị'),t('線別','Chuyền'),t('製程路線','Tuyến quy trình'),t('操作','Thao tác')].map(s=>`<th>${s}</th>`).join('')}</tr></thead><tbody>${productRows()}</tbody></table></div></div>`;
    }
    function bindRows() {
      document.querySelectorAll('[data-product-edit]').forEach(b=>b.onclick=()=>editProduct(current().products.find(p=>p.code===b.dataset.productEdit)));
      document.querySelectorAll('[data-product-delete]').forEach(b=>b.onclick=()=>{
        if(!canDelete()){toast(deletionNote());return;}
        const product=current().products.find(p=>p.code===b.dataset.productDelete),impact=deletionImpact({products:product?[product]:[b.dataset.productDelete]});
        if(!confirm(`${t(`刪除產品 ${b.dataset.productDelete}？`,`Xóa sản phẩm ${b.dataset.productDelete}?`)}\n\n${impact.message}\n\n${t('主管核准後才會套用移除，確定加入草稿？','Chỉ xóa sau khi quản lý duyệt. Thêm vào bản nháp?')}`))return;
        if(commit('刪除產品',b.dataset.productDelete,c=>{c.products=c.products.filter(p=>p.code!==b.dataset.productDelete);selected().warnings.push(`刪除產品 ${b.dataset.productDelete}｜${impact.warning}`);}))redraw();
      });
    }
    function bindMaster() {
      const on=(id,event,fn)=>document.querySelector(id)?.addEventListener(event,fn);
      const newDraftButton=document.querySelector('#master-new-draft');
      if(newDraftButton&&permitted('master.delete'))newDraftButton.textContent=t('開始修改／刪除資料','Bắt đầu sửa / xóa dữ liệu');
      on('#master-version-choice','change',e=>{ui.versions[state.masterScope]=e.target.value;ui.line='';ui.category='';state.masterValidationErrors=[];redraw();});
      document.querySelectorAll('[data-history-pick]').forEach(b=>b.onclick=()=>{ui.versions[state.masterScope]=b.dataset.historyPick;ui.line='';ui.category='';state.masterValidationErrors=[];redraw();});
      on('#master-return-draft','click',()=>{ui.versions[state.masterScope]=draft()?.id;redraw();});
      on('#master-new-draft','click',()=>{delete ui.versions[state.masterScope];beginDraft();});
      on('#master-save-draft','click',saveDraft);on('#master-submit','click',submitDraft);
      on('#master-view-review','click',()=>{state.masterReviewId=selected()?.id;state.view='approval';render();});
      on('#master-lines-scope','change',e=>{state.masterScope=e.target.value;ui.line='';ui.category='';redraw();});
      on('#master-line-export','click',()=>{if(!permitted('master.export')){toast(t('此帳號沒有匯出權限。','Tài khoản này không có quyền xuất.'));return;}LineStageExcel.exportFile(current().lines,state.masterScope);toast(t('線別與工段 Excel 匯出成功','Xuất Excel chuyền và công đoạn thành công'));});
      on('#master-line-import','click',()=>{if(!permitted('master.import')){toast(t('此帳號沒有匯入權限。','Tài khoản này không có quyền nhập.'));return;}if(!editable()){toast(t('請先建立新版本草稿再匯入','Hãy tạo bản nháp mới trước khi nhập'));return;}document.querySelector('#master-line-import-file').click();});
      on('#master-line-import-file','change',async event=>{const file=event.target.files?.[0];if(!file)return;try{const imported=await LineStageExcel.readFile(file);if(!imported.length)throw new Error('empty');if(imported.complete&&imported.scope&&imported.scope!==state.masterScope)throw new Error('scope');const catalog=editable();if(imported.complete){const owners=new Map(imported.flatMap(line=>line.stages.map(stage=>[stage.code,line.code]))),lineCodes=new Set(imported.map(line=>line.code)),invalid=catalog.products.filter(product=>!lineCodes.has(product.line)||product.stages.some(stage=>owners.get(stage)!==product.line));if(invalid.length)throw new Error(`route:${invalid.slice(0,8).map(product=>product.code).join(', ')}`);}const message=imported.complete?t(`找到 ${imported.length} 條線別。這是完整匯出檔，確認後會取代目前所選範圍。`,`Tìm thấy ${imported.length} chuyền. Đây là tệp đầy đủ và sẽ thay phạm vi hiện tại.`):t(`找到 ${imported.length} 條線別。這是舊格式，只會新增或更新檔案內資料。`,`Tìm thấy ${imported.length} chuyền. Đây là định dạng cũ, chỉ thêm hoặc cập nhật dữ liệu trong tệp.`);if(!confirm(message))return;if(imported.complete)LineStageExcel.replace(catalog,imported);else LineStageExcel.merge(catalog,imported);record(draft(),'匯入線別與工段 Excel',`${file.name} · ${imported.length} 條線別 · ${imported.complete?'完整取代':'相容匯入'}`);persist();toast(t('線別與工段匯入成功','Nhập chuyền và công đoạn thành công'));redraw();}catch(error){console.warn(error);toast(error.message?.startsWith('route:')?t(`無法完整取代：產品路線仍使用檔案未包含的線別或工段（${error.message.slice(6)}）。`,`Không thể thay toàn bộ: tuyến sản phẩm vẫn dùng chuyền hoặc công đoạn không có trong tệp (${error.message.slice(6)}).`):t('無法匯入：請確認格式、範圍及線別／工段欄位','Không thể nhập: kiểm tra định dạng, phạm vi và các cột chuyền / công đoạn'));}finally{event.target.value='';}});
      document.querySelectorAll('[data-fix-master]').forEach(b=>b.onclick=()=>editProduct(current().products[Number(b.dataset.fixMaster)]));
      on('#master-withdraw','click',()=>{const item=selected();if(item?.status!=='pending')return;item.status='draft';record(item,'解除送審，繼續修改');persist();redraw();toast(t('已解除送審，可繼續修改。','Đã hủy gửi duyệt, có thể sửa tiếp.'));});
      on('#master-line-filter','change',e=>{ui.line=e.target.value;ui.category='';redraw();});
      on('#master-category-filter','change',e=>{ui.category=e.target.value;redraw();});
      on('#master-product-search','input',e=>{ui.search=e.target.value;document.querySelector('.master-table tbody').innerHTML=productRows();document.querySelector('#master-result-count').textContent=`${filtered().length} / ${current().products.length}`;bindRows();});
      on('#master-add-product','click',()=>editProduct());on('#add-master-category','click',()=>editCategory());
      document.querySelectorAll('[data-category-pick]').forEach(b=>b.onclick=()=>{ui.line=b.dataset.categoryLine;ui.category=b.dataset.categoryPick;redraw();document.querySelector('.master-products-heading')?.scrollIntoView({block:'nearest'});});
      document.querySelectorAll('[data-category-edit]').forEach(b=>b.onclick=()=>editCategory({line:b.dataset.categoryLine,name:b.dataset.categoryEdit}));
      document.querySelectorAll('[data-category-delete]').forEach(b=>b.onclick=()=>removeCategory({line:b.dataset.categoryLine,name:b.dataset.categoryDelete}));
      on('.master-line-editor','toggle',e=>ui.linesOpen=e.target.open);on('#add-master-line','click',()=>editLine());
      document.querySelectorAll('[data-line-edit]').forEach(b=>b.onclick=()=>editLine(current().lines.find(l=>l.code===b.dataset.lineEdit)));
      document.querySelectorAll('[data-stage-add]').forEach(b=>b.onclick=()=>editStage(current().lines.find(l=>l.code===b.dataset.stageAdd)));
      document.querySelectorAll('[data-stage-edit]').forEach(b=>b.onclick=()=>{const l=current().lines.find(l=>l.code===b.dataset.parentLine);editStage(l,l.stages.find(s=>s.code===b.dataset.stageEdit));});
      document.querySelectorAll('[data-line-delete],[data-stage-delete]').forEach(b=>b.onclick=()=>{
        if(!canDelete()){toast(deletionNote());return;}
        const lineCode=b.dataset.lineDelete,stageCode=b.dataset.stageDelete,code=lineCode||stageCode;
        const products=current().products.filter(p=>lineCode?p.line===lineCode:p.stages.includes(stageCode)),affected=products.length,stages=lineCode?(current().lines.find(l=>l.code===lineCode)?.stages||[]).map(s=>s.code):[stageCode],impact=deletionImpact({products,stages});
        if(!confirm(`${t(`刪除 ${code} 將影響 ${affected} 筆產品。`,`Xóa ${code} sẽ ảnh hưởng ${affected} sản phẩm.`)}\n\n${impact.message}\n\n${t('路線與編輯器選項會在主管核准後一併清理，確定加入草稿？','Tuyến và lựa chọn trong trình chỉnh sửa sẽ được dọn sau khi duyệt. Tiếp tục?')}`))return;
        if(commit(lineCode?'刪除線別':'刪除工段',code,c=>{
          if(lineCode){const removed=new Set(c.lines.find(l=>l.code===lineCode)?.stages.map(s=>s.code));c.categoryGroups=categoryEntries(c);c.categoryGroups.forEach(g=>{if(g.line===lineCode)g.line='待補';});c.lines=c.lines.filter(l=>l.code!==lineCode);c.products.forEach(p=>{if(p.line===lineCode){p.line='待補';p.stages=[];}else p.stages=p.stages.filter(s=>!removed.has(s));});ui.line='';}
          else {c.lines.forEach(l=>l.stages=l.stages.filter(s=>s.code!==stageCode));c.products.forEach(p=>p.stages=p.stages.filter(s=>s!==stageCode));}
          selected().warnings.push(`刪除 ${code}（影響 ${affected} 筆產品）｜${impact.warning}`);
        }))redraw();
      });
      on('#master-import','click',()=>{if(!permitted('master.import')){toast(t('此帳號沒有匯入權限。','Tài khoản này không có quyền nhập.'));return;}if(!editable()){toast(t('請先建立或切回草稿。','Hãy tạo hoặc mở bản nháp.'));return;}document.querySelector('#master-import-file').click();});
      on('#master-import-file','change',event=>{if(permitted('master.import'))importExcel(event);else event.target.value='';});on('#master-export','click',()=>{if(permitted('master.export'))exportExcel();else toast(t('此帳號沒有匯出權限。','Tài khoản này không có quyền xuất.'));});bindRows();
    }
    let language=document.documentElement.lang;
    new MutationObserver(()=>{if(language!==document.documentElement.lang){language=document.documentElement.lang;if(document.querySelector('.master-organized')&&!document.querySelector('#master-edit-dialog'))redraw();}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    return {showVersion:(scope,id)=>{state.masterScope=scope;state.masterSection="products";ui.versions[scope]=id;state.view="data";render();},current,editable,masterView,bindMaster,productRows,syncRows:()=>{},categories:(catalog=current())=>[...new Set(categoryEntries(catalog).map(g=>g.name))]};
  }
  host.MasterAdminUI={install,categoryEntries,validProduct};
})(typeof window==='undefined'?globalThis:window);
