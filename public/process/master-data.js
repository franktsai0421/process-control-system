(function () {
  const STORAGE = 'masterDataControl',
    clone = (value) => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString(),
    labelTime = (value) => new Date(value).toLocaleString('zh-TW');
  const safe = (value) => escapeHtml(String(value ?? '待補'));
  const normalized = (value) => String(value ?? '').trim() || '待補';
  const routeLine = (product) =>
    routing.productRoutes[product.code]?.line || '待補';
  const routeStages = (product) =>
    routing.productRoutes[product.code]?.stages || [];
  const abProducts = data.products
    .filter((product) => ['A', 'B'].includes(routeLine(product)))
    .map((product) => ({
      ...clone(product),
      unit: product.unit || '待補',
      line: routeLine(product),
      stages: routeStages(product),
    }));
  const seed = {
    AB: {
      name: 'AB 產線與類別',
      products: abProducts,
      lines: routing.lines
        .filter((line) => ['A', 'B'].includes(line.code))
        .map(clone),
    },
    C: {
      name: 'C 產線與類別',
      products: clone(window.LINE_C_MASTER?.products || []),
      lines: [
        {
          code: 'C',
          name: '零件加工線',
          stages: clone(window.LINE_C_MASTER?.stages || []),
        },
      ],
    },
  };
  function initial() {
    const created = now();
    return {
      active: clone(seed),
      versions: ['AB', 'C'].map((scope) => ({
        id: `MD-SEED-${scope}`,
        scope,
        number: 1,
        status: 'approved',
        snapshot: clone(seed[scope]),
        creatorId: 'system',
        creatorName: '系統匯入',
        createdAt: created,
        updatedAt: created,
        reviewedAt: created,
        reviewerName: '系統',
        warnings: [],
        history: [{ label: 'Excel 主資料匯入', actor: '系統', at: created }],
      })),
    };
  }
  let control = readStore(STORAGE, null) || initial();
  if (!Array.isArray(control.active?.C?.products)) {
    control = initial();
    localStorage.setItem(STORAGE, JSON.stringify(control));
  }
  state.masterScope = state.masterScope || 'AB';
  state.masterCategory = state.masterCategory || '全部';
  state.masterSearch = state.masterSearch || '';
  state.masterReviewId = state.masterReviewId || null;
  function persist() {
    localStorage.setItem(STORAGE, JSON.stringify(control));
  }
  function canPublishProcessMaster() {
    return (
      window.ProcessSync?.identity?.role === 'admin' ||
      currentUser?.role === 'admin' ||
      window.hasPermission?.('approval.approve') === true
    );
  }
  function ensureProcessMasterVersionScope() {
    if (control.active.PROCESS && control.versions.some((item) => item.scope === 'PROCESS'))
      return false;
    const created = now(),
      snapshot = clone(processMaster || {});
    control.active.PROCESS = snapshot;
    control.versions.push({
      id: 'MD-SEED-PROCESS',
      scope: 'PROCESS',
      number: 1,
      status: 'approved',
      snapshot,
      creatorId: 'system',
      creatorName: '系統匯入',
      createdAt: created,
      updatedAt: created,
      reviewedAt: created,
      reviewerName: '系統',
      warnings: [],
      history: [{ label: '流程資料建立', actor: '系統', at: created }],
    });
    if (canPublishProcessMaster()) persist();
    return true;
  }
  ensureProcessMasterVersionScope();
  function versions(scope = state.masterScope) {
    return control.versions
      .filter((item) => item.scope === scope)
      .sort((a, b) => (b.number || 0) - (a.number || 0));
  }
  function draft(scope = state.masterScope) {
    return versions(scope).find((item) => item.status === 'draft');
  }
  function pending(scope = state.masterScope) {
    return versions(scope).find((item) => item.status === 'pending');
  }
  function editable() {
    return draft()?.snapshot || null;
  }
  function current() {
    return (
      editable() ||
      pending()?.snapshot ||
      control.active[state.masterScope] ||
      seed[state.masterScope]
    );
  }
  function statusText(status) {
    return (
      {
        draft: '草稿 · 未送審',
        pending: '主管審核中',
        approved: '已核准',
        superseded: '歷史核准',
      }[status] || status
    );
  }
  function record(version, label, note = '') {
    version.history = version.history || [];
    version.history.push({
      label,
      note,
      actor: currentUser?.name || '系統',
      at: now(),
    });
    version.updatedAt = now();
  }
  function beginDraft() {
    if (draft() || pending()) {
      toast('此資料已有草稿或正在主管審核中');
      return;
    }
    const previous = versions()[0],
      version = {
        id: `MD-${state.masterScope}-${Date.now()}`,
        scope: state.masterScope,
        number: Math.max(0, ...versions().map((item) => item.number || 0)) + 1,
        status: 'draft',
        snapshot: clone(control.active[state.masterScope]),
        creatorId: currentUser?.id || 'local',
        creatorName: currentUser?.name || '本機使用者',
        createdAt: now(),
        updatedAt: now(),
        parentVersionId: previous?.id || null,
        warnings: [],
        history: [],
      };
    record(version, '建立主資料草稿');
    control.versions.push(version);
    persist();
    toast('已建立可修改的主資料草稿');
    render();
  }
  function saveDraft() {
    const version = draft();
    if (!version) return;
    syncRows();
    record(version, '儲存主資料草稿');
    persist();
    toast('主資料草稿已儲存');
    render();
  }
  function validateCatalog(catalog) {
    const errors = [],
      filled = (value) => String(value ?? '').trim().length > 0;
    catalog.products.forEach((item, index) => {
      const code = item.code || '待補',
        label = code + ' · ' + (item.name || '待補');
      if (!filled(item.code))
        errors.push({
          code,
          index,
          field: 'code',
          message: label + '：請填入產品編號',
        });
      if (!filled(item.name))
        errors.push({
          code,
          index,
          field: 'name',
          message: label + '：請填入產品名稱',
        });
      if (!(item.stages || []).some(filled))
        errors.push({
          code,
          index,
          field: 'stages',
          message: label + '：至少選擇一個工段即可，不必選完整路線',
        });
    });
    return errors;
  }
  function submitDraft() {
    const version = draft();
    if (!version) return;
    syncRows();
    const errors = validateCatalog(version.snapshot);
    state.masterValidationErrors = errors;
    if (errors.length) {
      toast(`送審前需修正 ${errors.length} 項主資料問題`);
      render();
      return;
    }
    version.status = 'pending';
    state.masterReviewId = version.id;
    record(version, '送出主資料確認');
    persist();
    state.masterValidationErrors = [];
    toast('主資料已送主管確認');
    render();
  }
  function syncRows() {
    const version = draft();
    if (!version) return;
    document.querySelectorAll('[data-master-row]').forEach((row) => {
      const product = version.snapshot.products.find(
        (item) => item.code === row.dataset.originalCode,
      );
      if (!product) return;
      const old = product.code;
      product.category = normalized(
        row.querySelector('[data-field="category"]').value,
      );
      product.code = normalized(row.querySelector('[data-field="code"]').value);
      product.name = normalized(row.querySelector('[data-field="name"]').value);
      product.specification = normalized(
        row.querySelector('[data-field="specification"]').value,
      );
      product.unit = normalized(row.querySelector('[data-field="unit"]').value);
      product.line = normalized(
        row.querySelector('[data-field="line"]').value,
      ).toUpperCase();
      product.stages = row
        .querySelector('[data-field="stages"]')
        .value.split(/[,，>→/]+/)
        .map((item) => item.trim().replace(/C-\s+/i, 'C-').toUpperCase())
        .filter(Boolean);
      row.dataset.originalCode = product.code;
      if (old !== product.code)
        record(version, '修改產品編號', `${old} → ${product.code}`);
    });
  }
  function categories(catalog = current()) {
    return [
      ...new Set(catalog.products.map((item) => normalized(item.category))),
    ].sort((a, b) => a.localeCompare(b));
  }
  function visibleProducts() {
    const catalog = current(),
      q = state.masterSearch.toLowerCase();
    return catalog.products
      .filter(
        (item) =>
          (state.masterCategory === '全部' ||
            item.category === state.masterCategory) &&
          (!q ||
            Object.values(item).flat().join(' ').toLowerCase().includes(q)),
      )
      .slice(0, 300);
  }
  function cell(product, field, readonly = false) {
    const value =
      field === 'stages' ? (product.stages || []).join(' → ') : product[field];
    return readonly
      ? `<span>${safe(value || '待補')}</span>`
      : `<input data-field="${field}" class="${field === 'stages' ? 'route-input' : ''}" value="${safe(value || '待補')}">`;
  }
  function productRows() {
    const locked = !editable(),
      bad = new Set(
        (state.masterValidationErrors || []).map((item) => item.code),
      );
    return (
      visibleProducts()
        .map(
          (product) =>
            `<tr class="${bad.has(product.code) ? 'master-invalid-row' : ''}" data-master-row data-original-code="${safe(product.code)}"><td>${cell(product, 'category', locked)}</td><td>${cell(product, 'code', locked)}</td><td>${cell(product, 'name', locked)}</td><td>${cell(product, 'specification', locked)}</td><td>${cell(product, 'unit', locked)}</td><td>${cell(product, 'line', locked)}</td><td>${cell(product, 'stages', locked)}</td><td>${locked ? '' : `<div class="master-row-actions"><button data-delete-product="${safe(product.code)}" class="danger">刪除</button></div>`}</td></tr>`,
        )
        .join('') || `<tr><td colspan="8">沒有符合的資料</td></tr>`
    );
  }
  function versionBar() {
    const item = draft() || pending() || versions()[0],
      errors = state.masterValidationErrors || [];
    return `<section class="master-version-bar"><div><small>MASTER DATA VERSION</small><h3>${safe(current().name)} · V${item?.number || 1} <span class="master-status ${item?.status || 'approved'}">${statusText(item?.status || 'approved')}</span></h3><p>${item?.status === 'draft' ? '可反覆儲存，確認內容後再送主管審核。' : item?.status === 'pending' ? '送審期間資料鎖定；可解除送審後繼續修改。' : '已核准版本正在供平台使用，可建立新草稿修改。'}</p></div><div class="master-version-actions">${!draft() && !pending() ? `<button class="button signal" id="master-new-draft">建立新版本草稿</button>` : ''}${draft() ? `<button class="button ghost" id="master-save-draft">儲存草稿</button><button class="button signal" id="master-submit">送出主管審核</button>` : ''}${pending() && (pending().creatorId === currentUser?.id || currentUser?.role === 'admin') ? `<button class="button ghost" id="master-withdraw">解除送審，繼續修改</button>` : ''}</div></section>${
      errors.length
        ? `<div class="master-danger-list"><b>送審前需修正 ${errors.length} 項問題</b>${errors
            .slice(0, 20)
            .map((error) => `<div>${safe(error.message)}</div>`)
            .join(
              '',
            )}${errors.length > 20 ? `<div>另有 ${errors.length - 20} 項，紅色資料列均需修正。</div>` : ''}</div>`
        : ''
    }${item?.warnings?.length ? `<div class="master-danger-list"><b>⚠ 此版本包含刪除變更，主管確認後才會生效</b>${item.warnings.map((w) => `<div>${safe(w)}</div>`).join('')}</div>` : ''}`;
  }
  function categoryBox() {
    const locked = !editable();
    return `<section class="master-category-box"><b>產品類別管理</b><div class="master-category-list">${categories()
      .map(
        (category) =>
          `<span>${safe(category)}${locked ? '' : `<button data-rename-category="${safe(category)}" title="修改產品類別">改</button><button data-delete-category="${safe(category)}" title="刪除產品類別">×</button>`}</span>`,
      )
      .join(
        '',
      )}</div>${locked ? '' : `<div class="toolbar"><input id="new-master-category" placeholder="新增產品類別名稱"><button class="master-small" id="add-master-category">＋ 加入類別</button></div>`}</section>`;
  }
  function lineEditor() {
    const catalog = current(),
      locked = !editable();
    return `<details class="master-line-editor"><summary>線別與工段管理 · ${catalog.lines.length} 條線別 · ${catalog.lines.reduce((sum, line) => sum + line.stages.length, 0)} 個工段</summary>${catalog.lines.map((line) => `<section class="master-line-block" data-line="${safe(line.code)}"><div class="master-line-head"><input data-line-code value="${safe(line.code)}" ${locked ? 'disabled' : ''}><input data-line-name value="${safe(line.name || '待補')}" ${locked ? 'disabled' : ''}>${locked ? '' : `<button class="master-small" data-add-stage="${safe(line.code)}">＋ 新增工段</button><button class="master-small danger" data-delete-line="${safe(line.code)}">刪除線別</button>`}</div><div class="master-stage-grid">${line.stages.map((stage) => `<div class="master-stage-card" data-stage="${safe(stage.code)}"><input data-stage-code value="${safe(stage.code)}" ${locked ? 'disabled' : ''}><input data-stage-name value="${safe(stage.name || '待補')}" ${locked ? 'disabled' : ''}>${locked ? '' : `<button class="master-small" data-delete-stage="${safe(stage.code)}">刪除</button>`}</div>`).join('')}</div></section>`).join('')}${locked ? '' : `<div class="master-line-add"><button class="master-small" id="add-master-line">＋ 新增線別</button></div>`}</details>`;
  }
  function masterView() {
    const catalog = current();
    return `<div class="master-shell">${versionBar()}<section class="master-toolbar"><div class="field"><label>產品類別</label><select id="master-category"><option>全部</option>${categories()
      .map(
        (item) =>
          `<option ${item === state.masterCategory ? 'selected' : ''}>${safe(item)}</option>`,
      )
      .join(
        '',
      )}</select></div><div class="field"><label>搜尋產品</label><input id="master-search" value="${safe(state.masterSearch)}" placeholder="輸入類別、編號或名稱"></div><div class="actions"><input hidden type="file" id="master-import-file" accept=".xlsx,.xls,.csv"><button class="button ghost" id="master-import">匯入 Excel</button><button class="button ghost" id="master-export">匯出 Excel</button>${editable() ? `<button class="button signal" id="master-add-product">＋ 新增產品</button>` : ''}</div></section><div class="master-summary"><span>${catalog.products.length} 筆產品</span><span>${categories().length} 個類別</span><span>${catalog.lines.length} 條線別</span><span>${catalog.lines.reduce((sum, line) => sum + line.stages.length, 0)} 個工段</span></div>${editable() ? `<div class="master-edit-note">目前修改的是草稿；送審並經主管確認後，才會套用到其他平台。</div>` : ''}${categoryBox()}${lineEditor()}<div class="master-table-wrap"><table class="master-table"><thead><tr><th>產品類別</th><th>產品編號</th><th>產品名稱</th><th>規格</th><th>單位</th><th>線別</th><th>製程路線</th><th>操作</th></tr></thead><tbody>${productRows()}</tbody></table></div></div>`;
  }
  const originalDataView = dataView,
    originalBindData = bindData;
  dataView = function () {
    return `<section class="page"><div class="tabs master-tabs"><button class="tab master-tab ${state.masterSection !== 'lines' && state.masterScope === 'AB' ? 'active' : ''}" data-master-scope="AB">AB 產線與類別</button><button class="tab master-tab ${state.masterSection !== 'lines' && state.masterScope === 'C' ? 'active' : ''}" data-master-scope="C">C 產線與類別</button><button class="tab master-tab" data-tab="bom">BOM 資料</button><button class="tab master-tab ${state.masterSection === 'lines' ? 'active' : ''}" data-tab="line-admin">線別與工段管理</button><button class="tab master-tab" data-tab="process-master">流程資料</button><button class="tab master-tab" data-tab="users">使用者與權限</button></div><div id="data-content">${masterView()}</div></section>`;
  };
  function selectDataTab(tab, push = false) {
    if (!['AB','C','bom','line-admin','process-master','users','backups'].includes(tab)) tab='AB';
    if (['users','backups'].includes(tab) && currentUser?.role!=='admin') tab='AB';
    state.dataTab=tab;
    state.masterSection=tab==='line-admin'?'lines':'products';
    if (tab==='AB'||tab==='C') {if(state.masterScope!==tab){state.masterCategory='全部';state.masterSearch='';}state.masterScope=tab;}
    const content=document.querySelector('#data-content');
    if (!content) return;
    content.dataset.activeTab=tab;
    const url=new URL(location.href);
    if (push && url.searchParams.get('dataTab')!==tab) {
      url.searchParams.set('dataTab',tab);history.pushState({...history.state,dataTab:tab},'',url);
    }
    if (tab==='backups') window.ProcessBackupPage?.();
    else {
      content.innerHTML=['AB','C','line-admin'].includes(tab)?masterView():tab==='bom'?bomTable():tab==='process-master'?processMasterView():userManagementView();
      if (['AB','C','line-admin'].includes(tab)) bindMaster();else bindDataInner(tab);
    }
    bindTabButtons();
  }
  function bindTabButtons() {
    document.querySelectorAll('.master-tabs .tab').forEach(button=>{
      const tab=button.dataset.masterScope||button.dataset.tab||(button.id==='backup-tab'?'backups':'');
      button.classList.toggle('active',tab===state.dataTab);
      button.setAttribute('aria-selected',String(tab===state.dataTab));
      button.onclick=()=>selectDataTab(tab,true);
    });
  }
  window.ProcessDataTabs={select:selectDataTab,bind:bindTabButtons};
  bindData = function () {
    selectDataTab(state.dataTab||new URL(location.href).searchParams.get('dataTab')||'AB');
  };
  window.addEventListener('popstate',()=>{
    if (!currentUser) return;
    state.dataTab=new URL(location.href).searchParams.get('dataTab')||'AB';
    if (state.view!=='data') navigate('data');else selectDataTab(state.dataTab);
  });
  function rerenderMaster() {
    document.querySelector('#data-content').innerHTML = masterView();
    bindMaster();
  }
  function bindMaster() {
    document.querySelectorAll('[data-master-scope]').forEach(
      (button) =>
        (button.onclick = () => {
          state.masterScope = button.dataset.masterScope;
          state.masterCategory = '全部';
          state.masterSearch = '';
          render();
        }),
    );
    document
      .querySelector('#master-new-draft')
      ?.addEventListener('click', beginDraft);
    document
      .querySelector('#master-save-draft')
      ?.addEventListener('click', saveDraft);
    document
      .querySelector('#master-submit')
      ?.addEventListener('click', submitDraft);
    document
      .querySelector('#master-withdraw')
      ?.addEventListener('click', () => {
        const item = pending();
        if (!item) return;
        item.status = 'draft';
        record(item, '解除送審，繼續修改');
        persist();
        toast('已解除送審，可繼續修改草稿');
        render();
      });
    document
      .querySelector('#master-category')
      ?.addEventListener('change', (event) => {
        state.masterCategory = event.target.value;
        rerenderMaster();
      });
    document
      .querySelector('#master-search')
      ?.addEventListener('input', (event) => {
        state.masterSearch = event.target.value;
        const body = document.querySelector('.master-table tbody');
        if (body) body.innerHTML = productRows();
        bindMasterRows();
      });
    document
      .querySelector('#master-add-product')
      ?.addEventListener('click', () => {
        syncRows();
        const catalog = editable();
        catalog.products.unshift({
          category:
            state.masterCategory !== '全部' ? state.masterCategory : '待補',
          code: `NEW-${Date.now()}`,
          name: '待補',
          specification: '待補',
          unit: '待補',
          line: state.masterScope === 'C' ? 'C' : 'A',
          stages: [],
        });
        record(draft(), '新增產品');
        persist();
        rerenderMaster();
      });
    document
      .querySelector('#add-master-category')
      ?.addEventListener('click', () => {
        const value = normalized(
          document.querySelector('#new-master-category')?.value,
        );
        if (value === '待補') return;
        editable().products.push({
          category: value,
          code: `NEW-${Date.now()}`,
          name: '待補',
          specification: '待補',
          unit: '待補',
          line: state.masterScope === 'C' ? 'C' : 'A',
          stages: [],
        });
        record(draft(), '新增產品類別', value);
        persist();
        state.masterCategory = value;
        rerenderMaster();
      });
    document.querySelectorAll('[data-delete-category]').forEach(
      (button) =>
        (button.onclick = () => {
          syncRows();
          const catalog = editable(),
            category = button.dataset.deleteCategory,
            count = catalog.products.filter(
              (item) => item.category === category,
            ).length;
          if (
            !confirm(
              `刪除「${category}」會一併刪除 ${count} 筆產品。此變更仍須主管確認，確定加入草稿？`,
            )
          )
            return;
          catalog.products = catalog.products.filter(
            (item) => item.category !== category,
          );
          draft().warnings.push(`刪除產品類別 ${category}（${count} 筆產品）`);
          record(draft(), '刪除產品類別', category);
          persist();
          state.masterCategory = '全部';
          rerenderMaster();
        }),
    );
    document.querySelectorAll('[data-rename-category]').forEach(
      (button) =>
        (button.onclick = () => {
          syncRows();
          const old = button.dataset.renameCategory,
            next = normalized(prompt(`修改產品類別「${old}」的新名稱`, old));
          if (next === '待補' || next === old) return;
          editable().products.forEach((item) => {
            if (item.category === old) item.category = next;
          });
          record(draft(), '修改產品類別', `${old} → ${next}`);
          persist();
          if (state.masterCategory === old) state.masterCategory = next;
          rerenderMaster();
        }),
    );
    document.querySelectorAll('[data-add-stage]').forEach(
      (button) =>
        (button.onclick = () => {
          syncRows();
          const line = editable().lines.find(
              (item) => item.code === button.dataset.addStage,
            ),
            code = `${line.code}-NEW-${line.stages.length + 1}`;
          line.stages.push({
            code,
            name: '待補',
            machine: '待補',
            assetNumber: '待補',
            operators: null,
          });
          record(draft(), '新增工段', code);
          persist();
          rerenderMaster();
        }),
    );
    document
      .querySelector('#add-master-line')
      ?.addEventListener('click', () => {
        syncRows();
        const catalog = editable(),
          code = `${state.masterScope === 'C' ? 'C' : 'LINE'}-${catalog.lines.length + 1}`;
        catalog.lines.push({ code, name: '待補', stages: [] });
        record(draft(), '新增線別', code);
        persist();
        rerenderMaster();
      });
    document.querySelectorAll('[data-delete-line]').forEach(
      (button) =>
        (button.onclick = () => {
          syncRows();
          const catalog = editable(),
            code = button.dataset.deleteLine,
            used = catalog.products.filter((item) => item.line === code).length;
          if (
            !confirm(
              `線別 ${code} 目前有 ${used} 筆產品。刪除後這些產品的線別會標示待補，並送主管確認。確定繼續？`,
            )
          )
            return;
          catalog.lines = catalog.lines.filter((line) => line.code !== code);
          catalog.products.forEach((item) => {
            if (item.line === code) item.line = '待補';
          });
          draft().warnings.push(`刪除線別 ${code}（影響 ${used} 筆產品）`);
          record(draft(), '刪除線別', code);
          persist();
          rerenderMaster();
        }),
    );
    document.querySelectorAll('[data-delete-stage]').forEach(
      (button) =>
        (button.onclick = () => {
          syncRows();
          const catalog = editable(),
            code = button.dataset.deleteStage,
            used = catalog.products.filter((item) =>
              item.stages.includes(code),
            ).length;
          if (
            !confirm(
              `工段 ${code} 目前被 ${used} 筆產品使用。刪除後會從這些路線移除，並送主管確認。確定繼續？`,
            )
          )
            return;
          catalog.lines.forEach(
            (line) =>
              (line.stages = line.stages.filter((item) => item.code !== code)),
          );
          catalog.products.forEach(
            (item) =>
              (item.stages = item.stages.filter((stage) => stage !== code)),
          );
          draft().warnings.push(`刪除工段 ${code}（影響 ${used} 筆產品）`);
          record(draft(), '刪除工段', code);
          persist();
          rerenderMaster();
        }),
    );
    document.querySelectorAll('[data-stage]').forEach((card) =>
      card.querySelectorAll('input').forEach(
        (input) =>
          (input.onchange = () => {
            const version = draft(),
              catalog = editable(),
              old = card.dataset.stage,
              stage = catalog.lines
                .flatMap((line) => line.stages)
                .find((item) => item.code === old);
            if (!stage) return;
            const next = normalized(
                card.querySelector('[data-stage-code]').value,
              ).toUpperCase(),
              name = normalized(card.querySelector('[data-stage-name]').value);
            stage.code = next;
            stage.name = name;
            if (next !== old) {
              catalog.products.forEach(
                (item) =>
                  (item.stages = item.stages.map((code) =>
                    code === old ? next : code,
                  )),
              );
              card.dataset.stage = next;
            }
            record(version, '修改工段', `${old} → ${next}`);
            persist();
          }),
      ),
    );
    document.querySelectorAll('[data-line]').forEach((card) =>
      card.querySelectorAll('.master-line-head input').forEach(
        (input) =>
          (input.onchange = () => {
            syncRows();
            const catalog = editable(),
              old = card.dataset.line,
              line = catalog.lines.find((item) => item.code === old);
            if (!line) return;
            const next = normalized(
                card.querySelector('[data-line-code]').value,
              ).toUpperCase(),
              name = normalized(card.querySelector('[data-line-name]').value);
            line.code = next;
            line.name = name;
            if (next !== old) {
              catalog.products.forEach((item) => {
                if (item.line === old) item.line = next;
              });
              card.dataset.line = next;
            }
            record(draft(), '修改線別', `${old} → ${next}`);
            persist();
          }),
      ),
    );
    document.querySelector('#master-import')?.addEventListener('click', () => {
      if (!editable()) {
        toast('請先建立新版本草稿再匯入');
        return;
      }
      document.querySelector('#master-import-file').click();
    });
    document
      .querySelector('#master-import-file')
      ?.addEventListener('change', importExcel);
    document
      .querySelector('#master-export')
      ?.addEventListener('click', exportExcel);
    bindMasterRows();
  }
  function bindMasterRows() {
    document.querySelectorAll('[data-delete-product]').forEach(
      (button) =>
        (button.onclick = () => {
          syncRows();
          const catalog = editable(),
            code = button.dataset.deleteProduct,
            item = catalog.products.find((product) => product.code === code);
          if (
            !confirm(
              `確定把產品 ${code} 加入刪除草稿？主管確認後才會正式刪除。`,
            )
          )
            return;
          catalog.products = catalog.products.filter(
            (product) => product !== item,
          );
          draft().warnings.push(`刪除產品 ${code} · ${item?.name || '待補'}`);
          record(draft(), '刪除產品', code);
          persist();
          rerenderMaster();
        }),
    );
  }
  function parseWorkbook(buffer) {
    const complete = window.MasterPageExcel?.readBuffer(
      buffer,
      state.masterScope,
    );
    if (complete) return complete;
    const book = XLSX.read(buffer, { type: 'array' }),
      sheetName =
        state.masterScope === 'C' && book.SheetNames.includes('SKU BTP')
          ? 'SKU BTP'
          : book.SheetNames.includes('產品資料')
            ? '產品資料'
            : book.SheetNames[0],
      rows = XLSX.utils.sheet_to_json(book.Sheets[sheetName], {
        header: 1,
        defval: '',
      });
    let headerIndex = rows.findIndex((row) =>
      row.some((cell) => /MÃ SẢN PHẨM|產品編號/i.test(String(cell))),
    );
    if (headerIndex < 0) headerIndex = 0;
    const header = rows[headerIndex].map((value) => String(value).trim()),
      find = (patterns) =>
        header.findIndex((value) =>
          patterns.some((pattern) => pattern.test(value)),
        );
    const idx = {
        category: find([/NHÓM SẢN PHẨM/i, /產品類別/]),
        code: find([/MÃ SẢN PHẨM/i, /產品編號/]),
        name: find([/TÊN SẢN PHẨM/i, /產品名稱/]),
        specification: find([/QUY CÁCH/i, /規格/]),
        unit: find([/ĐVT/i, /單位/]),
        line: find([/^LINE$/i, /線別/]),
        route: find([/製程路線/, /MÃ QUY TRÌNH/i]),
      },
      stageColumns = header
        .map((value, index) => (/CÔNG ĐOẠN/i.test(value) ? index : -1))
        .filter((index) => index >= 0);
    return {
      complete: false,
      products: rows
      .slice(headerIndex + 1)
      .filter((row) => idx.code >= 0 && String(row[idx.code] || '').trim())
      .map((row) => {
        const route = idx.route >= 0 ? String(row[idx.route] || '') : '';
        const stages = (
          stageColumns.length
            ? stageColumns.map((index) => row[index])
            : route.split(/[/→,，>]+/)
        )
          .map((value) =>
            String(value || '')
              .trim()
              .replace(/C-\s+/i, 'C-')
              .toUpperCase(),
          )
          .filter(Boolean);
        return {
          category: normalized(row[idx.category]),
          code: normalized(row[idx.code]),
          name: normalized(row[idx.name]),
          specification: normalized(row[idx.specification]),
          unit: normalized(row[idx.unit]),
          line: normalized(
            row[idx.line] || (state.masterScope === 'C' ? 'C' : 'A'),
          ).toUpperCase(),
          stages,
        };
      }),
    };
  }
  async function importExcel(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = parseWorkbook(await file.arrayBuffer()),
        products = imported.products || [];
      if (!products.length) throw new Error('no rows');
      if (
        !confirm(
          imported.complete
            ? `找到 ${products.length} 筆產品。這是本頁完整匯出檔，確認後會完整取代目前草稿的產品、類別、線別與工段。`
            : `找到 ${products.length} 筆產品。這是舊格式或外部檔案，只更新相同編號，其他資料保留。`,
        )
      )
        return;
      syncRows();
      const catalog = editable();
      if (imported.complete) {
        catalog.products = clone(products);
        catalog.lines = clone(imported.lines || []);
        catalog.categoryGroups = clone(imported.categoryGroups || []);
      } else {
        const map = new Map(catalog.products.map((item) => [item.code, item]));
        products.forEach((item) => map.set(item.code, item));
        catalog.products = [...map.values()];
      }
      record(
        draft(),
        '匯入 Excel',
        `${file.name} · ${products.length} 筆 · ${imported.complete ? '完整取代' : '相容匯入'}`,
      );
      persist();
      toast(`Excel 匯入成功：${products.length} 筆`);
      rerenderMaster();
    } catch (error) {
      console.warn(error);
      toast('Excel 無法讀取，請確認欄位包含產品編號與產品名稱');
    }
  }
  function exportExcel() {
    const catalog = current(),
      historyRows = versions().map((item) => ({
        版本: `V${item.number}`,
        狀態: statusText(item.status),
        建立者: item.creatorName,
        建立時間: labelTime(item.createdAt),
        確認者: item.reviewerName || '待補',
        確認時間: item.reviewedAt ? labelTime(item.reviewedAt) : '待補',
      }));
    window.MasterPageExcel.exportFile(
      catalog,
      state.masterScope,
      historyRows,
    );
    toast('Excel 匯出成功');
  }
  function cleanEditorSet(
    editorData,
    validProducts,
    validStages,
    requiredStages = null,
  ) {
    if (!editorData || typeof editorData !== 'object') return false;
    let changed = false;
    Object.keys(editorData).forEach((stageCode) => {
      if (
        !validStages.has(stageCode) ||
        (requiredStages && !requiredStages.has(stageCode))
      ) {
        delete editorData[stageCode];
        changed = true;
        return;
      }
      const operations = Array.isArray(editorData[stageCode])
        ? editorData[stageCode]
        : [];
      operations.forEach((operation) => {
        const before = (operation.productCodes || []).length;
        operation.productCodes = (operation.productCodes || []).filter((code) =>
          validProducts.has(code),
        );
        if (operation.productCodes.length !== before) changed = true;
        for (const key of Object.keys(operation.bomSelections || {}))
          if (!validProducts.has(key)) {
            delete operation.bomSelections[key];
            changed = true;
          }
        for (const key of Object.keys(operation.productInstructions || {}))
          if (!validProducts.has(key)) {
            delete operation.productInstructions[key];
            changed = true;
          }
        if (
          operation.noteProductCode &&
          !validProducts.has(operation.noteProductCode)
        ) {
          operation.noteProductCode = operation.productCodes[0] || '';
          changed = true;
        }
        operation.bomProductCode = operation.productCodes.includes(
          operation.bomProductCode,
        )
          ? operation.bomProductCode
          : operation.productCodes[0] || '';
        operation.bomItems = Object.values(
          operation.bomSelections || {},
        ).flat();
      });
      const ids = new Set(operations.map((operation) => operation.id));
      operations.forEach((operation) => {
        const next = (operation.nextIds || []).filter((id) => ids.has(id));
        if (next.length !== (operation.nextIds || []).length) {
          operation.nextIds = next;
          changed = true;
        }
      });
    });
    if (requiredStages)
      requiredStages.forEach((stageCode) => {
        if (!Array.isArray(editorData[stageCode])) {
          editorData[stageCode] = [];
          changed = true;
        }
      });
    return changed;
  }
  function reconcileEditorMaster(all, categoryGroups = []) {
    const validProducts = new Set(all.map((item) => item.code)),
      validStages = new Set(
        routing.lines.flatMap((line) => line.stages.map((stage) => stage.code)),
      ),
      validEditorKeys = new Set([
        ...all.map((item) => `${item.category}:${item.line}`),
        ...categoryGroups.map((item) => `${item.name}:${item.line}`),
      ]);
    const requirements = (key) => {
      const split = key.lastIndexOf(':'),
        category = key.slice(0, split),
        line = key.slice(split + 1);
      return new Set(
        all
          .filter((item) => item.category === category && item.line === line)
          .flatMap((item) => item.stages || [])
          .filter((code) => validStages.has(code)),
      );
    };
    if (typeof ensureProcessMasterStages === 'function')
      ensureProcessMasterStages();
    Object.keys(state.editorByCategory || {}).forEach((key) => {
      if (!validEditorKeys.has(key)) {
        delete state.editorByCategory[key];
        return;
      }
      cleanEditorSet(
        state.editorByCategory[key],
        validProducts,
        validStages,
        requirements(key),
      );
    });
    if (
      typeof localStorage.length === 'number' &&
      typeof localStorage.key === 'function'
    ) {
      for (let index = localStorage.length - 1; index >= 0; index--) {
        const storageKey = localStorage.key(index);
        if (!storageKey?.startsWith('processEditor:')) continue;
        const editorKey = storageKey.slice('processEditor:'.length);
        if (!validEditorKeys.has(editorKey)) {
          localStorage.removeItem(storageKey);
          continue;
        }
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
          if (
            saved?.stages &&
            cleanEditorSet(
              saved.stages,
              validProducts,
              validStages,
              requirements(editorKey),
            )
          )
            localStorage.setItem(storageKey, JSON.stringify(saved));
        } catch (error) {
          console.warn('無法同步製程草稿', storageKey, error);
        }
      }
    }
    if (typeof dispatchBoard !== 'undefined') {
      let changed = false;
      Object.keys(dispatchBoard).forEach((line) => {
        const next = (dispatchBoard[line] || []).filter(
          (code) =>
            validProducts.has(code) &&
            routing.productRoutes[code]?.line === line,
        );
        if (next.length !== (dispatchBoard[line] || []).length) {
          dispatchBoard[line] = next;
          changed = true;
        }
      });
      if (changed)
        localStorage.setItem('dispatchBoard', JSON.stringify(dispatchBoard));
    }
    // BOM is an independent master and can contain semi-finished roots that are not
    // listed as finished products. Keep those branches and only ensure every
    // approved product has a BOM slot for the editor to match against.
    if (data.bom)
      validProducts.forEach((code) => {
        if (!data.bom[code]) data.bom[code] = [];
      });
    if (!validProducts.has(state.productCode))
      state.productCode = all[0]?.code || '';
    if (!data.categories.includes(state.category))
      state.category = data.categories[0] || '';
    if (!routing.lines.some((line) => line.code === state.editorLine))
      state.editorLine = routing.lines[0]?.code || '';
    if (!validStages.has(state.masterStage))
      state.masterStage = routing.lines[0]?.stages[0]?.code || '';
    if (data.meta) {
      data.meta.productCount = data.products.length;
      data.meta.categoryCount = data.categories.length;
      data.meta.bomProductCount = Object.values(data.bom || {}).filter(
        (rows) => rows.length,
      ).length;
      data.meta.bomRowCount = Object.values(data.bom || {}).reduce(
        (sum, rows) => sum + rows.length,
        0,
      );
    }
    if (routing.meta) {
      routing.meta.finishedCount = all.filter(
        (item) => item.line === 'A' || item.line === 'B',
      ).length;
      routing.meta.semiFinishedCount = all.filter(
        (item) => item.line === 'C',
      ).length;
      routing.meta.matchedCategoryCount = all.filter(
        (item) => item.category && item.category !== '待補',
      ).length;
      routing.meta.unmatchedCount = all.filter(
        (item) => !item.category || item.category === '待補',
      ).length;
    }
  }
  function applyActive() {
    const ab = control.active.AB,
      c = control.active.C,
      all = [...clone(ab.products), ...clone(c.products)],
      groupMap = new Map();
    [
      ...(ab.categoryGroups || []),
      ...(c.categoryGroups || []),
      ...all.map((item) => ({ line: item.line, name: item.category })),
    ].forEach((item) => {
      if (item?.line && item?.name)
        groupMap.set(`${item.line}\u0000${item.name}`, {
          line: item.line,
          name: item.name,
        });
    });
    const categoryGroups = [...groupMap.values()];
    window.ACTIVE_MASTER_CATEGORIES = clone(categoryGroups);
    data.products.splice(
      0,
      data.products.length,
      ...all.map((item) => ({
        category: item.category,
        code: item.code,
        name: item.name,
        specification: item.specification,
        unit: item.unit,
      })),
    );
    data.categories.splice(
      0,
      data.categories.length,
      ...[...new Set(categoryGroups.map((item) => item.name))],
    );
    Object.keys(routing.productRoutes).forEach(
      (key) => delete routing.productRoutes[key],
    );
    all.forEach(
      (item) =>
        (routing.productRoutes[item.code] = {
          code: item.code,
          category: item.category,
          name: item.name,
          specification: item.specification,
          unit: item.unit,
          line: item.line,
          routeCode: item.stages.join(' / '),
          stages: clone(item.stages),
        }),
    );
    routing.lines.splice(
      0,
      routing.lines.length,
      ...clone([...ab.lines, ...c.lines]),
    );
    lines.splice(
      0,
      lines.length,
      ...routing.lines.map((line, index) => ({
        ...line,
        stations: line.stages.map((stage) => stage.code),
        load: [82, 64, 48][index] || 50,
      })),
    );
    reconcileEditorMaster(all, categoryGroups);
    if (control.active.PROCESS) {
      processMaster = clone(control.active.PROCESS);
      const processCatalogChanged = ensureProcessMasterStages();
      control.active.PROCESS = clone(processMaster);
      if (!processCatalogChanged || canPublishProcessMaster())
        localStorage.setItem('processMasterData', JSON.stringify(processMaster));
      if (processCatalogChanged && canPublishProcessMaster()) persist();
    }
  }
  function approvalSection() {
    const reviewable = control.versions
        .filter((item) => item.status !== 'draft')
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
      selected =
        reviewable.find((item) => item.id === state.masterReviewId) ||
        reviewable[0];
    if (selected && !state.masterReviewId) state.masterReviewId = selected.id;
    return `<section class="master-pending"><header><p class="eyebrow">MASTER DATA VERSION CONTROL</p><h2>主資料版本確認</h2><p>AB 與 C 的產品、線別、工段與製程路線都在這裡確認；刪除變更會特別標示。</p></header><div class="master-review-grid"><aside class="master-review-list">${reviewable.map((item) => `<button data-master-review="${item.id}" class="${item.id === selected?.id ? 'active' : ''}"><span class="master-status ${item.status}">${statusText(item.status)}</span><b>${item.scope} · V${item.number}</b><small>${safe(item.creatorName)} · ${labelTime(item.updatedAt)}</small></button>`).join('')}</aside><div class="master-review-detail">${selected ? `<span class="master-status ${selected.status}">${statusText(selected.status)}</span><h3>${selected.scope} 產線與類別 · V${selected.number}</h3><div class="master-change-grid"><span><b>${selected.snapshot.products.length}</b><br>產品</span><span><b>${[...new Set(selected.snapshot.products.map((item) => item.category))].length}</b><br>類別</span><span><b>${selected.snapshot.lines.reduce((sum, line) => sum + line.stages.length, 0)}</b><br>工段</span></div>${selected.warnings?.length ? `<div class="master-danger-list"><b>⚠ 刪除警告</b>${selected.warnings.map((item) => `<div>${safe(item)}</div>`).join('')}</div>` : ''}<div class="master-version-actions">${canApprove() && selected.status === 'pending' ? `<button class="button signal" id="approve-master">確認版本</button>` : ''}${selected.status === 'pending' && (selected.creatorId === currentUser?.id || currentUser?.role === 'admin') ? `<button class="button ghost" id="withdraw-master-review">解除送審，繼續修改</button>` : ''}</div>` : '尚無主資料版本'}</div></div></section>`;
  }
  function bindApprovalMaster() {
    document.querySelectorAll('[data-master-review]').forEach(
      (button) =>
        (button.onclick = () => {
          state.masterReviewId = button.dataset.masterReview;
          render();
        }),
    );
    document.querySelector('#approve-master')?.addEventListener('click', () => {
      const item =
        control.versions.find(
          (version) => version.id === state.masterReviewId,
        ) || control.versions.find((version) => version.status === 'pending');
      if (!item) return;
      control.versions
        .filter(
          (version) =>
            version.scope === item.scope && version.status === 'approved',
        )
        .forEach((version) => (version.status = 'superseded'));
      item.status = 'approved';
      item.reviewerName = currentUser?.name || '主管';
      item.reviewedAt = now();
      record(item, '確認主資料版本');
      control.active[item.scope] = clone(item.snapshot);
      persist();
      applyActive();
      toast('主資料版本已確認並套用');
      render();
    });
    document
      .querySelector('#withdraw-master-review')
      ?.addEventListener('click', () => {
        const item = control.versions.find(
          (version) => version.id === state.masterReviewId,
        );
        if (!item) return;
        item.status = 'draft';
        record(item, '解除送審，繼續修改');
        persist();
        toast('已解除送審，項目已從待確認清單移除');
        render();
      });
  }
  if (window.MasterAdminUI) {
    const enhanced = window.MasterAdminUI.install({
      state,
      control,
      versions,
      draft,
      pending,
      persist,
      record,
      beginDraft,
      saveDraft,
      submitDraft,
      importExcel,
      exportExcel,
      validateCatalog,
    });
    current = enhanced.current;
    editable = enhanced.editable;
    masterView = enhanced.masterView;
    bindMaster = enhanced.bindMaster;
    productRows = enhanced.productRows;
    syncRows = enhanced.syncRows;
    categories = enhanced.categories;
    if (window.MasterReview) {
      const review = window.MasterReview.install({
        state,
        control,
        persist,
        record,
        validateCatalog,
        applyActive,
        showVersion: (scope, id) => {
          if (scope === 'PROCESS')
            window.ProcessMasterVersioning?.showVersion(id);
          else enhanced.showVersion(scope, id);
        },
      });
      approvalSection = review.view;
      bindApprovalMaster = review.bind;
    }
  }
  window.MasterDataWorkflow = {
    control: () => control,
    persist,
    record,
    applyActive,
  };
  applyActive();
  window.addEventListener('process-shared-state-updated', () => {
    platformUsers = readStore('platformUsers', platformUsers);
    approvalVersions = readStore('approvalVersions', approvalVersions);
    dispatchBoard = readStore('dispatchBoard', dispatchBoard);
    processMaster = readStore('processMasterData', processMaster);
    control = readStore(STORAGE, control);
    ensureProcessMasterVersionScope();
    if (state.view !== 'editor') state.editorByCategory = {};
    applyActive();
    if (currentUser && currentUser.id !== 'public-viewer') {
      const latest = platformUsers.find((user) => user.id === currentUser.id);
      if (latest)
        currentUser = { ...currentUser, ...latest };
      applyPlatformIdentity();
    }
    // Keep the active DOM, form inputs, modal and scroll positions intact.
    window.ProcessRoles?.refresh?.();
    window.dispatchEvent(new CustomEvent('process-runtime-updated'));
  });
  const priorRender = render;
  render = function () {
    if (state.view === 'approval')
      state.approvalTab =
        state.approvalTab === 'process' ? 'process' : 'master';
    priorRender();
    if (state.view === 'approval') {
      const masterActive = state.approvalTab === 'master';
      window.ApprovalTabs.mount({
        page: document.querySelector('.approval-page'),
        state,
        masterHTML: masterActive ? approvalSection() : '',
        masterPending: control.versions.filter((v) => v.status === 'pending')
          .length,
        processPending: approvalVersions.filter((v) => v.status === 'pending')
          .length,
        onSelect: () => render(),
      });
      if (masterActive) bindApprovalMaster();
    }
  };
})();
