## 2026-10-14 GitHub流程候選收尾中

最新候選改採遠端 main `51a3979c` 的獨立 Git database，原工作區及所有本機歷史保留。冷啟動相對匯入修正與真實隔離初始化 PASS；current source 與 51 個遠端歷史 commit preflight 零 findings。獨立 11 scope handler 尾段及 Tooling/BOM 協作 PASS，GUI network denied 保留 BLOCKED；25 lint 經引用分類仍 FAIL。完整去敏開發包及單一 PR/CI/Frank review 尚在收尾；以 [最新矩陣](docs/local-integration/20261014-evidence-matrix.json) 為準。

交接已解除，使用目前dirty工作樹與獨立來源保全；整合分支codex/github-upload-20261014已納入最新remote main。新播放器初選／legacy匯入等待安全修正及V3未知Save快照共20項定向PASS，tsc PASS；25項既有受影響lint及完整GUI／去憑證開發包缺口保留。唯一本階段進度見[GitHub整合紀錄](docs/local-integration/20261014-github-upload.md)。舊4a7bb／31756b包保留，不能冒稱含新修正；日常資料、3040／3050、C2C及正式環境未操作。

## 2026-10-14 3035剩餘未同步輸入恢復已完成

本次只續未同步輸入保全／重開／帳號隔離。新純合成3035 `process-recovery-20261014-rCjLkV`／PID21152先產生一次真後端commit後失ACK的已知輸入；正常登出確認、同tab真正reload、manager正常登入無原帳號入口，再以frank正常登入實際下載284 bytes原輸入，base5／baseline與desired精確保留。發現自動恢復登入後下載入口消失，已最小修正，修前FAIL及修後正常reload＋下載完全相同SHA保留；新5項定向PASS，中越文桌面1366／手機390單行44px與鍵盤焦點PASS。最後實體rev6／history4／POST[200,409]，全程僅1成功commit，沒有背景重送。

[同一工程進度](docs/local-integration/20261010-permissions-admin.md)、`Temp/recovery-complete-20261014.json`為準；最新程式包／build依`Temp/current-merged-delivery-20261014.json`，舊1453/923fd包保留，不能冒稱包含此次UI修正。原已關閉tab輸入未宣稱取回；本次走保全後登出／reload正常路徑，不宣稱直接dirty-page原生beforeunload已自動驗收。日常3000資料／登入／分頁、舊私有副本與其他服務未動，舊通過suite不重跑，無schema／Git／C2C／部署變更。

## 較早紀錄：2026-10-14 原驗收分頁關閉後重開3035

使用者關閉原3035分頁後，依「你自己再開吧」在官方IAB另開同一私有服務的專用可見tab；正常載入QA synthetic primary／ADMIN，B線0/3。新頁後實體仍rev6、row SHA `af5dca77…39785d`、POST仍[200,409]／唯一成功commit，至06:17:04Z無自動重播。原tab的session未同步輸入是否保留未證明，不把新tab或關閉當成同tab reload recovery PASS；先前reload無navigation／getJsDialog null的工具阻點保留。新頁已handoff，未再Send、切換帳號、改程式或重跑已PASS。

[唯一進度](docs/local-integration/20261010-permissions-admin.md)、`Temp/http-fault-browser-20261014.json`及`Temp/http-fault-state-after-reload-20261014.json`為準。完整隔離驗收仍未完成；1453/923fd程式包不改，這是封存後進度。Main3000、其他服務／資料、C2C、Git及部署未操作。

## 2026-10-14 未知結果補驗收尾檢查點

原22項功能與rev5 GUI沿用。未知ACK直接補驗後，發現「未知結果再改回舊baseline」會清dirty並誤報成功；已只加paused／blocked保留條件，新3項定向及必要identity4情境PASS，無新增lint。沒有真資料／服務／登入／分頁操作，也未重跑備份或舊功能。此記憶體補驗不等於V3 Save未知快照或實際網路故障驗收。

原30151 manifest／76e4ec ZIP與build保持原版本。最新候選、完整hash、build／ZIP及未驗界線以`Temp/current-merged-delivery-20261014.json`與[唯一工程進度](docs/local-integration/20261010-permissions-admin.md)文首為準；不得把歷史待驗／服務PID當成自動啟動或發布指示。日常3000、3040／3050、C2C與Git／部署均不操作。

## 2026-10-14 03:13封存檢查點

完整資料衍生副本純讀取已核rev495不變；BOM摘要降94.12%為傳輸量證據，非延遲承諾。新六合成3035完成metadata案件真核准及Send／正常重開player，最終rev5／B線101CTP007／核准V1。修正V3 terminal誤擋與發送未等儲存確認，新增7項定向PASS；pure projection／startup5項PASS。舊完整BOM閉環及最後放棄沿用、不重跑。原資料／日常登入不改，C2C／Git／部署不操作。

唯一工程進度、失敗保留、fixture與產品修正區分、未驗項及交付manifest／ZIP／build收據見[同一進度](docs/local-integration/20261010-permissions-admin.md)。最終候選以`Temp/current-merged-delivery-20261014.json`指標為準，不能用59b或e9b舊build冒稱最新來源通過。3035目前為新合成fixture，不是日常3000；診斷用未Save合成草稿與舊頁未同步輸入保留，不從交接自動送審／發布。

## 2026-10-13 FQC 文件色彩／草稿照片／不可復原捨棄

程式交付指標（封存後文件）：最新私有共享程式ZIP `59b603d1…16da`、1351來源／1352entries，owner與Dot另8項完整性PASS；3035候選741的八個關鍵來源相同。完整版本／FQC範圍／3050與私有資料排除／舊build及未跑界線以[单一交付指標](Temp/current-program-delivery-20261013.json)及[同一工程進度](docs/local-integration/20261010-permissions-admin.md)為準。這是封存後doc-only指標，不在ZIP內，不因文件連結重封裝或重跑舊測試。

3040 文件類型配色統一，草稿照片可移除並保存重開驗證，缺照片仍擋送審；移除已捨棄顯示及復原入口，後端亦拒絕。新增 10 筆未安排 DEMO 保留，專用照片驗收草稿 COR-0048 未送審；原文件 flow／案件／工作保全。六組定向檢查 PASS，桌面中越文及鍵盤焦點已核；390px 全域選單遮擋、3050 缺檔造成全庫型別失敗及既有 lint 問題如實保留。無 schema、3000、埠或部署變更。[同一验收與證據](docs/routine-fqc/20261013-colors-photos-discard.md)。

## 2026-10-13 已收到隔離3035合成登入直接授權並完成分項補驗

16:30續接：3035最後放棄已分項PASS，由使用者按Edge原生「確定」，代理事後核dialog關閉、重開STAFF說明仍空白／dirty=null，實體rev33/wf26/pending null前後相同。沒有權限提交或Main3000操作。Edge／Chrome句柄與原生URL政策限制保留為NA，不稱代理全自動native驗收；原生控制已歸還，`3040-3035`續接排程已PAUSED。[同一進度與收據](docs/local-integration/20261010-permissions-admin.md)文首已取代下方待驗狀態。凍結ZIP0f939／舊build仍只涵蓋06:02版本，不含07:41總覽文字或之後FQC共享來源；3050私有來源未整合，不回填旧包或重跑旧build／restore。

15:05（Asia/Bangkok）再續接：僅核當前3035 listener/PID33176、原私有root及rev33/wf26/pending null，六個合成帳號；沒有重算來源／資料雜湊或重跑備份／還原／build。Chrome821983196仍在inventory，尚未接管／點擊；FQC3040正做共用Chrome手機驗收，本任務先釋出UI控制。已校正同一工程進度表的待批准／越文下階／捲動舊狀態，當時失敗仍保留。待3040釋出後再讀原分頁actor與合成未儲存說明，只續最後放棄，不按權限確認、不動3000／3040／3050。`Temp/3035-current-continuation-state-20261013.json`是當前狀態讀取，不是新完整保全PASS。

ADMIN既有分項沿用；primary越文角色搜尋取消、STAFF正常登入／中越文本人卡與管理限制、越文BOM下階補驗通過。原生未儲存確認保留輸入通過，最後放棄仍受提示競爭限制，Chrome821983196角色對話框保留handoff，未儲存權限變更。3035原程序已停止，保留證據後以同一私有root恢復PID33176；只修總覽混語，candidate741d661d…44d1b，最終rev33/wf26／pending null／非目標鍵不變。所有詳細範圍、收據、來源ZIP／build版本界線及未跑項以[同一工程進度](docs/local-integration/20261010-permissions-admin.md)最新段為準。不動日常3000資料／登入，不重跑已通過BOM鏈，不啟動C2C／Git／發布。

## 2026-10-13 已續接：BOM 閉環及 Main 唯讀保全／隔離還原通過，權限瀏覽器補驗待處理

