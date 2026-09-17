[Tiếng Việt](README.md) | [繁體中文](README.zh-TW.md) | [English](README.en.md)

# PROCESS OS — 製程中控系統

## 專案目的

以內部平台連結核准主資料、BOM 與製程版本。Canonical 提供可透過 Git 審查的共同基準，每位同仁使用獨立 Local。

## 主要功能

產品與設備主資料、BOM、製程流程圖、版本核准、發送、產線播放、產品狀態、角色與備份。介面支援繁體中文與越南文。

## 專案架構

React/Vinext/TypeScript 提供外框與 API，現有介面位於 public/process。Vite/Miniflare 執行 Local，D1 儲存狀態，R2 儲存大型快照；migration 位於 drizzle。

## Canonical 與 Local

data/canonical 含 16 個領域檔與 manifest，初始共 7,971 筆核准資料；它不是資料庫檔案。Local D1/R2 是個人工作儲存，不進 Git。Merge 只改 Canonical，不寫入 Cloudflare。

## 第一次 Clone

使用已獲授權的 GitHub 帳號 clone Private repository，進入 repository root；不從舊版或備份匯入資料。

```sh
git clone https://github.com/franktsai0421/process-control-system.git
cd process-control-system
```

## 安裝依賴

需要符合 package.json engines 的 Node（>=22.13.0）與 npm。依賴安裝需要 registry 網路，與 Local runtime 分開；不需要 Cloudflare Token 或 Frank 密碼。

npm install 透過 postinstall 自動啟用版本化本機 pre-push 防呆。安裝後執行 npm run collaboration:setup 確認；若安裝腳本未執行，必須以此啟用。設定只作用於目前 repository，拒絕覆寫既有自訂 hook。

```sh
npm install
npm run collaboration:setup
```

## 啟動 Local

執行指令，開啟印出的 127.0.0.1 網址並加上 /process/。初始化失敗會停止啟動。

```sh
npm run dev
```

## 首次資料初始化

只有空白 Local DB 會套用兩個既有 migration、匯入最新 Canonical 並建立 demo-admin/demo-rd/demo-staff。初始 schema/bootstrap 為 1，manifest 驗證 digest。重啟不重新匯入或重置資料。

## Demo 快捷入口

ADMIN、RD、STAFF 保留名稱、位置與既有權限，不使用預設密碼。後端選定三個固定身分；簽章 Session 有效八小時，authMode/sessionType 為 demo。

## Demo 開關

DEMO_LOGIN_ENABLED 未設定／true 允許，false 拒絕新登入及舊 demo Session；不因 hostname 自動關閉。測試階段快捷入口預設開放；正式營運前必須由Frank明確確認關閉。

## Canonical 圖片同步

Fresh clone 執行 npm install、npm run dev 後，會驗證並自動將版本化 Web 圖片匯入自己的 Local R2，直接顯示實際圖片。首次基準有 205 張圖片，Web 包約 7.92 MiB；7,971 筆 Canonical 保留。

修改並核准圖片後先停止 dev，再執行 npm run data:export；資料、Web 圖片、assets/manifest.json、assets/web-manifest.json 與內容版本一併匯出。圖片更新產生新的內容 asset ID；最後一個 Canonical 關聯刪除時產生 deletedAt tombstone，歷史版本仍引用的圖片會保留。經 PR 審查 Merge 後，同仁停止 dev、git pull --ff-only、npm run data:sync，再啟動 dev。同步先備份且拒絕未匯出 Local 修改；重啟及重複同步不重複寫入、不覆蓋 Local 圖片。

Git 只包含去除 EXIF／GPS 等 metadata、最長邊 1600px 的 WebP，以及相對路徑與 SHA-256 manifest。高解析原圖、影片、Local R2 blob 不進 Git；每張 Web 圖片上限 2 MiB，整包上限 25 MiB，超限或缺少來源會停止，不自動採用 LFS／外部服務。同一 asset ID 的來源或 Web hash 衝突會停止。圖片路由只接受啟用 Local 模式的 loopback 請求，未連接 Staging／Production／Sites。

