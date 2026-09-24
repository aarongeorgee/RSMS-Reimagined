import { spawn } from 'node:child_process'

const npm=process.platform==='win32'?'npm.cmd':'npm'
const api=spawn(npm,['run','api'],{stdio:'inherit'})
const web=spawn(npm,['run','start:web'],{stdio:'inherit'})
function stop(code=0){api.kill('SIGTERM');web.kill('SIGTERM');process.exit(code)}
api.on('exit',code=>{if(code&&code!==0)stop(code)})
web.on('exit',code=>stop(code??0))
process.on('SIGINT',()=>stop(0))
process.on('SIGTERM',()=>stop(0))
