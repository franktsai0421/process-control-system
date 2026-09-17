# BOM search

The backend BOM tab now searches by SKU, product name, production line and category. The catalog combines current approved master products (AB/C) with BOM roots and component identifiers. Unknown line/category metadata remains marked 待補; no line is inferred from a parent product.

## Tree rules

- Source `data/imported-data.js` is a preorder list with numeric levels 0–4.
- For an SKU occurrence at level n, take only consecutive following rows with level > n. Stop at the first peer or ancestor. Show relative levels starting at 1; the selected SKU is the separate L0 heading.
- A standalone BOM is authoritative when present. Otherwise find occurrences within finished-product BOMs.
- Different component structures, quantities, units or specifications remain separate selectable source branches. Identical branches share a source list. Never combine sibling branches or substitute the entire parent's BOM.
- Quantity and unit values retain source semantics. No per-unit conversion is invented.
- An SKU without children shows an explicit missing-data state. All branches initially expand; the user can collapse nodes or view only the next level.
- Search normalizes Vietnamese diacritics and ranks exact SKU matches first. UI labels support Chinese and Vietnamese without translating stored values.

## Verification

Run `node scripts/test-bom-search.cjs public/process` from this site directory. Tests cover ABC/category filtering, accent-insensitive search, subtree boundaries, separate variants, missing/leaf records, real source data, and non-browser UI rendering/search callbacks. No shared records are written by these tests.

## Future handoffs

The user requests a webpage link after every update so they can inspect it. Always distinguish a local preview from the published site and never label the old public website as the newly updated version. Follow the Sites approval policy before a public deployment.
