# 全站新照片上傳統一規格

日期：2026-10-24。狀態：使用者已確認一般1600／WebP82%、高清2400／WebP90%、細字及尺寸圖保真例外；本 checkout 已接入共用前端處理。原照片、歷史與正式資料不轉碼。這是本機實作及限定隔離證據，未正式發布；第4階段主要照片入口已完成隔離GUI送審／核准，原生離頁與全專案lint仍有下列界線。階段與資料包見[分階段計畫](../../local-integration/20261024-3000-data-photo-plan.md)。

## 已確認規則與操作

在每個照片選檔處，**選檔前**選擇「照片規格」。每批選入檔案固定當時的選項；不因後續改選而改變已暫存的檔案。繁中／越文共用相同規則，不保存為業務欄位。

| 模式 | 處理 |
| --- | --- |
| 一般（預設） | 保留比例，長邊最多1600px，WebP quality0.82 |
| 高清 | 保留比例，長邊最多2400px，WebP quality0.90 |
| 保真（細字、尺寸圖、原始證據） | 驗證格式及可解碼後沿用原檔 bytes、尺寸、檔名及metadata；不縮圖、不重編碼 |

一般／高清都不放大、不裁切、不拉伸；quality 是編碼參數，不代表相同容量或原始品質的百分比。已符合該模式尺寸、靜態且不含EXIF／XMP／ICC的WebP沿用bytes，避免再次有損編碼；高清不會補出來源原本沒有的細節。其他一般／高清輸出必須是真正WebP，不以副檔名冒充，轉碼失敗明確拒絕，不靜默回退原大圖。瀏覽器輸出可能附帶標準色彩資訊，試驗輸出不帶原EXIF／GPS。保真刻意保留原件metadata。

原始輸入限40,000,000 bytes、解碼後最多50,000,000 pixels；超限提示另存副本。這是瀏覽器處理防護，不代替手機記憶體壓測。最終檔仍受各入口原有5MB／25MB等容量、格式與權限限制；保真不繞過限制。一般PNG可能轉換後稍大，不承諾一律變小。

支援內容與MIME相符的JPEG／PNG／WebP。GIF、APNG及動畫WebP只能選保真，且仍需該入口本來允許該格式；不把動畫扁平化。SVG／HEIC不作照片轉碼；舊圖片仍照原引用顯示。製程原有影片路徑保留，不當照片轉碼。

## 實作入口與相容性

| 入口 | 接入方式 |
| --- | --- |
| 製程作業、產品專用照片、製程主資料、製程設備、編輯台 | app.js的prepareMediaUpload(s)委派共用helper；process-editor／version-workflow／process-equipment沿用此入口 |
| FQC標準主檔 | 選檔處理後才讀Data URL，沿用表單身分／generation／pending檢查 |
| IQC、IPQC-AB／C、品質檢具、模具 | 傳送前共用處理，使用最終MIME與bytes；保留現有API、去重、角色及草稿流程 |
| 例行FQC報告及附件照片 | 共用處理後PUT，固定原照片目標；離開畫面不掛入其他報告 |
| 問題回報選檔及Ctrl+V | 使用當前選檔處模式；處理後保存Blob。處理中不送出，epoch／marker防錯掛，並行批次不突破6張限制 |

唯一處理來源是 `public/process/photo-upload.js`，樣式為photo-upload.css；index.html同步先載入，再載入shared-state及各模組。MutationObserver只為明確accept=image的file input加入規格選單；capture change固定檔案所選模式，沒有全域攔截fetch或重送change。選單置於選檔label外，不影響原標籤點擊／鍵盤動作。原套用、Save、取消、Submit及Approve仍由各模組執行，不自動送審。

處理期間身分／identityGeneration改變即拒絕交給上傳者。共用helper釋放bitmap／object URL／canvas，重試重用同一處理結果。AB／模具／製程等另保留或補入視窗／固定目標檢查；現有CAS、pending、BOM互鎖與後端角色閘門不改。前端規格不是後端強制像素規格，舊客戶端仍按既有API容量／格式／權限規則運作。

**來源匯入／還原例外**：IQC來源照片ID校驗、品質設備來源Excel，以及製程設備Excel內嵌照片、Canonical打包與歷史還原沿用來源bytes與引用，不把舊資料匯入誤作新手動選檔。IQC／設備內部來源上傳明確指定preserveSource；手動入口不能藉UI選取此旗標。不修改來源SHA、不批次處理既有照片。

## 第3階段既有證據與第4階段結果

安全彙總：[實作與精簡包V2](../../local-integration/evidence/20261024-3000-data-photo/implementation-result.json)。

