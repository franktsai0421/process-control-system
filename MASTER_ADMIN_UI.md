# Master catalog UI and BOM Excel exchange

## Master data

- `master-admin-ui.js` extends the existing master-data workflow through the installation hook in `master-data.js`; existing approval and shared persistence are retained.
- AB categories are grouped by their actual line; C uses the same UI. Independent `categoryGroups` allow empty categories without manufacturing placeholder products. Category rename/delete only affects that line's category.
- Native dialogs commit only on form submit. Cancel and Escape discard the local edit. Product forms constrain category, unit, line and ordered route choices; changing line clears the previous route.
- Line/stage dialogs support addition and editing. Renaming references updates the draft's product routes. Deletion still requires confirmation and leaves review warnings.
- Version selection reads the selected snapshot; historical/approved/pending snapshots are read-only. Only approval applies the active catalog. Creating a new draft still follows the existing one-draft-or-pending-per-scope rule.
- Empty approved C product arrays are no longer interpreted as a missing catalog.

## Separate line management and review sample

- Line/stage management is its own tab immediately after BOM, with an AB/C scope selector. It retains the same catalog draft/version workflow.
- New product is in the product-table heading, not the import/export toolbar or category panel.
- Submission checks only empty/whitespace product identifiers and names, plus at least one nonempty stage. A full route, BOM allocation or additional fields are not required by this master-data validation. Duplicate IDs and cross-line selections are prevented in the edit forms.
- Existing validation messages recompute when a modal edit is saved. Error entries include the product and a direct edit action.
- Master review appears at the top of the approval page and shows additions, deletions and before/after values. Successful submission selects that exact review item; pending versions have a direct review link.
- SAMPLE is an explicitly labeled in-memory demonstration with a changed product and a single-stage route. Its approval/withdraw controls never write shared state or modify the live catalog. Actual submissions use the real snapshot and existing persisted approval lifecycle.

## BOM Excel exchange

- `bom-excel.js` exports the current selected BOM, all source BOMs, or an Excel template. The selected semi-finished subtree exports as its own L0 root with relative descendants.
- Import accepts the exported BOM sheet, validates the root SKU and levels before showing a confirmation, then replaces only the included complete root BOMs. Cancel and malformed workbooks leave data unchanged.
- Blank source item names are retained as 待補; quantities, comma decimals, units, waste and source type are not converted. Source filename is retained after import.
- `bomOverrides` is included in the existing shared-state synchronization keys; imported BOMs overlay source data on reload. There is no new schema or data migration.
- The existing shared-state conflict/reload behavior is unchanged. No production records were changed during implementation tests.

## Non-browser checks

From this directory:

```
node scripts/test-master-admin.cjs public/process
node scripts/test-bom-excel.cjs public/process
node scripts/test-bom-search.cjs public/process
```

These use isolated fixtures / local source data. They cover category scoping, cancel without writes, independent empty categories, version selection, route constraints, bilingual rendering, real XLSX roundtrip, invalid hierarchy rejection and all 6,214 source BOM rows.
