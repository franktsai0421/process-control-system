export const roleDefaults = {
  admin: { name: 'ADMIN', lines: ['A','B','C'], views: ['dashboard','player','dispatch','productStatus','approval','editor','data'], permissions: ['approval.viewAll','approval.viewLine','approval.compare','approval.submit','approval.withdraw','approval.approve','approval.reject','approval.requestChange','approval.revoke','approval.revise','status.viewAllLines','status.viewDetails','status.viewMedia','master.delete','master.import','master.export'] },
  rd: { name: 'RD 主管', lines: ['A','B','C'], views: ['dashboard','productStatus','approval','editor','data'], permissions: ['approval.viewAll','approval.compare','approval.approve','approval.reject','approval.requestChange','approval.revoke','approval.revise','status.viewAllLines','status.viewDetails','status.viewMedia','master.delete','master.import','master.export'] },
  staff: { name: '製程人員（STAFF）', lines: ['A'], views: ['dashboard','productStatus','approval','editor','data'], permissions: ['approval.viewLine','approval.compare','approval.submit','approval.withdraw','approval.revise','status.viewDetails','status.viewMedia'] },
};
type AccessScope={id?:string; name?:string; lines:string[]; views:string[]; permissions:string[]};
type AccessUser=Partial<AccessScope> & {id:string; role:string; enabled?:boolean; inheritRole?:boolean; deletedAt?:string};
const parse = <T>(value:string|undefined, fallback:T):T => { try { return JSON.parse(value||'') ?? fallback; } catch { return fallback; } };
export function roleTemplates(values:Record<string,string>):Record<string,AccessScope> {
  const overrides = parse(values.processRoleTemplateOverrides, {});
  return { ...roleDefaults, ...Object.fromEntries(parse<AccessScope[]>(values.processCustomRoles, []).map(role => [role.id, role])), ...overrides, admin: roleDefaults.admin };
}
export function effectiveAccess(user:AccessUser, values:Record<string,string>) {
  const role = String(user.id).toLowerCase() === 'admin' ? 'admin' : user.role;
  const preset = roleTemplates(values)[role];
  const scope = role === 'admin' || user.inheritRole !== false ? preset : user;
  const enabled = user.enabled !== false && !user.deletedAt && !!preset;
  return { role, enabled, inheritRole: role === 'admin' || user.inheritRole !== false,
    lines: enabled ? [...new Set(scope?.lines || [])] : [], views: enabled ? [...new Set(scope?.views || [])] : [], permissions: enabled ? [...new Set(scope?.permissions || [])] : [] };
}
