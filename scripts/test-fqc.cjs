const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const canonical = JSON.parse(fs.readFileSync(path.join(root, 'data/canonical/quality/fqc.json'), 'utf8'));
const errors = canonical.records.filter(record => record.type === 'error-code');
const items = canonical.records.filter(record => record.type === 'check-item');
assert.ok(items.every(record => record.data.source.sha256 === '5BC8CC4B55C4194DA08E18E4F9E75CE65D4FB50967B2A0BB2F861B5845FCF257'));
assert.equal(errors.length, 164);
assert.equal(items.length, 508);
assert.equal(new Set(items.map(record => record.data.checkNo)).size, 508);
for (const code of ['103SM00012', '104A10202', '108BR4005']) {
  const refs = items.flatMap(record => record.data.productRefs || []).filter(ref => ref.code === code);
  assert.ok(refs.length > 0, `${code} must be retained`);
  assert.ok(refs.every(ref => ref.kind === 'semi-finished'), `${code} must retain semi-finished identity`);
}
for (const category of ['BRX1021-CO3360', 'DAUTUOICAY-RUAXE', 'ONGHOI-CAOAP/BRX-CAOAP', 'PHAODIEN', 'PVC(2)']) assert.ok(items.some(record => record.data.category === category));
const source = fs.readFileSync(path.join(root, 'public/process/fqc-master.js'), 'utf8');
for (const signal of ['qualityMasterControl', 'await window.ProcessSync?.flush?.()', 'data-matrix-item', 'preselectCode', 'mediaItems', "status = 'pending'", "status = 'approved'"]) assert.match(source, new RegExp(signal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
const excel = fs.readFileSync(path.join(root, 'public/process/fqc-excel.js'), 'utf8');
assert.match(excel, /sheet\['!merges'\]/);
assert.match(excel, /PROCESS_OS_FQC_EXCEL/);
console.log('FQC canonical and workflow checks passed');
