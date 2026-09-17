import { env } from 'cloudflare:workers';
import { effectiveAccess } from './user-access';
import { demoLoginAllowed, demoIdentity, isDemoUser } from './demo-identities.mjs';
export type State = { revision: number; values: Record<string, string> };
let localSessionSecret = '';
const loopback = (request: Request) => ['localhost','127.0.0.1'].includes(new URL(request.url).hostname);
// Test phase: absent flag is open. Only Frank decides the production cutover.
export const demoEnabled = (_request: Request) => demoLoginAllowed((env as any).DEMO_LOGIN_ENABLED);
const sessionSecret = (request: Request) => (env as any).PROCESS_SESSION_SECRET || (loopback(request) ? (localSessionSecret ||= crypto.randomUUID() + crypto.randomUUID()) : '');
type SessionIdentity = { id: string; sessionType: 'demo' | 'platform' };
async function verifiedSession(request: Request): Promise<SessionIdentity | null> {
  try {
    const secret = sessionSecret(request);
    if (!secret) return null;
    const token = request.headers.get('cookie')?.match(/(?:^|;\s*)process_demo=([^;]+)/)?.[1] || '';
    if (token.length > 4096) return null;
    const [payload, signature, extra] = token.split('.');
    if (extra || !payload || !/^[a-f0-9]{64}$/.test(signature || '')) return null;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign','verify']);
    if (!await crypto.subtle.verify('HMAC', key, Uint8Array.from(signature.match(/../g)!, x=>parseInt(x,16)), new TextEncoder().encode(payload))) return null;
    const value = JSON.parse(atob(payload));
    if (typeof value.id !== 'string' || !Number.isFinite(value.expires) || value.expires <= Date.now()) return null;
    const sessionType = value.version === 2 ? value.sessionType : value.version === undefined && value.demo === false ? 'platform' : null;
    if (sessionType === 'demo') {
      if (!demoEnabled(request) || !['admin','rd','staff'].some(role=>demoIdentity(role)?.id===value.id)) return null;
    } else if (sessionType !== 'platform') return null;
    return { id: value.id, sessionType };
  } catch { return null; }
}
export async function demoSession(request: Request, id?: string, demo = true) {
  if (!id) return (await verifiedSession(request))?.id || null;
  if (demo && (!demoEnabled(request) || !['admin','rd','staff'].some(role=>demoIdentity(role)?.id===id))) return null;
  const secret = sessionSecret(request);
  if (!secret) return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign','verify']);
  const payload = btoa(JSON.stringify({version:2,id,sessionType:demo?'demo':'platform',expires:Date.now()+8*60*60*1000,nonce:crypto.randomUUID()}));
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return payload + '.' + Array.from(new Uint8Array(signature), x=>x.toString(16).padStart(2,'0')).join('');
}
export function clearDemoSession(_request:Request) { /* Logout expires the HttpOnly browser cookie. */ }
export const sessionCookie = (request: Request, token: string) => `process_demo=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
export const responseHeaders = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};
export const publicUntil = Date.parse('2026-09-13T12:00:00+07:00');
export const backupCoverage = [
  { view: '總覽', data: '全站統計與即時狀態所需來源' },
  { view: '產線播放台', data: '已核准製程、工段內容、BOM、設備與照片' },
  { view: '發送介面', data: 'A／B／C 線發送設定與產品安排' },
  { view: '產品製程狀態', data: '產品、路線、BOM 與已核准版本' },
  { view: '版本確認平台', data: '主資料與製程版本、送審狀態及確認紀錄' },
  {
    view: '製程編輯台',
    data: '所有類別工作區、流程方塊、連線、BOM 分配與草稿',
  },
  {
    view: '資料後台',
    data: 'AB／C 類別、產品、BOM、線別、工段、流程資料、使用者與角色權限',
  },
];
export const parse = (s: string | undefined, fallback: any) => {
  try {
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
};
export async function encodeValues(values:Record<string,string>) {
  const raw=JSON.stringify(values);
  if(new TextEncoder().encode(raw).length<512*1024)return raw;
  const bucket=(env as any).STATE_ARCHIVE;
  if(!bucket)throw Error('Large snapshot requires STATE_ARCHIVE storage');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))),b=>b.toString(16).padStart(2,'0')).join('');
  const key=`snapshots/${digest}.json`;
  await bucket.put(key,raw,{httpMetadata:{contentType:'application/json'}});
  return JSON.stringify({__processR2:{key,sha256:digest},platformUsers:values.platformUsers,...(values.maintenanceMode!==undefined?{maintenanceMode:values.maintenanceMode}:{})});
}
export async function decodeValues(raw:string):Promise<Record<string,string>> {
  const stored=JSON.parse(raw);
  if(!stored.__processR2)return stored;
  const ref=stored.__processR2;
  if(!/^snapshots\/[a-f0-9]{64}\.json$/.test(ref.key))throw Error('Invalid snapshot reference');
  const object=await (env as any).STATE_ARCHIVE?.get(ref.key);
  if(!object)throw Error('Snapshot unavailable; database was not modified');
  const data=await object.text();
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(data))),b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==ref.sha256)throw Error('Snapshot integrity check failed');
  const values=JSON.parse(data);
  if(stored.maintenanceMode!==undefined)values.maintenanceMode=stored.maintenanceMode;
  return values;
}
const normalizeUserId = (value: unknown) => String(value || '').trim().toLowerCase();
export async function readState(): Promise<State> {
  // Schema is owned by the checked-in Drizzle migrations, never by public reads.
  const row = await env.DB.prepare(
    'SELECT revision,"values" FROM shared_state WHERE id=1',
  ).first<{ revision: number; values: string }>();
  if (!row) throw Error('Current state is missing; explicit initialization is required');
  const values = await decodeValues(row.values);
  return { revision: row.revision, values };
}
export async function identity(request: Request, state: State) {
  const session = await verifiedSession(request);
  if (session) {
    const user = parse(state.values.platformUsers, []).find((u:any)=>normalizeUserId(u.id)===session.id && u.enabled!==false && !u.deletedAt);
    if (!user || (session.sessionType==='demo' ? !isDemoUser(user) : user.authMode==='demo')) return null;
    return {id:session.id,name:user.name,role:normalizeUserId(user.id)==='admin'?'admin':user.role,authMode:user.authMode,sessionType:session.sessionType};
  }
  const requestUrl = new URL(request.url),
    hostname = requestUrl.hostname;
  const email = request.headers
    .get('oai-authenticated-user-email')
    ?.toLowerCase();
  const verified = !!request.headers.get('oai-authenticated-user-id');
  const platformId = normalizeUserId(request.headers.get('x-process-admin-id')),
    platformPassword = request.headers.get('x-process-admin-password') || '';
  const platformUser =
    platformId && platformPassword
      ? parse(state.values.platformUsers, []).find(
          (user: any) =>
            normalizeUserId(user.id) === platformId &&
            user.enabled !== false &&
            !user.deletedAt &&
            user.authMode !== 'demo' && user.password === platformPassword,
        )
      : null;
  if (platformUser)
    return {
      id: normalizeUserId(platformUser.id),
      name: platformUser.name,
      role: normalizeUserId(platformUser.id) === 'admin' ? 'admin' : platformUser.role,
    };
  // A copied local management-preview URL does not carry the Sites preview
  // identity headers. Allow the explicit manage=1 URL only on loopback hosts;
  // the same query parameter never grants access on the deployed site.
  const localPreview =
    ['localhost', '127.0.0.1'].includes(hostname) &&
    requestUrl.searchParams.get('manage') === '1';
  if (verified && (email === 'franktsai0421@gmail.com' || localPreview))
    return {
      id: 'admin',
      name: localPreview ? '本機檢查管理員' : '系統管理員',
      role: 'admin',
      email,
    };
  if (localPreview)
    return {
      id: 'admin',
      name: '本機檢查管理員',
      role: 'admin',
      email: 'local-preview',
    };
  const user =
    verified &&
    parse(state.values.platformUsers, []).find(
      (u: any) => u.enabled !== false && !u.deletedAt && u.email?.toLowerCase() === email,
    );
  return user ? { id: user.id, name: user.name, role: user.role, email } : null;
}
export async function can(request: Request, state: State, key: string) {
  const user = await identity(request, state);
  if (!user) return false;
  if (user.role === 'admin') return true;
  const stored = parse(state.values.platformUsers, []).find((item: any) => normalizeUserId(item.id) === user.id);
  const role = stored ? effectiveAccess(stored, state.values) : null;
  return (
    !!role &&
    (key.startsWith('view:')
      ? role.views?.includes(key.slice(5))
      : role.permissions?.includes(key))
  );
}
export function publicState(state: State) {
  const values = { ...state.values };
  values.platformUsers = JSON.stringify(
    parse(values.platformUsers, []).map(({ password, ...u }: any) => ({
      ...u,
      role: normalizeUserId(u.id) === 'admin' ? 'admin' : u.role,
    })),
  );
  return { ...state, values };
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('Origin');
  return request.headers.get('Sec-Fetch-Site') !== 'cross-site' && (!origin || origin === new URL(request.url).origin);
}
export const defaultBackupSettings = {
  enabled: false,
  frequency: 'weekly',
  dayOfWeek: 6,
  time: '12:00',
  timezone: 'Asia/Ho_Chi_Minh',
};
export function backupSettings(state: State) {
  const raw = parse(state.values.backupSettings, {}),
    legacy = raw.dayOfWeek === 1 && raw.time === '00:00',
    frequency = 'weekly',
    dayOfWeek = 6,
    time = legacy
      ? '12:00'
      : /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw.time || '')
        ? raw.time
        : '12:00';
  return {
    enabled: raw.enabled === true,
    frequency,
    dayOfWeek,
    time,
    timezone: 'Asia/Ho_Chi_Minh',
  };
}
export function allowedKey(k: string) {
  return (
    [
      'platformUsers',
      'processCustomRoles',
      'processRoleTemplateOverrides',
      'approvalVersions',
      'dispatchBoard',
      'publishedProcess',
      'processMasterData',
      'masterDataControl',
      'bomOverrides',
      'versionSampleSeed4',
      'backupSettings',
    ].includes(k) || k.startsWith('processEditor:')
  );
}
export async function backup(
  state: State,
  reason: string,
  actor: string,
  force = false,
) {
  const slot = new Date().toISOString().slice(0, 13),
    id = force ? crypto.randomUUID() : `hour-${slot}`;
  await env.DB.prepare(
    'INSERT OR IGNORE INTO state_backups(id,revision,"values",reason,actor,created_at) VALUES(?,?,?,?,?,?)',
  )
    .bind(
      id,
      state.revision,
      await encodeValues(state.values),
      reason,
      actor,
      new Date().toISOString(),
    )
    .run();
  await env.DB.prepare(
    'DELETE FROM state_backups WHERE id NOT IN (SELECT id FROM state_backups ORDER BY created_at DESC LIMIT 100)',
  ).run();
  return id;
}
export async function scheduledBackup(state: State) {
  const settings = backupSettings(state),
    [hour, minute] = settings.time.split(':').map(Number),
    now = Date.now(),
    offset = 7 * 60 * 60 * 1000,
    local = new Date(now + offset),
    scheduled = new Date(local);
  if (!settings.enabled) return;
  if (settings.frequency === 'hourly') {
    scheduled.setUTCMinutes(minute, 0, 0);
    if (scheduled.getTime() > local.getTime())
      scheduled.setUTCHours(scheduled.getUTCHours() - 1);
  } else {
    scheduled.setUTCHours(hour, minute, 0, 0);
    if (settings.frequency === 'weekly') {
      scheduled.setUTCDate(
        scheduled.getUTCDate() -
          ((scheduled.getUTCDay() - settings.dayOfWeek + 7) % 7),
      );
    }
    if (scheduled.getTime() > local.getTime())
      scheduled.setUTCDate(
        scheduled.getUTCDate() - (settings.frequency === 'weekly' ? 7 : 1),
      );
  }
  const dueAt = new Date(scheduled.getTime() - offset),
    id = `scheduled-${settings.frequency}-${dueAt.toISOString()}`;
  const label =
    settings.frequency === 'weekly'
      ? '每週'
      : settings.frequency === 'daily'
        ? '每日'
        : '每小時';
  await env.DB.prepare(
    'INSERT OR IGNORE INTO state_backups(id,revision,"values",reason,actor,created_at) VALUES(?,?,?,?,?,?)',
  )
    .bind(
      id,
      state.revision,
      await encodeValues(state.values),
      `整站定期備份 · ${label} ${settings.time}`,
      'system',
      new Date().toISOString(),
    )
    .run();
  await env.DB.prepare(
    'DELETE FROM state_backups WHERE id NOT IN (SELECT id FROM state_backups ORDER BY created_at DESC LIMIT 100)',
  ).run();
}
