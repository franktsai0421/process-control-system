# 整站備份與還原

## 現有架構

- 前端：Vinext、React 19，主要介面位於 `public/process`。
- 後端：Vinext API／Cloudflare Worker 相容路由；本機由 Vite 與 Miniflare 執行。
- 資料庫：Cloudflare D1（SQLite）；本機資料位於 `.wrangler/state/v3/d1`。
- 檔案：超過 512 KiB 的共用狀態存入 R2 內容定址快照，D1 保留指標與摘要；Local R2 metadata／blob 位於 `.wrangler/state/v3/r2`。既有 inline 快照仍可讀取。
- 權限：只有 `admin` 角色可使用備份 API；舊還原及刪除流程仍要求 ADMIN 密碼與確認文字。無密碼 demo 登入不替代這項舊帳密驗證，不提供預設密碼。
- 範圍：本次只驗證隔離 Local；正式 Sites 狀態未查詢、未部署。完整主機 ZIP 功能是 Windows 本機管理流程。

## Canonical 同步的 Local 實體回復

`npm run data:sync` 在停用 Local 寫入後，先驗證 D1、WAL／SHM、R2 metadata／blob 與 Local 簽章／基準設定的逐檔備份。備份位於忽略的 `.wrangler/local-only/backups/`，驗證失敗時回復實體備份並保留失敗儲存供診斷。這不是舊 ZIP 管理介面的密碼回復流程。隔離失敗回滾及另一副本的完整回復已驗證；不可直接套用回原有 Frank Local。操作與範圍詳見 [AI_CONTEXT/LOCAL_DATA_COLLABORATION.md](AI_CONTEXT/LOCAL_DATA_COLLABORATION.md)。

## 備份位置與排程

- 預設：`.local-backups`。
- 可用環境變數 `PROCESS_BACKUP_PATH` 覆蓋，或在 ADMIN 後台設定其他路徑。
- 每週六越南時間 12:00 自動備份。網站服務啟動時會檢查本週是否錯過，錯過且尚未成功時立即補做一次。
- 排程狀態與不可修改的操作記錄位於備份資料夾的 `.system` 子資料夾。
- 同週自動備份使用持久化週次記錄與跨程序鎖，不會重複；手動備份不會改變本週自動備份狀態。
- 預設保留 30 天，且至少保留最近一份成功備份。

## ZIP 內容與安全

每份 `backup_YYYY-MM-DD_HHmmss.zip` 包含可讀的 `manifest.json` 與 AES-256-GCM 加密的 `payload.enc`。加密內容包含完整網站程式、D1／SQLite 一致性快照、網站資產、上傳內容、備份設定與版本資訊。`.env`、私鑰、快取、日誌、建置輸出、`node_modules`、`.git`、虛擬環境及可重新安裝套件不會納入。

主機金鑰位於 `.local-backups\.system\backup.key`，不會放進 ZIP。請由系統管理員另外離線保管一份；遺失金鑰將無法解密備份。

## 管理員操作

1. 以 ADMIN 進入「資料後台」。
2. 選擇「備份與還原」。
3. 可重新掃描、立即備份、下載、完整檢查、還原或刪除。
4. 還原與刪除會二次確認，要求重新輸入 ADMIN 密碼及確認文字。
5. 還原前系統會先建立安全備份；失敗則自動回滾，維護模式期間所有資料寫入會被拒絕。

## Windows 開機自動執行

以具有專案讀取、D1 資料寫入及備份資料夾讀寫權限，但不是系統管理員的服務帳號執行網站。第一次安裝工作排程時，以系統管理員 PowerShell 執行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-windows-backup-task.ps1
```

工作排程會在 Windows 啟動時執行網站服務；服務正常後才啟動備份排程與錯過補做檢查。如果目前帳號沒有建立系統工作的權限，安裝程式會改在 Windows 使用者的「啟動」資料夾建立隱藏啟動捷徑，登入後自動執行相同服務。

## 完整還原

介面還原會先檢查 ZIP 格式、`manifest.json`、必要內容、SHA-256、系統與 SQLite 版本、解壓容量及所有路徑；全部通過前不會變更正式資料。成功後重新整理網站，使新程式與資料生效。

## 緊急命令列還原

網站介面無法啟動時，在專案目錄執行：

```powershell
$env:PROCESS_ADMIN_PASSWORD = '目前 ADMIN 密碼'
node .\scripts\backup-cli.mjs inspect backup_YYYY-MM-DD_HHmmss.zip
node .\scripts\backup-cli.mjs restore backup_YYYY-MM-DD_HHmmss.zip
Remove-Item Env:PROCESS_ADMIN_PASSWORD
```

緊急還原同樣會建立還原前安全備份、啟用維護模式、驗證、交易式更新 D1，失敗時回滾並留下操作紀錄。
