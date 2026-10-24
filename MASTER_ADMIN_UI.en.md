> Status: Current reading edition. Canonical maintenance source: [MASTER_ADMIN_UI.zh-TW.md](MASTER_ADMIN_UI.zh-TW.md). Shared invariants are maintained there; this translation does not define additional policy.

[Tiếng Việt](MASTER_ADMIN_UI.md) | [繁體中文](MASTER_ADMIN_UI.zh-TW.md) | [English](MASTER_ADMIN_UI.en.md)

# MASTER_ADMIN_UI

## Catalog and approval

AB/C retain draft/submit/approve. Category groups can be empty and renames/deletions affect only that line. Historical/approved/pending snapshots are readonly; only approval applies the active catalog. Cancel/Escape never commit edits.

## Lines and SAMPLE

A separate tab manages lines/stages. Forms prevent duplicate IDs/cross-line choices and changing line clears the old route. Submit needs nonempty ID/name and at least one stage without inventing BOM-allocation requirements. SAMPLE is in-memory only and never writes real records.

## Excel exchange

bom-excel.js exports selected/all BOMs or a template; semi-finished subtrees have their own L0. Import validates roots/levels before confirmation and replaces only included complete roots. Cancel/malformed Excel leaves data unchanged; quantities/units/waste are preserved without invented conversion.

## Checks

Run test-master-admin.cjs, test-bom-excel.cjs and test-bom-search.cjs with Node and public/process; fixtures cover 6,214 BOM rows and XLSX roundtrip without Production.
