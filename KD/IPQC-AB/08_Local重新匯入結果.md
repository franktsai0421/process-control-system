> 狀態：Historical source audit / verification evidence。保留來源、疑點、備份及還原資訊；數量、revision、分支與PASS只屬原日期，不是目前DB或本次驗證。後續操作須重新核對並有適用授權。現行進度：[HANDOFF](../../HANDOFF.md)。

# IPQC-AB 新版 Local 草稿重新匯入結果

完成於 2026-09-30，服務 `http://127.0.0.1:3000/process/?system=quality&view=data&dataTab=quality-ipqc-ab`。
Repo `<WORKSPACE>/中控系統`、branch `codex/ipqc-ab-local`、HEAD `1312189a9d5f3e3f2a25333c0024e6b10d644ce6` 均保留；既有未提交工作未切換／重設。唯一來源、SHA 和完整核對結果見 README／03。

## 寫入結果

- Local shared revision 287 → 288，僅 `ipqcABMasterControl` 改動；所有其他共用資料键雜湊一致。
- 交付前觀察最新 Local 修訂 290：`A:BOVESINH` 在匯入後有兩次草稿儲存（06:45 UTC），已保留，沒有再執行匯入寫入。本報告／CSV 描述本次 287 → 288 匯入結果，不覆蓋後續人工編輯。最後讀取仍為 24 群組／335 草稿項、生效版本 0，其他資料键雜湊仍一致。
- 新增 270 檢查項、更新 61 既有來源項、標記刪除 0、保留 4 人工新增項；新增 122 錯誤碼，合計 158 錯誤码／335 項（331 來源項＋4 人工項）／24 群組草稿。
- 有效來源關聯 1,065（7,343 展開列）；排除 2,606 展開列、55 無有效關聯來源變體。4 組基本資料衝突／11 變體暫緩，未建立空項；其餘可接受資料無身分歧義暫緩。
- 40 組同來源編號不同標準拆獨立項；25 個既有項的新版來源編號不同，原 ID／實際編碼不變，只更新來源對應。沒有因來源排序重新編號。
- `A-BORUAXE1021-CUT-L1-01` 的兩張既存照片與人工頻率保留；人工新增 `...CUT-L1-10` 至 `-13` 保留。人工設定衝突 1 項（rules），完整差異見 `新版_合併差異.csv`。
- 所有 270 新項 `inspectionMode=visual`、`equipmentId=''`。不自動綁檢具、不臆造敘述／工具；來源 J 仍空，正式送審照原規則阻擋。
- 所有原／新增群組 activeVersionId 仍為空，未送審／核准。無物理刪照片、歷史、引用或主資料修改，無 migration、commit、push、merge、部署及遠端寫入。

四份 CSV 已由最新 Excel 重新產生，保留来源列號、內容 key、來源及實際拆分編碼。逐筆原因：`01_最新資料/新版_逐筆排除與暫緩.csv`；標準拆分與共用欄位衝突值：`新版_拆分與衝突.json`；無關聯項：`新版_無有效關聯項目.csv`。完整私有稽核及合併結果在下述備份的上層 `audit.json`／`result.json`，不含登入 Cookie。

## 備份及還原

寫入前全量備份（958 檔，含 D1、完整 R2 照片／快照及草稿關聯）：

`<WORKSPACE>/中控系統\.wrangler\local-only\ipqc-ab-reimport\2026-09-30T05-42-43-307Z\backup`

`manifest.json` 包含每檔 SHA／大小、服務來源、branch／HEAD、revision 287。另保存 `ipqc-ab-state.json`、`catalog.json`、各資料键雜湊、精確匯入請求及舊 CSV。實際 Local 綁定 `.wrangler/local-only/wrangler.json` 的 DB／STATE_ARCHIVE 都是 remote:false，persist `.wrangler/state/v3`；未寫遠端。

離線還原方式（本次未執行到業務環境）：

1. 停止 port 3000 Local 服務，確認沒有其他程序使用同一 persist。先另備份現況，保護匯入後的人工工作；全量還原會回到 revision 287，不應在後續編輯後直接還原。
2. 僅將 `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/faaf2b0445ab934c3aac48ddf0cdfade8f9bac050be98993748742cdd2cb05fb.sqlite` 及其 `-wal`／`-shm` 安全移到另一個已確認位於此專案內的還原前備份目錄，將備份中相同路徑 SQLite 複製回去。只操作此明確 DB，不刪專案／目錄根。
3. 將現有 `.wrangler/state/v3/r2` 安全移入還原前備份目錄，把備份 `state/v3/r2` 完整複製回同一路徑（含 metadata 與 blobs），不能只還原 D1 的 R2 引用。原資料仍可從還原前備份復原。
4. 驗證 manifest 各檔 SHA、各 SQLite integrity_check，重啟 Local 並核對 revision／草稿／照片。這些步驟已在自動建立並清理的隔離副本完成，未回寫業務資料。

## 可重複執行的命令

以 repo 根目錄執行。Python 使用具 openpyxl 的既有環境；`<備份>` 必須是新取的、與当前 Local 修訂相同的完整實體備份目录，不是舊備份或正式 DB。

