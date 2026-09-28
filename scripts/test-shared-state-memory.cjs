const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const { webcrypto } = require('node:crypto');

// Exercise the real serializer and backup functions against an isolated D1/R2
// fixture; no Site or employee data is read or written.
let source = fs.readFileSync('lib/process-state.ts', 'utf8');
source = source.replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '');
source = stripTypeScriptTypes(source);
source += '\nglobalThis.stateStorage = { encodeValues, decodeValues, backupStoredState };';

const objects = new Map();
const statements = [];
let storedRevision = 7;
const env = {
  STATE_ARCHIVE: {
    async put(key, value) { objects.set(key, Buffer.from(value)); },
    async get(key) {
      const value = objects.get(key);
      return value ? { arrayBuffer: async () => value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) } : null;
    },
  },
  DB: {
    prepare(sql) {
      const record = { sql, args: [] };
      statements.push(record);
      return {
        bind(...args) { record.args = args; return this; },
        async run() {
          return { meta: { changes: sql.startsWith('INSERT INTO state_backups') ? Number(record.args.at(-1) === storedRevision) : 1 } };
        },
      };
    },
  },
};
const context = { env, crypto: webcrypto, TextEncoder, TextDecoder, Buffer, console };
vm.runInNewContext(source, context, { filename: 'process-state.ts' });

(async () => {
  const { encodeValues, decodeValues, backupStoredState } = context.stateStorage;
  const values = { platformUsers: '[]', processEditor: JSON.stringify({ image: 'x'.repeat(2 * 1024 * 1024) }) };
  const stored = await encodeValues(values);
  assert.match(stored, /__processR2/);
  assert.deepEqual(JSON.parse(JSON.stringify(await decodeValues(stored))), values);
  assert.equal(objects.size, 1, 'the new snapshot is uploaded once');

  const id = await backupStoredState(7, 'before save', 'employee');
  assert.ok(id);
  assert.equal(objects.size, 1, 'backing up the existing D1 reference must not copy the full R2 snapshot');
  assert.match(statements[0].sql, /INSERT INTO state_backups.*SELECT.*FROM shared_state/);
  assert.equal(statements[0].args.at(-1), 7, 'backup uses the exact revision being edited');
  await assert.rejects(backupStoredState(6, 'stale save', 'employee'), /changed before backup/);
  storedRevision = 8;
  await assert.rejects(backupStoredState(7, 'racing save', 'employee'), /changed before backup/);
  console.log('PASS: snapshot round trip, stored-reference backup, and stale-revision protection');
})().catch(error => { console.error(error); process.exitCode = 1; });
