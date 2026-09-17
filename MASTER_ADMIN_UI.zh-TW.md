[Tiếng Việt](MASTER_ADMIN_UI.md) | [繁體中文](MASTER_ADMIN_UI.zh-TW.md) | [English](MASTER_ADMIN_UI.en.md)

# MASTER_ADMIN_UI

## 主資料與核准

AB／C 沿用 draft／submit／approve。類別群組可為空，改名／刪除只影響該線。歷史／approved／pending 快照唯讀，只有 approve 套用目前主資料；Cancel／Escape 不寫入。

## 線別與 SAMPLE

獨立 tab 管理線別／工段；表單防止重複 ID 與跨線選擇，換線清除舊 route。Submit 需要非空 ID／名稱與至少一個工段，不額外要求 BOM 分配。SAMPLE 僅為記憶體示範，不寫入真實資料。

## Excel 交換

bom-excel.js 可匯出選取 BOM、全部 BOM 或範本，半成品 subtree 有自己的 L0。Import 先驗證 root／層級再確認，只取代本次完整 root；Cancel／錯誤 Excel 不改資料。保留數量／單位／waste，不自行換算。

## 測試

以 Node 執行 test-master-admin.cjs、test-bom-excel.cjs 與 test-bom-search.cjs，參數為 public/process；fixture 驗證 6,214 筆 BOM 與 XLSX roundtrip，不使用 Production。