最新續接：Main保全Dot另9/9獨立PASS，兩私有副本保持凍結、不重做。role搜尋新案例先FAIL後最小修／真變更及Escape保護定向PASS，登入中越文／中文誤字修正已在新頁reload核對；3035候選`dde9da43…0181f`、原PID3584、rev33/wf26／pending null／非目標資料未變，旧3bd／10dc分開保全。新1338檔程式ZIP `0f939216…4b14` owner及Dot7/7獨立PASS；乾淨来源＋既有依賴build於新私有`program-clean-build-20261013-ggcvel`exit0，509檔／18,581,163 bytes、Dot11/11獨立PASS，沒有business DB/session、網路或服務；不稱npm ci／新機／真資料啟動。06:02程式包凍結後只補本階段文件，不持續重包或回填舊包。完整receipts／限定scope／八類未跑項見[同一工程進度表](docs/local-integration/20261010-permissions-admin.md)。

權限browser直接登入批准已收到，最新分項通過與仍保留的原生未儲存提示以上方續接段及同一工程進度表為準。較早拒絕、提示逾時與舊來源採證保留為歷史，不能冒稱全scope PASS。

使用者已在本任務直接授權，取代此前待批准狀態。日常3000完整私有物理資料已唯讀複製至同機 `<TEMP>/main-private-preservation-20261013-SWBFtv/snapshot`，由既有production restore還原至同目錄的`restored`。2,380檔／8,172,592,757 bytes全部相符，rev495與所有資料表保留；詳細測試、原始資料最後核對及範圍以[同一驗收紀錄](docs/local-integration/20261010-permissions-admin.md)及`Temp/main-private-preservation-20261013.json`／`Temp/main-private-preservation-final-20261013.json`為準。原資料、登入、分頁與服務不寫入，不上傳／發布或移轉真實帳號；兩份私有資料副本保持凍結，不加入程式ZIP／Git。

使用者在外，舊3035提示擱置，不等／催代按，也不再重試debugger/C2C。專用同台任務官方UI runtime初始化`0x80070003`退出，未見像素／無點擊，控制已交回；這不同於本任務先前Sky列windows成功但skill限制宿主操作。最新非browser工作：原3035 actual API三合成身分登入／權限投影PASS、33→33且R2索引不變，未動browserCookie；完整dirty source與安全排除清單已完成，實際程式ZIP／解壓完整性以`Temp/source-package-20261013.json`收據為準，沒有Main storage。私有備份網站copy補排除`.dev.vars*`，新定向encrypted-archive/R2相容PASS，舊FAIL保留；Dot11項fullrestore沿用5c94舊來源，不在8b84冒稱重跑。資料包coverage／安全設定分離與八類剩餘界線見[同一驗收紀錄](docs/local-integration/20261010-permissions-admin.md)。無Main/3040資料、migration、Git或部署操作。

較早Main停機閘門失敗保留：原PID-only guard因markerPID25644被重用為msedgewebview2而拒絕；CIM建立時間證明並完成嚴格data-target修正後才通過。沒有刪marker、中止程序或以無listener繞過。程式ZIP與本次完整私有資料副本分開：`Temp/source-package-20261013.json`僅證明當時來源版本的封裝／解壓完整性，不包含本次私有資料或後續文件更新，也不代表部署驗收。

source stop gate已補PID建立時間與嚴格data-target proof，20合成與真正OS gate PASS；原marker／程序未動，3040/3035 runtime與父鏈均核對。新target可查本module來源工作區的既有isolation声明，每個仍唯一PID/time/root/config/state/hash驗證。早期完整私有複製在CreateProcess前被自動審查拒絕，收據保留；本任務直接授權後已按原操作完成，沒有改工具或guard繞過拒絕。

收尾補驗：最新86ec stop gate真正04:05 OS PASS；3035已授權舊rev27的53files/1.625GB/六合成＋28帳號快照，實際長path還原失敗268→recovery四處namespaced修正，338回歸與session/feature gate PASS；新還原基線ocHA8F精確53bytes/hash/25history並独立核對，保持不寫。另新工作副本bUSDk9合成CLI移轉／冪等27→28→28，8業務鍵／ID／hash／25history／35blob保留。wrapper漏schema/policy依賴的失敗已修，未改migrationguard。

早期重試遭拒的原因為delegation轉述不屬本任務可信直接批准；使用者其後已在此對話直接確認完整私有內容範圍。原Main/3040/3035服務、資料與登入仍未改寫。先前ZIP353f舊候選留存，長pathfix版本的source refreeze/ZIP/解壓以Temp/source-package收據為準。範圍、未測項與回歸風險由同一驗收紀錄維護。

原分支／HEAD保留。3035昨晚rev27狀態已真正唯讀核對：新完整備份後只恢復誤建空AB草稿鍵，27→28，已核准BOM与其他鍵不動。唯一UI writer仍本任務；其他FQC任務只處理自有檔／副本，不共享此IAB提示或C2C設定。新BOM草稿正常Save/Submit後，在主資料送審平台撤回案 `ea0e3d41-b2c8-4b74-85de-332c3f666af8`，rev33/wf26/pending null，working=saved `500193ac…638e14`，active案 `483875d9-c755-4fca-bb95-45e83b68f25f`／SHA `ae0cac22…cb3b70`；待審清單歸零、歷史原因保留。獨立QA已核對physical資料／像素／DOM，不重跑已PASS鏈。

詳細實作／驗證與所有證據以[同一驗收紀錄](docs/local-integration/20261010-permissions-admin.md)10/13段落為準。原BOM執行候選d9ac、窄版遮擋修正8d9b、最新搜尋假dirty修正3bd67787220ec8e6942f750da814cbbb9220dc16d82c63272ced5744863c3cfd，各舊manifest、變更源文件與SQLite備份保留，不能把新candidate回填舊收據。當前3035/PID3584、root `<TEMP>/process-qa-20261012-01`，`real-evidence/PERMISSION-SEARCH-RUNTIME-20261013.json`1200檔0mismatch，`PERMISSION-SEARCH-SERVED-20261013.json`真正GET200/sourceSHA，唯一HTML差異為既有feedback-loader注入。3032/3036本輪未重啟，原資料與PASS保留；不沿用昨日PID。

新的權限dialog検索不標dirty，真姓名／角色／權限修改保留取消／Escape離開保護，production-handler定向與lint／diff PASS。390×844 VI個人矩陣確認／取消／關閉44px且無浮鈕遮擋；最終JS的實際搜尋取消、ZH/VI角色完整互動、合成frank/ADMIN session補驗尚未完成。ZH BOM下階兩列／來源／相對層級像素、ZH/VI DOM已核；VI同張行列像素需正常捲動補採。原生IME／實體手機／跨機器真人同步仍未驗。

真正阻點：舊搜索only取消後，受支持click/getJsDialog/AX逾時，依已知dirty狀態及cancel handler推定可能停在native離開提示；工具未能讀出可處理dialog。使用者已授權代按，不是等待批准，但未取得舊提示的可讀畫面；不盲按或繞UI，也不重試已失敗的方法。2:41 UTC另建自有IAB tab3，正常讀出localhost3035 users的VI權限頁與合成ADMIN身分；按staff「Sửa」後AX未出dialog，唯讀DOM也確認dialogs為空，沒有把click返回當成功。原tab2保留且未重整。browser ID會因runtime重置改變，續接以fresh inventory確認，不固定ID；viewport reset是否成功仍不可確認。

C2C支線已依本輪使用者指示取消。此前doctor曾恢復本機服務與更換安全地址；實際設定頁仍為原同名連接器、Frank Tsai／OAuth與舊地址，未刪除／重建／unpair、未生成新配對碼、未完成新OAuth或改保存chat `6ac767b0-4a20-83ec-b1b8-71c813181817`。使用者曾提供當次代按授權，其後撤回此支線；目前停在既有管理頁而非真正consent。沒有為補修繼續操作。AGENTS未修改，只讀取並另存備份，保留所有既有dirty內容。本輪不再以連接支線阻擋本機驗證。

日常3000的資料、登入與使用者未儲存IQC頁未動；未跑migration、正式資料操作、資料包、commit/push/merge/deploy。其他checkpoints保留。3035搜尋提示代按授權仍有效，受支持getJsDialog、畫面／鍵盤與正常close均未完成（debugger synchronization逾時）；2:23 UTC唯讀33/wf26/working=saved及非目標鍵仍相同，原代理tab2仍在，未強制關閉。官方computer-use已初始化並唯讀列出視窗；只有ChatGPT主視窗、無獨立3035提示視窗，該skill明文禁止自動操作ChatGPT桌面UI，沒有用它代點。實際限制及各分開結果在私有root `real-evidence/OFFICIAL-COMPUTER-RESULT-20261013.json`、`BROWSER-RECOVERY-BEFORE-20261013.json`，未把授權不足冒充能力錯誤。後續只續本機最新JS／權限／VI下階缺口；不重播已完成BOM或製程審核。

本輪最新「看目前畫面」已實際唯讀確認：Edge日常3000停在IQC URL但顯示ERR_CONNECTION_REFUSED，不是BOM匯出／儲存結果；未重整、登入或代存。沙箱內程序查詢漏看3035，已以完整唯讀OS查詢更正：3000無listener，3035仍為原PID3584與原root/config，沒有重啟。既有3035啟動器的occupied-port gate在任何Start-Process前拒絕，原服務未替換。新唯讀guard核1200檔candidate3bd、rev33/wf26、pending null及所有非目標鍵不變；`Temp/inspect-private-3035-resume.cjs`保留可查。新頁未完成的權限互動與VI下階像素仍不算PASS，完整資料包／migration仍未執行。

