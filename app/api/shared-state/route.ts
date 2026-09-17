import { env } from 'cloudflare:workers';
import {
  readState,
  encodeValues,
  identity,
  can,
  publicState,
  sameOrigin,
  allowedKey,
  backup,
  scheduledBackup,
  parse,
  publicUntil,
  demoEnabled,
  responseHeaders as headers,
} from '@/lib/process-state';

const normalizeUserId = (value: unknown) => String(value || '').trim().toLowerCase();
const processPresetKeys = [
  'entry',
  'manual',
  'manual-inspection',
  'machine-assembly',
  'exit',
];
const validProcessCatalog = (
  catalog: unknown,
  requiredStages: string[] = [],
) => {
  if (!catalog || Array.isArray(catalog) || typeof catalog !== 'object')
    return false;
  const entries = Object.entries(catalog as Record<string, unknown>),
    validStages = new Set(requiredStages);
  if (
    requiredStages.some((stage) => !(stage in catalog)) ||
    entries.some(([stage]) => validStages.size > 0 && !validStages.has(stage))
  )
    return false;
  const equipmentIds = new Set<string>();
  return entries.every(([stage, items]) => {
    if (!Array.isArray(items)) return false;
    const ids = new Set<string>();
    const presets = new Set<string>();
    for (const item of items) {
      if (!item || typeof item !== 'object') return false;
      const template = item as Record<string, unknown>;
      const id = String(template.id || '').trim();
      const name = String(template.name || '').trim();
      if (!id || !name || ids.has(id)) return false;
      ids.add(id);
      if (template.presetKey) presets.add(String(template.presetKey));
      if (
        template.mediaItems !== undefined &&
        !Array.isArray(template.mediaItems)
      )
        return false;
      if (template.equipment !== undefined) {
        if (!['machine-assembly', 'machine-setting'].includes(String(template.presetKey)) || !Array.isArray(template.equipment)) return false;
        for (const e of template.equipment as any[]) {
          if (!e || typeof e !== 'object' || typeof e.id !== 'string' || !e.id || equipmentIds.has(e.id) ||
            typeof e.name !== 'string' || !e.name.trim() || typeof e.number !== 'string' ||
            e.stageCode !== stage || e.line !== stage.split('-')[0] || e.kind !== template.presetKey ||
            !Array.isArray(e.mediaItems) || e.mediaItems.some((p:any) => !p || typeof p.src !== 'string')) return false;
          equipmentIds.add(e.id);
        }
      }
    }
    return processPresetKeys.every((key) => presets.has(key));
  });
};
const historicalUserReference = (values: Record<string, string>, userId: string) => {
  const identityFields = new Set(['creatorId','reviewerId','actorId','userId','submittedBy','createdBy','updatedBy','ownerId']);
  const visit = (value: any, key = ''): boolean => {
    if (Array.isArray(value)) return value.some((item) => visit(item));
    if (!value || typeof value !== 'object')
      return identityFields.has(key) && normalizeUserId(value) === userId;
    return Object.entries(value).some(([childKey, child]) => visit(child, childKey));
  };
  return Object.entries(values).some(([key, raw]) =>
    key !== 'platformUsers' && visit(parse(raw, null)),
  );
};

