[Tiếng Việt](BACKUP_AND_RESTORE.md) | [繁體中文](BACKUP_AND_RESTORE.zh-TW.md) | [English](BACKUP_AND_RESTORE.en.md)

# BACKUP_AND_RESTORE

## Local 備份

預設 repository root 下被 Git 忽略的 .local-backups；PROCESS_BACKUP_PATH 可明確設定 Local 位置，拒絕網路路徑／URL。協作流程不修改或回復舊備份。

## 同步與回復

data:sync 寫入 revision 前驗證 D1／WAL／SHM、R2 metadata／blob 與 Session／基準設定的實體備份。驗證失敗回復並保留失敗副本；回復失敗必須停止。CLI 前停止 dev。

## 舊 ZIP 與權限

Windows 主機 ZIP 使用 AES-256-GCM、SHA-256 manifest，金鑰另行保存，不放 ZIP。離線保管金鑰，遺失則無法解密。舊 restore／delete 要求 ADMIN 驗證與確認；無密碼 demo 不取代此驗證。本次未執行可選 Windows 服務安裝。