## 匯出資料

匯出前停止 dev。只匯出核准協作資料，使用固定 ID 與穩定排序，排除帳號、歷史及敏感資料；沒有變更時檔案與版本不變。工具不 commit 或 push。

```sh
npm run data:export
```

## 同步資料

pull 後停止 dev 再同步。與上次基準進行三方比較；未 export 修改或同 ID 衝突會被阻擋。錯誤關聯被拒絕，刪除須有 deletedAt；同步先驗證實體備份，驗證失敗則回復。

```sh
git switch main
git pull --ff-only
npm run data:sync
```

## 分支與 Pull Request

Frank 與員工一律使用工作分支 → Commit → Push工作分支 → PR → GitHub Actions → Frank審查 → Frank Merge。所有人不得直接或 force push main、刪除 main；員工不得 Merge，日常操作不得以 Owner／管理員權限繞過流程。CI 綠燈仍須 Frank 審查。本機 hook 阻擋在 main 上的 push，以及以 main 為目標的 push。詳見 EMPLOYEE_WORKFLOW.zh-TW.md。

```sh
npm run task:status
git switch -c data/work-name
npm run task:submit
git add <reviewed-files>
git commit -m "Describe reviewed changes"
git push -u origin data/work-name
```

## Build 與測試

CI 只使用 Local fixture，不部署。下列 scripts 確實存在於 package.json。舊瀏覽器測試需要已安裝 Playwright，PLAYWRIGHT_MODULE／CHROME_PATH 提供可選工具，不自動下載。

```sh
npm run build
npx --no-install tsc --noEmit
npm run test:demo
npm run test:local-schema
npm run test:local-init
npm run test:images
npm run test:canonical
npm run test:data-merge
npm run test:task-safety
npm run test:portable
npm run test:collaboration
npm run data:validate
npm run github:preflight
```

## 禁止提交資料

不得提交密碼、hash、Token、Session／Cookie、真實帳號、個資、.env／.dev.vars、D1／SQLite／WAL／SHM、R2 blob、備份、壓縮檔、log 或診斷資料。.local-backups 已忽略；scanner 不保證任意文字皆安全，新內容仍須人工審查。

```sh
npm run safety:scan
```

## Production 隔離

Local 只使用 loopback，remote bindings 關閉；工具拒絕 Production 參數或設定，不使用正式 secret。本次未建立或連接 Staging；未來只是 Canonical 鏡像，每個 PR 使用隔離 Preview。Production 不因 merge 自動變動。

## 已知限制

Git 包含 205 張受控 Web 圖片及資產索引；原圖留於私有資產包。FQC／IQC／IPQC 是 CLI 協作資料，尚無新品質介面。舊 Local 轉換、正式帳號／hash 與完整依賴稽核仍是後續工作。Main 保護取決於 GitHub 方案，操作規範不等於技術強制。


此 Private repository 使用 GitHub Free，未啟用伺服器端 Branch Protection。GitHub 目前不會強制阻止 Write 協作者直接 Push main 或 Merge PR。「只有 Frank Merge」是公司正式規則；本機 hook 只防止誤操作，不是伺服器端保護。CODEOWNERS 識別 Frank 為程式與 Canonical 最終審核人，目前不強制其核准。不得重試付費保護、變更公開狀態或加入開源 LICENSE。

## 工作副本與文件

repository root 為正式 Git 工作副本；舊版只讀保留供回復，不匯入其歷史或資料。本專案為內部 Private repository，公司條款未確認，未建立開源 LICENSE。

[COLLABORATION](COLLABORATION.zh-TW.md) · [BACKUP_AND_RESTORE](BACKUP_AND_RESTORE.zh-TW.md) · [BOM_SEARCH](BOM_SEARCH.zh-TW.md) · [MASTER_ADMIN_UI](MASTER_ADMIN_UI.zh-TW.md)

[EMPLOYEE_WORKFLOW](EMPLOYEE_WORKFLOW.zh-TW.md)
