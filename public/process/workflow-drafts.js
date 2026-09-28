(function (host) {
  'use strict';
  const records = new Map();
  const key = (kind, scope) => `${kind}:${scope}`;
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const t = (zh, vi) => document.documentElement.lang === 'vi' ? vi : zh;
  const h = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
  let loading = null;

  function headers() {
    return host.ProcessSync?.platformHeaders?.() || { 'Content-Type': 'application/json' };
  }
  function setRecord(kind, scope, draft, analysis) {
    const id = key(kind, scope);
    if (!draft) records.delete(id);
    else records.set(id, { draft, analysis: analysis || null });
  }
  function applyResult(kind, scope, result) {
    setRecord(kind, scope, result.draft, result.analysis);
    if (result.state) {
      host.ProcessSync?.applyServerState?.(result.state);
      host.dispatchEvent(new CustomEvent('process-shared-state-updated'));
    }
    return result;
  }
  async function request(body) {
    const response = await fetch('/api/workflow-drafts', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (result.draft || result.analysis)
        setRecord(body.kind, body.scope, result.draft, result.analysis);
      const error = new Error(result.error || t('草稿操作失敗', 'Thao tác bản nháp thất bại'));
      error.status = response.status;
      error.code = result.code;
      error.result = result;
      throw error;
    }
    return applyResult(body.kind, body.scope, result);
  }
  async function refresh() {
    if (!host.ProcessSync?.identity || ['viewer', 'device'].includes(host.ProcessSync.identity.role)) {
      records.clear();
      return [];
    }
    if (loading) return loading;
    loading = (async () => {
      const response = await fetch('/api/workflow-drafts', {
        cache: 'no-store',
        headers: headers(),
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) throw Error(t('無法讀取個人草稿', 'Không thể đọc bản nháp cá nhân'));
      const result = await response.json();
      records.clear();
      (result.drafts || []).forEach((entry) =>
        setRecord(entry.kind, entry.scope, entry.draft, entry.analysis),
      );
      return result.drafts || [];
    })().finally(() => (loading = null));
    return loading;
  }
  function get(kind, scope) {
    return records.get(key(kind, scope)) || null;
  }
  function version(kind, scope) {
    const entry = get(kind, scope);
    if (!entry?.draft) return null;
    const draft = entry.draft;
    const number = `我的-${draft.version}`;
    if (kind === 'process') {
      const [category, line] = scope.split('|');
      return {
        id: draft.id,
        workflowDraft: true,
        number,
        category,
        line,
        stages: draft.payload,
        creatorId: draft.ownerId,
        creatorName: draft.ownerName,
        status: draft.status === 'locked' ? 'pending' : 'draft',
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
        history: [],
      };
    }
    return {
      id: draft.id,
      workflowDraft: true,
      scope,
      number,
      snapshot: draft.payload,
      creatorId: draft.ownerId,
      creatorName: draft.ownerName,
      status: draft.status === 'locked' ? 'pending' : 'draft',
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      warnings: [],
      history: [],
    };
  }
  async function save(kind, scope, payload) {
    const current = get(kind, scope)?.draft;
    return request({
      action: 'save', kind, scope, payload,
      draftId: current?.id,
      expectedVersion: current?.version || 0,
    });
  }
  async function submit(kind, scope) {
    const current = get(kind, scope)?.draft;
    if (!current) throw Error(t('請先儲存草稿', 'Hãy lưu bản nháp trước'));
    return request({
      action: 'submit', kind, scope,
      draftId: current.id,
      expectedVersion: current.version,
    });
  }
  async function resolve(kind, scope, changeId, strategy) {
    const current = get(kind, scope)?.draft;
    if (!current) throw Error(t('草稿已不存在', 'Bản nháp không còn tồn tại'));
    return request({
      action: 'resolve', kind, scope, changeId, strategy,
      draftId: current.id,
      expectedVersion: current.version,
    });
  }
  async function review(version, action, note = '') {
    const kind = version.category ? 'process' : version.scope === 'BOM' ? 'bom' : 'master';
    const scope = version.category ? `${version.category}|${version.line}` : version.scope;
    return request({ action, kind, scope, caseId: version.workflowCaseId || version.id, note });
  }
  function shortValue(value) {
    if (value == null) return '—';
    if (typeof value === 'string') return value.length > 120 ? `${value.slice(0, 117)}…` : value;
    const text = JSON.stringify(value);
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  }
  function panel(kind, scope) {
    const entry = get(kind, scope);
    if (!entry?.draft) return '';
    const { draft, analysis } = entry;
    const waiting = analysis?.waiting || [];
    const conflicts = analysis?.conflicts || [];
    if (!waiting.length && !conflicts.length && draft.status !== 'locked') return '';
    const rows = waiting.length ? waiting : conflicts;
    const heading = draft.status === 'locked'
      ? t('草稿已送審並鎖定', 'Bản nháp đã gửi duyệt và bị khóa')
      : waiting.length
        ? t('等待審核：整份草稿暫緩送審', 'Chờ duyệt: tạm hoãn toàn bộ bản nháp')
        : t('審核後發現差異，請先處理', 'Có khác biệt sau duyệt, hãy xử lý trước');
    return `<section class="workflow-draft-panel" data-workflow-panel="${h(kind)}:${h(scope)}"><header><div><small>${t('我的個人草稿', 'Bản nháp cá nhân của tôi')} · v${draft.version}</small><h4>${heading}</h4></div><span>${rows.length} ${t('項', 'mục')}</span></header><div class="workflow-diff-table" role="table">${rows.map((row) => `<article role="row" class="${row.type} ${row.resolved ? 'resolved' : ''}"><div class="workflow-diff-id"><b>${h(row.label)}</b>${row.type === 'waiting' ? `<small>${t('待審人員', 'Người đang chờ duyệt')}：${h(row.pendingOwnerName)}</small>` : row.resolved ? `<small>${t('已確認保留我的值', 'Đã xác nhận giữ giá trị của tôi')}</small>` : ''}</div>${row.type === 'waiting' ? `<div><label>${t('待審值', 'Giá trị chờ duyệt')}</label><span>${h(shortValue(row.pendingValue))}</span></div><div><label>${t('我的值', 'Giá trị của tôi')}</label><span>${h(shortValue(row.mineValue))}</span></div>` : `<div><label>${t('原值', 'Giá trị gốc')}</label><span>${h(shortValue(row.baseValue))}</span></div><div><label>${t('目前生效值', 'Giá trị hiện hành')}</label><span>${h(shortValue(row.currentValue))}</span></div><div><label>${t('我的草稿值', 'Giá trị bản nháp')}</label><span>${h(shortValue(row.mineValue))}</span></div>`}<div class="workflow-diff-actions"><button type="button" class="button ghost" data-workflow-goto="${h(row.id)}">${t('前往修改', 'Đi tới chỉnh sửa')}</button>${row.type === 'conflict' ? `<button type="button" class="button ghost" data-workflow-resolve="current" data-change-id="${h(row.id)}">${t('採用目前值', 'Dùng giá trị hiện hành')}</button><button type="button" class="button signal" data-workflow-resolve="mine" data-change-id="${h(row.id)}" ${row.resolved ? 'disabled' : ''}>${t('確認保留我的值', 'Xác nhận giữ giá trị của tôi')}</button>` : ''}</div></article>`).join('')}</div></section>`;
  }
  function gotoIssue(kind, scope, issue) {
    const location = issue?.location || {};
    if (kind === 'process') {
      state.category = scope.split('|')[0];
      state.editorLine = scope.split('|')[1];
      state.masterStage = location.stageCode || state.masterStage;
      state.selectedOperation = location.operationId || state.selectedOperation;
      state.view = 'editor';
      render();
      setTimeout(() => document.querySelector(`[data-operation="${CSS.escape(location.operationId || '')}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
      return;
    }
    state.view = 'data';
    if (kind === 'bom') {
      state.dataTab = 'bom';
      state.productCode = location.productCode || state.productCode;
    } else if (scope === 'PROCESS') state.dataTab = 'process-master';
    else {
      state.dataTab = scope;
      state.masterScope = scope;
      state.masterSearch = location.recordId || '';
    }
    render();
  }
  function bindPanel(container, kind, scope) {
    const entry = get(kind, scope);
    if (!entry) return;
    const issues = [...(entry.analysis?.waiting || []), ...(entry.analysis?.conflicts || [])];
    container.querySelectorAll('[data-workflow-goto]').forEach((button) => {
      button.onclick = () => gotoIssue(kind, scope, issues.find((item) => item.id === button.dataset.workflowGoto));
    });
    container.querySelectorAll('[data-workflow-resolve]').forEach((button) => {
      button.onclick = async () => {
        button.disabled = true;
        try {
          const result = await resolve(kind, scope, button.dataset.changeId, button.dataset.workflowResolve);
          if (kind === 'process') state.editorByCategory[scope.replace('|', ':')] = copy(result.draft.payload);
          toast(t('差異已重新檢查', 'Đã kiểm tra lại khác biệt'));
          render();
        } catch (error) {
          toast(error.message);
          render();
        }
      };
    });
  }
  function clear() {
    records.clear();
    loading = null;
  }

  host.WorkflowDrafts = {
    refresh, get, version, save, submit, resolve, review, panel, bindPanel, clear,
    payload(kind, scope) { return get(kind, scope)?.draft?.payload || null; },
    analysis(kind, scope) { return get(kind, scope)?.analysis || null; },
  };
})(window);
