import { env } from 'cloudflare:workers';
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
  const state = await readState();
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
  const state = await readState();
  if (!sameOrigin(request) || (await identity(request, state))?.role !== 'admin')
    return Response.json(
      { error: '只有 ADMIN 可以管理備份' },
      { status: 403, headers },
    );
  let body: any;
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
      time = String(body.settings?.time || '');
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
        await encodeValues(values),
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
  if (
    (master.versions || []).some((v: any) => v.status === 'pending') ||
    process.some((v: any) => v.status === 'pending')
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
  const values = await decodeValues(row.values);
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
      await encodeValues(values),
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