- PASS：共用helper的精確1600/.82與2400/.90參數、小圖、不支援輸出拒絕、重試快取、保真原件、身分切換與資源釋放；實際客戶端函式的最終bytes／MIME、5MB限制前處理、來源SHA例外、AB取消、回報並行6張／epoch／送出保護。
- PASS：實際內建瀏覽器對4張合成圖×3模式共12個輸出，加格式錯誤及合規WebP重用共15項；方向6正確轉為800×1200，保真hash完全一致，小圖不放大。桌面1280與窄iframe 388×842（外框390×844），中越文選單、44px觸控、無橫向溢出；合成預覽的儲存／取消／重開操作核對。這是共用UI fixture，不是全模組正式業務GUI。
- PASS：6個實際photo API在memory SQLite／R2驗標準化WebP上傳、最終SHA、去重、授權讀回、匿名／受限身分／跨來源拒絕，共42項。原有state-media、品質欄位／CAS、檢具刪除fence及feedback API45項通過。
- 第3階段當時FAIL：品質fixture缺guard（422）及Routine FQC deprecated returnValue。第4階段已補正fixture及動作權限、修IPQC-C真實權限缺口，5模組100項PASS；離頁handler改為保留legacy語意的property回傳契約，8組PASS、定向lint PASS。完整lint實跑713檔／208規則仍FAIL1（既有Spinner），未關規則。
- 第4階段PASS：FQC、IQC零件／方法、IPQC-AB/C、檢具分類／設備、模具、流程模板／設備、製程共用／產品照片、例行FQC報告／處置附件，在合成資料的實際SPA與API完成上傳→套用→Save→重開→送審→核准；舊照片及歷史保留。品質／製程不同帳號核准，例行走明確自審確認。回報選檔及Ctrl+V圖片可重開、送出、後台標記完成（此入口不適用版本核准）。派工、產品狀態、播放端讀到核准V3及2400×1650共用圖／3200×2200保真產品圖。14個R2照片body SHA／MIME核對通過，保真附件118,802 bytes與輸入逐byte一致。
- 第4階段GUI：390×844 iframe（375px實際內容寬含scrollbar）、中越文規格選單、44px高、鍵盤選項及Tab，頁面無橫向溢出。透明toast擋住設備套用的問題以pointer-events:none修正，不改任何儲存／核准API。
- 未驗／未完成：新離頁handler的原生dirty/clean重載、取消保留／繼續離頁；IAB換頁被中止，改Chrome Ctrl+R補驗時使用者停止Computer Use，因此不標PASS。實體iPhone、HEIC、50MP記憶體壓測、所有動畫格式、正式線上runtime及服務重啟持久性仍未驗。隔離後端為memory SQLite/R2，不能外推正式D1/R2或服務重啟。
- 安全與逐入口矩陣：[第4階段結果](../../local-integration/evidence/20261024-3000-data-photo/phase4-result.json)。原3000 rev495／4表／100份備份／1,726物件metadata及1,155保留body SHA不變，原照片不轉碼。

資料模型：沒有SQL、migration或業務持久欄位變更；既有inline照片與API圖片結構、權限及歷史引用不變。程式來源已改，階段2配對的source-runtime仍為當時快照，不能把舊來源指紋當作這次實作的程式交付包。

## 2026-10-24 瀏覽器實際壓縮試驗

唯讀盤點精簡包的765張可解碼靜態圖片，選13份入口樣本（11張不重複圖片），涵蓋模具、IQC、IPQC-AB/C、檢具、Canonical與delivery媒體；另作細字／細線、透明、小圖與EXIF方向6共4張合成圖。以可見內建瀏覽器實際Canvas toBlob處理，17份輸入×4方案＝68個輸出；不是以Sharp編碼結果代替瀏覽器結果。原照片、歷史及產品程式未改。

| 方案 | 11張不重複實際圖片原始總量 | 輸出總量 | 本批容量變化 |
| --- | ---: | ---: | ---: |
| 長邊1600、WebP quality0.82 | 29,207,630 bytes | 1,375,144 bytes | 減少95.29% |
| 長邊1600、WebP quality0.90 | 同上 | 2,377,534 bytes | 減少91.86%；1張比原檔大 |
| 長邊2400、WebP quality0.90 | 同上 | 3,634,092 bytes | 減少87.56%；1張比原檔大 |
| 長邊2400、PNG | 同上 | 47,555,450 bytes | 增加62.82%；11張全部比原檔大 |

這是刻意含大型PNG的樣本，不是765張全庫估計，也不保證每張均減少95%。一般方案實際樣本輸出約2.3KB至218KB；不能由此訂成每張一律200KB。已符合尺寸且無EXIF的1536×1024 WebP樣本重編碼只省約2%，較高品質重編碼可能增加容量，因此宜避免對合規WebP反覆有損重編碼。

放大裁切核對：模具標籤及本批一般照片1600/82仍可辨識；有色註解原圖已小於1600，提升上限不會補回來源本來沒有的細節。合成密集小字／細線在1600變模糊，2400/90改善但不等同原圖，PNG仍會因縮圖失去資訊。這不是微小瑕疵、精密量測或正式檢驗證據的業務接受。

68個輸出的實際格式／尺寸與參數一致、不放大；透明fixture的alpha值不變；方向6fixture正確轉成800×1200且輸出不帶EXIF。PSNR只比較同一縮後尺寸的編碼誤差，不能證明縮圖沒有丟失細字，亦不能跨不同尺寸當作清晰度排名。

安全彙總見[階段3實測](../../local-integration/evidence/20261024-3000-data-photo/phase3-result.json)；私有逐圖比較、輸出與HTML報告的路徑由忽略的 `Temp/phase3-photos-20261024/delivery.private.json` 保存，不將實際業務照片放進Git。未驗：HEIC／動圖、40MP解碼壓測、實體手機、印刷與全部業務入口／審核整合。
