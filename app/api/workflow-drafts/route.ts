/* oxlint-disable typescript/no-explicit-any -- Shared-state payloads are legacy JSON records with route-specific shapes. */
import { env } from 'cloudflare:workers';
import {
  backupStoredState,
  can,
  encodeValues,
  identity,
  parse,
  publicState,
  readState,
  responseHeaders as headers,
  sameOrigin,
  type State,
} from '@/lib/process-state';
import { effectiveAccess } from '@/lib/user-access';
import {
  activeWorkflowSnapshot,
  analyzeWorkflowDraft,
  applyWorkflowChanges,
  ownWorkflowDraft,
  publicDraft,
  valueAt,
  workflowChanges,
  workflowStore,
  type WorkflowCase,
  type WorkflowDraft,
  type WorkflowKind,
  type WorkflowStore,
} from '@/lib/workflow-drafts';

const STORE_KEY = 'workflowDraftsV1';
const normalize = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).trim().toLowerCase()
    : '';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const now = () => new Date().toISOString();
const validKind = (value: unknown): value is WorkflowKind =>
  ['process', 'master', 'bom'].includes(String(value));

function validScope(kind: WorkflowKind, scope: string) {
  if (kind === 'process') return /^[^|]{1,160}\|[ABC]$/.test(scope);
  if (kind === 'master') return ['AB', 'C', 'PROCESS'].includes(scope);
  return scope === 'BOM';
}

function validPayload(kind: WorkflowKind, scope: string, payload: unknown) {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') return false;
  if (kind === 'process')
    return Object.values(payload).every((operations) => Array.isArray(operations));
  if (kind === 'bom') {
    const source = (payload as any).replaceAll ? (payload as any).data : payload;
    return (
      !!source &&
      !Array.isArray(source) &&
      typeof source === 'object' &&
      Object.entries(source).every(
        ([key, rows]) =>
          !['__proto__', 'constructor', 'prototype'].includes(key) &&
          (key.startsWith('__') || Array.isArray(rows)),
      )
    );
  }
  if (scope === 'PROCESS')
    return Object.values(payload).every((templates) => Array.isArray(templates));
  const catalog = payload as any;
  return (
    Array.isArray(catalog.products) &&
    Array.isArray(catalog.lines) &&
    catalog.products.every((product: any) => product?.code && Array.isArray(product.stages)) &&
    catalog.lines.every((line: any) => line?.code && Array.isArray(line.stages))
  );
}

async function scopeAllowed(
  request: Request,
  state: State,
  user: any,
  kind: WorkflowKind,
  scope: string,
  action: string,
) {
  if (action === 'approve') return can(request, state, 'approval.approve');
  if (action === 'reject') return can(request, state, 'approval.reject');
  if (action === 'submit' && !(await can(request, state, 'approval.submit')))
    return false;
  if (kind === 'bom') return can(request, state, 'master.import');
  if (kind === 'master') return can(request, state, 'view:data');
  if (!(await can(request, state, 'view:editor'))) return false;
  const line = scope.split('|')[1];
  if (user.role === 'admin') return true;
  const stored = parse(state.values.platformUsers, []).find(
    (entry: any) => normalize(entry.id) === normalize(user.id),
  );
  return !!stored && effectiveAccess(stored, state.values).lines.includes(line);
}

function responseDraft(values: Record<string, string>, store: WorkflowStore, draft?: WorkflowDraft) {
  return {
    draft: publicDraft(draft),
    analysis: draft ? analyzeWorkflowDraft(values, store, draft) : null,
  };
}

function versionHistory(label: string, actor: any, note = '') {
  return { label, action: label, actor: actor.name || actor.id, actorId: actor.id, note, at: now() };
}

