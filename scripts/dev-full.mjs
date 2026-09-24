import { spawn } from 'node:child_process'
import { networkInterfaces } from 'node:os'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const api = spawn(npm, ['run', 'api:dev'], { stdio: 'inherit' })
const web = spawn(npm, ['run', 'dev'], { stdio: 'inherit' })

const addresses = []
for (const rows of Object.values(networkInterfaces())) {
  for (const row of rows || []) {
    if (row.family === 'IPv4' && !row.internal) addresses.push(row.address)
  }
}
setTimeout(() => {
  console.log('\nRSMS universal access')
  console.log('  This computer: http://localhost:5173')
  for (const address of addresses) console.log(`  Phone / another computer on the same Wi-Fi: http://${address}:5173`)
  console.log('  API: port 5001 on the same host')
  console.log('  Tip: Windows Firewall may ask permission the first time; allow Private networks.\n')
}, 1800)

function stop(code = 0) {
  api.kill('SIGTERM')
  web.kill('SIGTERM')
  process.exit(code)
}
api.on('exit', (code) => { if (code && code !== 0) stop(code) })
web.on('exit', (code) => stop(code ?? 0))
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
