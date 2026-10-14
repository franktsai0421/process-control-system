# 私有完整開發資料包

此包與 canonical 協作資料分開。它包含指定快照的目前資料、全部歷史、草稿、送審／核准案件、角色與個人 overrides、feedback 與全部索引 R2 objects；不作為 Git 種子，也不傳送到雲端。

分發包只有經驗證的 `pack-v4/`、`static-assets/` 與分發 README。禁止分發 inspection-copy、acceptance-target、早期失敗包、診斷或來源帳密。production 密碼、hash、session、token、簽章 secret 已移除；原身份與權限保留。正式帳號不沿用 production 密碼。

在目前審查來源的全新 checkout 完成 `npm ci`，尚未啟動 dev、尚無 `.wrangler` 時執行：

```powershell
node scripts/dev-package-restore.mjs --package <私有包目錄> --manifest-sha256 <獨立核對的manifest SHA256>
```

工具先驗 manifest、資料庫、所有 objects 與已列來源相依檔；再原子取得全新本機 storage，使用 checkout migrations 建立實際 Miniflare D1／R2。所有 rows、objects 內容與 metadata 均回讀核對。個別 object 上限 64 MiB；超限在寫入前停止，不跳過。chunks 編碼仍不支援，須另行審查而不能冒稱可還原。

成功時只在忽略的 `.wrangler/local-only/private-development-login.json` 產生獨立普通開發帳號；它與 demo-admin、Frank 都分開。原身份、角色、其他 business values 及歷史不變；普通帳號使用 revision／values CAS 新增。新的 session secret 只在目標環境產生。請保護此登入檔，不提交或加入資料包。

已有 storage、Cloudflare 憑證／remote 環境、checksum 不符、未知 schema 欄位、相依檔不符均拒絕。失敗副本保留 `development-package-incomplete.json`；自動初始化與 session 啟動會拒絕它。請換新的 checkout 修復，不能移除 marker 強行啟動或覆盖既有資料。

`development-package-receipt.json` 的 Miniflare 還原 PASS 不等於 session middleware、GUI、跨電腦、實體手機或正式遷移通過；這些必須各自有證據。來源新鮮度僅適用包的明確快照與核对時間。[本次證據](20261014-github-upload.md)記錄具體版本、驗收及限制。
