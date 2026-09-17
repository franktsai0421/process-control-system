import {demoIdentity,isDemoUser} from '@/lib/demo-identities.mjs';
import {readState,parse,sameOrigin,demoSession,demoEnabled,sessionCookie,clearDemoSession,responseHeaders as headers} from '@/lib/process-state';
import { effectiveAccess } from '@/lib/user-access';

export async function POST(request:Request){
  if(!sameOrigin(request))return Response.json({error:'來源不允許'},{status:403,headers});
  let body:any;try{body=await request.json();}catch{return Response.json({error:'登入資料格式錯誤'},{status:400,headers});}
  if(!body || typeof body!=='object' || Array.isArray(body))return Response.json({error:'登入資料格式錯誤'},{status:400,headers});
  if(body.action==='logout'){clearDemoSession(request);return Response.json({ok:true},{headers:{...headers,'Set-Cookie':'process_demo=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'}});}
  if(Object.prototype.hasOwnProperty.call(body || {}, 'demoRole')){
    if(!demoEnabled(request))return Response.json({error:'此網站未開啟公開示範登入'},{status:403,headers});
    if(!body || Array.isArray(body) || Object.keys(body).some(key=>key!=='demoRole'))return Response.json({error:'示範入口只能指定既有角色'},{status:400,headers});
    const definition=demoIdentity(body.demoRole);
    if(!definition)return Response.json({error:'示範角色無效'},{status:400,headers});
    const state=await readState(),user=parse(state.values.platformUsers,[]).find((u:any)=>u.id===definition.id);
    if(!isDemoUser(user))return Response.json({error:'沒有可用的示範帳號，請檢查 Local 初始化'},{status:403,headers});
    const token=await demoSession(request,user.id);
    if(!token)return Response.json({error:'示範登入暫時無法使用'},{status:503,headers});
    return Response.json({user:{id:user.id,name:user.name,authMode:'demo',sessionType:'demo',...effectiveAccess(user,state.values)}},{headers:{...headers,'Set-Cookie':sessionCookie(request,token)}});
  }
  const id=String(body.id||'').trim().toLowerCase(),password=String(body.password||'');
  if(!id||!password||id.length>80||password.length>200)return Response.json({error:'帳號或密碼錯誤'},{status:401,headers});
  const state=await readState(),users=parse(state.values.platformUsers,[]),user=users.find((item:any)=>String(item.id||'').trim().toLowerCase()===id);
  if(!user || user.deletedAt)return Response.json({error:'帳號不存在',code:'ACCOUNT_NOT_FOUND'},{status:404,headers});
  if(user.enabled===false)return Response.json({error:'此帳號已停用',code:'ACCOUNT_DISABLED'},{status:403,headers});
  if(user.authMode==='demo'||user.password!==password)return Response.json({error:'密碼錯誤',code:'PASSWORD_INCORRECT'},{status:401,headers});
  if(!user.role)return Response.json({error:'此帳號尚未設定使用權限',code:'NO_PERMISSION'},{status:403,headers});
  const token=await demoSession(request,String(user.id).toLowerCase(),false);
  return Response.json({user:{id:String(user.id).toLowerCase(),name:user.name,...effectiveAccess(user,state.values)}},{headers:token?{...headers,'Set-Cookie':sessionCookie(request,token)}:headers});
}
