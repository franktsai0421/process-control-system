# 3000 資料包與照片規格分階段整理

日期：2026-10-24（Asia/Bangkok）。狀態：使用者最新決定保留8.15GB備份、之後不作主要工作來源；以精簡包為基準。主要精簡包已由322,214,696降至319,619,087 bytes並實際還原驗證，共用新照片上傳已接入本checkout。原3000資料庫及原照片不改；完整模組GUI／正式發布尚未接受。私有包含原登入設定，不作員工分發。

使用者要求分階段整理目前 3000 資料包及網站照片規格。以開啟的 checkout、既有未提交修改及當下 3000 資料為基準；不從舊包重灌、不混入 3040／3050 或其他 QA 副本。既有上傳／驗收任務及 checkpoint 依 [HANDOFF](../../HANDOFF.md) 繼續各別列管，本計畫不替代其結論。

## 目標與交付物

| 階段 | 目標 | 交付物／完成條件 | 本輪狀態 |
| --- | --- | --- | --- |
| 1 現況基準 | 確認目前資料與程式來源，列保留及排除候選 | 容量、revision、引用關係、照片入口與來源 SHA 清單；區分已驗及未驗 | 完成盤點；[基準證據](evidence/20261024-3000-data-photo/baseline.json) |
| 2 私有資料包 | 原件保留，另製精簡候選及可復原封存 | 完整原始封存、精簡資料候選、逐物件 SHA／metadata／資料表核對；在獨立目標實際還原，保留正常內容、草稿、pending、歷史、照片與權限 | PASS：原始階段2完整備份約8.15GB、精簡payload約322MB；本輪V2約319.62MB；[實際結果](evidence/20261024-3000-data-photo/phase2-result.json) |
| 3 統一照片處理 | 新上傳照片使用共用處理規則 | 依 [PHOTO_UPLOAD](../specs/current/PHOTO_UPLOAD.md) 先抽樣比較清晰度與容量，再實作、核對全部入口 | 使用者確認三模式；共用前端、全手動選檔及回報貼圖已接入，限定隔離驗證通過，未正式發布 |
| 4 整體驗證與交付 | 可使用、可還原、版本可辨識 | 資料候選冷還原與正常登入；照片新增→套用→儲存→重開→送審／核准→查閱；中越文、桌面及 iPhone viewport；程式包／資料包各有來源版本、manifest 與 SHA | 共用UI／API及資料包V2限定驗證完成；全模組GUI、跨電腦與正式發布未驗 |

GitHub 提交、Frank 合併與正式網站發布是後續獨立工作，遵守 [員工協作](../../EMPLOYEE_WORKFLOW.zh-TW.md) 及 [部署程序](../../DEPLOYMENT.md)。本輪不 stage／commit／push／更新 PR／merge／部署，也不排程背景工作。

## 容量基準與候選

本對話 2026-10-24 的來源 metadata 穩定副本核對，current revision 495。此數字是該次盤點時點，不是未來製包可直接沿用的 live pin。資料庫以副本查詢；來源 WAL bytes 在運作期間改變，最後再作穩定副本核對，四個業務／備份相關資料表的邏輯內容相同。沒有在原庫執行清理或還原。

| 類別 | 數量 | Bytes | 處理方向 |
| --- | ---: | ---: | --- |
| 完整本機 storage | 1,741 檔 | 8,137,524,625 | 保留原件；不是已完成的復原封存 |
| 舊 `snapshots/` | 333 物件 | 4,891,477,374 | current、庫內 100 份備份及全部 record 物件未引用；僅為精簡候選排除項，外部封存依賴未驗 |
| `delivery/v1/` 傳送快取 | 238 物件 | 2,928,806,313 | 由現有 mediaState 重建；可評估不收入候選，需驗首次讀取／重建與舊頁相容 |
| 其他 R2 物件 | 1,155 物件 | 310,286,234 | 先全部保留，包含 record 歷史／legacySources、照片及附件；不因未顯示就刪除 |
| 推算候選 physical storage | 未實際製作 | 317,240,938 | 約 317 MB、減少約 96.1%；含原 D1／cache 等，不等於 ZIP 大小或還原後容量 |

