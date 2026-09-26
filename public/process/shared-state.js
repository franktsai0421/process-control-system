(() => {
  const localManage =
      new URLSearchParams(location.search).get('manage') === '1',
    endpoint = localManage ? '/api/shared-state?manage=1' : '/api/shared-state',
    fixedKeys = new Set([
      'platformUsers',
      'processCustomRoles',
      'processRoleTemplateOverrides',
      'approvalVersions',
      'dispatchBoard',
      'publishedProcess',
      'processMasterData',
      'masterDataControl',
      'bomOverrides',
      'versionSampleSeed4',
      'backupSettings',
    ]);
  const originalGet = Storage.prototype.getItem,
    originalSet = Storage.prototype.setItem,
    originalRemove = Storage.prototype.removeItem;
  const isSharedKey = (key) =>
    fixedKeys.has(key) || key.startsWith('processEditor:');
  let revision = 0,
    ready = false,
    posting = false,
    pendingFlush = null,
    timer,
    dirty = {},
    baseline = {},
    staleKeys = new Set(),
    blocked = false,
    paused = false,
    platformCredential = null,
    sharedValues = new Map(
      Object.keys(localStorage)
        .filter(isSharedKey)
        .map((key) => [key, originalGet.call(localStorage, key)]),
    );
  const legacyDrafts = new Map([...sharedValues].filter(([key]) => key.startsWith('processEditor:')));
  const api = (window.ProcessSync = {
    identity: null,
    protected: false,
    status: 'loading',
    paused: false,
    revision: 0,
    loadError: null,
    saveError: null,
    flush,
    legacyDraftKeys: () => [...legacyDrafts.keys()],
    readLegacyDraft: key => validLegacyDraft(key, legacyDrafts.get(key)),
  });
  api.saveFailureMessage = () => {
    const vi = document.documentElement.lang === 'vi';
    const code = api.saveError?.status;
    if (code === 409) return vi
      ? 'Bản nháp chưa được lưu trên máy chủ: dữ liệu đã được cập nhật ở nơi khác. Giữ trang này và đối chiếu thay đổi trước khi lưu lại.'
      : '草稿尚未完成伺服器儲存：資料已在其他位置更新。請保留目前頁面並核對差異，不要重新整理或覆蓋他人的修改。';
    if (code === 401 || code === 403) return vi
      ? 'Bản nháp chưa được lưu trên máy chủ: phiên đăng nhập đã hết hạn hoặc không có quyền. Giữ trang này và liên hệ quản trị viên.'
      : '草稿尚未完成伺服器儲存：登入已失效或沒有儲存權限。請保留目前頁面並聯絡管理員。';
    return vi
      ? 'Bản nháp chưa được lưu trên máy chủ. Giữ trang này, kiểm tra kết nối rồi nhấn Lưu lại.'
      : '草稿尚未完成伺服器儲存。請保留目前頁面，確認連線後再次按儲存。';
  };
  function authHeaders() {
    return platformCredential?.id && platformCredential?.password
      ? {
          'X-Process-Admin-Id': platformCredential.id,
          'X-Process-Admin-Password': platformCredential.password,
        }
      : {};
  }
  api.setPlatformIdentity = (user, password) => {
    api.identity = { id: user.id, name: user.name, role: user.role, authMode: user.authMode, sessionType: user.sessionType };
    platformCredential = password ? { id: user.id, password } : null;
    blocked = false;
    paused = false;
    api.paused = false;
  };
  api.getPlatformPassword = () => platformCredential?.password || '';
  api.setDemoIdentity = user => {api.setPlatformIdentity(user);sessionStorage.removeItem('process-platform-signed-out');};
  api.clearIdentity = () => {platformCredential=null;api.identity=null;blocked=false;paused=false;api.paused=false;};
  api.platformHeaders = () => ({ 'Content-Type': 'application/json', ...authHeaders() });
  api.applyServerState = apply;
  api.discardPending = (key, value) => {
    if (posting) throw Error('Cannot discard an in-flight write');
    delete dirty[key];
    if (value === null) sharedValues.delete(key); else sharedValues.set(key, value);
    preserveRecovery();
  };
  function status(message) {
    api.status = message;
    window.dispatchEvent(
      new CustomEvent('process-sync-status', { detail: message }),
    );
  }
  function preserveRecovery() {
    try {
      originalSet.call(
        sessionStorage,
        'process-unsynced-recovery',
        JSON.stringify({ at: new Date().toISOString(), updates: dirty }),
      );
    } catch (error) {
      console.warn('瀏覽器無法保存未同步資料備份', error);
    }
  }
  function apply(shared) {
    api.loadError = null;
    api.expired = false;
    api.saveError = null;
    const values = shared.values || {};
    sharedValues = new Map(
      Object.entries(values).filter(
        ([key, value]) => isSharedKey(key) && typeof value === 'string',
      ),
    );
    // Preserve old browser drafts until a complete server write is verified.
    for (const [key, value] of legacyDrafts) {
      if (!sharedValues.has(key) && validLegacyDraft(key, value)) sharedValues.set(key, value);
    }
    Object.keys(localStorage)
      .filter(key => isSharedKey(key) && !key.startsWith('processEditor:'))
      .forEach((key) => originalRemove.call(localStorage, key));
    baseline = { ...values };
    staleKeys.clear();
    revision = shared.revision || 0;
    api.revision = revision;
  }
  async function load() {
   try {
    const request = await fetch(endpoint, { cache: 'no-store', headers: { 'X-Process-Media': 'deferred-v1', ...authHeaders() }, signal: AbortSignal.timeout(45000) });
    if (request.status === 200) {
      const shared = await request.json();
      api.identity = shared.identity || null;
      api.protected = !!shared.serverProtected;
      api.demoEnabled = !!shared.demoEnabled;
      apply(shared);
    } else if (request.status === 403) {
      api.protected = true;
      api.expired = true;
    } else {
      api.protected = true;
      api.loadError = 'unavailable';
      status('offline');
    }
  } catch (error) {
    api.protected = true;
    api.loadError = 'unavailable';
    console.warn('共用資料服務無法連線', error);
    status('offline');
  } finally {
    ready = true;
    stageLegacyDrafts();
   }
  }
  api.ready = load();
  api.refresh = async () => {
    if (pendingFlush || Object.keys(dirty).length) throw Error('Unsaved changes');
    await load();
    if(api.loadError || api.expired) throw Error('Shared state unavailable');
    window.dispatchEvent(new CustomEvent('process-shared-state-updated'));
  };
  function validLegacyDraft(key, value) {
    try {
      const saved = JSON.parse(value || 'null');
      return saved && key === `processEditor:${saved.category}:${saved.line}` &&
        saved.stages && !Array.isArray(saved.stages) && typeof saved.stages === 'object' &&
        Object.values(saved.stages).every(Array.isArray) ? saved : null;
    } catch { return null; }
  }
  function stageLegacyDrafts() {
    if (!ready || (api.protected && (!api.identity || ['viewer', 'device'].includes(api.identity.role)))) return;
    for (const [key, value] of legacyDrafts) {
      if (!(key in baseline) && validLegacyDraft(key, value)) queue(key, sharedValues.get(key));
    }
  }
  function confirmLegacyDrafts(updates, values) {
    for (const [key, legacyValue] of legacyDrafts) {
      const legacy = validLegacyDraft(key, legacyValue), saved = validLegacyDraft(key, values[key]);
      if (legacy && saved && key in updates && !(key in dirty) &&
        updates[key] === values[key] && sharedValues.get(key) === values[key] &&
        originalGet.call(localStorage, key) === legacyValue &&
        JSON.stringify(saved.stages) === JSON.stringify(legacy.stages)) {
        originalRemove.call(localStorage, key);
        legacyDrafts.delete(key);
      }
    }
  }
  api.applyRestore = (shared) => {
    for (const key of ['processCustomRoles', 'processRoleTemplateOverrides'])
      originalRemove.call(localStorage, key);
    dirty = {};
      apply(shared);
  };
  function flush() {
    clearTimeout(timer);
    if (api.loadError) return Promise.resolve(false);
    if (pendingFlush) return pendingFlush;
    if (blocked) return Promise.resolve(false);
    // Explicit Save may retry a temporary failure. No background retry is scheduled.
    paused = false;
    api.paused = false;
    pendingFlush = (async () => {
      let rebases = 0;
      while (Object.keys(dirty).length) {
        const result = await writeBatch(rebases < 2);
        if (result === 'retry') { rebases++; continue; }
        if (!result) return false;
      }
      return true;
    })().finally(() => { pendingFlush = null; });
    return pendingFlush;
  }
  async function writeBatch(canRebase) {
    clearTimeout(timer);
    if (posting || blocked || paused) return false;
    if (!Object.keys(dirty).length) return true;
    posting = true;
    const updates = dirty;
    dirty = {};
    status('saving');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Process-Receipt': 'sha256', 'X-Process-Media': 'deferred-v1', ...authHeaders() },
        body: JSON.stringify({ updates, baseRevision: revision }),
      });
      const text = await response.text();
      let shared = {};
      try {
        shared = text ? JSON.parse(text) : {};
      } catch {
        shared = { error: `同步服務回應異常（HTTP ${response.status}）` };
      }
      if (!response.ok) {
        dirty = { ...updates, ...dirty };
        // A different page/key may have been saved since this editor loaded.
        // Retry only when none of the keys in this request changed on the server.
        // Keep local edits and stop if another writer changed the same key.
        if (response.status === 409 && canRebase &&
          Number.isInteger(shared.revision) && shared.values &&
          Object.keys(updates).every(key => baseline[key] === shared.values[key])) {
          for (const key of new Set([...Object.keys(baseline), ...Object.keys(shared.values)])) {
            if (!(key in updates) && baseline[key] !== shared.values[key]) staleKeys.add(key);
          }
          baseline = { ...shared.values };
          revision = shared.revision;
          api.revision = revision;
          api.saveError = null;
          return 'retry';
        }
        // Never create an endless retry loop. Client/conflict responses need
        // human review; server failures pause until the user retries once.
        blocked = [401, 403, 409].includes(response.status);
        api.saveError = { status: response.status, message: shared.error || '' };
        paused = !blocked;
        api.paused = paused;
        preserveRecovery();
        status(
          response.status === 409
            ? 'conflict'
            : paused
              ? 'offline'
              : shared.error || '儲存失敗',
        );
        return false;
      }
      let acceptedValues = shared.values;
      if (shared.accepted) {
        for (const [key, value] of Object.entries(updates)) {
          const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)))), b => b.toString(16).padStart(2, '0')).join('');
          if (shared.accepted[key] !== digest) throw Error('Server receipt mismatch');
        }
        acceptedValues = { ...baseline, ...updates };
      }
      if (!acceptedValues || !Number.isInteger(shared.revision)) throw Error('Invalid server receipt');
      baseline = { ...acceptedValues };
      confirmLegacyDrafts(updates, acceptedValues);
      revision = shared.revision;
      api.revision = revision;
      blocked = false;
      api.saveError = null;
      paused = false;
      api.paused = false;
      originalRemove.call(sessionStorage, 'process-unsynced-recovery');
      status('saved');
      return true;
    } catch (error) {
      dirty = { ...updates, ...dirty };
      api.saveError = { status: 0, message: 'network' };
      paused = true;
      api.paused = true;
      preserveRecovery();
      status('offline');
      return false;
    } finally {
      posting = false;
    }
  }
  function queue(key, value) {
    if (!ready || !isSharedKey(key)) return;
    if (!posting && baseline[key] === value) {
      delete dirty[key];
      return;
    }
    // Account/role changes use the revision-checked administration API.
    if(['platformUsers','processCustomRoles','processRoleTemplateOverrides'].includes(key))return;
    if (api.protected && !api.identity) {
      status('readonly');
      return;
    }
    if (
      api.protected &&
      api.identity?.role !== 'admin' &&
      [
        'platformUsers',
        'processCustomRoles',
        'processRoleTemplateOverrides',
      ].includes(key)
    )
      return;
    dirty[key] = value;
    if (staleKeys.has(key)) {
      blocked = true;
      api.saveError = { status: 409, message: '此資料已由其他人更新，請保留目前頁面內容並核對差異。' };
      preserveRecovery();
      status('conflict');
      return;
    }
    clearTimeout(timer);
    if (paused || blocked) {
      preserveRecovery();
      return;
    }
    timer = setTimeout(flush, 250);
  }
  Storage.prototype.getItem = function (key) {
    key = String(key);
    if (this === localStorage && isSharedKey(key))
      return sharedValues.has(key) ? sharedValues.get(key) : null;
    return originalGet.call(this, key);
  };
  Storage.prototype.setItem = function (key, value) {
    key = String(key);
    value = String(value);
    if (this === localStorage && isSharedKey(key)) {
      sharedValues.set(key, value);
      queue(key, value);
      return;
    }
    originalSet.call(this, key, value);
  };
  Storage.prototype.removeItem = function (key) {
    key = String(key);
    if (this === localStorage && isSharedKey(key)) {
      sharedValues.delete(key);
      queue(key, null);
      return;
    }
    originalRemove.call(this, key);
  };
  if (api.identity?.role === 'admin')
    for (const key of ['processCustomRoles', 'processRoleTemplateOverrides']) {
      const value = localStorage.getItem(key);
      if (value && !baseline[key]) queue(key, value);
    }
  // Shared state is loaded when the latest URL opens. Background polling is
  // intentionally disabled so another open tab cannot interrupt current work.
  window.addEventListener('beforeunload', (event) => {
    if (Object.keys(dirty).length || posting) {
      event.preventDefault();
      event.returnValue = '資料尚未儲存完成';
    }
  });
})();