## 2026-10-12 下班安全暫停（歷史，由上方10/13續接取代）：真實 BOM 報表驗證至核准

收到停止工作交接後，僅保存唯讀檢查點及分頁，不再新增 UI／程式／資料測試、不回滾清理。預定 10/13 越南 08:15 續接時先核對當時實際狀態；本記錄不表示自動排程或全部驗收完成。其他 task checkpoints 與服務保留。

3035 真實 Excel 的測試副本已經正常 chooser 匯入：大批 5 項變更套用／儲存（rev18），少批 11 項合併／儲存及重開（rev20），354 主件／6128 列，原6105位置ID保留。重匯0差異資料冪等；另修正0差異套用仍排入佇列、假顯示尚未儲存，3個定向VM案例及實際UI保持已儲存 PASS。案件 `1efd0d68-a258-44d6-8659-dbc3073d2ffa` 已發回，修正儲存後案件 `483875d9-c755-4fca-bb95-45e83b68f25f` 已核准，rev26/wf22/pending null，active與固定案件同 SHA `ae0cac22adb3e55a2458bc02ec131683a1e46b1da0ac71f144bea0175acb3b70`；bomOverrides 依既有adapter精確投影正式BOM，其他8鍵保留。原檔SHA與大批後未列入少批的343主件由Dot獨立保全核對通過。此新報表案件的撤回尚未執行；下方rev16小型合成案件鏈只是較早PASS，不重跑。

最後私有D1 revision27：核准後重開資料後台回到預設AB，操作人誤按AB開始修改；只建立合成AB草稿，未改正式主資料。精準復原工具在 `__processR2` 格式檢查、任何寫入之前停止，暫停後沒有回滾或清理。明早第一步唯讀比對 `<TEMP>/process-qa-20261012-01/real-evidence/PAUSED-20261012.json` 與實際D1/R2，保全当前rev27，然後僅處理誤建AB草稿，禁止整庫回復而丟失核准BOM。精確前備份 `qr12-2026-10-12T09-37-16-420Z`（rev20、AB尚未誤建）保留；舊R2 blobs未刪除。

3035候選 manifest SHA `d9ac262e00956dc243936f8a29da012cce08404d26fef796cc0c9e8e097faf8f`（前0883，僅BOM JS、入口token及新增noop測試三檔）。3036新startup保護及C01/C02冷載—→單案1、同步非busy的待審編輯鎖定由獨立QA scoped PASS，rev17，候選46e6900a…；舊conflict/failure證據保留。3035本輪未安裝network collector，不能補造已完成請求時序。定向lint仍有legacy version-workflow既有兩個unused及新增startup CJS harness四個require規則錯誤，尚未修復；最終diff／文件整合與新BOM撤回尚未完成，不宣稱全scope PASS。

目前本任務沒有執行中的寫入操作；服務3032/PID4224、3035/PID15712、3036/PID14580保持運行。IAB1/4/5/6/7已標handoff，使用者Chrome3000分頁未重整、代存、切登入。較早唯讀Main rev495的BOM working/saved業務內容已與正式V6相同，因此未還原或刪V7歷史；09:27目前Chrome已轉IQC V17編輯中，顯示同步讀取失敗 `signal is aborted without reason`，其輸入保留。沒有日常資料寫入、credential變更、commit／push／merge／部署或業務schema變更。
## 2026-10-12 FQC14項樣品回饋

已修正單列單樣品、同項不得重複，複測原樣品固定且無建立樣品按鈕；RPT/RTS/COR分色與舊號識別、草稿照片移除、結果列展開保留。使用者原分頁不重整、不儲存／送審；獨立分頁只讀歷史驗證。完整結果與未測以[本輪報告](docs/routine-fqc/20261012-sample-feedback.md)為準。10/8同報告重測規則已被本次直接需求取代；當日保存ZIP仍是歷史快照，不重建覆蓋。其他任務checkpoint、服務與資料保留，未commit/push/merge/部署。

## 2026-10-12 IQC例行規劃待確認

3040已沿原隔離runtime啟動，PID13680、HTTP200；為避免FQC自動Generate，分頁停在品質總覽登入頁，未代登入或操作業務寫入。文件核對PASS，完整SQLite業務內容比對不可宣稱通過，細節見[核對與開啟紀錄](docs/routine-iqc/20261012-planning-checks.md)。

使用者要求先規劃、不改程式或資料。已保存[IQC例行檢查規劃](docs/routine-iqc/IQC例行檢查規劃_20261012.md)，沿用FQC續談包並區分時間／批次、單件結果／批次接受／文件核准／異常結案。C01至C10為待確認政策，不是實作或核准授權；原Save固定快照、CAS、權限與歷史維持。僅文件核對，不執行功能測試、不改主檔／業務資料／schema，其他task checkpoint保留。

## 2026-10-12 已續接：隔離 BOM 完整流程通過

使用者已明確恢復本輪工作，取代下方 10/10 的下班暫停。工作分支與 HEAD 保持 `codex/ipqc-ab-local`／`8b182626085bb2aa1f3a216903c5b373ee82bc44`，其他任務 checkpoint 保留，不自動啟動舊 migration／發布。Codex with ChatGPT 已恢复並在指定 chat `6ac767b0-4a20-83ec-b1b8-71c813181817` 實際呼叫 workspace_info、read_file AGENTS.md、test_status 成功；workspaceId `a49fab0d07ab` 的本機綁定為 <WORKSPACE>/中控系統，舊 taskId／DONE checkpoint 未續跑。

3035 獨立合成帳號／D1/R2 的 BOM 套用、儲存重開、送審、發回、修正再送審、核准、撤回均通過實際 UI；revision16、pending null，354 主件／6105 列及全位置 ID、非目標欄位和其他9鍵保留。3032 原複製案件及真實帳號保留，只用合成登入作唯讀效能測量。API／wire／有效授權及待審數投影定向 PASS；最後雙語呈現與 source/refreeze 收據以[同一驗收記錄](docs/local-integration/20261010-permissions-admin.md)為準。不得重跑已通過業務狀態轉換。

日常3000本輪沒有登入、代存、送審或資料測試。最新本輪保護副本為 04:08:59 UTC revision492，BOM V6／V7草稿，並非使用者後續目前狀態。其真實 Chrome BOM 分頁仍顯示 COMMAND_TOO_LARGE 與尚未儲存；「匯出全部」等待時控制連線中斷，尚無可驗證的新下載。不能把資料庫副本或成功截圖當作未同步輸入備份，不能重整／重試／切登入／放棄它。新請求摘要修復維持2MB上限，已開舊頁的大請求仍413；先取得可恢復前端副本，再安排載入新頁。沒有 commit／push／merge／部署或真實帳號移轉。

未来發布偏好：使用者希望改用 ChatGPT Sites 管理的資料庫／媒體，不再使用自有 Cloudflare bindings。正式切換前另驗證 Sites 能力／額度、依賴、資料媒體遷移、登入權限、多人 CAS／審核、備份恢復與退回方案。本輪未授權發布、切正式連線、搬真實資料、刪舊服務或取消付費，現有服務及資料保留。

## 2026-10-10 使用者下班暫停（歷史；由上方已續接取代）

本次已停止新增UI／測試／程式或資料修改，不自動續做。使用者預定星期一2026-10-12越南08:15開機後續接；收到續接指示再先核對連線、fresh state及唯一UI操作人。3000、3032與人類分頁保留；未停止其他task，未commit/push/merge/部署。

固定source候選8852c696be5d3837569d7ec56fc65116baf53f4688de0859a6b4708e34b07f89，3032 PID33492／私有root <TEMP>/bom-latest-acceptance-20261010-02。暫停收據核對task files 20次，source mismatch 0。最後唯讀09:55:28UTC隔離revision471，相較470僅platformUsers加入兩QA fixtures，原14帳號及其他25鍵相同；RD顯示AB V9草稿是客戶端觀察，尚無持久變化證據，禁止整庫回復。Dot IAB3032 tab6在固定製程案件唯讀dialog，Chrome與保存chat維持。

實際UI部分PASS：三DEMO登入／登出與密碼disabled、normal manager／staff登入、本人改密碼3欄、角色矩陣27列178控制搜尋取消重開、BOM搜尋保留焦點及多階子件、390×844密碼表單無水平溢出。剩餘BOM套用Save重開、實際審核狀態轉換、原生IME未驗。一般帳號本人資料卡入口缺失、線別舊文案及lint修正已在暫存準備，尚未套source；後續停妥UI再一批套用、固定候選並定向重驗。全新合成實體CLI備份／移轉／冪等／stale拒絕／targeted rollback／互動雙輸入復原PASS，真實14權限或密碼未套用。

自動核准審查拒絕Dot「發回修改」click（可能立即mutation且未見明確批准）；沒有return寫入或繞過。下方舊狀態僅作歷史；不啟動發布、日常登入或資料移轉。[完整候選與證據](docs/local-integration/20261010-permissions-admin.md)。

## 2026-10-10 權限／BOM／製程固定候選（目前阶段）

