## 2026-10-14 shared-state未知結果與改回舊值

queue只有在未posting、未paused、未blocked且desired等於confirmed baseline時，才可清除該dirty鍵。網路結果不明或衝突後的舊baseline不足以證明伺服器仍相同；改回舊值必須保留desired/recovery，經明確儲存與原CAS確認，禁止無dirty而誤報成功。正常未送取消維持不POST。唯讀PROCESS鏡像不清pending或推進confirmed revision；V3 operationId未知收據仍屬獨立client，不能和shared-state ACK混稱。[直接情境及限制](../../docs/local-integration/20261010-permissions-admin.md)。無持久模型變更。

## 2026-10-14 BOM審核清單摘要與語言／手機觸控

`reviewMetadata=1`沿既有workflow GET身分／權限驗證，只傳清單metadata；不讀取完整快照getter，不修改持久內容。BOM審核摘要與編輯模型分開，摘要不推進full-model token，帳號／權限／full revision過期回應隔離；動作前才重讀full control，差異按需載入。未變更輪詢不重繪清單與差異。流程說明用完整中越詞組；表單業務值保持原文。手機頂列至少44px。生效候選、定向驗收及未驗界線見[同一進度](../../docs/local-integration/20261010-permissions-admin.md)。無schema或業務資料修改。


核准PROCESS的applyActive採ProcessSync.projectProcessMaster唯讀鏡像，不排一般shared-state更新、不推進baseline／revision；若processMasterData或masterDataControl有queued／in-flight輸入則不覆蓋。已有master/V3 control時app不執行legacy啟動補種，空白legacy路徑保留。真正dirty、待審鎖與未確認回執不清除。純讀fresh-tab／refresh及VM分項證據見同一進度；API摘要只增選用傳輸模式，持久資料模型不變。

## 2026-10-13 無變更匯入與權限視窗

`bom-workspace.finishImport` 比較套用前後語意摘要，零差異與全數保留不排入本機import佇列；既有其他待送修改不受影響。`user-access` dialog同時排除個人`data-ua-matrix-search`及角色`data-ua-role-search`的搜尋input，真正表單／權限input仍觸發離開保護；新版asset access7。舊已載入頁closure不能僅由磁碟／HTTP最新SHA推定，直接授權後 primary 越文角色搜尋取消及 ADMIN 個人／角色搜尋取消已分項通過，真正變更取消離開能保留輸入；最後放棄已由使用者原生確認、代理事後核對關閉／原值與修訂不變；代理自動原生提示仍NA，見同一進度。權限CSS僅在回報浮鈕位於dialog時保留footer空間，中文及越文窄版主要動作至少44px，角色格／繼承／重設規則不變。登入頁完整詞組中越翻譯及中文欄位誤字已修，未翻譯業務input值。真實報表副本完整審核链与補驗範圍以[同一驗收紀錄](../../docs/local-integration/20261010-permissions-admin.md)為準；未變業務schema或API契約。

## 2026-10-12 BOM 增量匯入與有效授權

`bom-domain.mjs` 按 occurrence ID 合併同主件，保留缺列／後代及原兄弟順序，新位置接至穩定父位置；比對預覽標明合併後結果。新 `import-digiwin` 帶 `baseDigest`、`importMode:incremental-v1`，服務端重新 SHA-256 核對，維持 2 MB／CAS／回執／權限／待審鎖。舊小請求比對格式相容且保留缺列；過大舊請求仍 413。BOM 本機隊列／已拒絕請求不再誤標已儲存；同操作成功重試清除本操作失敗記錄。下階表格投影相對層級，編輯／匯出及深層數值仍用原 ERP 層級。

角色更新比較前後有效格才增加各帳號 authEpoch；主要管理員獨立完整授權，範本名稱／說明變更不登出。本人資料卡含正式角色名稱；普通人不取得角色範本。最新 UI 唯一操作人為本 Codex 任務，3035 使用六個合成帳號及獨立 D1/R2，3032 原帳號和複製案件保留。驗證與限制見[同一收據](../../docs/local-integration/20261010-permissions-admin.md)。下方 2026-10-10 的 Dot 操作分工屬歷史。

