# IPQC-AB文件入口

狀態：Current router。需求：[01規格](01_規格與資料結構.md)；匯入才讀[02欄位／增量保護](02_欄位對應與匯入.md)及[07來源決定](07_最新決定_初次匯入與檢具.md)；UI才讀[04](04_UI與驗收.md)。[03待核對](03_資料核對與待處理.md)、[08匯入與還原](08_Local重新匯入結果.md)是2026-09-30來源及操作證據，數量／revision不代表當前DB。

唯一新版Excel：01_最新資料/IPQC_CHUAN_29092026_V.xlsx的IPQC表，SHA256 e5bb57abfbe5ea9221a7e15ed1fd8ab964b9211968fdae872facc7ece8c712b3；RA_SOAT_NHOM不匯入。CSV是逐筆稽核產物，不代替Excel。主資料須以執行當時Local生效AB核對；不模糊映射、不造類別、不改既有手工照片／設備／頻率。

版本流程另見[共享草稿](../../docs/specs/current/SHARED_DRAFT.md)；品質驗證不自動套用製程 advisory；AB/C 三項待補依[最新 IPQC 政策](../../docs/specs/current/IPQC_POLICY.md)。實作見[品質現況](../../AI_CONTEXT/modules/QUALITY.md)，目前待辦見[HANDOFF](../../HANDOFF.md)。來源合併三方baseline不是已淘汰PR#11個人草稿方案。

02_UI設計是示意，不具正式持久化能力。04_歷史文件_不可作為匯入依據僅供追溯；05／06舊prompt已改Deprecated入口。檔案清單_SHA256.json保留來源包當時清單／hash，不是本次修改後MD的即時manifest；本次限制不改JSON。讀文件不授權重新匯入或送審。
