const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class QuotaStorage {
  constructor(limit = 5 * 1024 * 1024) {
    Object.defineProperties(this, { limit: { value: limit } });
  }
  getItem(key) {
    key = String(key);
    return Object.prototype.hasOwnProperty.call(this, key) ? this[key] : null;
  }
  setItem(key, value) {
    key = String(key);
    value = String(value);
    const size = Object.keys(this).reduce(
      (total, item) =>
        total + item.length + (item === key ? 0 : String(this[item]).length),
      key.length + value.length,
    );
    if (size > this.limit) throw Error('QuotaExceededError');
    this[key] = value;
  }
  removeItem(key) {
    delete this[String(key)];
  }
}

const localStorage = new QuotaStorage();
const sessionStorage = new QuotaStorage();
const nativeGetItem = QuotaStorage.prototype.getItem;
localStorage.setItem(
  'processEditor:legacy:A',
  JSON.stringify({ media: 'L'.repeat(1024 * 1024) }),
);

const initialEditor = JSON.stringify({
  category: 'quota-test',
  line: 'A',
  stages: { 'A-CUT': [{ id: 'large', media: 'A'.repeat(1024 * 1024) }] },
});
let revision = 10;
let values = {
  platformUsers: '[]',
  approvalVersions: '[]',
  'processEditor:quota-test:A': initialEditor,
};
let lastPost = null;
let failWrites = false;
const listeners = new Map();

class FixtureRequest {
  open(method, url) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader() {}
  send() {
    assert.equal(this.method, 'GET');
    assert.equal(this.url, '/api/shared-state');
    this.status = 200;
    this.responseText = JSON.stringify({
      revision,
      values,
      identity: { id: 'operator', role: 'staff' },
      serverProtected: true,
    });
  }
}

const window = {
  dispatchEvent(event) {
    for (const handler of listeners.get(event.type) || []) handler(event);
  },
  addEventListener(type, handler) {
    listeners.set(type, [...(listeners.get(type) || []), handler]);
  },
};
const context = vm.createContext({
  window,
  Storage: QuotaStorage,
  localStorage,
  sessionStorage,
  location: {
    href: 'https://example.test/process/',
    origin: 'https://example.test',
    search: '',
  },
  URL,
  URLSearchParams,
  XMLHttpRequest: FixtureRequest,
  CustomEvent: class {
    constructor(type, options) {
      this.type = type;
      this.detail = options?.detail;
    }
  },
  console,
  clearTimeout,
  setTimeout,
  fetch: async (url, options) => {
    assert.equal(url, '/api/shared-state');
    lastPost = JSON.parse(options.body);
    if (failWrites)
      return {
        ok: false,
        status: 503,
        text: async () => JSON.stringify({ error: 'fixture unavailable' }),
      };
    values = { ...values, ...lastPost.updates };
    revision += 1;
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ revision, values }),
    };
  },
});
window.window = window;

vm.runInContext(
  fs.readFileSync(path.resolve('public/process/shared-state.js'), 'utf8'),
  context,
  { filename: 'shared-state.js' },
);

(async () => {
  assert.equal(
    localStorage.getItem('processEditor:quota-test:A'),
    initialEditor,
    'server state is available through the compatibility mirror',
  );
  assert.equal(
    nativeGetItem.call(localStorage, 'processEditor:quota-test:A'),
    null,
    'server state is not copied into native localStorage',
  );
  assert.equal(
    nativeGetItem.call(localStorage, 'processEditor:legacy:A'),
    null,
    'legacy shared browser data is removed on load',
  );

  localStorage.setItem('device-quota-fixture', 'F'.repeat(4 * 1024 * 1024));
  const nextEditor = JSON.stringify({
    category: 'quota-test',
    line: 'A',
    stages: { 'A-CUT': [{ id: 'larger', media: 'N'.repeat(1200 * 1024) }] },
  });
  localStorage.setItem('processEditor:quota-test:A', nextEditor);
  assert.equal(await window.ProcessSync.flush(), true);
  assert.equal(
    lastPost.updates['processEditor:quota-test:A'],
    nextEditor,
    'the complete photo draft reaches the cloud write',
  );
  assert.equal(
    nativeGetItem.call(localStorage, 'processEditor:quota-test:A'),
    null,
  );

  failWrites = true;
  sessionStorage.setItem('quota-fixture', 'Q'.repeat(4 * 1024 * 1024));
  localStorage.setItem(
    'processEditor:quota-test:A',
    JSON.stringify({ media: 'R'.repeat(1200 * 1024) }),
  );
  assert.equal(await window.ProcessSync.flush(), false);
  assert.equal(window.ProcessSync.status, 'offline');

  const safetySource = fs.readFileSync(
    path.resolve('public/process/data-safety-ui.js'),
    'utf8',
  );
  assert.match(
    safetySource,
    /currentUser\.id !== 'public-viewer' && !sync\?\.protected/,
    'a remembered hosted user must not bypass server session verification',
  );
  assert.match(
    safetySource,
    /currentUser = null;\s*persistPlatform\(\);\s*renderLogin\(\);/,
  );
  const appSource = fs.readFileSync(
    path.resolve('public/process/app.js'),
    'utf8',
  );
  assert.match(
    appSource,
    /const saved = await window\.ProcessSync\?\.flush\?\.\(\);/,
    'the save action must wait for the cloud write before showing success',
  );
  console.log(
    'PASS: shared photo drafts bypass localStorage quota, cloud save is awaited, recovery quota is contained, and stale hosted identity returns to login',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
