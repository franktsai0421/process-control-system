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
    timer,
    dirty = {},
    baseline = {},
    blocked = false,
    paused = false,
    platformCredential = null,
    sharedValues = new Map(
      Object.keys(localStorage)
        .filter(isSharedKey)
        .map((key) => [key, originalGet.call(localStorage, key)]),
    );
  const api = (window.ProcessSync = {
    identity: null,
    protected: false,
    status: 'loading',
    paused: false,
    revision: 0,
    flush,
  });
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
    const values = shared.values || {};
    sharedValues = new Map(
      Object.entries(values).filter(
        ([key, value]) => isSharedKey(key) && typeof value === 'string',
      ),
    );
    // Shared business data can contain many compressed photos. Keep it in
    // memory and persist it through D1/R2 instead of consuming the browser's
    // small localStorage quota. Remove legacy browser copies on every load.
    Object.keys(localStorage)
      .filter(isSharedKey)
      .forEach((key) => originalRemove.call(localStorage, key));
    baseline = { ...values };
    revision = shared.revision || 0;
    api.revision = revision;
  }
  try {
    const request = new XMLHttpRequest();
    request.open('GET', endpoint, false);
    Object.entries(authHeaders()).forEach(([key, value]) =>
      request.setRequestHeader(key, value),
    );
    request.send();
    if (request.status === 200) {
      const shared = JSON.parse(request.responseText);
      api.identity = shared.identity || null;
      api.protected = !!shared.serverProtected;
      api.demoEnabled = !!shared.demoEnabled;
      apply(shared);
    } else if (request.status === 403) {
      api.protected = true;
      api.expired = true;
    }
  } catch (error) {
    console.warn('共用資料服務無法連線', error);
    status('offline');
  }
  ready = true;
  api.applyRestore = (shared) => {
    for (const key of ['processCustomRoles', 'processRoleTemplateOverrides'])
      originalRemove.call(localStorage, key);
    dirty = {};
    apply(shared);
  };
  async function flush() {
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
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
        // Never create an endless retry loop. Client/conflict responses need
        // human review; server failures pause until the user retries once.
        blocked = [401, 403, 409].includes(response.status);
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
      baseline = { ...shared.values };
      revision = shared.revision;
      api.revision = revision;
      blocked = false;
      paused = false;
      api.paused = false;
      originalRemove.call(sessionStorage, 'process-unsynced-recovery');
      status('saved');
      return true;
    } catch (error) {
      dirty = { ...updates, ...dirty };
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
    if (!ready || !isSharedKey(key) || baseline[key] === value) return;
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
