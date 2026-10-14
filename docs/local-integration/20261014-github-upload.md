# 2026-10-14 GitHub 整合候選

本輪最新狀態見 [驗證矩陣](20261014-evidence-matrix.json)。PASS 僅適用所列範圍；完整 GUI、實體手機、跨機及全站效能沒有被升格為 PASS。

## 乾淨初始化與可攜性補正

冷啟動發現 `loadTypeScript` 使用 repository-root `createRequire`，導致 `lib/user-access.ts` 的相對權限 policy 匯入找錯位置。已改以被載入的 source filename 解析，相依 fixture 同時帶入實際 policy；隔離空白建立、重複建立、安全拒絕及保留既有資料測試 PASS。沒有 schema、帳號規則或 Main 資料變更。

上傳候選從遠端 main `51a3979c7639b4ecc00295b5fac55c51e835039e` 的獨立 Git database 建立，覆蓋 opened checkout 的最新成果。原工作區、本機未上傳 commits 與恢復備份完整保留，不改寫歷史。機器固定 Chrome 路徑改為 Playwright `chrome` channel，既有明確環境覆寫仍適用；外部 fixture/evidence 必須由 caller 提供絕對路徑，缺少即拒絕，不能以空資料替代。Windows 安全測試仍保留 drive root、quoted spaces、`--import` 與 foreign runtime 情境。歷史文件保留獨特檔名，位置以 portable root label 表示；精確原位置仍在私有恢復證據。

獨立核對 1,452 source bytes/hash 全符，475 未納入素材仍保留且 hash 全符。兩份約 9.48MB 原始設備 Excel 保留於私有原件，發布 source 以 [原始資產清單](../../KD/ROUTINE/REFERENCE_ASSETS.json) 記錄 SHA、大小、用途與取得方式。候選建置 PASS；51 個遠端歷史 commit 與 current source 的 preflight 零 findings，未放寬全域 guard。83 個修改 script 語法及兩組隔離／停止安全測試 PASS。

## 審核流程與 lint 的實際範圍

Canonical 摘要不符已定位到還原時唯讀 SQLite 改變 D1 SHM read marks；其餘逐檔 bytes/SHA 與全部 SQLite table 內容一致。測試僅分類嚴格 D1 SHM 路徑的易變 digest，另對隔離副本驗 integrity 與所有 table，原件與預期 digest 不改。Canonical、images、data-merge 三組定向 PASS。master-admin 舊 fixture 的 shared bridge 相依及 obsolete submit 期望已更新至實際 loader／固定 Save 契約；pure component 與 signed handler 兩個範圍 PASS，原失敗保留，無 GUI 宣稱。

完整開發包 V3 的 substring 去敏會誤刪合法 `user-password.edit` policy cell，已撤銷交付资格。新的 schema/context 修正須獨立對來源 current、100 history 及 orphan objects 的角色與覆蓋整樹核對，不能只拿去敏後結果自證。中間 database.json／inspection-copy／fresh login target 不得分發或進 Git。

獨立實際 handler 補驗 11 scope 的 Save、固定 Submit、Withdraw、解鎖、working/saved 原文保留、沿同 savedId 重送新 case、另一帳號 Approve 及 history PASS。Tooling、BOM 新 scope 的兩帳號 CAS 不同欄及 Save 保留兩人內容 PASS。來源與審核端 GUI 撤回入口均有 source 盤點；自有瀏覽器 goto 遭 `ERR_NETWORK_ACCESS_DENIED`，雙端 GUI 明確 BLOCKED。fresh handler GET 不等同 browser 重開。

Lint 由38→37→25，12項安全清理為 local binding名稱、unused catch/callback名稱及純Set配置/計數；規則未放寬。25 項 lint 仍為 FAIL。獨立引用核對未從這 25 項確認新 runtime 缺陷；跨檔 global 重賦值、另一模組使用的 helper、legacy enhancement 插入、Storage 明確 receiver 與 beforeunload 相容不可盲刪。可局部清理的命名／未使用參數／舊 helper 保持為技術債；未用屏蔽、`void` 或全域 relaxation 製造 PASS。實際 import Promise race 已修正並有 8 項測試。

Main sealed rev495 的 D1 sqlite/WAL 與 R2 indexed sqlite/WAL，在 2026-10-14 09:19 UTC 雙讀 SHA/bytes 與日常來源精確一致；零 Main SQLite handle、零 write。因此既有完整 8.17GB 備份還原證據沿用，無需重做。完整去敏開發包另進行全 current/history/R2/靜態資產處理；其 READY、初始化、還原及登入結果以最終收據為準，不能以 source ZIP 或 canonical 截斷資料代替。