function createPendingMirror(values: Record<string, string>, entry: WorkflowCase, snapshot: any) {
  if (entry.kind === 'process') {
    const [category, line] = entry.scope.split('|');
    const versions = parse(values.approvalVersions, []);
    const number = Math.max(
      0,
      ...versions
        .filter((version: any) => version.category === category && version.line === line)
        .map((version: any) => version.number || 0),
    ) + 1;
    versions.unshift({
      id: entry.id,
      workflowCaseId: entry.id,
      number,
      category,
      line,
      stages: clone(snapshot),
      baseSnapshot: clone(entry.base),
      creatorId: entry.ownerId,
      creatorName: entry.ownerName,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      status: 'pending',
      history: [versionHistory('草稿送出確認', { id: entry.ownerId, name: entry.ownerName })],
    });
    values.approvalVersions = JSON.stringify(versions);
    return;
  }
  const control = parse(values.masterDataControl, { active: {}, versions: [] });
  const scope = entry.kind === 'bom' ? 'BOM' : entry.scope;
  const number = Math.max(
    0,
    ...control.versions
      .filter((version: any) => version.scope === scope)
      .map((version: any) => version.number || 0),
  ) + 1;
  control.versions.push({
    id: entry.id,
    workflowCaseId: entry.id,
    scope,
    number,
    status: 'pending',
    snapshot: clone(snapshot),
    baseSnapshot: clone(entry.base),
    creatorId: entry.ownerId,
    creatorName: entry.ownerName,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    warnings: [],
    history: [versionHistory('草稿送出確認', { id: entry.ownerId, name: entry.ownerName })],
  });
  values.masterDataControl = JSON.stringify(control);
}

function updateMirrorReview(
  values: Record<string, string>,
  entry: WorkflowCase,
  status: 'approved' | 'rejected' | 'withdrawn',
  snapshot: unknown,
  reviewer: any,
  note: string,
) {
  const reviewedAt = now();
  if (entry.kind === 'process') {
    const versions = parse(values.approvalVersions, []);
    const version = versions.find((item: any) => item.workflowCaseId === entry.id || item.id === entry.id);
    if (!version || version.status !== 'pending') throw Error('CASE_VERSION_MISMATCH');
    if (status === 'approved') {
      versions
        .filter(
          (item: any) =>
            item.category === version.category &&
            item.line === version.line &&
            item.status === 'approved' &&
            item.id !== version.id,
        )
        .forEach((item: any) => (item.status = 'superseded'));
      version.stages = clone(snapshot);
      const [category, line] = entry.scope.split('|');
      values[`processEditor:${category}:${line}`] = JSON.stringify({
        category,
        line,
        stages: clone(snapshot),
        savedAt: reviewedAt,
        approvedVersionId: version.id,
      });
    }
    version.status = status;
    version.reviewNote = note;
    version.reviewerId = reviewer.id;
    version.reviewerName = reviewer.name;
    version.reviewedAt = reviewedAt;
    version.updatedAt = reviewedAt;
    version.history = version.history || [];
    version.history.push(versionHistory(status === 'approved' ? '確認核准' : status === 'rejected' ? '拒絕並要求修改' : '解除送審', reviewer, note));
    values.approvalVersions = JSON.stringify(versions);
    return;
  }
  const control = parse(values.masterDataControl, { active: {}, versions: [] });
  const version = control.versions.find(
    (item: any) => item.workflowCaseId === entry.id || item.id === entry.id,
  );
  if (!version || version.status !== 'pending') throw Error('CASE_VERSION_MISMATCH');
  if (status === 'approved') {
    control.versions
      .filter(
        (item: any) =>
          item.scope === version.scope && item.status === 'approved' && item.id !== version.id,
      )
      .forEach((item: any) => (item.status = 'superseded'));
    version.snapshot = clone(snapshot);
    if (entry.kind === 'bom') values.bomOverrides = JSON.stringify(snapshot);
    else {
      control.active[entry.scope] = clone(snapshot);
      if (entry.scope === 'PROCESS') values.processMasterData = JSON.stringify(snapshot);
    }
  }
  version.status = status;
  version.reviewNote = note;
  version.reviewerId = reviewer.id;
  version.reviewerName = reviewer.name;
  version.reviewedAt = reviewedAt;
  version.updatedAt = reviewedAt;
  version.history = version.history || [];
  version.history.push(versionHistory(status === 'approved' ? '確認核准' : status === 'rejected' ? '拒絕並要求修改' : '解除送審', reviewer, note));
  values.masterDataControl = JSON.stringify(control);
}