## 2026-10-10 使用者與權限候選

共用access-policy 151格與target-specific管理規則，user-access API專用CAS＋保護備份；角色、個人override、啟停、逻輯刪除與自己的密碼均server核對。普通人GET只讀自身，public shared-state／media／409不回傳別人帳號設定或秘密，舊整陣列寫入封鎖。UI角色搜尋與個人搜尋獨立；actor/object/generation隔離GET／POST／render的舊回應。真實14帳號移轉未套用，詳見[規格](../../docs/specs/current/PERMISSIONS_ADMIN.md)、[候選收據](../../docs/local-integration/20261010-permissions-admin.md)。BOM多階後代索引及保留composition輸入元素已候選修正，原生IME與完整最新UI由Dot驗證。

## 2026-10-10 介面與主資料送審

master-review 統一 AB/C/PROCESS/BOM 固定案件清單，BOMWorkspace 提供案件／權限／審核介面；資料頁查看案件以 scope + ID 定位同頁。待審與歷史分開，撤回立即離開待審，保留原因與稽核；差異按需讀取。詳見[統一審核驗證](../../docs/local-integration/20261010-unified-master-review.md)。活動 BOM 頁條件輪詢，保留未儲存輸入與捲動，請求／帳號隔離過期回應。未儲存或衝突時不送出舊快照。master-review 差異表僅展開時計算；共用 VersionDraftUI 歷史只在展開時讀取。[驗證與限制](../../docs/local-integration/20261010-ui-language-review.md)。

## 2026-10-10 BOM 原檔與共用版本

BOM資料頁改由`bom-workspace.js/css`及共用`bom-domain.mjs`處理，舊bom-search介面由此覆蓋；`bom-excel.js`仍載入已核准replaceAll資料作相容消費。`/api/bom/workflow`接`bom-workflow.ts`至既有V3核心，只有核准投影有效bomOverrides；shared-state與canonical sync不得繞過。十欄、原始L1消費、位置ID、草稿保存/待審鎖/歷史與引用提示見[規格](../../docs/specs/current/BOM_REBUILD.md)。最初交付未核准；最新日常已經人類明確授權核准V6，詳見候選收據；[驗收](../../docs/local-integration/20261010-bom-rebuild.md)記錄實際限制。

## 群組最大路線（2026-10-08）

master-admin-ui 共用 maximumRoute / groupRoute / setGroupRoute；AB/C 支援群組預設及產品例外，例外直接顯示路徑。修改同線別類別保留路徑；群組 Apply 同時保護產品集合及工段順序。未變更輪詢略過完整投影，舊帳號/請求回應不覆寫，重繪保留捲動。見 [提交範圍與驗證](../../docs/ipqc-reference/20261008-local-commit.md)。

# 主資料實作現況

## 2026-10-07 群組路線

追加最大路線：同線別／類別產品工段去重聯集，按產品先後關係排序，衝突依主檔順序並提示；既有預設分開保留。採用最大路線只改群組及模式，不改產品 stages；單品預設按鈕只先改表單。例外實際路徑直接顯示；2026-10-08 移除產品／例外「查看路線」按鈕與死處理器，產品換類別保留現有 route。群組 Apply guard 包括 lines 排序與 products。見[最新驗收](../../docs/ipqc-reference/20261007-group-routes-max.md)。

[規格](../../docs/specs/current/GROUP_ROUTES.md)、[驗收](../../docs/ipqc-reference/20261007-group-routes.md)。master-admin-ui 提供群組預設及產品例外，清單40筆分頁僅限制顯示；master-shared-client整份原子Apply、產品集合guard、state revision輪詢及帳號／請求失效保護。master-data僅投影active，保留defaultStages；輪詢可見scope且未變更不重繪，必要更新保留捲動與焦點。移除預設不刪產品路線，實際路線刪除保留權限與確認；工段主檔引用含群組預設。

