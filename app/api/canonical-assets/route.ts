import {env} from 'cloudflare:workers';
import manifest from '@/data/canonical/assets/manifest.json';

export async function GET(request: Request) {
  const url=new URL(request.url);
  const bindings=env as {STATE_ARCHIVE?: R2Bucket; PROCESS_LOCAL_IMAGES?: string};
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||bindings.PROCESS_LOCAL_IMAGES!=='true')
    return new Response('Local images only',{status:404});
  const id=url.searchParams.get('id'),version=url.searchParams.get('version');
  if(!id||!version||!/^[a-f0-9]{64}$/.test(id)||!/^[a-f0-9]{64}$/.test(version))
    return new Response('Invalid image reference',{status:400});
  const records: Array<{id:string;sha256:string;deletedAt?:string;web?:{sha256:string;bytes:number}}> = manifest.records;
  const record=records.find(r=>r.id===`asset:${id}`&&!r.deletedAt&&r.web?.sha256===version);
  if(!record?.web||!bindings.STATE_ARCHIVE)return new Response('Image not found',{status:404});
  const object=await bindings.STATE_ARCHIVE.get(`canonical-images/${id}/${version}.webp`);
  if(!object||object.size!==record.web.bytes||object.customMetadata?.sourceSha256!==id||object.customMetadata?.webSha256!==version)
    return new Response('Local image integrity check failed',{status:503});
  return new Response(object.body,{headers:{'Content-Type':'image/webp','Content-Length':String(object.size),
    'Cache-Control':'private, max-age=31536000, immutable','ETag':object.httpEtag,'X-Content-Type-Options':'nosniff'}});
}
