import {spawn} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const child=spawn(process.execPath,['--import',pathToFileURL(path.resolve('scripts/local-network-preload.mjs')).href,path.resolve('node_modules/vinext/dist/cli.js'),'build'],{stdio:'inherit',env:process.env});child.on('exit',code=>{process.exitCode=code??1;});
