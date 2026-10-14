[Tiếng Việt](README.md) | [繁體中文](README.zh-TW.md) | [English](README.en.md)

# PROCESS OS — 中控系統

內部製程及品質標準平台，連結核准主資料、BOM、製程版本、入口發送、產線播放／產品狀態、FQC／IQC／IPQC及檢具。UI支援繁體中文與越文；品質報告、例行檢查及FPY仍有框架範圍，詳見現況。

## 開始與文件路由

- 開發入口：[AGENTS](AGENTS.md)。確認目前checkout、branch／HEAD／未提交工作，不能以舊副本或GitHubmain代替。
- 最新需求：[正式規格](docs/specs/current/README.md)；實作：[AI_CONTEXT](AI_CONTEXT/AI_CONTEXT.md)；持久化：[DATA_MODEL](AI_CONTEXT/DATA_MODEL.md)。
- 目前階段：[HANDOFF](HANDOFF.md)；所有文件、歷史與未決衝突：[索引](docs/DOCUMENTATION_INDEX.md)。
- 員工Git操作：[EMPLOYEE_WORKFLOW](EMPLOYEE_WORKFLOW.zh-TW.md)；Canonical／圖片／Local初始化：[LOCAL_DATA_COLLABORATION](AI_CONTEXT/LOCAL_DATA_COLLABORATION.md)。
- [備份](BACKUP_AND_RESTORE.zh-TW.md)、[BOM](BOM_SEARCH.zh-TW.md)、[主資料](MASTER_ADMIN_UI.zh-TW.md)、[部署](DEPLOYMENT.md)按任務閱讀。

## 執行與驗證

Node需求以package.json engines為準。新clone需要安裝依賴與collaboration:setup；既有工作區不要為小修改重新安装或重建環境。Local入口通常為npm run dev，開啟印出的127.0.0.1網址／process/；已採用的既有Local另依HANDOFF及runtime文件，避免誤跑initializer。

package.json列出實際命令。功能改動選相關fixture／型別／build；UI檢查桌面／窄螢幕及中越；純文件查連結／diff，不預設全部tests。data:export／data:sync會操作Local資料，須任務涉及且先停dev、保護未匯出內容；gitpull／merge不自動寫DB。

## 工程邊界

工作分支→PR→Frank審查／merge；不直接pushmain。Private GitHub Free的Localhook不是伺服器保護。Local D1/R2、帳號、憑證、照片原檔及備份不進Git；D1 DB／R2 STATE_ARCHIVE及legacy相容性保留。Production與Site發佈依DEPLOYMENT精確SHA批准，不能把未提交Local版本或Workerupload當Site更新。

本文件是入口；數量、版本、demo開關、初始化與圖片政策只在對應正式來源維護。