狀態：準備中，非可發布接受。唯一主執行者於交接確認後使用目前工作樹，保留日常資料及3040／3050暫停成果。整合工作分支 `codex/github-upload-20261014` 已納入遠端 main；禁止以舊副本取代現況。

## 本次修正與驗證

- 實際 `version-workflow.js` 播放器初次載入，只有一條合法線有有效產品派送時選該線；後續 render保留手選，固定設備不跟隨其他線派送。沒有修改伺服器權限或發送資料。production renderer的7個隔離VM案例PASS；不是實體設備／GUI接受。
- 舊流程主資料匯入入口等待begin成功，重核操作者、待審鎖及權限後才繼續；begin可從已選核准歷史版正確選到新草稿。8個production handler案例PASS。V3內容匯入仍依既有 `NON_BOM_EXCHANGE_DISABLED` 拒絕，未啟用匯入，也未宣稱真瀏覽器chooser接受。
- V3 Save真handler已commit後模擬ACK遺失，production transport保留未知操作；新client重開查同一actor receipt，核對saved ID／完整body／cutoff，沒有第二次Save或額外revision；後續working不能改saved。5個SQLite／R2隔離案例PASS。不是實際瀏覽器reload或跨電腦接受。
- TypeScript最初掃到Temp3050副本缺檔而FAIL。候選來源不含Temp，正式程式不依賴暫存／worktree；tsconfig排除這些獨立目錄，保留正式依賴檢查後PASS。副本未刪除／重啟。Temp、Python cache亦排除版本控制。
- 受影響8檔目前lint25項：原四檔38項先修正一項未等待Promise，再安全清理12項命名／未用binding／Set操作。其餘診斷仍FAIL，未關規則或聲稱全庫PASS。

## 重用及界線

1,358-source候選 `4a7bb262…f4ef` 與盤點時工作樹SHA全部相同。其來源包與owner build原PASS、4,228角色決策五項相依hash、封存Main備份還原、合成升級／冪等及獨立依賴安裝有證據可沿用。本次新產品來源須新建置，不能沿用舊build作最終候選PASS。詳細本機矩陣保留於Temp的github-upload-evidence-reuse-20261014.json。

最新「獨立13/13」為交接轉述；已找到的原收據綁旧30151ca4／1356-source候選，未找到4a7bb的原收據。保留旧PASS，不改標版本或為新任務無差別重測。

逐頁舊9-scope及10-module證據保留，但與新整份AB、Tooling、BOM及最新權限／待補／自審政策逐項對照；全部來源／review撤回入口、完整GUI與多人跨頁覆蓋尚不可宣稱完成。全角色151格GUI、跨電腦、實體手機／IME、全站CWV與完整桌面像素仍未驗。

## 資料包與發布關卡

现有程式ZIP是source-only；封存完整物理備份含私有憑證，僅供受控復原，不能進Git或當開發分發包。Canonical匯出會省略部分草稿、歷史及帳號關聯，不符合完整開發包。去憑證完整包與獨立普通帳號bootstrap／乾淨clone還原仍未完成；不得把Frank改成DEMO或對日常3000產生假案件。

本次沒有schema、業務資料或正式環境變更。單一PR及CI尚待固定候選與安全核對；必要接受未完成前不得合併。Frank最終審核／合併及Production精確main SHA批准仍適用。

## 2026-10-14 最終候選準備

V3包曾因清理規則移除136個合法user-password權限欄位（47/404失敗），已撤銷READY並保留失敗證據。V4從原件重建：404組／10,734欄位及全956 JSON／4,458欄位比較皆無差異；分發2032檔掃描無credential欄位或已知secret模式。manifest SHA `1e4ee98164ab957b34af7774e3a15584296545de9b1bbb148e1c174e0bd15cec`。此為私有logical包通過，不代表實際runtime或GUI通過。

新增[完整私有開發包還原工具](PRIVATE_DEVELOPMENT_PACKAGE.md)，只允許全新本機storage。實際Miniflare冷還原仍在驗證：已修正target ownership、metadata核對及migration初始feedback singleton與完整feedback匯入衝突。失敗副本保留，完成前不可發布READY。

本次清理實際無用程式與九個可重賦值延伸函式，八個精準lint註記保留跨檔global／Storage receiver／beforeunload相容；不更改全域規則。當前受影響範圍lint0、import入口8及current master bridge／signed handler回歸PASS。完整lint仍FAIL，須在PR如實列出，不能稱全站PASS。

來源由remote main獨立Git DB整合，原工作目錄refs、歷史、修改、兩份大型參考Excel及未納入證據均保留；只有一個整合分支／PR，沒有force push或production資料改寫。GUI兩端撤回受policy限制；跨電腦、實體手機與全站性能未驗證。