目前source候選8852c696be5d3837569d7ec56fc65116baf53f4688de0859a6b4708e34b07f89；3032 PID33492，私有DB/R2 runtime guard PASS，861 source hashes match。Dot單獨恢復3032 UI，writer不操作該browser，也不在UI途中更換source。副本新增兩個synthetic QA帳號470→471，原14帳號及25其他鍵保留，BOM仍V6。日常最新只讀09:12:54為470/V6 approved，同contentSHA885ae…及24鍵；不代表使用者後續當前狀態。禁止日常登入／寫入測試、真實密碼或帳號移轉、commit/push/merge/部署。

14帳號完整151格及独立執行保全舊backend基準PASS；151+27列全選=178。移轉／CAS／冪等／targeted rollback／Frank工具入口＋舊session拒絕、新login／workerd scrypt／共享身份與輸入保全PASS。真實帳號設定未套用。CLI完整實體端到端及原生IME/實體手機未驗；09:29 lint有小項待下一自然checkpoint修正再freeze。[候選實作與驗證](docs/local-integration/20261010-permissions-admin.md)。較早BOM版本、PID、未開始權限字樣與停用連接訊息僅屬歷史，不可依下文啟動發布或回灌舊DB。保留所有其他任務checkpoint。

## 2026-10-10 BOM 離頁修復與權限改造待續（歷史檢查點）

BOM 最小離頁修復已在工作區：空修改模式不再誤報，真正修改／匯入差異／保存未知結果仍保護；有匯入差異時不能保存舊內容冒充已套用。定向函式與 API PASS，瀏覽器部分驗證與未完項見[檢查點](docs/local-integration/20261010-bom-navigation.md)。下方 revision461／V4待審是歷史證據；本輪唯讀已見V5 draft、無pending、working=saved，不得依舊文字重送或還原。

當時下一任務：依 Permissions_Admin_Local3000_20261010.zip 改造使用者權限；使用者指定 gpt-6.1-sol / high。切換請求已接受，實際生效尚未以允許的 runtime／任務／UI 證據核實。本輪曾誤用不允許的會話檔案來源核對模型，已停止，不沿用該結果作合規證據；完成此檢查點後結束本輪，讓既有 queued 任務於指定設定下一輪接續。ZIP已在 <USERPROFILE>/Downloads，761693 bytes，SHA256 41e5860a89dce0f7485ef98c6edd50848e31c50d364da07b249eb6f9df63fc6e，解壓至 <TEMP>/permissions-admin-20261010-01；當時未開始權限實作或帳號移轉；本段由上方最新階段取代。沿用最新固定ID／角色／個人設定；frank唯一主要管理員，DEMO ADMIN不可誤映射為frank，詳細00–05待依新模型完整讀取。禁止真實密碼重設、整庫覆蓋、commit/push/merge/部署。
## 2026-10-10 統一主資料審核（最新）

最新本機候選：主資料統一審核已完成，AB/C/PROCESS/BOM 同列，確認／發回／撤回及理由歷史通過 12 組隔離 API 與瀏覽器驗證。日常最新唯讀 revision461，BOM V4 354/6105 仍待審；下方 455、11/227 為前輪紀錄，不得回灌或自動核准。review2，C2C GREEN，未 commit/push/merge/部署。 [完整驗證](docs/local-integration/20261010-unified-master-review.md)。

## 2026-10-10 中越文／送審介面整理（最新本機候選）

已依 12 個標註修正語言、版面、BOM 樹與主資料送審、製程案件頁、回報非同步及版本頁按需載入；資源 ui4。合成雙帳號協作與定向測試通過，舊 quality-shared-rebase 測試初始化失敗、實體手機／跨機網路未驗。日常 revision455、25鍵及回報保全 PASS，真實 BOM 11/227 仍待審；691 引用未解，不自動核准。C2C doctor 本輪 GREEN，保存 chat ID 不變。沒有 commit/push/merge/部署。詳見[本次整理](docs/local-integration/20261010-ui-language-review.md)；下方 BOM 舊候選雜湊只屬前一交付。

## 2026-10-10 BOM 重建最新交接

日常3000沿原checkout與資料，原451→455；11主件227列與附件原ERP零差異。真實案件`2194e2ec-6f1c-4c8f-9501-e480b9148924`待人工審核，未核准，正式仍330主件6237列。依ZIP不靜默自審；不是測試送審。原25鍵與回報表保全；外部1,631檔約7.83GB備份及獨立全量還原PASS。完整歷史引用1,161筆缺根，未猜配／清空；正常頁面當次提示691筆。BOM限定測試、真實正常UI匯入／Save／重開／同檔零差異／Submit PASS；兩項舊回歸FAIL與1920／正式核准後發送播放未測均保留。下一步為人工查看BOM送審案件，不可因續接而自動核准、啟動資料同步或部署。[完整交付與備份](docs/local-integration/20261010-bom-rebuild.md)。未commit/push/Git merge/部署；其他checkpoint原樣保留。

## 2026-10-10 續接狀態