317 MB 是規劃參考，不是硬性容量上限；不得為達標刪除有效資料。候選啟動後可重建快取，容量會增加。照片規格只減少未來新增容量，不能取代舊快照／快取整理。

## 三種內容分開保存

- **原始復原封存**：保留原 D1／WAL／SHM、完整 R2 與必要設定；依 [備份規則](../../BACKUP_AND_RESTORE.zh-TW.md) 取得一致性及真實還原證據。含私密設定的復原封存只留私有位置，不入 Git 或員工資料包。現有 metadata 盤點副本不是完整復原封存。
- **精簡使用資料候選**：另建新目錄，只從被 pin 的一致性來源複製；保留有效資料、全部庫內備份與其依賴、各模組歷史、照片、feedback、身分及角色關聯。舊測試名稱／草稿／案件不在本次自行刪除。排除快取或舊快照需列精確清單、理由、來源及回復位置，不修改原 storage。
- **程式包**：來源、lockfile、必要靜態資產、文件與工具；排除私有 DB／R2、診斷、登入資料及封存。正式帳密、session、token、key 不進 Git 或分發包。

完整私有資料包仍可能包含業務身分與歷史，並非匿名。若作員工開發用途，依 [私有開發包](PRIVATE_DEVELOPMENT_PACKAGE.md) 使用另一份排除原憑證的資料包；不得直接把原始復原封存當作員工資料包。既有工具的格式／物件覆蓋及來源 binding 必須相容，不以手改 manifest 將新候選標成 READY。

## 第 2 階段的執行順序

1. 重新核對 active 3000 的來源、最新 revision、未保存輸入及既有資料包指標；安排一致性捕捉時窗。若需要停止服務，正常關閉自有服務並保全輸入，不強制終止其他工作。
2. 留存完整私有復原封存，核對 D1 完整性及 R2 bytes／metadata／SHA；外部舊封存依賴分開核查，原封存及失敗原件不動。
3. 另製精簡候選，先排除可重建 `delivery/v1/`，再依完整引用及回復證據決定舊快照是否不收入候選。保留 `delivery/media/`，它不是 JSON 傳送快取。
4. 在獨立新目標依既有受驗工具還原，核對 current、100 份備份及其所有依賴、媒體可讀、歷史、draft／pending、角色與相容欄位；未知結果維持未驗。
5. 輸出候選版本、來源時點／revision、大小、排除清單、SHA、還原與功能證據。沒有完整成功收據前，不以 317 MB 宣稱可交付，也不刪原庫。

## 第 2 階段實際結果

使用者本對話直接授權完整備份、另製精簡資料包及獨立還原，明確保留原資料。沿既有 `createLocalBackup`／`restoreLocalBackup` 實體流程執行，未使用有容量上限的加密 ZIP，也未放寬其上限。實際包不是先前推算的 317 MB。

| 項目 | 結果 |
| --- | --- |
| 完整私有備份 | 1,745 檔、8,145,514,191 bytes；逐檔驗 SHA，保留原 D1／WAL／SHM、R2、session／features／canonical-base／local binding 設定 |
| 完整備份實際還原 | 新獨立目標；4 個資料表精確比對、1,726 個 R2 物件共 8,130,569,921 bytes，經公開 SDK 全部讀回比對 body SHA 及 HTTP／custom metadata，dispose 完成 |
| 精簡範圍 | 只在該獨立副本以公開 R2 API 移除 333 個無引用舊 snapshots 及 238 個 delivery/v1 JSON 快取；原庫及完整備份仍保留它們，delivery/media 不移除 |
| 精簡私有復原包 | 1,174 個 manifest payload 檔、322,214,696 bytes，較完整備份減少 96.04%；另有少量 README／provenance，不是 ZIP 壓縮大小 |
| 精簡包實際還原 | 另一個全新目標，4 表與 current revision495 精確保留；100 份庫內備份、身分／角色／草稿／pending／feedback／撤銷紀錄不改；1,155 個 R2 物件共310,286,234 bytes 全部經 SDK 讀回驗 SHA／metadata，current decoded values 與完整還原一致 |
| 實際 HTTP | 15 項 PASS：入口／實際 app.js SHA、匿名拒絕、既有 DEMO ADMIN 簽章登入、生效版、dispatchBoard 精確值、authoring 工作／儲存／pending／歷史唯讀入口、各照片 namespace 抽樣 byte hash；傳送快取正常重建1物件 |
| 保全及收尾 | 原庫4表及R2物件集合未變、1,309個來源檔未改；HTTP後還原目標4表亦未變。測試站6072經正常 Vite close、exec exit0及OS缺席核對；3000恢復HTTP200，3040／3050不動 |

