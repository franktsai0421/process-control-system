> Deprecated (2026-10-10): Historical lookup/import behavior. See the [current BOM specification](docs/specs/current/BOM_REBUILD.md).

[Tiếng Việt](BOM_SEARCH.md) | [繁體中文](BOM_SEARCH.zh-TW.md) | [English](BOM_SEARCH.en.md)

# BOM_SEARCH

## Search

Search SKU, name, line and category without inferring missing metadata. Vietnamese search ignores accents and ranks exact SKU first; bilingual labels do not translate stored values.

## Tree and variants

Source preorder levels are 0–4. Select consecutive descendants until a peer/ancestor, showing relative levels under a separate SKU L0. Standalone BOM takes precedence, otherwise use occurrences inside finished products. Different structure/quantity/unit variants remain separate; never merge siblings or invent conversions.

## Checks

node scripts/test-bom-search.cjs public/process uses fixtures without writing shared records. Missing descendants show missing data rather than substituting an entire parent BOM.