狀態：Current source notes；整理自本 checkout 既有現況文件。2026-10-05只定向核對來源，不重跑功能測試；歷史數量／版本與PASS僅屬原日期證據。確認需求見[現行規格](../../docs/specs/current/README.md)。

## User Roles

- **Primary ADMIN**: exact enabled formal `frank`; full cells and role/ADMIN creation. Other ADMINs use configured cells and protected self/peer/primary targets; own-password exception remains. No user-ID `admin` role coercion.
- **RD 主管 (`rd`)**: configurable access centered on review/approval, version comparison, status visibility, editor viewing, and selected master-data operations.
- **製程人員 (`staff`)**: configured module/action access; own profile/password only. Legacy line fields remain stored, but lines no longer authorize or deny platform actions.
- **產線設備 (`device`)**: enters a selected line/stage directly and sees only the player.
- **公開查看者 (`viewer`)**: read-only access while the configured public window is open; no protected writes or ADMIN management.
- Only primary Frank manages role templates. Roles retain legacy `views`, `lines`, `permissions` and add real per-cell `access`; individuals add touched `accessOverrides`. Invalid view/action dependencies are rejected, never silently granted.



## Main implementation areas

Important implementation areas:

- `public/process/app.js`: SPA state, routing, editor canvas, dashboard, player, dispatch, status, login, and base master-data UI.
- `public/process/master-data.js` and `master-admin-ui.js`: approved master catalog, draft/review lifecycle, line/category/product/stage synchronization.
- `public/process/version-workflow.js`: process versions, validation, approval actions, production rendering, and dispatch readiness.
- `public/process/permission-controls.js` and `system-upgrade.js`: role templates, complete user administration, page/line/action scope, responsive editor controls, modal editing, pointer movement, and connection mode.
- `public/process/shared-state.js`: in-memory shared-state mirror, explicit browser-to-D1/R2 writes, revision conflict handling, and local recovery state. Generic shared-state cross-tab polling/retry is disabled; the dedicated IPQC-C and IQC V3 clients has scoped revision polling and explicit operation recovery.
- `public/process/bom-search-engine.js`, `bom-search.js`, and `bom-excel.js`: BOM lookup, tree selection, and Excel exchange.
- Dashboard BOM totals are recalculated from the effective BOM after persisted overrides or Excel import: nonempty roots and all rows (including L0). Purchased leaf components can occur in many parent BOMs while correctly having no descendants of their own.
- `public/process/master-page-excel.js` and `line-stage-excel.js`: complete-page, versioned Excel exchange for product/category and line/stage master pages, with legacy partial-import compatibility.
- `public/process/data-safety-ui.js`, `app/api/backups/route.ts`, and `lib/local-backup.mjs`: cloud snapshots and host ZIP backup/restore.

### Master-data lifecycle



1. ADMIN or an authorized role creates an AB or C master-data draft from the currently approved catalog.
2. The shared draft may edit products, categories, lines, ordered routes, and stages. Non-BOM Excel import/export entrances are removed from ordinary user pages; legacy codec support is not a daily-user feature. The line/stage page shares the selected AB/C draft rather than creating another scope.
3. Submission validates identifiers, names, and routes. Deletions are recorded as warnings and require deletion permission.
4. A permitted reviewer approves the exact snapshot. Only approval replaces `masterDataControl.active`.
5. Approved master data updates the product catalog, routing, editor workspaces, stage templates, BOM slots, status, dispatch, and player inputs.



AB/C/PROCESS V3 scopes are separate; line/stage management shares AB/C. Linked route changes may publish a derived PROCESS version in the same CAS, but must not clear independent PROCESS draft/pending work. See models/V3 and current data-model routing.

BOM 離頁依實際欄位差異、待送修改、未套用匯入與未確認保存判定；空修改模式不視為未存。有匯入差異須先套用／放棄才可保存，詳見[20261010檢查點](../../docs/local-integration/20261010-bom-navigation.md)。
