import { env } from 'cloudflare:workers';
import { roleDefaults, roleTemplates } from '@/lib/user-access';
import { readState, encodeValues, identity, publicState, sameOrigin, backup, parse, responseHeaders as headers } from '@/lib/process-state';

const normalizeId = (value: unknown) => String(value || '').trim().toLowerCase();
const defaults: Record<string, any> = {
  admin: { lines: ['A','B','C'], views: ['dashboard','player','dispatch','productStatus','approval','editor','data'], permissions: ['approval.viewAll','approval.viewLine','approval.compare','approval.submit','approval.withdraw','approval.approve','approval.reject','approval.requestChange','approval.revoke','approval.revise','status.viewAllLines','status.viewDetails','status.viewMedia','master.delete','master.import','master.export'] },
  rd: { lines: ['A','B','C'], views: ['dashboard','productStatus','approval','editor','data'], permissions: ['approval.viewAll','approval.compare','approval.approve','approval.reject','approval.requestChange','approval.revoke','approval.revise','status.viewAllLines','status.viewDetails','status.viewMedia','master.delete','master.import','master.export'] },
  staff: { lines: ['A'], views: ['dashboard','productStatus','approval','editor','data'], permissions: ['approval.viewLine','approval.compare','approval.submit','approval.withdraw','approval.revise','status.viewDetails','status.viewMedia'] },
};
const rolePreset = (state: any, role: string) => roleTemplates(state.values)[role] || roleDefaults.staff;
const roleExists = (state: any, role: string) => {
  const overrides = parse(state.values.processRoleTemplateOverrides, {}), custom = parse(state.values.processCustomRoles, []);
  return Boolean(defaults[role] || overrides[role] || custom.some((item: any) => item.id === role));
};
const historicalReference = (values: Record<string,string>, userId: string) => {
  const fields = new Set(['creatorId','reviewerId','actorId','actor','userId','submittedBy','createdBy','updatedBy','ownerId']);
  const visit = (value: any, key = ''): boolean => Array.isArray(value)
    ? value.some((item) => visit(item))
    : value && typeof value === 'object'
      ? Object.entries(value).some(([childKey, child]) => visit(child, childKey))
      : fields.has(key) && normalizeId(value) === userId;
  return Object.entries(values).some(([key, value]) => key !== 'platformUsers' && visit(parse(value, null)));
};
const cleanList = (value: unknown) => [...new Set(Array.isArray(value) ? value.map(String) : [])];

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: '來源不允許' }, { status: 403, headers });
  const state = await readState(), actor = await identity(request, state);
  if (!actor || actor.role !== 'admin') return Response.json({ error: '只有最高 ADMIN 可以管理使用者' }, { status: 403, headers });
  if (state.values.maintenanceMode === '1') return Response.json({ error: '系統維護中，暫停修改帳號' }, { status: 503, headers });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: '資料格式錯誤' }, { status: 400, headers }); }
  if (body.baseRevision !== state.revision) return Response.json(publicState(state), { status: 409, headers });
  const users = parse(state.values.platformUsers, []);
  if (!Array.isArray(users)) return Response.json({ error: '使用者資料損壞' }, { status: 500, headers });
  const action = String(body.action || ''), id = normalizeId(body.id);
  if (['role-save','role-create','role-delete'].includes(action)) {
    const custom = parse(state.values.processCustomRoles, []), overrides = parse(state.values.processRoleTemplateOverrides, {});
    const role = action === 'role-create' ? `custom_${crypto.randomUUID()}` : id;
    if (role === 'admin') return Response.json({error:'ADMIN 角色固定完整權限'}, {status:403,headers});
    if (action !== 'role-create' && !roleExists(state, role)) return Response.json({error:'角色不存在'}, {status:404,headers});
    if (action === 'role-delete') {
      if (['rd','staff'].includes(role)) return Response.json({error:'內建角色不可刪除'}, {status:409,headers});
      if (users.some(user => user.role === role && !user.deletedAt)) return Response.json({error:'請先將此角色的 User 轉移到其他角色'}, {status:409,headers});
      custom.splice(custom.findIndex((item:{id:string}) => item.id === role),1); delete overrides[role];
    } else {
      const name = String(body.name || '').trim();
      if (!name) return Response.json({error:'請輸入角色名稱'}, {status:400,headers});
      const value = {id:role,name,lines:cleanList(body.lines).filter(id=>roleDefaults.admin.lines.includes(id)),views:cleanList(body.views).filter(id=>roleDefaults.admin.views.includes(id)),permissions:cleanList(body.permissions).filter(id=>roleDefaults.admin.permissions.includes(id))};
      if (['rd','staff'].includes(role)) overrides[role] = value;
      else { const index = custom.findIndex((item:{id:string})=>item.id===role); if(index<0)custom.push(value);else custom[index]=value; }
    }
    const values = {...state.values,processCustomRoles:JSON.stringify(custom),processRoleTemplateOverrides:JSON.stringify(overrides)};
    await backup(state,'角色設定異動前保護備份',actor.id,true);
    const result = await env.DB.prepare('UPDATE shared_state SET revision=?,"values"=?,updated_at=? WHERE id=1 AND revision=?').bind(state.revision+1,await encodeValues(values),new Date().toISOString(),state.revision).run();
    return Response.json(result.meta.changes ? publicState({revision:state.revision+1,values}) : publicState(await readState()),{status:result.meta.changes?200:409,headers});
  }
  if (!/^[a-z0-9._-]{1,80}$/.test(id)) return Response.json({ error: '帳號只能使用英文字母、數字、點、底線及連字號，最多 80 字元', field: 'id' }, { status: 400, headers });
  const index = users.findIndex((user: any) => normalizeId(user.id) === id);
  if (action === 'create') {
    if (index >= 0) return Response.json({ error: '此帳號已存在，請使用其他帳號（英文不分大小寫）', field: 'id' }, { status: 409, headers });
    const name = String(body.name || '').trim(), password = String(body.password || ''), requestedRole = String(body.role || 'staff'), role = roleExists(state, requestedRole) ? requestedRole : 'staff', preset = rolePreset(state, role);
    if (!name || password.length < 6) return Response.json({ error: !name ? '請填寫姓名' : '密碼至少需要 6 個字元', field: !name ? 'name' : 'password' }, { status: 400, headers });
    users.push({ id, name, password, role, enabled: true, inheritRole: true, lines: [...preset.lines], views: [...preset.views], permissions: [...preset.permissions] });
  } else {
    if (index < 0 || users[index].deletedAt) return Response.json({ error: '帳號不存在' }, { status: 404, headers });
    const user = users[index];
    if (user.authMode === 'demo' && (action === 'reset-password' || Object.prototype.hasOwnProperty.call(body, 'password') || Object.prototype.hasOwnProperty.call(body, 'passwordHash')))
      return Response.json({ error: '示範身分不使用密碼', field: 'password' }, { status: 400, headers });
    if (action === 'reset-password') {
      const password = String(body.password || '');
      if (password.length < 6) return Response.json({ error: '密碼至少需要 6 個字元' }, { status: 400, headers });
      user.password = password;
    } else if (action === 'update') {
      const requestedRole = String(body.role || user.role || 'staff');
      if (id !== 'admin' && !roleExists(state, requestedRole)) return Response.json({ error: '角色不存在' }, { status: 400, headers });
      const role = id === 'admin' ? 'admin' : requestedRole, preset = rolePreset(state, role), inheritRole = role === 'admin' || user.role !== role || body.inheritRole !== false;
      const enabled = body.enabled !== false;
      if (user.role === 'admin' && user.enabled !== false && (!enabled || role !== 'admin') && users.filter((item: any) => item.role === 'admin' && item.enabled !== false && !item.deletedAt).length === 1)
        return Response.json({ error: '不可停用最後一位 ADMIN' }, { status: 409, headers });
      Object.assign(user, { name: String(body.name || user.name).trim(), role, enabled, inheritRole, lines: inheritRole ? [...preset.lines] : cleanList(body.lines), views: inheritRole ? [...preset.views] : cleanList(body.views), permissions: inheritRole ? [...preset.permissions] : cleanList(body.permissions) });
    } else if (action === 'delete') {
      if (id === normalizeId(actor.id)) return Response.json({error:'不可刪除目前登入的自己'}, {status:409,headers});
      if (user.role === 'admin' && users.filter((item: any) => item.role === 'admin' && item.enabled !== false).length === 1)
        return Response.json({ error: '不可刪除最後一位 ADMIN' }, { status: 409, headers });
      const audit = await env.DB.prepare('SELECT id FROM state_backups WHERE actor=? LIMIT 1').bind(id).first();
      if (historicalReference(state.values, id) || audit) { user.enabled=false; user.deletedAt=new Date().toISOString(); user.deletedBy=actor.id; }
      else users.splice(index, 1);
    } else return Response.json({ error: '不支援的使用者操作' }, { status: 400, headers });
  }
  const values = { ...state.values, platformUsers: JSON.stringify(users) };
  await backup(state, '使用者與權限異動前保護備份', actor.id, true);
  const next = { revision: state.revision + 1, values };
  const result = await env.DB.prepare('UPDATE shared_state SET revision=?,"values"=?,updated_at=? WHERE id=1 AND revision=?').bind(next.revision, await encodeValues(values), new Date().toISOString(), state.revision).run();
  if (!result.meta.changes) return Response.json(publicState(await readState()), { status: 409, headers });
  return Response.json(publicState(next), { headers });
}