限定效能診斷已補入[整合報告](docs/local-integration/20261009-3020-to-3000.md#限定效能診斷收尾2026-10-10)：原ZIP未定義冷狀態或最低樣本數；326ms FAIL保留，273ms僅適用路由預編譯／冷auth条件。昨日INP會話中斷保留INCOMPLETE；今日獨立localhost補驗取得官方web-vitals單一桌面會話INP144ms、18次互動，僅此無額外負載會話PASS；現場p75／實體iPhone仍NOT_RUN。續接時服務均已停止；已沿原資料啟動日常3000為PID22004，HTTP200，451／feedback20及原雜湊保留，沒有回灌DB。隔離3002已停止，原3020未啟動；下方舊PID為歷史交付證據。C2C原安全地址失效，本機doctor已恢復服務，ChatGPT同名連接器停在永久刪除確認，待人類操作；指定chat ID仍為`6ac767b0-4a20-83ec-b1b8-71c813181817`。2026-10-10 本任務已收到人類直接授權及 ZIP，BOM 重建已完成本機實作與真實匯入保存／送審，取代先前未授權狀態；詳見下列最新 BOM 交接。

## 2026-10-09 3020 → 日常3000整合（交付紀錄）

人類已確認本機整合授權。先保全3670檔，隔離正常runtime驗證，再日常450→451增量写入；25鍵讀回一致、196媒體核對、原2回報/3handoff保留。入口同一唯一槽位已核實，採3020現行ID，保留舊歷史/恢復封套、0條連線改接，先前待人判已解除。日常正常啟動與切換後25鍵／196媒體／原450歷史／八條API核對PASS，瀏覽器已顯示唯一3020入口；不使用隔離測試DB覆蓋日常。收尾修復還原時撤銷設定退回關閉及附加檔案相容性，隔離回歸PASS。後續效能續修完成：原129MB／90s同負載，最終完整paint273/57/58ms；正常Local全部36連續LCP樣本中位-0.55%，48樣本含分組為+1.21%，舊失敗與波動保留。正常3000已重啟為PID20996，最新451／feedback20與簽章設定保全吻合。正式INP／實體iPhone仍未測。最新界線與證據見[本次整合](docs/local-integration/20261009-3020-to-3000.md)。沒有commit/push/Git merge/資料包/部署。下方3020服務交接仍作原來源記錄，非新任務指令。

## 2026-10-09 3020 修復安全收尾（最新，取代下方舊PID／revision）

七項共用／產品專用標註已EXECUTED，原業務primary348保留、合成45精確Apply／Save驗證。登入撤銷、完整checkpoint Buffer及inline legacy單次解析已實作；定向副本/API測試PASS，但實際restart-replay協調逾時FAIL、完整負載開啟及部分UI仍未完成。最新既有3020 PID8500，primary348、localhost合成45；兩scope各13鍵及四個checkpoint在服務切換後byte-equal。原媒體與archive沿用，未操作日常3000／3030／3040，不commit/push/merge/deploy。用戶已同意保留本機未同步修改、不代為保存，原表單／七筆位置不重整、不Apply／Save。

本執行者於2026-10-09 14:19（Asia/Bangkok）停止新增程式／資料／UI寫入；沒有仍運行的驗收probe或子代理，正常3020服務保持開啟。下一階段交由使用者指定的Codex『規劃資料庫同步上傳 merge』（協調提供ID01a11980-3e7b-7170-b0f5-d9e9162b5630；本執行者未自行核實其idle狀態）。不得因此自動開始日常整合，接手者先確認唯一寫入者、目前HEAD/diff及最新原資料。未解FAIL／NOT_RUN和私有證據、runtime、持久secret/ledger的無敏感位置見[登入交接](docs/ipqc-reference/20261009-session-revocation.md)與[整合報告](docs/web-feedback/20261009-integration.md)；七個原標註及截圖見[作業報告](docs/ipqc-reference/20261009-work-items.md)。切換後auth線上唯讀備份session-switch-after-auth-01已通過SQLite integrity及secret byte-equal，值未輸出；恢復仍須合併較新撤銷。舊backup僅供比對，禁止整庫覆蓋新資料或把合成／fixture帳號、ledger、secret帶入日常；共享C2C指標不動。

## 2026-10-09 網頁回報 V1 獨立驗收

核心功能及 ZIP 定向驗收通過；原生彈窗遮擋已修復。續驗安全空白輸入介面9項隔離測試及暖測通過；首次權限等待切頁仍FAIL，修正副本10項PASS但尚未套用；同負載重驗因出現他人分頁／交接操作而待協調，Library本機helper工具未註冊，不能算已交付。開啟負載目標仍 FAIL，正式 INP／UI 選檔／完整浏览器关闭／實體手機未驗證。原3020 revision332及合成41各13鍵、原案件及archive保持；僅合成回報新增2案及2handoff。未重啟server，未操作3000／正式DB／Git發布。接續須保留最新checkpoint，不以before回滾；只處理本任務。[独立報告](docs/web-feedback/20261009-independent-acceptance.md)。

## 2026-10-09 網頁回報 V1（本次直接實作）

本機功能 EXECUTED，驗收有明列未測範圍；未 commit/push/merge/部署。使用者明確授權不等待 ChatGPT 連線，未更改其他 C2C session。原 3020 及 localhost 合成副本分離；以 editor-feedback-20261008/runtime 最新 durable 業務與 feedback checkpoint 啟動，原媒體來源保留，禁止用本輪 before 快照覆蓋後續修改。完整功能、逐項證據、最新服務來源及恢復方法见 [V1 交付](docs/web-feedback/20261009-implementation.md)。只恢復本任務，不重跑舊產品移轉／核准／取消的 heartbeat，也不覆蓋 FQC 或畫布工作。新功能需先從右下角回報；管理入口在資料後台 users 後方，匯出需 admin。

## 2026-10-08 3020 首屏載入修正

Commit後續：本機 `8b18262`；現有C2C健康檢查已全綠，指定「規劃問題回報小幫手」已開啟。驗證訊息被自動核准審查擋下，需使用者明確同意傳送工作區路徑、commit及報告路徑；未重送、未修改並行FQC session指標。證據根目錄 editor-startup-20261008/connection-followup.md（同下方報告所列外部保全目錄）。

最新 annotation 已修正：畫布不再等待待補及舊版本清單，啟動後明確呈現最後註冊的畫布。定向測試18項與lint PASS；桌機中越文可用，手機尺寸模擬未生效（BLOCKED）。原3020 revision332及合成41各13鍵不變。使用者授權本次局部commit，並行改動保留、不push／部署。指定「規劃問題回報小幫手」連接尚未成功，共享C2C指標未改。[完整證據與復原](docs/ipqc-reference/20261008-editor-startup.md)。

## 2026-10-08 FQC設計保存與後續模組接續

已按使用者要求保存[FQC整體設計與審核條件](docs/routine-fqc/FQC設計與審核條件_20261008.md)、[ChatGPT續談提示](docs/routine-fqc/ChatGPT續談提示_20261008.md)及可下載續談包。摘要區分現行實作、主檔規則及新模組建議；IQC、模具檢查及校準例行執行未開始實作。最新再測按鈕隔離測試PASS，最後真實畫面與本輪手機NOT_RUN，不能沿用前輪驗收。此次保存不寫業務資料、不發ChatGPT訊息、不重建已取消排程。下次先確認檢查單位、觸發期限、結果必填、異常複測、核准完成、來源歷史六項差異。

## 2026-10-08 FQC計畫報告、分類定位與原樣品再測（最新）

STATE: EXECUTED；本checkout工作分支codex/ipqc-ab-local，未提交。計畫明示報告建立狀態／入口；清單分類分框與上方定位按鈕；改善與建複測同次CAS；同樣品可跨結果列再測，新列結果留白，固定原樣品／正式历史保留。已增量建立3040 DEMO01–10，建立時全部未安排且舊來源／文件／案件／工作不變；使用者已後續操作，不得重設或重跑建立。UI保留使用者舊分頁輸入，驗證使用獨立分頁。為補入其他工作新增的canvas-local靜態資產，3040沿原隔離runtime重開，未初始化／換埠；其他服務不動。核心／操作／命令／導航／重測隔離測試PASS；13項既有lint仍FAIL；真實複測API寫入、實體手機、3000整合及ChatGPT獨立複審NOT_RUN。沒有新增schema或欄位，沒有commit/push/merge/部署。不恢復已取消fqc-chatgpt排程，保留原ChatGPT指標與其他checkpoint。[驗證、畫面與復原](docs/routine-fqc/20261008-plans-groups.md)。

## 2026-10-08 畫布本機編輯與手動整批同步

已接上獨立canvas journal、自動整理、復原／重做、固定批次guarded同步及Save前同步確認。3020原資料revision327保留，合成驗收使用同服務localhost。未操作3000/3030、未commit/push/merge/deploy。驗收及未完成項目以[本機畫布報告](docs/ipqc-reference/20261008-canvas-local.md)為準；不沿用舊報告的全數PASS。ChatGPT connector仍MCP -32603，複審未完成，未改共享C2C指標。

## 2026-10-08 FQC複測狀態與範圍標記（最新4項回饋）

EXECUTED：3040已顯示現有複測／阻擋原因，成功建立與收回留在原案件；草稿確認收回沿原可復原取消API，待審／正式／相依防護保留。統計卡與不合格快捷標記匹配列，再點取消，其他列保留。實際3/15未完成、4/11未結案及8/11不合格標記／切換驗證PASS；原FQC-CA-00001被處置草稿FQC-DSP-20261008-0009占用，已顯示連結，不代替使用者取消。真實前端命令＋生產核心的記憶體測試PASS，桌機與390手機中越文PASS；沒有替使用者建立／收回／儲存／送審文件。資料模型無變，9項既有前端lint仍FAIL；實體手機、真實API建立／收回及ChatGPT独立複審NOT_RUN。保留舊分頁輸入；不重建已取消排程、不動其他服务或Git發布。[測試與復原](docs/routine-fqc/20261008-actions.md)。

## 2026-10-08 製程手動定位與預覽連線（最新3020）

EXECUTED：整理只整理連線、零位置寫入；取消自動搬動方塊，拖動／寫入期间延後重畫，背景讀取去重且不鎖編輯。入口／出口支援拉線預覽、合法變綠、反向建立與點線確認刪除。6份定向測試PASS，桌面中越文拖曳、儲存重開PASS；手機尺寸模擬工具未生效，BLOCKED，實體手機NOT_RUN。本輪原3020 revision303及13鍵完全保留，服務未重啟，不得回復下方舊292／262；仍使用原runtime最新快照。無業務送審核准／其他port／Git提交／C2C恢復。[完整差異、保全與界線](docs/ipqc-reference/20261008-editor-gestures.md)。

## 2026-10-08 FQC 11項清單與複測回饋

EXECUTED：3040前端已修正桌機捲軸、明確階段與下一步、RPT/DSP/WVR分類、草稿置頂與快捷、選中標示、緊湊草稿卡與三色區塊、複測原樣品名稱及結果列入口。原分頁尚未儲存的輸入先備份並逐欄核對保留；不得替使用者儲存或送審。只改前端及定向測試／文件，無schema、業務文件改寫、3000/3020/3030操作或Git提交／部署。隔離核心與操作／共用草稿檢查PASS，桌機與390手機中越文通過；前端lint仍有同樣9項既有問題。實體手機與ChatGPT獨立複審NOT_RUN。舊 fqc-chatgpt 排程已由使用者取消，禁止重建。[證據與復原](docs/routine-fqc/20261008-navigation.md)。

## 2026-10-08 網頁問題回報對話連結（歷史；停用決定已取代）

使用者於 2026-10-08 取消此對話連結；該停用決定已由 2026-10-09 的明確恢復指示取代。已綁定既有「規劃資料庫同步上傳 merge」，完整網址 `https://chatgpt.com/g/g-p-6aa92cd426048191b704fdcc0ad78631-zhong-kong-xi-tong/c/6ac767b0-4a20-83ec-b1b8-71c813181817`。只恢復連接及唯讀驗證，不接續問題回報或發布任務。帳戶已安裝清單無原連接器，舊設定頁無法載入，因此以同名「Codex with ChatGPT · 中控系統」恢復；使用者完成授權，本機配對成功。指定對話實際 workspace_info／read_file／test_status 均 PASS：名稱中控系統、ID `a49fab0d07ab`、分支 `codex/ipqc-ab-local`、HEAD `8b18262`；AGENTS.md 共55行，第13行規則引用吻合；既有測試為 `c2c_pe3020_20261008` iteration1，50 PASS／8 NOT_RUN／1 screenshot BLOCKED，舊紀錄整體 blocked，不表示目前連接失敗。本次未執行測試。工具僅暴露 `workspace:/`；本機依實際 realpath＋SHA-256 ID 規則核對 `<WORKSPACE>/中控系統` 對應相同 ID，完整 HEAD 為 `8b182626085bb2aa1f3a216903c5b373ee82bc44`。驗證成功後只改 session url／title／savedAt，原 task `routine-fqc-operations-3040`、iteration1、DONE 及 checkpoint 保留，不能依此啟動舊任務。更新前文件與 session 已保全於 `<TEMP>/c2c-restore-20261009-111708\`。程式、業務資料與資料模型無變；未 migration、資料包、commit、push、merge 或部署。以下取消前檢查僅為歷史，沒有授權啟動舊任務。

使用者要求切換至既有「規劃問題回報小幫手」（chat ID `6ac704cb-a0f4-83ee-bac8-9644ef153394`）。已在同一可見 IAB 分頁讀取 V1 規劃並發送僅連線驗證的 HANDOFF；ChatGPT 實際 `workspace_info` 與 Codex 直接連接器呼叫均回內部錯誤。Doctor 本機健康 PASS，但 ChatGPT 外掛管理頁仍指向較早的失效安全地址，與目前連線不符。未刪除／重建外掛，待使用者確認替換既有「Codex with ChatGPT · 中控系統」連線。驗證成功前不得保存新 session URL；原「設計例行檢查流程」指標、task／iteration／DONE 及其他 checkpoint 保留。此次只處理連結，未啟動架構掃描或功能實作；程式、業務資料、資料模型及其他服務未改。專案外保全：`<TEMP>/c2c-web-feedback-link-20261008-120038\`，包含 AGENTS／HANDOFF 修改前副本及完整舊 session，已核对 SHA-256。

## 2026-10-08 製程畫布回饋修復（最新3020）

EXECUTED：直線優先／分道避障、動態卡片尺寸、快取重畫、機器照片、套用非阻塞待補與儲存後按鈕解鎖。3020曾heap耗盡；已限制同時大型解碼、後續封存與成功寫入checkpoint落磁碟，恢復最新revision292，PID33180。原13鍵不變，合成驗收20卡20線零重疊／穿框／疊線。不要用下方舊262或PID20744啟動；沿用本輪runtime最新原資料和原媒體。使用者已取消舊IPQC自動複審，本輪未重啟C2C、未commit或操作其他port。[實作、證據、私有備份與回復](docs/ipqc-reference/20261008-editor-feedback.md)。

## 2026-10-08 製程編輯台交接包實作（本輪）

狀態 EXECUTED；Astra本輪讀取規格/報告/execution_output仍回-32603，獨立複審BLOCKED；本輪禁止 commit/push/merge/deploy。原3020仍 revision262、13鍵完全相同。原服務PID20744，原資料網址127.0.0.1:3020；localhost:3020 是同服務的獨立合成驗收副本。不要把合成資料帶回原來源，不從3000或旧checkpoint覆蓋。最後快照、原媒體來源、測試輸出、精確任務差異和未測/BLOCKED項目均見 [本輪報告](docs/ipqc-reference/20261008-process-editor.md)。共享C2C指標、FQC/模具並行工作保留；舊 c2c_9fa2 iteration12 不因本次重新初始化。

## 2026-10-08 本機路線提交

2026-10-08 3040載入失敗恢復：原服務對新增製程編輯器三檔回404；核對隔離程序後，只重載原3040 runtime，新PID22284，三檔HTTP200與實際FQC清單重開PASS。未修改程式或業務資料、未初始化／換埠，不操作3000／3020／3030；原ChatGPT連線仍保留且未完成恢復。證據與保全見 [本機接續紀錄](docs/routine-fqc/20261007-workday-startup.md#2026-10-08-3040載入失敗恢復)。

已按使用者授權整理路線／畫布的獨立本機提交；並行 FQC／模具與其他權限政策仍留在工作區。3020 revision262 不重做；Astra iteration12 複審未完成。範圍、驗證及回復見 [提交紀錄](docs/ipqc-reference/20261008-local-commit.md)。

# 接續工作交接

2026-10-08 FQC開機接續：已建立Codex-FQC-3040登入捷徑、ASCII入口與一次性`fqc-chatgpt`自動接續。3040从原隔離runtime冷啟動PASS，未初始化或改業務資料；原ChatGPT安全地址失效，替換舊連線的永久刪除確認已詢問，尚未刪除或完成恢復。不要重複詢問同一個確認，勿動並行IPQC checkpoint。啟動／驗證／復原見 [本機接續紀錄](docs/routine-fqc/20261007-workday-startup.md)。真正Windows重開機NOT_RUN，Codex與3040程式入口已實測；自動接續成功後才暫停。

2026-10-08 IPQC 下班接續：已恢复原3020 revision258，兩筆 INOX 產品正常原子移轉、手動整份儲存／送審／明確自審核准，最新262；只變 masterDataControl。畫布最大路線／隱藏恢復及37項定向測試PASS，Astra iteration12複審因ChatGPT唯讀連線 -32603 待恢復；FQC對話已有連線替換確認，勿重複資料操作。[最新報告](docs/ipqc-reference/20261008-group-route-canvas.md)。保留並行FQC連結／checkpoint，未操作3000/3030。昨日啟動交接為歷史，真正登入啟動尚未驗證。

2026-10-07 routine-fqc-operations-3040：22項操作回饋完成，33組定向驗收PASS；草稿可捨棄／復原、計畫與報告分開、平台例行檢查分頁、行內明確自審、照片必填與修改導引、版本系譜占用防護已落實。原ChatGPT「設計例行檢查流程」以connector独立複審 iteration1 DONE，核對 execution_output #41 實際核心／API／UI／型別輸出及失敗接續；詳見 [操作驗收](docs/routine-fqc/20261007-operations.md)。保留使用者文件／案件／工作／照片；手動演練3/4仍未操作，1/2已由使用者操作。3040頁面與原對話保持開啟；實體iPhone NOT_RUN。本輪不寫3000業務資料，不操作3020/3030，不另開埠，不commit/push/merge/部署。不要初始化或整庫恢復而覆蓋後續工作。

2026-10-07 群組最大路線（c2c_9fa2 iteration9–11）：AB/C 路線去重聯集、相同用預設／例外直接顯示、產品套用預設按鈕。既有手動設定及產品有效路線保留。僅3020隔離驗收，未改日常資料；Astra第11輪獨立複審DONE；28項定向測試PASS。3020最新備份258，TIEN/GIA群組草稿保留，所有原產品工段及active不變。[本輪報告](docs/ipqc-reference/20261007-group-routes-max.md)。

2026-10-07 群組路線（c2c_9fa2 iteration8）：新增AB/C群組預設、产品例外、核准後畫布／IPQC連動、基本資料預設、輪詢及捲動修復。3020由使用者最新234延續，最新248；A/INOX、B/VANPHAODONG、C/PVC實際正常核准及C例外保存驗證PASS，原產品路線／IPQC／分配／發送／其他模組逐鍵保留。僅masterDataControl變更；未改3000日常資料或3030，未commit/push/merge/部署。此輪不宣稱完成先前審核UI問題。Astra已独立複審第8輪群組路線DONE。[詳細交接與備份](docs/ipqc-reference/20261007-group-routes.md)。

2026-10-07 routine-fqc-feedback-3040：六項頁面回饋已修正並定向驗證；分類完整／三級連動／結果色標與下一步／同步失效勾選、每半年來源修復；第二輪修復同ID歷史快照覆蓋現行名稱，先按範圍整理選項，保留舊分類與報告。3040保留四項「手動演練」未安排，查詢與操作順序見 [回饋報告](docs/routine-fqc/20261007-feedback.md)。原3000唯讀revision450前後相同，未帶演練資料；原報告／案件及並行工作保留。STATE: EXECUTED；同一ChatGPT以connector獨立複審第二輪DONE，執行紀錄33–36已核對。無commit/push/merge/部署；實體iPhone與使用者親自流程仍NOT_RUN。3040頁面已搜尋「手動演練」，保持原ChatGPT連結。

routine-fqc-3040 第二輪：修復不合格後複測無法測試與五類正式文件更正的案件連結，逐份保存應複測樣品，保留原核准／結案歷史；真實3040 API、UI、匯出與定向核心回歸PASS，同一ChatGPT已獨立複審並回覆STATE: DONE。最新3000唯讀驗證revision450前後一致，起始日仍未設定；沒有覆蓋並行日常變更。新增情境與截圖見下方本輪報告。3040展示頁與原ChatGPT分頁保持開啟，實體iPhone仍NOT_RUN。

2026-10-07 例行 FQC V2（routine-fqc-3040）：已完成四入口與FQC實際排程／計畫／逐項樣品／照片／共享文稿審核／改善複測／免做處置／明確結案／搜尋匯出。完整逐情境驗收、截圖、日常銜接收據及復原界線見 [本輪報告](docs/routine-fqc/20261007-acceptance.md)。3040使用獨立D1/R2/session；日常在保留並行IPQC與模具revision448基礎上只增量啟用，未帶測試control、帳號、照片或起始日。備份 `.local-backups/routine-fqc-3000-20261007-before/`；不要以隔離revision410覆蓋日常。STATE: EXECUTED；第二輪同一ChatGPT對話以connector獨立複審DONE。未commit/push/Git merge/部署，未操作3020／3030。

2026-10-07 整份文稿／日常銜接（c2c_9fa2 第 7 輪補驗）：第6輪Astra確認主要實作與日常交接證據；已補10模組員工實際Apply保存、AB兩儲存格式24群組撤回／發回內容歷史及BOM無文稿盤點，Astra已獨立複審第7輪補件DONE；新提出的ADMIN審核／C重複／歷史收折UI仍待修，移除發回入口待本機使用者澄清。第7輪僅測試與文件，未操作服務／業務資料；全部主資料完整UI鏈仍未測。完整 PASS／FAIL／未測及回復方式見 [本輪報告](docs/ipqc-reference/20261007-whole-module-progress.md)。3020 revision 222 保全；3000 沿原 D1/R2 使用目前 checkout。使用者指定 demo-admin，正常整份 Save／Submit／明確自審核准 AB 24 群組（案 482c0eed-1e20-4031-9b2d-f25b044d951a）、C V8（案 9201033e-98f4-476c-aa1e-55c6b0a0a008）。使用者明確授權清除 111… 測試資料，C 主資料 V4 只刪產品 11111111。revision 447 比對既有製程／分配及其他品質模組未改，原三帳號不變，並行新增帳號保留。1274 備份雜湊及1267原R2 blob核對通過；禁止用舊整庫覆蓋最新日常。未操作3030、未commit/push/merge/遠端部署；未改並行 Routine FQC 的預設ChatGPT連結或checkpoint。

2026-10-07 ChatGPT 持續連結：依使用者要求，固定沿用「設計例行檢查流程」（chat ID `6ac36c38-501c-83ec-a5d6-e42870edb8b1`）。連線健康檢查 PASS；已在該對話實際呼叫 `workspace_info`，回覆工作區 `中控系統`／`a49fab0d07ab`、分支 `codex/ipqc-ab-local`、HEAD `84278d8`，與目前 checkout 一致。C2C session 採 `long-chat` 保證跨 Codex 對話沿用同一 chat，原 Project URL 仍保存。永久接續規則見 [AGENTS](AGENTS.md#persistent-codex-with-chatgpt-connection)：首次工作回合自動檢查／恢復並開啟此對話，結束保持分頁；沒有設定 Codex 尚未開始工作回合時的應用程式啟動鉤子，關機／離線不中斷也未保證或驗證。

以下為本日稍早「只完成連結」的歷史紀錄；FQC建置已由上方routine-fqc-3040交接取代。當時未執行該對話中的FQC建置方案。既有 `c2c_9fa2`／第 6 輪 checkpoint 完整保留，仍屬原 IPQC 對話，不可因切換連結自動視為本次 FQC 任務。修改前的 `AGENTS-before.md`、`HANDOFF-before.md` 與 `session-before.json` 保存在專案外 `<TEMP>/c2c-routine-link-20261007\`；保留原未提交工作、業務資料及連線授權。

2026-10-07 IPQC 接續驗收：核對昨日沒有掛起的測試程序，3020 持續執行；补測藍色占用卡片與 FQC／IQC／檢具真實 handler 待補／無修改／授權自審通路 PASS。未重啟 3000／3030，未新增日常業務寫入。最新結果與仍未測界線見 [接續驗收](docs/ipqc-reference/20261007-continuation.md)。

最新 IPQC 工作：2026-10-06 review5，保留既有及並行未提交修改。狀態卡片、跨頁儲存送審、自審與 C/INOX 修复／未測界線見 [review5](docs/ipqc-reference/20261006-review5.md)。3020 延續最新 checkpoint；本輪未修改日常資料，未 commit/push/merge/部署。以下各隔離入口保留原管理責任，不相互覆蓋。

更新：2026-10-06（Asia/Bangkok）。`c2c_9fa2` 第 4 輪處理 12 項瀏覽器回饋，沿用 `codex/ipqc-ab-local`、HEAD `84278d837898f4e836ec003f7adb67ff38f785c8`；既有未提交修改保留，未 commit/push/merge/部署。最新根因、操作及未測界線見 [review4](docs/ipqc-reference/20261006-review4.md)。

最新 [IPQC 送審政策](docs/specs/current/IPQC_POLICY.md)及 AB 儲存／C 撤回修復與驗收見 [review3](docs/ipqc-reference/20261006-review3.md)。使用者後續明確允許真實資料隔離副本正常送審／核准，故 AB/C 成功分配與反向引用已在 3020 驗證；此前 [第一輪](docs/ipqc-reference/20261006-acceptance.md)、[第二輪](docs/ipqc-reference/20261006-review2.md)的 AB 未測是當輪歷史狀態。

測試統一 3020，3021 已停止，原兩份狀態先保全；採 3020 延續，不將衝突工作流互相覆寫。3000 是日常入口，靜態程式載入目前 checkout，但日常資料送審／核准仍由使用者操作。一般媒體完整載入、日常寫入、實體手機與正式發送／播放未測。

## 3030 資料匯入隔離區（已退役，2026-10-07）

最終狀態：[V12 銜接與退役](docs/tooling/20261007-retirement.md)。使用者後續核准 V12 已增量接續至 3000 revision 449→450，保留並行資料；366 筆、239 原圖、38 IQC 引用、12 版本／4 Save／6 案件與全部歷史一致。精確前備份 `acc10865-23b5-4b1d-a3e3-9c432b09a210`。3030 已停止且無監聽，runtime 封存於 `.wrangler/local-only/import-3030-20261006/runtime-retired-20261007/`，舊匯入入口已停用。以後使用 3030 必須另建新的隔離目錄／資料／當時基準，不得重啟此次封存環境。以下 V8 及初次建立內容為歷史過程。

依使用者要求新增入口 `http://127.0.0.1:3030/process/`。隔離 runtime 在 `.wrangler/local-only/import-3030-20261006/runtime/`，D1/R2 實體儲存獨立；匯入前基準在同目錄的 `baseline/`。來源 revision 409；SQLite 以唯讀 `VACUUM INTO` 擷取並核對 integrity，來源 pointer 在擷取前後及啟動後相同。`isolation.json`、`verification.json`、`server.json` 與啟動紀錄保留在該隔離目錄。

2026-10-07 最新模具階段：依使用者本輪授權完成權限／完整草稿／移轉及 IQC 引用修復，保持 VersionDraftUI。3031 完整實體隔離副本的正常登入 API 16 組、定向 handler 21 組 PASS；測試修改沒有帶入日常。3030 正常 UI 完成 V4 模組撤回、V6 平台撤回及整份 V8 ADMIN 明確自審核准，案 `030e6c4e-6df7-49f0-abff-45a48c05424c`，核准 `2026-10-07T05:21:33.414Z`。備份及 dry-run 後透過 Local ADMIN／CAS 交接至原 3000 revision 447→448，366 筆、239 原圖／243 引用、39 IQC 引用／30 穩定 ID、8 版本／3 Save／4 案件及全部歷史延續；只變模具 pointer，其他並行資料不變。精確前備份 `a2c8df2c-ab68-406c-a2cf-4270b1fa21ce` 保留。具體帳號模式、案件、原圖 SHA、未測與風險見 [完整流程驗收](docs/tooling/20261007-flow-acceptance.md)。日常現在使用 3000，3030 留隔離，不自動雙向同步。原 5 張照片／19 筆 IQC 識別問題及 2 筆舊移轉不明目的仍待業務確認，不猜配；未 commit/push/merge/deploy。[介面驗收](docs/tooling/20261007-ui-acceptance.md)及[初次匯入](docs/tooling/20261006-acceptance.md)均為較早時點，不要重跑初始化或覆寫後續資料。

程式原本連結目前 checkout，未提交成果已在日常 3000 使用。此次隔離環境已退役，不再提供舊 runtime 重啟入口；保留封存供追溯。未來隔離資料工作須另建環境並重新核對／備份，不能重跑本輪交接或用 Git merge 代替資料銜接。

本輪收尾確認原 3000 服務已停止，沿原 checkout／D1／R2 正常重啟；沒有初始化或重交接。`2026-10-07T06:06:41.482Z` 正常登入唯讀復核兩端完整模具控制仍相同、V8／366 筆／待審 0，日常 revision 448；3000／3030 已監聽並保留查看分頁。3031 自建測試服務已停止，隔離測試資料／備份保留。停止原因未確認，服務紀錄及最終畫面見本輪驗收報告。

歷史連結紀錄（目前綁定已由本文件開頭取代）：當時曾改為「建立模具資料庫討論」（chat ID `6ac3720a-4fe0-83ec-9203-91e8550c50ad`），原對話設定保存在隔離目錄 `chatgpt-session-before.json`。該次沒有送出訊息、覆寫正在編輯的輸入或重建 connector，也未另外驗證該對話內的 workspace 工具回覆。

以下為 **2026-10-05 歷史交接**；其中「乾淨／已提交」只代表該日期，不代表目前 checkout。

## 工作目錄與 Git

- 正確目錄：`<WORKSPACE>/中控系統`；目前分支：`codex/ipqc-ab-local`。沿用此 checkout，不另取舊副本或搬動 C 槽 worktree。
- 交接更新前 HEAD：`7b861f9`。本文件另有最後交接提交，接手以 `git log -1` 核對實際 HEAD，不把舊 SHA 當成目前版本。
- 本機只有兩個分支：`codex/ipqc-ab-local`、`main`。日常繼續在前者工作，不直接修改 main。
- 程式與先前文件成果均已提交；本次開始時已追蹤檔案乾淨。57 個未追蹤原始表格、截圖、匯入報告及 Python 快取刻意留在本機，不整批 `git add .`、刪除或提交。
- 其他現存 worktree：`.worktrees/bom-runtime`（main）、`work/draft-workflow-loading`（detached HEAD），不是本次開發目錄。
- 未 push、未變更遠端分支、未合併 main、未部署；本機 commit 不等於發佈。
- 重要提交：`b2b1f6b` 保全 V3／規格；`9811630` 整合 shared-state 修復；`cf7218a` 核對舊副本與修正 IPQC-C 測試；`6043e22`／`7b861f9` 記錄副本與分支清理。

## 先讀的來源

1. [AGENTS.md](AGENTS.md)：專案規則。
2. [AI_CONTEXT](AI_CONTEXT/AI_CONTEXT.md)：依任務選讀相關 module；資料／API 任務再讀[資料模型](AI_CONTEXT/DATA_MODEL.md)。
3. [正式規格入口](docs/specs/current/README.md)，尤其[共享草稿](docs/specs/current/SHARED_DRAFT.md)及[製程工作流](docs/specs/current/PROCESS_WORKFLOW.md)。
4. [未決事項](docs/DOCUMENTATION_INDEX.md)：需求與實作差距，歷史文件不能當成新驗收結果。

## 已有成果與保留規則

- 2026-10-07 例行 FQC 22 項操作回饋詳見 [操作驗收](docs/routine-fqc/20261007-operations.md)。保留使用者 plan9、plan10 更正版、report20、disposal5；更正版共用既有報告入口，不直接刪重複紀錄或改 status。草稿與可刪正式計畫採可復原捨棄，版本確認平台新增例行檢查分類。3040 驗收 fixture 與使用者已操作項目分離；先前「四項未操作」是歷史驗收時點，現在只剩手動演練3/4未操作。此輪不再寫入3000，不重新匯入測試資料；不要重跑初始化或覆蓋使用者後續操作。

- 十頁共用版本／草稿介面已有定向驗證：製程編輯台、AB/C、線別工段、PROCESS、FQC、IQC、IPQC-AB/C、檢具設備。同步／儲存分開、報錯／待補分區、操作紀錄、中越文與桌機／窄版已整理；BOM 不在該批美化範圍。
- 每個適用 scope 一份共享草稿；Apply／同步不是 Save；手動儲存後才有可送審快照；送最後成功儲存版本，不自動補存。保留待審鎖定、撤回／發回、權限、revision／generation／CAS 及固定歷史。
- 僅 `process:platform` 的業務問題改為待補提醒，可送審；带待補核准須明確確認並留紀錄，問題清單固定於案件快照。真正權限、同步、解析、快照完整性錯誤仍阻擋；品質與主資料驗證不一併放寬。
- 原 18 節點已儲存封存及 19 節點工作內容須保留。四個缺產品 654564 的流程不能刪除、補造產品或改指其他產品，目前只有唯讀封存入口，尚無修正入口。待補數量可能隨使用者操作改變，不沿用舊數字當成即時現況。
- FQC 曾依授權完成一次 Local 草稿清理及一次 Save：4 個不存在產品的 53 筆關聯移除；產品數 91→87、關聯 931→878、舊關聯問題 53→0。510 項目保留，其中 30 項沒有適用產品，未擅自刪除／停用／重配。照片、正式版、案件及歷史保全。Save 涵蓋當時整份已同步草稿，不只清理部分；接手不得重跑此已完成動作。
- shared-state 已整合引用備份、byte snapshot、digest 照片重用、帳號隔離、安全 revision 重試，以及防止重試後用其他欄位舊畫面覆寫新資料。
- PR #11 個人草稿／三值衝突方案已淘汰，本機分支已移除並封存，不重新合入。

## Local 與資料邊界

- 網址：`http://127.0.0.1:3000/process/?system=process&view=editor`。本次交接唯讀 HTTP 檢查回應 200，沒有重啟服務。
- 本次未讀 DB revision 或 scope 狀態。FQC 清理時歷史 revision 為 399→401，不能當作現在的寫入條件。後續獲准資料操作前必須重新讀即時 revision／hash、草稿狀態及權限。
- 使用者可能同時操作 Local；revision 增加不代表應復原，不覆蓋後續新資料。測試寫入使用隔離 fixture／副本，不為測試處理真實送審／核准案件。
- 有限 authoring 採用與隔離 PASS 不代表所有 scope 啟用；不批次啟用、不重做 Local 轉換或 FQC 清理。
- 不自行執行 data:sync、data、seed、migration、整庫轉換、復原、push 或部署。先前資料授權僅限已完成的特定操作，不是未來任意寫入授權。
- 若 Local 停止，先查狀態及安全入口；既有入口為 `node --import ./scripts/local-network-preload.mjs ./scripts/local-server.mjs --port 3000`。不要為查看畫面執行初始化資料的流程。

## 證據與未完成項目

以下本機證據本次確認仍在，但不在 Git 中：

- `.wrangler/local-only/v3-evidence/polish-fqc-advisory-20261003/index.html` 與 `acceptance.json`：逐頁前後圖、1366／390、中越、隔離與真實 Local 驗收分界。同目錄 `fqc-local.json`、`fqc-before.json` 是清理收據及清理前保全，不重跑套用脚本。
- `.wrangler/local-only/integration-20261005/results.json`：儲存／備份／媒體、帳號隔離及 stale-key、V3 authoring、瀏覽器儲存競爭、records/chunks 等定向隔離 PASS。全檔 lint 仍有 24 項落在檢查點原有程式行的問題，不是全庫 lint 通過。
- `.wrangler/local-only/worktree-reconciliation-20261005/results.json`：35 個來源檔案核對、IPQC-C 維護憑證隔離測試及製程草稿保存測試 PASS；該次定向 lint PASS。

**V3 整體仍 NOT_COMPLETE。** 沿用未受影響有效證據，不全面重跑 T01–T45。連線方向／循環後端通路、IPQC 待補全情境、FQC／品質理由政策差異、全 scope／容量驗收等依正式規格及新需求處理。原生中越輸入法、實體手機觸控／鍵盤遮擋、原員工帳號／裝置仍待驗；390 瀏覽器模擬不等於實機通過。

## 已清理項目與復原

三份舊副本 `ipqc-c-local`、`editor-final-clean`、`editor-image-preview` 的功能已包含或被新版取代，已依授權移除；先備份並核對 3,019 個檔案與三份 Git 歷史包。其餘已整合分支名稱也已刪除，只保留日常開發分支與 main。

- [清理與核對紀錄](docs/WORKTREE_RECONCILIATION_20261005.md)。
- `.wrangler/local-only/worktree-reconciliation-20261005/archive-receipt.json`：專案外副本備份位置。
- 同目錄 `branch-archive-receipt.json`：全部 14 個舊本機分支的 Git bundle 位置與 SHA。這兩類備份位於使用者 Temp，可能被系統清理，長期保留需另行安排持久保管。
- 文件整理前備份：`<TEMP>/process-docs-20261005-XzbRc7`，不是 DB 備份；含私人內容，不上傳 Git。

新對話先核對目錄、分支、HEAD、status、可寫範圍及 Local 可用性，讀本交接與相關規格；依使用者下一個具體需求接續，不重新開始、不自動重做已完成資料動作或恢復已淘汰分支。
## 2026-10-08 畫布走線與間距再次優化

接續本機畫布版：純幾何修正進站重複空欄、分支/匯合端點排序與独立走線；自動整理更緊密，仍需使用者手動同步。本次未寫3020主資料或合成資料，保留全部並行工作；完整證據、備份及驗收界線見[最新報告](docs/ipqc-reference/20261008-canvas-routing-compact.md)。舊C2C權限/connector阻擋未變，未重試設定或更動共享指標。

新增待續 UI 範圍：製程編輯台草稿與版本確認平台各分頁沿最新共用版型；製程審核確認位於版本確認平台的製程平台。主要操作審核／撤回送審，審核內保留核准／發回、固定內容／歷史與自審／權限／鎖定。不得把撤回解釋為刪除草稿。三張新圖 ID libfile_967088893b7481919d1044dc856f5136、libfile_98541136d4608191a8cc590059835512、libfile_fcf7e0a2107081918c0006fab221c84a 尚無本機像素；目前本機沒有 Library prepare_materialize 工具，不猜下載 URL。ZIP 內三張 references 圖已解壓但尚未 view_image；00–05尚待完整閱讀，不依摘要實作。

467／3032檢查點：完整隔離環境已READY_FOR_BROWSER_ACCEPTANCE，localhost:3032，PID8252，根目錄<TEMP>/bom-latest-acceptance-20261010-02；所有state／歷史／R2／圖片／獨立依賴驗證PASS，SPA／示範登入／BOM讀取200，filechooser仍NOT_RUN。完整路徑、角色、啟動及最新manifest見該根handoff.zh-TW.md與isolation-receipt.json。日常PID22004未重啟。舊463失敗副本保留NOT_READY；3033合成fixture PID19780及未存測試頁保留。權限／新增UI實作於本輪結束後以既有queued任務接續，不另造writer。
