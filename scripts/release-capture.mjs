import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import crypto from 'node:crypto';
const directory='.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const db=new DatabaseSync(directory+'/'+fs.readdirSync(directory).find(n=>n.endsWith('.sqlite')&&n!=='metadata.sqlite'),{readOnly:true});
const row=db.prepare('SELECT id,revision,"values" FROM state_backups WHERE reason=? ORDER BY created_at DESC LIMIT 1').get('發布前瀏覽器未儲存草稿保全');
if(!row)throw Error('No captured draft');
const response=await fetch('http://localhost:4174/api/release-state?manage=1&backup='+encodeURIComponent(row.id));
if(!response.ok)throw Error('Capture export failed');
const snapshot=await response.json();
fs.writeFileSync('work/release-7000/browser-state.json',JSON.stringify(snapshot));
const previous=JSON.parse(fs.readFileSync('work/release-7000/local-state.json'));
console.log({backupId:row.id,revision:row.revision,changedKeys:Object.keys(snapshot.values).filter(k=>snapshot.values[k]!==previous.values[k]),bytes:row.values.length,sha256:crypto.createHash('sha256').update(row.values).digest('hex')});
for(const key of Object.keys(snapshot.values).filter(k=>k.startsWith('processEditor:'))){const v=JSON.parse(snapshot.values[key]);console.log(key,JSON.stringify(v).length,Object.keys(v));}
db.close();
