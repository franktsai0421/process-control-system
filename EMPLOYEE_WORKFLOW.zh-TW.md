[Tiếng Việt](EMPLOYEE_WORKFLOW.md) | [繁體中文](EMPLOYEE_WORKFLOW.zh-TW.md) | [English](EMPLOYEE_WORKFLOW.en.md)

# 員工操作流程

此文件是已授權協作時的操作說明，不要求接手dirty工作區切branch/pull。只在核准資料有改動時export；提交前按AGENTS選相關驗證，純文件不跑build／型別／功能全量測試。

## Repository與責任

Frank 與員工一律使用工作分支 → Commit → Push工作分支 → PR → GitHub Actions → Frank審查 → Frank Merge。所有人不得直接或 force push main、刪除 main；員工不得 Merge，日常操作不得以 Owner／管理員權限繞過流程。CI 綠燈仍須 Frank 審查。本機 hook 阻擋在 main 上的 push，以及以 main 為目標的 push。詳見 EMPLOYEE_WORKFLOW.zh-TW.md。

此 Private repository 使用 GitHub Free，未啟用伺服器端 Branch Protection。GitHub 目前不會強制阻止 Write 協作者直接 Push main 或 Merge PR。「只有 Frank Merge」是公司正式規則；本機 hook 只防止誤操作，不是伺服器端保護。CODEOWNERS 識別 Frank 為程式與 Canonical 最終審核人，目前不強制其核准。不得重試付費保護、變更公開狀態或加入開源 LICENSE。

## 第一次Clone

npm install 透過 postinstall 自動啟用版本化本機 pre-push 防呆。安裝後執行 npm run collaboration:setup 確認；若安裝腳本未執行，必須以此啟用。設定只作用於目前 repository，拒絕覆寫既有自訂 hook。

```sh
git clone https://github.com/franktsai0421/process-control-system.git
cd process-control-system
npm install
npm run collaboration:setup
npm run dev
```

上述 Clone／dev 是空白 Canonical 開發環境流程。若收到程式 ZIP 與完整私有公司快照，ZIP 安裝無須先 clone；請依[私有完整開發資料包](docs/local-integration/PRIVATE_DEVELOPMENT_PACKAGE.md)核對同次程式／資料指標，在未啟動 dev、未建立 Local storage 前匯入；不要先啟動 Canonical 再覆蓋完整資料。ZIP 安裝的驗收結果不代表 Git clone 流程已驗證。獨立開發 ADMIN 與一般員工身份不同，登入檔不進 Git／資料包，正常員工帳密及角色依獲授權管理流程處理。

已安裝完整私有快照後，取得核准新版資料包的操作依[離線完整快照更新](docs/local-integration/OFFLINE_SNAPSHOT_UPDATE.md)。f722 隔離 TEST 的完整容量更新、重複、拒絕及恢復已有分項實證；正常服務關站與最終來源／建置／製包仍須依 [HANDOFF](HANDOFF.md)分別接受，不能沿舊來源結果宣稱新版 ZIP 冷安裝或 Git clone 通過。原 rev495 含既有 pending／草稿時仍應拒絕更新，不清理原資料求通過，也不要對已有資料重跑首次匯入器。

## Canonical 圖片同步

資料與圖片版本、來源限制、tombstone及備份／同步保護，以[Local資料協作](AI_CONTEXT/LOCAL_DATA_COLLABORATION.md)為正式來源。不要將歷史初始數量當目前資料量。

## 更新與建立工作分支

先停止 dev。保留既有修改；衝突須審查處理，不重設 Local 資料。

```sh
git switch main
git pull --ff-only
npm run data:sync
git switch -c work/task-name
```

## 提交程式或核准資料

data:export 前先停止 dev。只審查核准的變更，排除帳號、身分欄位與操作歷史。Push工作分支後向 main 建立 PR；員工不得 Merge。CI 通過後由 Frank 審查程式與 Canonical，再於 GitHub Merge。

```sh
git diff
npm run github:preflight
git add <reviewed-files>
git commit -m "Describe reviewed changes"
git push -u origin work/task-name
```

## 取得已Merge資料

Pull與sync前先停止 dev。尚未匯出或競爭變更會停止同步，交由人工審查。

```sh
git switch main
git pull --ff-only
npm run data:sync
npm run dev
```

## 資料與安全

Git 保存程式、migration、Canonical、文件、測試與 Actions。不得提交 Local D1／SQLite／WAL／SHM、R2 blob、Session／Cookie、密碼／Token／secret、.env／.dev.vars、備份、壓縮檔或診斷資料。Local 不連接 Staging／Production。Clone／Pull／Fetch／Commit及正常 GitHub 網頁 PR Merge 不受影響。設定失敗須由維護人審查，不覆寫既有 hook。測試階段快捷入口預設開放；正式營運前必須由Frank明確確認關閉。