完整備份、精簡包、配對來源及直接收據的本機絕對路徑，只存忽略的 `Temp/phase2-3000-20261024/delivery.private.json`，不將私有資料或登入設定收入 Git。安全彙總、manifest SHA 與未驗範圍見[階段2結果](evidence/20261024-3000-data-photo/phase2-result.json)。包內 README 標示 `privateLocalRecoveryOnly`／`containsOriginalCredentials`／`employeeDistributionReady=false`；它不是之前排除原憑證的員工開發包格式，不改舊 manifest 假裝相容。

預覽初次使用共享開發快取遇到 ENOENT；改用不含 node_modules/.vite 的位置又遭 CommonJS 重複 default export。另一次 Windows junction mkdir 失敗也保留直接診斷。最後使用實體 dependency 目錄下具獨立名稱的 `.vite` 前綴快取成功；原 generated cache 保留後重新產生，沒有改產品程式或資料。這些是開發預覽啟站問題，不改標資料還原失敗或抹去早期啟站失敗。

## 具名完整備份刪除與階段3試驗

使用者隨後直接要求「可以的話刪除8.15G」，按上一輪明確列出的完整私有備份處理，不擴張為刪原3000或其他備份。重新以metadata穩定副本核對原庫4表，並實際對原庫全1,726個R2物件驗body SHA（共8,130,569,921 bytes）及metadata、必要私有設定；精簡包1,174個payload檔逐SHA及manifest pin均完好。備份manifest及歷史還原證據另留於私人試驗目錄。這些證明該指定備份可作重複副本處理，不表示原庫舊快照也可刪。

實際 `Remove-Item -LiteralPath` 命令含精確目錄、父層、manifest pin及reparse-point檢查，但在執行前遭自動批准審查回覆 `blocked by policy`，未提供更詳細原因。**刪除未執行，備份仍存在；沒有改用其他工具、命令或方式重試。** 若使用者手動處理，後續先唯讀核對結果並更新此狀態，不把本輪寫成已釋放8.15GB。

照片試驗只讀精簡包照片副本，盤點765張靜態圖片，選13份實際入口樣本（11張不重複）及4張合成圖，用可見內建瀏覽器Canvas實際產生68個輸出。來源13份照片SHA及1,309份產品來源檔未變；試驗結果與統一規則只見[照片規格](../specs/current/PHOTO_UPLOAD.md)，安全彙總見[階段3結果](evidence/20261024-3000-data-photo/phase3-result.json)。本輪沒有壓縮舊照片、寫業務資料、改schema或接入全站上傳。刪除阻擋與私有報告位置記在忽略的 `Temp/phase3-photos-20261024/delivery.private.json`。

## 驗證範圍與後續限制

