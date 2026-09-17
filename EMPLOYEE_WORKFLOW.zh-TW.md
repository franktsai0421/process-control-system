[Tiếng Việt](EMPLOYEE_WORKFLOW.md) | [繁體中文](EMPLOYEE_WORKFLOW.zh-TW.md) | [English](EMPLOYEE_WORKFLOW.en.md)

# 員工操作流程

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

## Canonical 圖片同步

Fresh clone 執行 npm install、npm run dev 後，會驗證並自動將版本化 Web 圖片匯入自己的 Local R2，直接顯示實際圖片。首次基準有 205 張圖片，Web 包約 7.92 MiB；7,971 筆 Canonical 保留。

修改並核准圖片後先停止 dev，再執行 npm run data:export；資料、Web 圖片、assets/manifest.json、assets/web-manifest.json 與內容版本一併匯出。圖片更新產生新的內容 asset ID；最後一個 Canonical 關聯刪除時產生 deletedAt tombstone，歷史版本仍引用的圖片會保留。經 PR 審查 Merge 後，同仁停止 dev、git pull --ff-only、npm run data:sync，再啟動 dev。同步先備份且拒絕未匯出 Local 修改；重啟及重複同步不重複寫入、不覆蓋 Local 圖片。

Git 只包含去除 EXIF／GPS 等 metadata、最長邊 1600px 的 WebP，以及相對路徑與 SHA-256 manifest。高解析原圖、影片、Local R2 blob 不進 Git；每張 Web 圖片上限 2 MiB，整包上限 25 MiB，超限或缺少來源會停止，不自動採用 LFS／外部服務。同一 asset ID 的來源或 Web hash 衝突會停止。圖片路由只接受啟用 Local 模式的 loopback 請求，未連接 Staging／Production／Sites。

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
npm run data:export
git diff
npm run build
npx --no-install tsc --noEmit
npm run test:collaboration
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