```powershell
node scripts/ipqc-ab-local-context.mjs --snapshot --url http://127.0.0.1:3000 --output <備份>
python scripts/audit-ipqc-ab.py --catalog <備份>/catalog.json --report <新版稽核.json>
node scripts/seed-ipqc-ab.mjs --dry-run --url http://127.0.0.1:3000 --audit <新版稽核.json> --legacy .wrangler/local-only/ipqc-ab-audit.json --report <預覽.json> --payload-out <備份>/reimport-payload.json
node scripts/test-ipqc-ab-reimport.cjs <備份>
node scripts/seed-ipqc-ab.mjs --apply --url http://127.0.0.1:3000 --audit <新版稽核.json> --legacy .wrangler/local-only/ipqc-ab-audit.json --backup <備份> --report <結果.json> --csv KD/IPQC-AB/01_最新資料
```

舊稽核檔只用作第一次轉換既有項目的已匯入 baseline，不是新版來源；已保存 sourceImport 後重跑可省略 `--legacy`。相同來源再次執行沒有資料變更／新增／修訂遞增。`--verify` 不寫 DB，可搭配原備份比對本次前後結果。

## 驗證

- PASS：新版 SHA、完整合併區域／多行解析、所有排除原因、同號不同標準與同標準基本欄位衝突。
- PASS：還原實體 D1／備份 R2 的隔離 API 匯入兩次與逆序來源，無重複／編號改變／錯接資產；所有備份檔 SHA、SQLite 完整性與原照片內容 SHA。
- PASS：真實 Local 讀回、草稿重開、1,065 關聯映射、兩張照片與人工頻率保留、新項目視、原／新增生效版本不變、所有其他共用資料键雜湊不變。
- PASS：`test-ipqc-ab-reimport.cjs`（身分歧義暫緩、人工內容、軟刪、安全重跑、auth/CAS、待審鎖定、正式待補阻擋／測試單不生效）、既有 `test-ipqc-ab-numbering.cjs`。
- PASS：`test-ipqc-ab-browser.cjs` 桌面 1440／手機 390，重開／中越／矩陣顯示、FQC／IQC 切換、無外溢；`test-ipqc-ab-photo-mocked.cjs` 桌面 1366／手機 390 的圖片／設備小圖、相簿、矩陣／新增代碼請求（POST 完全 mock，不改業務資料）。
- PASS：IQC、IPQC-C、Routine Equipment 既有記憶體 API fixture 回歸，FQC／IQC 真實頁面可載入。
- PASS：`test-quality-comments-readonly.cjs` 桌面 1366／手機 390，兩張原照片正常解碼、設備篩選、彈窗／關聯、品質分組審核；`test-fqc-custom-isolated.cjs` 手機 FQC 自訂頻率存取／重開（寫入皆 mock）。設備目錄 121 筆、可選 0 筆是既有可用規則結果，本次未擅改確認／校驗狀態。
- PASS：TypeScript `tsc --noEmit`、本次修改檔案的 oxlint。
- 不執行：指向舊 port 3002 且會新增／送審／核准的既有 AB live fixture，不能套用到目前 port 3000；對應流程以隔離還原 API 與 mock browser 驗證。

畫面：`.wrangler/local-only/ipqc-ab-1440.png`、`ipqc-ab-390.png`；詳細 editor／equipment／quality-review 截圖在 `.wrangler/local-only/quality-comments/`。

資料模型影響：既有 JSON 新增 optional sourceImport 來源／baseline 欄位，向後相容；沒有 SQL schema／migration／綁定改動。剩餘業務事項為 1 個群組未對應、49 缺失品號、4 組共用欄位衝突，以及來源 J 敘述待人工補填；不得為通過審核捏造內容。

## 本次修改檔案

- `app/api/ipqc-ab/route.ts`、`lib/ipqc-ab.ts`、`lib/ipqc-ab-import.ts`：Local reimport、來源 baseline、身分與草稿增量合併；沿用 DB／R2、權限與 CAS。
- `scripts/audit-ipqc-ab.py`／`ipqc_ab_latest_audit.py`、`seed-ipqc-ab.mjs`／`ipqc-ab-reimport.mjs`：固定新版解析、預覽、備份門檻、API 匯入／讀回／CSV。
- `scripts/ipqc-ab-local-context.mjs`、`ipqc-ab-import-harness.cjs`、`test-ipqc-ab-reimport.cjs`、`export-ipqc-ab-evidence.mjs`：實體快照、還原副本 fixture、重跑與資產驗證、來源雜湊清單。
- `KD/IPQC-AB/01_最新資料/` 四份解析 CSV 及新增逐筆排除／無關聯／合併差異 CSV、拆分衝突／未匹配／匯入結果 JSON；來源 Excel 未改動。
- `KD/IPQC-AB/README_先讀.md`、02／03／05／06／07／08 及 `檔案清單_SHA256.json`；`AI_CONTEXT/AI_CONTEXT.md`、`AI_CONTEXT/DATA_MODEL.md`、`AI_CONTEXT/CHANGELOG.md` 更新實際狀態。其餘 UI 規格與歷史文件保留。

主要回歸風險：後續換來源、改主資料或修改草稿後，必須重新取備份／稽核，不能套用這次修訂 287 的寫入門檻；正式送審前仍需處理待補與未匹配資料。沒有另發現已驗證功能回歸。
