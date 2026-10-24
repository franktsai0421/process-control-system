import {legacyJsonValueText,type JsonValue} from '@/lib/legacy-login-json';
import type {PendingVersion} from '@/lib/legacy-master-types';
import { env } from 'cloudflare:workers';
import {verifiedRecordRestore} from '@/lib/state-records-restore';
import {
  readState,
  encodeValues,
  decodeValues,
  identity,
  sameOrigin,
  backup,
  scheduledBackup,
  backupSettings,
  backupCoverage,
  parse,
  publicState,
  responseHeaders as headers,
} from '@/lib/process-state';
export async function GET(request: Request) {
  const state = await readState({deferHistory:true,deferDependencyHistory:true});
  if ((await identity(request, state))?.role !== 'admin')
    return Response.json(
      { error: '只有 ADMIN 可以查閱備份' },
      { status: 403, headers },
    );
  await scheduledBackup(state);
  const rows = await env.DB.prepare(
    'SELECT id,revision,reason,actor,created_at FROM state_backups ORDER BY created_at DESC LIMIT 100',
  ).all();
  return Response.json(
    {
      backups: rows.results,
      revision: state.revision,
      settings: backupSettings(state),
      coverage: backupCoverage.map((item) => ({
        ...item,
        label: `${item.view}：${item.data}`,
      })),
    },
    { headers },
  );
}
export async function POST(request: Request) {
  const state = await readState({deferHistory:true,deferDependencyHistory:true});
  if (!sameOrigin(request) || (await identity(request, state))?.role !== 'admin')
    return Response.json(
      { error: '只有 ADMIN 可以管理備份' },
      { status: 403, headers },
    );
  let body: {action?:unknown;id?:unknown;confirm?:unknown;baseRevision?:unknown;settings?:{enabled?:unknown;frequency?:unknown;dayOfWeek?:unknown;time?:unknown}};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '格式錯誤' }, { status: 400, headers });
  }
  if (body.action === 'create') {
    await backup(state, 'ADMIN 整站立即備份', 'admin', true);
    return Response.json({ ok: true }, { headers });
  }
  if (body.action === 'settings') {
    if (body.baseRevision !== state.revision)
      return Response.json(
        { error: '資料已更新，請重新整理後再設定' },
        { status: 409, headers },
      );
    const enabled = body.settings?.enabled === true,
      frequency = body.settings?.frequency,
      dayOfWeek = Number(body.settings?.dayOfWeek),
      time = legacyJsonValueText((body.settings?.time || '') as JsonValue);
    if (
      frequency !== 'weekly' ||
      dayOfWeek !== 6 ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
    )
      return Response.json(
        { error: '備份排程固定為每週六，時間格式必須正確' },
        { status: 400, headers },
      );
    await backup(state, '整站備份排程修改前保護備份', 'admin', true);
    const values = {
        ...state.values,
        backupSettings: JSON.stringify({
          enabled,
          frequency,
          dayOfWeek,
          time,
          timezone: 'Asia/Ho_Chi_Minh',
        }),
      },
      next = { revision: state.revision + 1, values };
    const result = await env.DB.prepare(
      'UPDATE shared_state SET revision=?,"values"=?,updated_at=? WHERE id=1 AND revision=?',
    )
      .bind(
        next.revision,
        await encodeValues(values,state),
        new Date().toISOString(),
        state.revision,
      )
      .run();
    if (!result.meta.changes)
      return Response.json(
        { error: '其他使用者剛儲存資料，請重新整理' },
        { status: 409, headers },
      );
    return Response.json(publicState(next), { headers });
  }
  if (body.action === 'delete') {
    if (!body.id || body.confirm !== body.id)
      return Response.json(
        { error: '缺少第二次確認，未刪除備份' },
        { status: 409, headers },
      );
    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM state_backups',
    ).first<{ count: number }>();
    if (Number(count?.count || 0) <= 1)
      return Response.json(
        { error: '至少必須保留最近一個完整雲端備份' },
        { status: 409, headers },
      );
    const result = await env.DB.prepare('DELETE FROM state_backups WHERE id=?')
      .bind(body.id)
      .run();
    if (!result.meta.changes)
      return Response.json(
        { error: '備份不存在或已刪除' },
        { status: 404, headers },
      );
    return Response.json({ ok: true }, { headers });
  }
  if (
    body.action !== 'restore' ||
    body.confirm !== body.id ||
    body.baseRevision !== state.revision
  )
    return Response.json(
      { error: '資料已變更或缺少確認，請重新查看備份' },
      { status: 409, headers },
    );
  const master = parse(state.values.masterDataControl, {}),
    process = parse(state.values.approvalVersions, []);
  const controls=['qualityMasterControl','iqcMasterControl','ipqcABMasterControl','ipqcCMasterControl','routineEquipmentControl','toolingMasterControl','processAuthoringControl'].map(key=>parse(state.values[key],{}));
  const collections=controls.flatMap(control=>control.libraries?Object.values(control.libraries):control.scopes?Object.values(control.scopes):[control]) as {workflow?:{pendingId?:string|null};versions?:{status:string}[]}[];
  const routinePending=parse(state.values.routineFqcControl,{documents:[]}).documents.some((d:{flow?:{pendingId?:string}})=>d.flow?.pendingId);
  if (
    routinePending || (master.versions || []).some((v:PendingVersion) => v.status === 'pending') ||
    process.some((v:PendingVersion) => v.status === 'pending') || collections.some(control=>control.workflow?.pendingId||control.versions?.some(version=>['pending','pending-test'].includes(version.status)))
  )
    return Response.json(
      { error: '尚有送審中的版本，請先完成或解除送審再回復。' },
      { status: 409, headers },
    );
  const row = await env.DB.prepare(
    'SELECT "values" FROM state_backups WHERE id=?',
  )
    .bind(body.id)
    .first<{ values: string }>();
  if (!row)
    return Response.json({ error: '備份不存在' }, { status: 404, headers });
  let values:Record<string,string>,restoredRecords=false;
  try{
    const stored=JSON.parse(row.values);
    if(stored.__processRecords){values=(await verifiedRecordRestore(env.STATE_ARCHIVE,stored)).values;restoredRecords=true;}
    else values=await decodeValues(row.values);
  }catch{
    return Response.json({error:'Không thể xác minh bản sao lưu; chưa khôi phục. / 備份內容無法驗證，未回復。'},{status:503,headers});
  }
  if (!values || typeof values !== 'object')
    return Response.json(
      { error: '備份損壞，未回復' },
      { status: 400, headers },
    );
  await backup(state, '整站回復前保護備份', 'admin', true);
  const result = await env.DB.prepare(
    'UPDATE shared_state SET revision=?,"values"=?,updated_at=? WHERE id=1 AND revision=?',
  )
    .bind(
      state.revision + 1,
      restoredRecords?row.values:await encodeValues(values,state),
      new Date().toISOString(),
      state.revision,
    )
    .run();
  if (!result.meta.changes)
    return Response.json(
      { error: '其他使用者剛儲存資料，請重新確認' },
      { status: 409, headers },
    );
  return Response.json(publicState({ revision: state.revision + 1, values }), {
    headers,
  });
}
