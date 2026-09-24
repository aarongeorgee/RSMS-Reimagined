import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { db } from '../backend/db.js'

assert.equal(db.prepare('SELECT COUNT(*) AS c FROM timetable_slots').get().c, 27, 'Expected 27 timetable slots')
assert.ok(db.prepare('SELECT COUNT(*) AS c FROM academic_events').get().c >= 60, 'Academic calendar was not seeded')
assert.equal(db.prepare('SELECT COUNT(*) AS c FROM timetable_slots WHERE day_index=2').get().c, 6, 'Tuesday should contain six timetable slots')
assert.equal(db.prepare("SELECT COUNT(*) AS c FROM academic_events WHERE start_date <= '2026-09-22' AND end_date >= '2026-09-22' AND no_classes=1").get().c, 0, '22 Sep 2026 should be a normal timetable day')
assert.ok(db.prepare("SELECT COUNT(*) AS c FROM academic_events WHERE start_date <= '2026-09-21' AND end_date >= '2026-09-21' AND no_classes=1").get().c >= 1, '21 Sep 2026 should be calendar-suppressed')
assert.equal(db.prepare("SELECT role FROM users WHERE email='faculty@rsms.local'").get().role, 'faculty', 'Faculty demo account missing')
assert.equal(db.prepare('SELECT COUNT(*) AS c FROM attendance_baselines').get().c, 7, 'Expected seven official attendance baselines')
assert.equal(db.prepare('SELECT COUNT(*) AS c FROM attendance_entries').get().c, 29, 'Expected reconstructed attendance through 22 Sep')
assert.equal(db.prepare("SELECT COUNT(*) AS c FROM attendance_entries WHERE date='2026-09-17' AND status='absent' AND actual_subject_code IN ('AAD','CN')").get().c, 2, '17 Sep AAD/CN absences must be seeded')
assert.equal(db.prepare("SELECT COUNT(*) AS c FROM attendance_entries WHERE date='2026-09-21'").get().c, 0, 'Holiday on 21 Sep must not generate attendance')
assert.ok(db.prepare("SELECT COUNT(*) AS c FROM attendance_baselines WHERE attended IS NOT NULL AND total IS NOT NULL").get().c === 7, 'All seven attendance baselines should have reconstructed counts')

const root=resolve('.')
const forbiddenPatterns=[/@gmail\.com/i,/@rajagiri/i,/student@rsms\.demo/i,/U240\d+/i]
const skip=new Set(['node_modules','.git','.next','.vinext','.wrangler','.sites-runtime','backend/runtime'])
function walk(dir){
  for(const name of readdirSync(dir)){
    const full=join(dir,name);const rel=full.slice(root.length+1)
    if(rel==='scripts/verify-project.mjs'||[...skip].some(prefix=>rel===prefix||rel.startsWith(prefix+'/')))continue
    const stat=statSync(full)
    if(stat.isDirectory())walk(full)
    else if(/\.(?:ts|tsx|js|mjs|json|md|css|html|txt)$/.test(name)){
      const text=readFileSync(full,'utf8')
      for(const pattern of forbiddenPatterns)assert.ok(!pattern.test(text),`Personal identifier pattern found in ${rel}`)
    }
  }
}
walk(root)
console.log('RSMS verification passed: timetable, calendar, roles, reconstructed attendance through 22 Sep, verified 17 Sep absences and privacy checks are valid.')