- PASS：引用／容量盤點證據存在，照片入口實作已定向閱讀；本輪涉及產品來源另存 SHA pin。
- PASS：原始盤點副本的 reachable record／snapshot 雜湊核對無錯誤；最後 metadata 副本四表邏輯內容一致。此為既有同對話證據沿用，不冒稱本輪重新執行整庫還原。
- 第1階段只有文件／彙總證據；第2階段新增私有完整備份、精簡復原包、配對來源與隔離驗證目標。產品程式、schema、migration、原業務資料及 3040／3050 不改，沒有新增帳號、改密碼或對外發布。
- 未執行：具名完整備份刪除（自動批准審查阻擋）、外部舊封存依賴核查、員工正式密碼登入、新電腦依賴冷安裝、全站共用照片上傳實作、完整GUI／實機／跨電腦／全部工作流寫入驗收。原庫及完整備份保留，因此未以外部依賴未驗為由刪除其物件。既有 lint／安全／IQC UNKNOWN／AB HOLD 依原任務保留，不因本計畫解除。

下一個具體目標：依已完成副本試驗的規格建議，確認保真例外後再做共用上傳處理與全入口整合驗收；原照片仍不動。具名備份刪除須由使用者手動處理或等待可用執行政策，不繞過拒絕。員工分發或雲端資料包另按其憑證排除及部署契約準備，不直接分發本私有復原包。

## 最新決定：保留完整備份、精簡包V2與照片實作

前述刪除8.15GB的要求已由使用者明確撤回，改為保留但不使用為主要資料包；不再嘗試刪除。以原322MB精簡包建立副本，從全部4表（含100份備份）、local canonical-base設定及非record JSON追蹤immutable record引用，另找到82個無引用舊record，合計2,702,729 bytes。只在隔離副本用公開R2 API移除，保留所有照片／附件及可達record，經4表精確比對、1,073個保留物件body SHA／HTTP／custom metadata全量讀回及current decoded values核對。

V2 payload為319,619,087 bytes，相較322,214,696實際少2,595,609 bytes（約0.81%，metadata變化使其不等於原body移除量）。在另一全新目標實際還原成功後，更新同一主要私有精簡包目錄並逐檔驗SHA，移除82個已證明無引用片段；具名8.15GB備份及日常原庫不動。清掉這次6個重複候選／還原工作副本，留下必要收據與小型測試輸出。約7.99MB canonical-base是協作基準，不因內容看似重複就刪除；其餘仍以必要照片與歷史為主。

日常3000經原受控終端Ctrl+C短暫停止，確認listener及原worker消失後通過還原工具的服務停止閘門，再以原指令啟動；沒有把V2覆蓋到日常storage。最後穩定metadata副本核對4表、rev495、100份備份不變，原庫保留的1,155個物件body SHA亦一致；新helper／CSS／入口HTTP200。資料包變小不等於原3000 storage已縮小。

照片實作、來源匯入例外、具體PASS／FAIL與未驗範圍只由[PHOTO_UPLOAD](../specs/current/PHOTO_UPLOAD.md)維護。安全彙總見[implementation-result](evidence/20261024-3000-data-photo/implementation-result.json)。私有實體路徑／manifest及直接收據在忽略的Temp/phase3-photos-20261024/delivery.private.json；不增加帳號、schema／migration，未Git提交、PR、合併或部署。

## 第4階段實際結果

照片主要入口已用合成資料在實際SPA／TS API完成上傳、套用、Save重開與送審核准，含製程派工／狀態／播放及例行報告、處置保真附件；回報選檔／Ctrl+V採其原有送出及完成流程。原權限fixture與deprecated lint已修，另修IPQC-C逐動作權限及透明toast遮擋；精確入口與測試範圍只維護於[PHOTO_UPLOAD](../specs/current/PHOTO_UPLOAD.md)及[phase4-result](evidence/20261024-3000-data-photo/phase4-result.json)。

原生離頁補驗遭使用者停止Computer Use，未完成；完整lint仍FAIL1（既有Spinner），因此不是全部驗收／發布結案。原庫rev495、4表、100份備份、1,726物件metadata及1,155保留body SHA一致；8.15GB備份與319.62MB主要包保留，原照片不改。Codex with ChatGPT已依使用者明確要求撤銷token並停止bridge；不再使用。無資料模型／schema／migration、Git／PR／合併或遠端部署。