async function saveState(current: State, values: Record<string, string>, actor: string) {
  await backupStoredState(current.revision, '個人草稿流程異動前保護備份', actor);
  const next = { revision: current.revision + 1, values };
  const result = await env.DB.prepare(
    'UPDATE shared_state SET revision=?,"values"=?,updated_at=? WHERE id=1 AND revision=?',
  )
    .bind(next.revision, await encodeValues(values), now(), current.revision)
    .run();
  return result.meta.changes ? next : null;
}

export async function GET(request: Request) {
  const state = await readState();
  const user = await identity(request, state);
  if (!user) return Response.json({ error: '請先登入' }, { status: 401, headers });
  const url = new URL(request.url);
  const kind = url.searchParams.get('kind');
  const scope = url.searchParams.get('scope') || '';
  const store = workflowStore(state.values[STORE_KEY]);
  if (kind && (!validKind(kind) || !validScope(kind, scope)))
    return Response.json({ error: '草稿範圍錯誤' }, { status: 400, headers });
  const drafts = store.drafts.filter(
    (draft) =>
      draft.ownerId === user.id &&
      draft.status !== 'archived' &&
      (!kind || (draft.kind === kind && draft.scope === scope)),
  );
  const cases = store.cases
    .filter(
      (entry) =>
        entry.ownerId === user.id ||
        entry.status === 'pending' ||
        ['admin', 'rd'].includes(user.role),
    )
    .map(({ base: _base, payload: _payload, changes, ...entry }) => ({
      ...entry,
      changes: changes.map(({ baseValue: _before, mineValue: _after, ...change }) => change),
    }));
  return Response.json(
    {
      drafts: drafts.map((draft) => ({
        ...responseDraft(state.values, store, draft),
        kind: draft.kind,
        scope: draft.scope,
      })),
      cases,
      revision: state.revision,
    },
    { headers },
  );
}

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: '來源不允許' }, { status: 403, headers });
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '資料格式錯誤' }, { status: 400, headers });
  }
  const action = String(body.action || '');
  const kind = body.kind;
  const scope = String(body.scope || '');
  if (!validKind(kind) || !validScope(kind, scope))
    return Response.json({ error: '草稿範圍錯誤' }, { status: 400, headers });

  for (let attempt = 0; attempt < 4; attempt++) {
    const state = await readState();
    const user = await identity(request, state);
    if (!user)
      return Response.json({ error: '登入已失效，草稿未變更' }, { status: 401, headers });
    if (state.values.maintenanceMode === '1')
      return Response.json({ error: '系統維護中，草稿未變更' }, { status: 503, headers });
    if (!(await scopeAllowed(request, state, user, kind, scope, action)))
      return Response.json({ error: '目前帳號沒有此草稿操作權限' }, { status: 403, headers });
    const values = { ...state.values };
    const store = workflowStore(values[STORE_KEY]);
    let draft = ownWorkflowDraft(store, user.id, kind, scope);
    const requested = body.draftId
      ? store.drafts.find((entry) => entry.id === body.draftId)
      : undefined;
    if (body.draftId && !requested)
      return Response.json({ error: '草稿已不存在' }, { status: 404, headers });
    if (requested && requested.ownerId !== user.id)
      return Response.json({ error: '不可讀取或修改其他員工的草稿' }, { status: 403, headers });
    if (requested && draft?.id !== requested.id)
      return Response.json({ error: '草稿識別不相符' }, { status: 409, headers });

    let resultCase: WorkflowCase | undefined;
    try {
      if (action === 'save') {
        if (!validPayload(kind, scope, body.payload))
          return Response.json({ error: '草稿內容結構不完整' }, { status: 400, headers });
        if (draft?.status === 'locked')
          return Response.json({ error: '草稿已送審並鎖定' }, { status: 409, headers });
        const expected = Number(body.expectedVersion || 0);
        if (!draft && expected !== 0)
          return Response.json(
            { error: '草稿已不存在', code: 'DRAFT_VERSION_CONFLICT' },
            { status: 409, headers },
          );
        if (draft && expected !== draft.version)
          return Response.json(
            { error: '草稿已有較新的伺服器版本', code: 'DRAFT_VERSION_CONFLICT', ...responseDraft(values, store, draft) },
            { status: 409, headers },
          );
        const stamp = now();
        if (!draft) {
          draft = {
            id: `WD-${crypto.randomUUID()}`,
            kind,
            scope,
            ownerId: user.id,
            ownerName: user.name || user.id,
            version: 1,
            status: 'draft',
            base: activeWorkflowSnapshot(values, kind, scope),
            payload: clone(body.payload),
            createdAt: stamp,
            updatedAt: stamp,
            resolutions: {},
          };
          store.drafts.push(draft);
        } else {
          draft.payload = clone(body.payload);
          draft.version += 1;
          draft.updatedAt = stamp;
          draft.ownerName = user.name || user.id;
          const latest = workflowChanges(draft.base, draft.payload, kind, scope);
          draft.resolutions = Object.fromEntries(
            Object.entries(draft.resolutions || {}).filter(([id, resolution]: any) => {
              const change = latest.find((item) => item.id === id);
              return change && same(change.mineValue, resolution.mineValue);
            }),
          );
        }
      } else if (action === 'resolve') {
        if (!draft || draft.status !== 'draft')
          return Response.json({ error: '找不到可處理的個人草稿' }, { status: 404, headers });
        if (Number(body.expectedVersion) !== draft.version)
          return Response.json(
            { error: '草稿已有較新的伺服器版本', code: 'DRAFT_VERSION_CONFLICT', ...responseDraft(values, store, draft) },
            { status: 409, headers },
          );
        const analysis = analyzeWorkflowDraft(values, store, draft);
        const conflict = analysis.conflicts.find((item) => item.id === body.changeId);
        if (!conflict)
          return Response.json({ error: '差異已改變，請重新檢查' }, { status: 409, headers });
        if (body.strategy === 'current') {
          const original = analysis.changes.find((change) => change.id === conflict.id)!;
          draft.payload = applyWorkflowChanges(draft.payload, [
            { ...original, baseValue: original.mineValue, mineValue: conflict.currentValue },
          ]);
          delete draft.resolutions?.[conflict.id];
        } else if (body.strategy === 'mine') {
          draft.resolutions ||= {};
          draft.resolutions[conflict.id] = {
            strategy: 'mine',
            currentValue: clone(conflict.currentValue),
            mineValue: clone(conflict.mineValue),
          };
        } else return Response.json({ error: '衝突處理方式錯誤' }, { status: 400, headers });
        draft.version += 1;
        draft.updatedAt = now();
      } else if (action === 'submit') {
        if (!draft || draft.status !== 'draft')
          return Response.json({ error: '找不到可送審的個人草稿' }, { status: 404, headers });
        if (Number(body.expectedVersion) !== draft.version)
          return Response.json(
            { error: '草稿已有較新的伺服器版本', code: 'DRAFT_VERSION_CONFLICT', ...responseDraft(values, store, draft) },
            { status: 409, headers },
          );
        const analysis = analyzeWorkflowDraft(values, store, draft);
        if (!analysis.canSubmit)
          return Response.json(
            { error: analysis.waiting.length ? '同筆資料已有待審案件，整份草稿暫緩送審' : '草稿仍有未處理差異', code: analysis.waiting.length ? 'WAITING_REVIEW' : 'UNRESOLVED_CONFLICT', ...responseDraft(values, store, draft) },
            { status: 409, headers },
          );
        if (analysis.changes.some((change) => change.mineValue === null) && !(await can(request, state, 'master.delete')))
          return Response.json({ error: '此草稿包含刪除，帳號沒有刪除權限' }, { status: 403, headers });
        const stamp = now();
        const merged = applyWorkflowChanges(analysis.current, analysis.changes);
        resultCase = {
          id: `WC-${crypto.randomUUID()}`,
          draftId: draft.id,
          draftVersion: draft.version,
          kind,
          scope,
          ownerId: user.id,
          ownerName: user.name || user.id,
          status: 'pending',
          base: clone(analysis.current),
          payload: clone(merged),
          changes: workflowChanges(analysis.current, merged, kind, scope),
          createdAt: stamp,
          updatedAt: stamp,
        };
        store.cases.push(resultCase);
        draft.status = 'locked';
        draft.lockedCaseId = resultCase.id;
        draft.updatedAt = stamp;
        createPendingMirror(values, resultCase, merged);
      } else if (['approve', 'reject', 'withdraw'].includes(action)) {
        const entry = store.cases.find((item) => item.id === body.caseId);
        if (!entry || entry.kind !== kind || entry.scope !== scope)
          return Response.json({ error: '待審案件不存在' }, { status: 404, headers });
        if (entry.status !== 'pending')
          return Response.json({ error: '案件已由其他主管處理' }, { status: 409, headers });
        const ownerDraft = store.drafts.find((item) => item.id === entry.draftId);
        if (action === 'withdraw') {
          const mayWithdraw =
            entry.ownerId === user.id ||
            user.role === 'admin' ||
            (await can(request, state, 'approval.withdraw'));
          if (!mayWithdraw)
            return Response.json({ error: '沒有解除送審權限' }, { status: 403, headers });
          entry.status = 'withdrawn';
          entry.updatedAt = now();
          updateMirrorReview(values, entry, 'withdrawn', entry.payload, user, '解除送審');
          if (ownerDraft) {
            ownerDraft.status = 'draft';
            ownerDraft.lockedCaseId = undefined;
            ownerDraft.version += 1;
            ownerDraft.updatedAt = now();
          }
        } else if (action === 'reject') {
          const note = String(body.note || '').trim();
          if (!note)
            return Response.json({ error: '退回時必須填寫原因' }, { status: 400, headers });
          entry.status = 'rejected';
          entry.reviewNote = note;
          entry.reviewerId = user.id;
          entry.reviewerName = user.name;
          entry.reviewedAt = now();
          entry.updatedAt = entry.reviewedAt;
          updateMirrorReview(values, entry, 'rejected', entry.payload, user, note);
          if (ownerDraft) {
            ownerDraft.status = 'draft';
            ownerDraft.lockedCaseId = undefined;
            ownerDraft.version += 1;
            ownerDraft.updatedAt = now();
          }
        } else {
          const current = activeWorkflowSnapshot(values, kind, scope);
          const conflicts = entry.changes.filter((change) => {
            const live = valueAt(current, change.path) ?? null;
            return !same(live, change.baseValue) && !same(live, change.mineValue);
          });
          if (conflicts.length)
            return Response.json(
              { error: '現行版本已變更，主管確認已停止；未寫回舊值', code: 'REVIEW_VERSION_CONFLICT', conflicts },
              { status: 409, headers },
            );
          const merged = applyWorkflowChanges(current, entry.changes);
          if (!validPayload(kind, scope, merged))
            return Response.json({ error: '案件內容結構不完整' }, { status: 400, headers });
          const note = String(body.note || '').trim() || '版本內容確認完成';
          entry.status = 'approved';
          entry.payload = clone(merged);
          entry.reviewNote = note;
          entry.reviewerId = user.id;
          entry.reviewerName = user.name;
          entry.reviewedAt = now();
          entry.updatedAt = entry.reviewedAt;
          updateMirrorReview(values, entry, 'approved', merged, user, note);
          if (ownerDraft) {
            ownerDraft.status = 'archived';
            ownerDraft.updatedAt = now();
          }
        }
        resultCase = entry;
      } else {
        return Response.json({ error: '不支援的草稿操作' }, { status: 400, headers });
      }
    } catch (error: any) {
      if (error?.message === 'CASE_VERSION_MISMATCH')
        return Response.json({ error: '案件版本已變更，未執行操作' }, { status: 409, headers });
      throw error;
    }

    values[STORE_KEY] = JSON.stringify(store);
    let next: State | null = null;
    try {
      next = await saveState(state, values, user.id);
    } catch (error: any) {
      if (/changed before backup/i.test(String(error?.message || ''))) continue;
      console.error('[workflow-drafts] persistence failed', error);
      return Response.json({ error: '草稿暫時無法儲存，畫面內容已保留' }, { status: 503, headers });
    }
    if (!next) continue;
    draft = ownWorkflowDraft(store, user.id, kind, scope);
    return Response.json(
      {
        ok: true,
        ...responseDraft(values, store, draft),
        case: resultCase
          ? { ...resultCase, base: undefined, payload: undefined }
          : null,
        state: publicState(next),
      },
      { headers },
    );
  }
  return Response.json(
    { error: '資料同時更新中，草稿未覆蓋；請重新讀取後再試', code: 'SERVER_REVISION_CONFLICT' },
    { status: 409, headers },
  );
}
