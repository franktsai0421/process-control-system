import {createServer as createViteServer} from 'vite';
import {assertLocalMode,configureOfflineLocal,localFailureMessage}from'../lib/local-runtime.mjs';
import{installLocalNetworkGuard}from'../lib/local-network-guard.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
let server;
try{const args=process.argv.slice(2);assertLocalMode(args);configureOfflineLocal(process.cwd());installLocalNetworkGuard(process.cwd());const portIndex=args.indexOf('--port'),port=portIndex<0?3000:Number(args[portIndex+1]);server=await createViteServer({server:{host:'127.0.0.1',port,strictPort:true,hmr:false}});if(!server.httpServer)throw Error('Local HTTP server unavailable');
  // Public ViteDevServer.httpServer uses Vite's own initialization wrapper.
  // Direct loopback listen avoids Vite 8's wildcard-address port probes.
  await new Promise((resolve,reject)=>{server.httpServer.once('error',reject);server.httpServer.once('listening',resolve);Promise.resolve(server.httpServer.listen(port,'127.0.0.1')).catch(reject);});
  const address=server.httpServer.address();console.log(`Local: http://127.0.0.1:${address.port}/`);
  if(address.port!==3000){const root=fs.realpathSync(process.cwd()),config=fs.realpathSync(path.join(root,'.wrangler/local-only/wrangler.json')),state=fs.realpathSync(path.join(root,'.wrangler/state')),serverFile=path.join(root,'scripts/local-server.mjs'),sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');fs.writeFileSync(path.join(root,'.wrangler/local-only/test-runtime.json'),JSON.stringify({pid:process.pid,port:address.port,root,config,state,configSha256:sha(config),serverSha256:sha(serverFile),startedAt:new Date().toISOString()}));}
  for(const signal of['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit();});
}catch(error){await server?.close();console.error(localFailureMessage(error));process.exitCode=1;}
