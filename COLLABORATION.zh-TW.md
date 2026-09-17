[Tiếng Việt](COLLABORATION.md) | [繁體中文](COLLABORATION.zh-TW.md) | [English](COLLABORATION.en.md)

# COLLABORATION

## 協作流程

停止 dev、export 核准資料、審查 diff 與 scanner，再 commit／push 分支並建立 PR。Frank 決定 merge；其他人 pull main 後停止 dev 再 sync，不直接 push main。

## 衝突與刪除

未 export 修改或雙方修改同 ID 會停止 sync。保留兩版人工解決，不自動採最後寫入。刪除須用 deletedAt，缺少記錄不表示刪除。人工合併業務資料後以 data:manifest 重建衍生 metadata，不選擇勝出版本。

## 提交前檢查

task:status 顯示版本與未 export 資料；task:submit 匯出、驗證關聯、掃描與 diff，不自動上傳。有 remote 時 task:start 不自動 pull，須手動更新與 sync。不將員工 Email 寫入文件。
