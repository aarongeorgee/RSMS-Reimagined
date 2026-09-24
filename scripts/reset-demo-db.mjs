import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

for (const name of ['rsms.sqlite','rsms.sqlite-wal','rsms.sqlite-shm']) {
  rmSync(resolve('backend','runtime',name), { force:true })
}
console.log('Demo database reset. It will be recreated from data/*.json on the next API start.')
