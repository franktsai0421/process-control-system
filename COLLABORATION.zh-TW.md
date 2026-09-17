[Tiếng Việt](COLLABORATION.md) | [繁體中文](COLLABORATION.zh-TW.md) | [English](COLLABORATION.en.md)

# COLLABORATION

## 協作流程

停止 dev、export 核准資料、審查 diff 與 scanner，再 commit／push 分支並建立 PR。Frank 決定 merge；其他人 pull main 後停止 dev 再 sync，不直接 push main。

## 衝突與刪除

未 export 修改或雙方修改同 ID 會停止 sync。保留兩版人工解決，不自動採最後寫入。刪除須用 deletedAt，缺少記錄不表示刪除。人工合併業務資料後以 data:manifest 重建衍生 metadata，不選擇勝出版本。

## 提交前檢查

task:status 顯示版本與未 export 資料；task:submit 匯出、驗證關聯、掃描與 diff，不自動上傳。有 remote 時 task:start 不自動 pull，須手動更新與 sync。不將員工 Email 寫入文件。

Frank 與員工一律使用工作分支 → Commit → Push工作分支 → PR → GitHub Actions → Frank審查 → Frank Merge。所有人不得直接或 force push main、刪除 main；員工不得 Merge，日常操作不得以 Owner／管理員權限繞過流程。CI 綠燈仍須 Frank 審查。本機 hook 阻擋在 main 上的 push，以及以 main 為目標的 push。詳見 EMPLOYEE_WORKFLOW.zh-TW.md。

此 Private repository 使用 GitHub Free，未啟用伺服器端 Branch Protection。GitHub 目前不會強制阻止 Write 協作者直接 Push main 或 Merge PR。「只有 Frank Merge」是公司正式規則；本機 hook 只防止誤操作，不是伺服器端保護。CODEOWNERS 識別 Frank 為程式與 Canonical 最終審核人，目前不強制其核准。不得重試付費保護、變更公開狀態或加入開源 LICENSE。

npm install 透過 postinstall 自動啟用版本化本機 pre-push 防呆。安裝後執行 npm run collaboration:setup 確認；若安裝腳本未執行，必須以此啟用。設定只作用於目前 repository，拒絕覆寫既有自訂 hook。
