const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const { webcrypto } = require('node:crypto');

let source = fs.readFileSync('lib/state-media.ts', 'utf8');
source = source.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
source = stripTypeScriptTypes(source);
source += '\nglobalThis.restore = restoreMediaUpdates; globalThis.digestMedia = digest;';

const objects = new Map();
let reads = 0;
const env = { STATE_ARCHIVE: {
  async get(key) {
    reads++;
    const data = objects.get(key);
    return data ? {
      arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
      httpMetadata: { contentType: 'image/png' },
    } : null;
  },
} };
const context = { env, crypto: webcrypto, TextEncoder, Uint8Array, btoa, console };
vm.runInNewContext(source, context, { filename: 'state-media.ts' });

(async () => {
  const original = `data:image/png;base64,${Buffer.alloc(1024 * 1024, 7).toString('base64')}`;
  const id = await context.digestMedia(original);
  const url = `/api/state-media?id=${id}`;
  const previous = { image: original, description: 'before' };
  const incoming = { image: url, description: 'after' };
  let restored = await context.restore({ editor: JSON.stringify(incoming) }, { editor: JSON.stringify(previous) });
  assert.equal(JSON.parse(restored.editor).image, original);
  assert.equal(JSON.parse(restored.editor).description, 'after');
  assert.equal(reads, 0, 'unchanged image must reuse decoded snapshot');

  objects.set(`delivery/media/${id}`, Buffer.alloc(1024 * 1024, 7));
  restored = await context.restore({ editor: JSON.stringify({ image: url }) }, {});
  assert.equal(JSON.parse(restored.editor).image, original);
  assert.equal(reads, 1, 'new image must still be fetched and verified');
  objects.set(`delivery/media/${id}`, Buffer.from('corrupt'));
  await assert.rejects(context.restore({ editor: JSON.stringify({ image: url }) },
    { editor: JSON.stringify({ image: 'data:image/png;base64,eA==' }) }), /integrity/);
  console.log('PASS: unchanged media reused, new media verified');
})().catch(error => { console.error(error); process.exitCode = 1; });