export async function GET(request: Request) {
  const state = await readState(),
    user = await identity(request, state);
  if (!demoEnabled(request) && Date.now() >= publicUntil && user?.role !== 'admin')
    return Response.json(
      { error: '公開檢視期限已結束' },
      { status: 403, headers },
    );
  try {
    await scheduledBackup(state);
  } catch (error) {
    console.error('[cloud-backup] scheduled snapshot failed', error);
  }
  return Response.json(
    { ...publicState(state), identity: user, serverProtected: true, demoEnabled: demoEnabled(request) },
    { headers },
  );
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: '來源不允許' }, { status: 403, headers });
  const state = await readState(),
    user = await identity(request, state);
  if (!user)
    return Response.json(
      { error: '目前是唯讀模式；請由 ADMIN 帳號進入後再修改。' },
      { status: 401, headers },
    );
  if (state.values.maintenanceMode === '1')
    return Response.json(
      { error: '系統正在進行整站還原，暫停新增與修改資料。' },
      { status: 503, headers },
    );
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '資料格式錯誤' }, { status: 400, headers });
  }
  if (
    !body.updates ||
    Array.isArray(body.updates) ||
    typeof body.updates !== 'object'
  )
    return Response.json({ error: '資料格式錯誤' }, { status: 400, headers });
  if (body.baseRevision !== state.revision)
    return Response.json(publicState(state), { status: 409, headers });
  const values = { ...state.values };
  for (const [key, value] of Object.entries(body.updates)) {
    if (!allowedKey(key) || !(value === null || typeof value === 'string'))
      return Response.json(
        { error: '不允許的資料欄位' },
        { status: 400, headers },
      );
    if (value !== null) {
      try {
        JSON.parse(value as string);
      } catch {
        return Response.json(
          { error: '資料 JSON 損壞，未儲存' },
          { status: 400, headers },
        );
      }
    }
    if (value === state.values[key]) continue;
    if (['platformUsers','processCustomRoles','processRoleTemplateOverrides'].includes(key))
      return Response.json({error:'帳號與角色請使用管理介面的專用操作儲存'}, {status:403,headers});
    const required = [
      'platformUsers',
      'processCustomRoles',
      'processRoleTemplateOverrides',
    ].includes(key)
      ? 'admin'
      : key === 'bomOverrides'
        ? 'master.import'
        : key === 'dispatchBoard'
          ? 'view:dispatch'
          : key === 'approvalVersions'
            ? 'view:approval'
            : key.startsWith('processEditor:')
              ? 'view:editor'
              : 'view:data';
    if (
      required === 'admin'
        ? user.role !== 'admin'
        : !(await can(request, state, required))
    )
      return Response.json(
        { error: '目前角色沒有修改此資料的權限' },
        { status: 403, headers },
      );
    if (value === null) delete values[key];
    else values[key] = value as string;
  }
  const master = parse(values.masterDataControl, null);
  if (
    master &&
    (!master.active?.AB || !master.active?.C || !Array.isArray(master.versions))
  )
    return Response.json(
      { error: '主資料缺少版本或產線，未儲存' },
      { status: 400, headers },
    );
  if (master)
    for (const scope of ['AB', 'C']) {
      const catalog = master.active[scope];
      if (
        !Array.isArray(catalog.products) ||
        !Array.isArray(catalog.lines) ||
        catalog.products.some(
          (p: any) => !p.code || !Array.isArray(p.stages),
        ) ||
        catalog.lines.some((l: any) => !l.code || !Array.isArray(l.stages))
      )
        return Response.json(
          { error: '主資料結構不完整' },
          { status: 400, headers },
        );
    }
  const processStages = master
    ? ['AB', 'C'].flatMap((scope) =>
        master.active[scope].lines.flatMap((line: any) =>
          line.stages.map((stage: any) => String(stage.code || '')),
        ),
      )
    : [];
  if (
    master?.active?.PROCESS &&
    !validProcessCatalog(master.active.PROCESS, processStages)
  )
    return Response.json(
      { error: '流程資料結構不完整' },
      { status: 400, headers },
    );
  if (
    master?.versions?.some(
      (version: any) =>
        version.scope === 'PROCESS' &&
        !validProcessCatalog(version.snapshot),
    )
  )
    return Response.json(
      { error: '流程資料版本結構不完整' },
      { status: 400, headers },
    );
  const prior = parse(state.values.masterDataControl, null);
  if (prior && master && JSON.stringify(prior) !== JSON.stringify(master)) {
    const processScopeInitialization = Boolean(
      !prior.active?.PROCESS &&
        master.active?.PROCESS &&
        JSON.stringify(prior.active?.AB) === JSON.stringify(master.active?.AB) &&
        JSON.stringify(prior.active?.C) === JSON.stringify(master.active?.C) &&
        JSON.stringify(master.active.PROCESS) ===
          JSON.stringify(parse(state.values.processMasterData, {})),
    );
    if (
      JSON.stringify(prior.active) !== JSON.stringify(master.active) &&
      !processScopeInitialization &&
      !(await can(request, state, 'approval.approve'))
    )
      return Response.json(
        { error: '只有主管核准才能變更生效資料' },
        { status: 403, headers },
      );
    const removed = (a: any, b: any) =>
      a.some((x: any) => !b.some((y: any) => y.code === x.code));
    let deletion = false;
    for (const v of master.versions) {
      const before = prior.versions.find((p: any) => p.id === v.id) || {
        snapshot: prior.active[v.scope],
      };
      if (before?.snapshot && v.snapshot) {
        if (v.scope === 'PROCESS') {
          const nextEquipment = new Set(Object.values(v.snapshot).flatMap((items:any) => items.flatMap((item:any) => (item.equipment || []).map((e:any) => e.id))));
          deletion ||= Object.values(before.snapshot).some((items:any) => items.some((item:any) => (item.equipment || []).some((e:any) => !nextEquipment.has(e.id))));
          deletion ||= Object.entries(before.snapshot).some(
            ([stage, items]: [string, any]) =>
              !Array.isArray(v.snapshot[stage]) ||
              items.some(
                (item: any) =>
                  !v.snapshot[stage].some((next: any) => next.id === item.id),
              ),
          );
        } else {
          deletion ||=
            removed(before.snapshot.products || [], v.snapshot.products || []) ||
            removed(before.snapshot.lines || [], v.snapshot.lines || []) ||
            removed(
              (before.snapshot.lines || []).flatMap((l: any) => l.stages || []),
              (v.snapshot.lines || []).flatMap((l: any) => l.stages || []),
            );
          deletion ||=
            (before.snapshot.products || []).some((p: any) => {
              const next = (v.snapshot.products || []).find(
                (n: any) => n.code === p.code,
              );
              return (
                next &&
                (p.stages || []).some(
                  (code: string) => !next.stages.includes(code),
                )
              );
            }) ||
            (before.snapshot.categoryGroups || []).some(
              (g: any) =>
                !(v.snapshot.categoryGroups || []).some(
                  (n: any) => n.line === g.line && n.name === g.name,
                ),
            );
        }
      }
      if (
        before &&
        before.status !== 'approved' &&
        v.status === 'approved' &&
        !(await can(request, state, 'approval.approve'))
      )
        return Response.json(
          { error: '沒有主管核准權限' },
          { status: 403, headers },
        );
    }
    if (
      deletion &&
      (!(await can(request, state, 'master.delete')) ||
        prior.versions.some((v: any) => v.status === 'pending'))
    )
      return Response.json(
        { error: '無刪除權限，或仍有送審案件' },
        { status: 403, headers },
      );
  }
  if (values.processMasterData !== state.values.processMasterData) {
    const before = parse(state.values.processMasterData, {}),
      after = parse(values.processMasterData, {});
    if (
      master?.active?.PROCESS &&
      JSON.stringify(after) !== JSON.stringify(master.active.PROCESS)
    )
      return Response.json(
        { error: '流程資料必須先送審並由主管核准' },
        { status: 403, headers },
      );
    const removed = Object.entries(before).some(([stage, items]: any) =>
      items.some(
        (item: any) =>
          !(after[stage] || []).some((next: any) => next.id === item.id),
      ),
    );
    const approvingProcessDeletion = Boolean(
      prior &&
        master &&
        (await can(request, state, 'approval.approve')) &&
        master.versions.some((version: any) => {
          const previous = prior.versions.find(
            (item: any) => item.id === version.id,
          );
          return (
            version.scope === 'PROCESS' &&
            previous?.status === 'pending' &&
            version.status === 'approved' &&
            JSON.stringify(version.snapshot) ===
              JSON.stringify(master.active.PROCESS) &&
            JSON.stringify(version.snapshot) === JSON.stringify(after)
          );
        }),
    );
    if (
      removed &&
      (!(await can(request, state, 'master.delete')) ||
        (prior?.versions?.some((v: any) => v.status === 'pending') &&
          !approvingProcessDeletion))
    )
      return Response.json(
        { error: '流程範本刪除已鎖定：需刪除權限且不可有送審案件' },
        { status: 403, headers },
      );
  }
  if (values.approvalVersions !== state.values.approvalVersions) {
    const before = parse(state.values.approvalVersions, []),
      after = parse(values.approvalVersions, []);
    if (!Array.isArray(after))
      return Response.json(
        { error: '版本資料格式錯誤' },
        { status: 400, headers },
      );
    if (
      after.some(
        (v: any) =>
          v.status === 'approved' &&
          before.find((p: any) => p.id === v.id)?.status !== 'approved',
      ) &&
      !(await can(request, state, 'approval.approve'))
    )
      return Response.json(
        { error: '沒有主管核准權限' },
        { status: 403, headers },
      );
  }
  if (Object.prototype.hasOwnProperty.call(body.updates, 'platformUsers') && values.platformUsers) {
    const users = parse(values.platformUsers, []),
      old = parse(state.values.platformUsers, []);
    if (!Array.isArray(users))
      return Response.json({ error: '使用者資料格式錯誤' }, { status: 400, headers });
    const ids = users.map((u: any) => normalizeUserId(u.id));
    if (ids.some((id: string) => !id || !/^[a-z0-9._-]{1,80}$/.test(id)))
      return Response.json({ error: '帳號只可使用英文字母、數字、點、底線及連字號' }, { status: 400, headers });
    if (new Set(ids).size !== ids.length)
      return Response.json({ error: '英文帳號不分大小寫且不可重複' }, { status: 409, headers });
    const normalized = users.map((u: any, index: number) => {
      const id = ids[index], previous = old.find((o: any) => normalizeUserId(o.id) === id);
      return {
        ...u,
        id,
        name: String(u.name || '').trim(),
        role: id === 'admin' ? 'admin' : (u.role || 'staff'),
        enabled: u.enabled !== false,
        inheritRole: u.inheritRole !== false,
        lines: Array.isArray(u.lines) ? u.lines : [],
        views: Array.isArray(u.views) ? u.views : [],
        permissions: Array.isArray(u.permissions) ? u.permissions : [],
        password: u.password || previous?.password,
      };
    });
    if (normalized.some((u: any) => !u.name || !u.password))
      return Response.json({ error: '使用者姓名與密碼不可空白' }, { status: 400, headers });
    if (!normalized.some((u: any) => u.role === 'admin' && u.enabled !== false))
      return Response.json({ error: '不可停用或刪除最後一位 ADMIN' }, { status: 409, headers });
    const deleted = old.filter((u: any) => !normalized.some((n: any) => n.id === normalizeUserId(u.id)));
    const protectedUser = deleted.find((u: any) => historicalUserReference(state.values, normalizeUserId(u.id)));
    if (protectedUser)
      return Response.json({ error: `帳號 ${normalizeUserId(protectedUser.id)} 已有歷史紀錄，只能停用` }, { status: 409, headers });
    values.platformUsers = JSON.stringify(
      normalized,
    );
  }
  // Multiple open browser tabs can repeat an already-applied localStorage write.
  // Treat an identical snapshot as a successful no-op so it does not create a
  // backup or consume a revision number on every polling cycle.
  if (JSON.stringify(values) === JSON.stringify(state.values))
    return Response.json(publicState(state), { headers });
  await backup(state, '整站資料異動前保護備份', user.id, true);
  const next = { revision: state.revision + 1, values };
  const result = await env.DB.prepare(
    'UPDATE shared_state SET revision=?,"values"=?,updated_at=? WHERE id=1 AND revision=?',
  )
    .bind(
      next.revision,
      await encodeValues(values),
      new Date().toISOString(),
      state.revision,
    )
    .run();
  if (!result.meta.changes)
    return Response.json(publicState(await readState()), {
      status: 409,
      headers,
    });
  return Response.json(publicState(next), { headers });
}
