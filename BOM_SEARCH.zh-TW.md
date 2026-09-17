[Tiếng Việt](BOM_SEARCH.md) | [繁體中文](BOM_SEARCH.zh-TW.md) | [English](BOM_SEARCH.en.md)

# BOM_SEARCH

## 搜尋

依 SKU、名稱、線別與類別搜尋，不推測缺失 metadata。越南文搜尋忽略聲調並優先精確 SKU；雙語標籤不翻譯儲存值。

## 樹與分支

來源為 0–4 層 preorder；只擷取連續後代直到同層／祖先，選取 SKU 為獨立 L0 並顯示相對層級。獨立 BOM 優先，否則尋找成品中的分支；結構／數量／單位不同者分開，不合併兄弟分支或自行換算數量。

## 測試

node scripts/test-bom-search.cjs public/process 使用 fixture，不寫入共享記錄。沒有後代時顯示缺少資料，不用整個父 BOM 代替。
