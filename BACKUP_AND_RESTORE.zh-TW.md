> 狀態：Current，正式維護來源。其他語言為閱讀版本；修改共同規則時同步翻譯，測試數量是fixture基線。

[Tiếng Việt](BACKUP_AND_RESTORE.md) | [繁體中文](BACKUP_AND_RESTORE.zh-TW.md) | [English](BACKUP_AND_RESTORE.en.md)

# BACKUP_AND_RESTORE

還原在替換前拒絕把已啟用的登出撤銷功能關閉，以及恢復缺少已啟用功能資料表的備份；實體備份缺回報表且現況非空也拒絕。既有adoption附加照片、canonical、schema與設定檔同樣完整核對、還原，不能略過。

## Local 備份

預設 repository root 下被 Git 忽略的 .local-backups；PROCESS_BACKUP_PATH 可明確設定 Local 位置，拒絕網路路徑／URL。協作流程不修改或回復舊備份。

## 同步與回復

data:sync 寫入 revision 前驗證 D1／WAL／SHM、R2 metadata／blob 與 Session／基準設定的實體備份。驗證失敗回復並保留失敗副本；回復失敗必須停止。CLI 前停止 dev。

實體備份也保留 Local features.json。還原先在staging驗證檔案並聯集合併較新的登出撤銷紀錄，再啟用替換資料；同一token的expires_at／revoked_at取較大值，不能讓已登出session復活。一般ZIP還原也保留現有撤銷紀錄；若舊備份沒有回報表而目前已有回報歷史，拒絕還原。已有新業務寫入時，不可用舊整庫直接覆蓋，須先保全最新資料並按CAS做必要補償。詳見[本機整合與恢復界線](docs/local-integration/20261009-3020-to-3000.md)。

## 舊 ZIP 與權限

網站 ZIP 不收錄 `.env*`、`.dev.vars*`（含子目錄）與 PEM 私鑰；安全設定分開私下保存，不放公開程式包或 Git。完整資料延續還需私有 D1/R2、歷史／媒體及必要 Local Session／功能設定；網站 ZIP 與 Canonical 子集不能單獨代表完整還原。缺少金鑰、必要設定或媒體時，不宣稱還原完成。

Windows 主機 ZIP 使用 AES-256-GCM、SHA-256 manifest，金鑰另行保存，不放 ZIP。離線保管金鑰，遺失則無法解密。舊 restore／delete 要求 ADMIN 驗證與確認；無密碼 demo 不取代此驗證。本次未執行可選 Windows 服務安裝。
