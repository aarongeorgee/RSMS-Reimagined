import express from 'express'
import { createHash, randomUUID } from 'node:crypto'
import { db, resetDemoData } from './db.js'
import { requireAuth, requireRole, signToken } from './auth.js'

const app = express()
const port = Number(process.env.API_PORT || 5001)
const teachingTermStart = process.env.TEACHING_TERM_START || '2026-06-15'
const teachingTermEnd = process.env.TEACHING_TERM_END || '2026-10-09'
const requestTypeLabels = {
  hostelRefund: 'Hostel fee refund', messRefund: 'Mess fee refund', activityPoints: 'Activity points request',
  facility: 'Facility maintenance request', grievance: 'Grievance', suggestion: 'Suggestion',
}
const requestStatusLabels = { resolved: 'Resolved', inReview: 'Under review', submitted: 'Submitted' }
const normalizeRequest = (row) => ({
  id: row.id,
  type: requestTypeLabels[row.type] || row.type,
  details: row.details,
  status: requestStatusLabels[row.status] || row.status,
  remarks: row.remarks || '',
  date: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(row.created_at)),
  updatedAt: row.updated_at,
})

app.use((req,res,next)=>{
  const origin = req.headers.origin
  const configuredOrigin = process.env.CLIENT_ORIGIN
  const isLocalDevOrigin = typeof origin === 'string' && /^https?:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|[a-zA-Z0-9.-]+\.local)(?::\d+)?$/.test(origin)
  if (origin && (origin === configuredOrigin || isLocalDevOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  if(req.method==='OPTIONS') return res.sendStatus(204)
  next()
})
app.use(express.json({ limit: '150kb' }))
app.disable('x-powered-by')
app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff')
  res.setHeader('Referrer-Policy','no-referrer')
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()')
  next()
})


const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))
const nowIso = () => new Date().toISOString()
const dayIndex = (date) => new Date(`${date}T00:00:00Z`).getUTCDay()
const attendanceStatuses = new Set(['present', 'absent', 'duty', 'cancelled'])

function eventsForDate(date) {
  return db.prepare(`SELECT id,start_date AS startDate,end_date AS endDate,title,type,no_classes AS noClasses,start_time AS startTime,end_time AS endTime
    FROM academic_events WHERE start_date <= ? AND end_date >= ? ORDER BY start_date,title`).all(date, date)
    .map(row => ({ ...row, noClasses: Boolean(row.noClasses) }))
}

function subjectCatalog() {
  return db.prepare(`SELECT code,name,short_name AS shortName,track_attendance AS trackAttendance FROM subjects ORDER BY track_attendance DESC,name`).all()
    .map(row => ({ ...row, trackAttendance: Boolean(row.trackAttendance) }))
}

function scheduleForDate(date, rollNumber, options = {}) {
  const events = eventsForDate(date)
  const effectiveTeachingEnd = options.teachingTermEnd || teachingTermEnd
  const outsideTeachingTerm = date < teachingTermStart || date > effectiveTeachingEnd
  if (outsideTeachingTerm) events.push({ id:'TERM-BOUNDARY', startDate:date, endDate:date, title:'Outside the S5 teaching term', type:'academic', noClasses:true, startTime:null, endTime:null })
  const noClasses = outsideTeachingTerm || events.some(event => event.noClasses)
  const base = db.prepare(`SELECT id,day_name AS day,period,subject_code AS scheduledSubjectCode,subject_label AS scheduledSubject,
    start_time AS startTime,end_time AS endTime,room,kind,track_attendance AS trackAttendance
    FROM timetable_slots WHERE day_index=? ORDER BY start_time`).all(dayIndex(date))
  const overrides = db.prepare(`SELECT * FROM class_overrides WHERE date=?`).all(date)
  const overrideMap = new Map(overrides.map(row => [row.timetable_id, row]))
  const entries = rollNumber ? db.prepare(`SELECT * FROM attendance_entries WHERE roll_number=? AND date=?`).all(rollNumber, date) : []
  const entryMap = new Map(entries.map(row => [row.timetable_id, row]))
  const subjects = new Map(subjectCatalog().map(subject => [subject.code, subject]))

  const items = base.map(slot => {
    const override = overrideMap.get(slot.id)
    const entry = entryMap.get(slot.id)
    const actualSubjectCode = override?.status === 'cancelled' ? null : (override?.actual_subject_code || entry?.actual_subject_code || slot.scheduledSubjectCode)
    const actualSubject = actualSubjectCode ? subjects.get(actualSubjectCode)?.name || actualSubjectCode : null
    return {
      ...slot,
      trackAttendance: Boolean(slot.trackAttendance),
      overrideId: override?.id || null,
      overrideStatus: override?.status || null,
      overrideReason: override?.reason || '',
      actualSubjectCode,
      actualSubject,
      attendanceEntryId: entry?.id || null,
      attendanceStatus: entry?.status || null,
      attendanceNotes: entry?.notes || '',
      calendarSuppressed: noClasses,
    }
  })

  const extras = db.prepare(`SELECT id,date,subject_code AS actualSubjectCode,label AS actualSubject,start_time AS startTime,end_time AS endTime,room,reason
    FROM extra_classes WHERE date=? ORDER BY start_time`).all(date).map(extra => {
      const key = `EXTRA:${extra.id}`
      const entry = entryMap.get(key)
      return {
        id: key,
        extraId: extra.id,
        day: new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`)),
        period: 99,
        scheduledSubjectCode: extra.actualSubjectCode,
        scheduledSubject: extra.actualSubject,
        actualSubjectCode: extra.actualSubjectCode,
        actualSubject: extra.actualSubject,
        startTime: extra.startTime,
        endTime: extra.endTime,
        room: extra.room,
        kind: 'Extra class',
        trackAttendance: true,
        overrideStatus: 'extra',
        overrideReason: extra.reason,
        attendanceEntryId: entry?.id || null,
        attendanceStatus: entry?.status || null,
        attendanceNotes: entry?.notes || '',
        calendarSuppressed: false,
      }
    })

  return { date, dayIndex: dayIndex(date), events, noClasses, items: noClasses ? [] : [...items, ...extras].sort((a,b)=>a.startTime.localeCompare(b.startTime)), suppressedItems: noClasses ? items : [] }
}

function safeLeaves(attended, total, target) {
  if (!total || !attended) return 0
  return Math.max(0, Math.floor((attended / target) - total + 1e-9))
}
function neededClasses(attended, total, target) {
  if (total === 0 || attended / total >= target) return 0
  return Math.max(0, Math.ceil(((target * total) - attended) / (1 - target) - 1e-9))
}

function dateInIndia(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
}
function addDaysIso(date, amount) {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + amount)
  return d.toISOString().slice(0,10)
}
function futureClassesForSubject(from, through, subjectCode, rollNumber) {
  const rows = []
  const today = dateInIndia()
  const nowMinutes = (() => { const value = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()); const [h,m] = value.split(':').map(Number); return h*60+m })()
  for (let date = from; date <= through; date = addDaysIso(date,1)) {
    // For forecasting, the selected through-date represents the assumed teaching extension.
    // This lets a semester extension be modelled without a hard-coded calendar cutoff.
    const schedule = scheduleForDate(date, rollNumber, { teachingTermEnd: through })
    if (schedule.noClasses) continue
    for (const item of schedule.items) {
      if (!item.trackAttendance || item.overrideStatus === 'cancelled') continue
      if (item.actualSubjectCode !== subjectCode) continue
      if (item.attendanceStatus) continue
      if (date === today) { const [h,m] = item.endTime.split(':').map(Number); if (h*60+m <= nowMinutes) continue }
      rows.push({ date, id:item.id, startTime:item.startTime, endTime:item.endTime, subject:item.actualSubject || item.scheduledSubject })
    }
  }
  return rows
}

function attendanceSummary(rollNumber) {
  const baselines = db.prepare(`SELECT subject_code AS code,official_course_code AS officialCourseCode,
      percentage AS officialPercentage,as_of_date AS officialAsOf,attended AS baselineAttended,total AS baselineTotal,source_note AS baselineSourceNote
    FROM attendance_baselines WHERE roll_number=?`).all(rollNumber)
  const baselineByCode = new Map(baselines.map(row => [row.code, row]))
  const catalog = subjectCatalog().filter(subject => baselineByCode.has(subject.code))
  const rows = db.prepare(`SELECT actual_subject_code AS code,
      SUM(CASE WHEN status IN ('present','duty') THEN 1 ELSE 0 END) AS attended,
      SUM(CASE WHEN status IN ('present','duty','absent') THEN 1 ELSE 0 END) AS total,
      SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) AS absent
    FROM attendance_entries WHERE roll_number=? AND date>'2026-09-12' GROUP BY actual_subject_code`).all(rollNumber)
  const byCode = new Map(rows.map(row => [row.code, row]))
  const subjects = catalog.map(subject => {
    const base = baselineByCode.get(subject.code)
    const row = byCode.get(subject.code) || { attended: 0, total: 0, absent: 0 }
    const trackedAttended = Number(row.attended || 0)
    const trackedTotal = Number(row.total || 0)
    const trackedPercentage = trackedTotal ? Number(((trackedAttended / trackedTotal) * 100).toFixed(1)) : null
    const hasExactBaselineCounts = base.baselineAttended != null && base.baselineTotal != null
    let attended = trackedAttended, total = trackedTotal, percentage = Number(base.officialPercentage)
    if (hasExactBaselineCounts) {
      attended += Number(base.baselineAttended); total += Number(base.baselineTotal)
      percentage = total ? Number(((attended / total) * 100).toFixed(1)) : Number(base.officialPercentage)
    }
    return {
      ...subject, officialCourseCode: base.officialCourseCode, officialPercentage: Number(base.officialPercentage),
      officialAsOf: base.officialAsOf, baselineCountsKnown: hasExactBaselineCounts,
      baselineEstimated: Boolean(base.baselineSourceNote?.startsWith('Reconstructed baseline:')),
      baselineSourceNote: base.baselineSourceNote || '',
      baselineAttended: Number(base.baselineAttended || 0), baselineTotal: Number(base.baselineTotal || 0),
      trackedAttended, trackedTotal, trackedPercentage, attended, total, absent: Number(row.absent || 0), percentage,
      internalEligible: percentage >= 80, eseEligible: percentage >= 75,
      safeLeaves80: hasExactBaselineCounts ? safeLeaves(attended, total, 0.80) : null,
      safeLeaves75: hasExactBaselineCounts ? safeLeaves(attended, total, 0.75) : null,
      neededFor80: hasExactBaselineCounts ? neededClasses(attended, total, 0.80) : null,
      neededFor75: hasExactBaselineCounts ? neededClasses(attended, total, 0.75) : null,
    }
  })
  const attended = subjects.reduce((sum,row)=>sum+row.attended,0)
  const total = subjects.reduce((sum,row)=>sum+row.total,0)
  return {
    attended,
    total,
    overallPercentage: total ? Number(((attended / total) * 100).toFixed(1)) : null,
    officialAsOf: '2026-09-12', reconstructedThrough: '2026-09-22', internalThreshold: 80, eseThreshold: 75, subjects,
    note: 'Attendance data is current through 23-Sep-2026.'
  }
}

function attendanceAlerts(summary) {
  const alerts = []
  for (const subject of summary.subjects) {
    if (!subject.total) continue
    if (subject.percentage < 75) alerts.push({ severity:'critical', subjectCode:subject.code, message:`${subject.shortName} is below ESE eligibility at ${subject.percentage}%. Attend ${subject.neededFor75} consecutive class${subject.neededFor75===1?'':'es'} to reach 75%.` })
    else if (subject.percentage < 80) alerts.push({ severity:'warning', subjectCode:subject.code, message:`${subject.shortName} is ESE-eligible but below the 80% internal-exam threshold.` })
    else if (subject.safeLeaves80 != null && subject.safeLeaves80 <= 1) alerts.push({ severity:'info', subjectCode:subject.code, message:`${subject.shortName} has only ${subject.safeLeaves80} safe leave${subject.safeLeaves80===1?'':'s'} before dropping below 80%.` })
  }
  return alerts.slice(0, 8)
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'RSMS Express API', features: ['JWT','REST','SQLite','attendance','live-timetable','calendar-overrides'] }))

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase())
  const passwordHash = createHash('sha256').update(String(password)).digest('hex')
  if (!user || passwordHash !== user.password_hash) return res.status(401).json({ error: 'Invalid email or password' })
  const student = db.prepare('SELECT * FROM students WHERE roll_number = ?').get(user.student_roll_number)
  return res.json({ token: signToken(user), user: { email: user.email, role: user.role, student } })
})

app.post('/api/auth/forgot-password', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  if (!email) return res.status(400).json({ error: 'Email is required' })
  const user = db.prepare('SELECT email FROM users WHERE email=?').get(email)
  const response = { ok:true, message:'If the account exists, a reset code has been generated.' }
  if (!user) return res.json(response)
  const code = randomUUID().replaceAll('-','').slice(0,8).toUpperCase()
  const tokenHash = createHash('sha256').update(code).digest('hex')
  const createdAt = nowIso()
  const expiresAt = new Date(Date.now()+15*60*1000).toISOString()
  db.prepare('DELETE FROM password_reset_tokens WHERE email=? OR expires_at<?').run(email, createdAt)
  db.prepare('INSERT INTO password_reset_tokens (token_hash,email,expires_at,used_at,created_at) VALUES (?,?,?,?,?)').run(tokenHash,email,expiresAt,null,createdAt)
  if (email.endsWith('.local')) response.demoCode = code
  res.json(response)
})

app.post('/api/auth/reset-password', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const code = String(req.body?.code || '').trim().toUpperCase()
  const password = String(req.body?.password || '')
  if (!email || !code || password.length < 8) return res.status(400).json({ error:'Email, reset code and a password of at least 8 characters are required' })
  const tokenHash = createHash('sha256').update(code).digest('hex')
  const token = db.prepare('SELECT * FROM password_reset_tokens WHERE token_hash=? AND email=? AND used_at IS NULL').get(tokenHash,email)
  if (!token || token.expires_at < nowIso()) return res.status(400).json({ error:'Invalid or expired reset code' })
  const passwordHash = createHash('sha256').update(password).digest('hex')
  const changed = db.prepare('UPDATE users SET password_hash=? WHERE email=?').run(passwordHash,email)
  if (!changed.changes) return res.status(400).json({ error:'Invalid or expired reset code' })
  db.prepare('UPDATE password_reset_tokens SET used_at=? WHERE token_hash=?').run(nowIso(),tokenHash)
  res.json({ ok:true, message:'Password updated successfully' })
})

app.use('/api', requireAuth)

app.post('/api/demo/reset', (_req,res) => {
  resetDemoData()
  res.json({ ok:true, message:'Demo data restored to packaged defaults' })
})


app.get('/api/session', (req,res) => res.json({ email:req.user.email, role:req.user.role, rollNumber:req.user.rollNumber }))

app.get('/api/profile', (req, res) => {
  const row = db.prepare('SELECT * FROM students WHERE roll_number = ?').get(req.user.rollNumber)
  if (!row) return res.status(404).json({ error: 'Student not found' })
  res.json({ rollNumber: row.roll_number, name: row.name, email: row.email, program: row.program, branch: row.branch, semester: row.semester, section: row.section, phone: row.phone, bio: row.bio })
})

app.put('/api/profile', (req, res) => {
  const { name, email, phone = '', bio = '' } = req.body || {}
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' })
  db.prepare(`UPDATE students SET name=?, email=?, phone=?, bio=? WHERE roll_number=?`).run(String(name), String(email), String(phone), String(bio), req.user.rollNumber)
  const row = db.prepare('SELECT * FROM students WHERE roll_number = ?').get(req.user.rollNumber)
  res.json({ rollNumber: row.roll_number, name: row.name, email: row.email, program: row.program, branch: row.branch, semester: row.semester, section: row.section, phone: row.phone, bio: row.bio })
})

app.get('/api/subjects', (_req,res) => res.json(subjectCatalog()))

app.get('/api/calendar', (req,res) => {
  const from = validDate(req.query.from) ? String(req.query.from) : '2026-01-01'
  const to = validDate(req.query.to) ? String(req.query.to) : '2026-12-31'
  const rows = db.prepare(`SELECT id,start_date AS startDate,end_date AS endDate,title,type,no_classes AS noClasses,start_time AS startTime,end_time AS endTime
    FROM academic_events WHERE end_date >= ? AND start_date <= ? ORDER BY start_date,title`).all(from,to)
  res.json(rows.map(row=>({...row,noClasses:Boolean(row.noClasses)})))
})

app.get('/api/schedule', (req,res) => {
  const date = String(req.query.date || '')
  if (!validDate(date)) return res.status(400).json({ error:'A date in YYYY-MM-DD format is required' })
  res.json(scheduleForDate(date, req.user.rollNumber))
})

app.get('/api/overrides', (req,res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 30)))
  const rows = db.prepare(`SELECT o.id,o.date,o.timetable_id AS timetableId,o.actual_subject_code AS actualSubjectCode,o.status,o.reason,o.updated_at AS updatedAt,
    t.subject_label AS scheduledSubject,t.start_time AS startTime,t.end_time AS endTime,s.name AS actualSubject
    FROM class_overrides o LEFT JOIN timetable_slots t ON t.id=o.timetable_id LEFT JOIN subjects s ON s.code=o.actual_subject_code
    ORDER BY o.date DESC,t.start_time DESC LIMIT ?`).all(limit)
  res.json(rows)
})

app.post('/api/overrides', requireRole('faculty'), (req,res) => {
  const { date, timetableId, status, actualSubjectCode = null, reason = '' } = req.body || {}
  if (!validDate(date) || !timetableId || !['substituted','cancelled'].includes(status)) return res.status(400).json({ error:'Date, timetable slot and a valid override status are required' })
  const slot = db.prepare('SELECT * FROM timetable_slots WHERE id=?').get(String(timetableId))
  if (!slot) return res.status(404).json({ error:'Timetable slot not found' })
  if (status === 'substituted' && !db.prepare('SELECT code FROM subjects WHERE code=?').get(String(actualSubjectCode))) return res.status(400).json({ error:'Choose a valid replacement subject' })
  const existing = db.prepare('SELECT id FROM class_overrides WHERE date=? AND timetable_id=?').get(date, timetableId)
  const id = existing?.id || `OVR-${randomUUID()}`
  const now = nowIso()
  db.prepare(`INSERT INTO class_overrides (id,date,timetable_id,actual_subject_code,status,reason,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(date,timetable_id) DO UPDATE SET actual_subject_code=excluded.actual_subject_code,status=excluded.status,reason=excluded.reason,updated_at=excluded.updated_at`)
    .run(id,date,timetableId,status==='cancelled'?null:String(actualSubjectCode),status,String(reason),now,now)
  if (status === 'cancelled') {
    db.prepare(`UPDATE attendance_entries SET status='cancelled',updated_at=? WHERE date=? AND timetable_id=?`).run(now,date,timetableId)
  }
  res.status(existing?200:201).json({ ok:true, id })
})

app.delete('/api/overrides/:id', requireRole('faculty'), (req,res) => {
  const result = db.prepare('DELETE FROM class_overrides WHERE id=?').run(req.params.id)
  if (!result.changes) return res.status(404).json({ error:'Override not found' })
  res.status(204).end()
})

app.post('/api/extra-classes', requireRole('faculty'), (req,res) => {
  const { date, subjectCode, label, startTime, endTime, room='', reason='' } = req.body || {}
  if (!validDate(date) || !subjectCode || !label || !/^\d{2}:\d{2}$/.test(startTime||'') || !/^\d{2}:\d{2}$/.test(endTime||'')) return res.status(400).json({ error:'Date, subject, label and valid start/end times are required' })
  if (!db.prepare('SELECT code FROM subjects WHERE code=?').get(String(subjectCode))) return res.status(400).json({ error:'Unknown subject' })
  const id = `EXT-${randomUUID()}`
  const now = nowIso()
  db.prepare(`INSERT INTO extra_classes (id,date,subject_code,label,start_time,end_time,room,reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id,date,subjectCode,label,startTime,endTime,room,reason,now,now)
  res.status(201).json({ id })
})

app.delete('/api/extra-classes/:id', requireRole('faculty'), (req,res) => {
  const extraId = req.params.id
  const result = db.prepare('DELETE FROM extra_classes WHERE id=?').run(extraId)
  if (!result.changes) return res.status(404).json({ error:'Extra class not found' })
  db.prepare('DELETE FROM attendance_entries WHERE timetable_id=?').run(`EXTRA:${extraId}`)
  res.status(204).end()
})

app.get('/api/attendance/summary', (req,res) => {
  const summary = attendanceSummary(req.user.rollNumber)
  res.json({ ...summary, alerts: attendanceAlerts(summary) })
})

app.get('/api/attendance/history', (req,res) => {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit || 150)))
  const rows = db.prepare(`SELECT a.id,a.date,a.timetable_id AS timetableId,a.scheduled_subject_code AS scheduledSubjectCode,a.actual_subject_code AS actualSubjectCode,
    a.status,a.notes,a.updated_at AS updatedAt,s.name AS actualSubject,s.short_name AS shortName,t.subject_label AS scheduledSubject,t.start_time AS startTime,t.end_time AS endTime
    FROM attendance_entries a LEFT JOIN subjects s ON s.code=a.actual_subject_code LEFT JOIN timetable_slots t ON t.id=a.timetable_id
    WHERE a.roll_number=? ORDER BY a.date DESC,COALESCE(t.start_time,'23:59') DESC LIMIT ?`).all(req.user.rollNumber,limit)
  res.json(rows)
})

app.post('/api/attendance/entries', (req,res) => {
  const { date, timetableId, status, actualSubjectCode, notes='' } = req.body || {}
  if (!validDate(date) || !timetableId || !attendanceStatuses.has(status)) return res.status(400).json({ error:'Date, class and attendance status are required' })
  const schedule = scheduleForDate(date, req.user.rollNumber)
  const item = [...schedule.items, ...schedule.suppressedItems].find(row=>row.id===timetableId)
  if (!item) return res.status(404).json({ error:'Class is not available for that date' })
  if (schedule.noClasses) return res.status(400).json({ error:'Attendance cannot be recorded on a calendar-suppressed day' })
  const subjectCode = String(actualSubjectCode || item.actualSubjectCode || item.scheduledSubjectCode)
  if (!db.prepare('SELECT code FROM subjects WHERE code=?').get(subjectCode)) return res.status(400).json({ error:'Unknown actual subject' })
  const existing = db.prepare('SELECT id,created_at FROM attendance_entries WHERE roll_number=? AND date=? AND timetable_id=?').get(req.user.rollNumber,date,timetableId)
  const id = existing?.id || `ATT-${randomUUID()}`
  const now = nowIso()
  db.prepare(`INSERT INTO attendance_entries (id,roll_number,date,timetable_id,scheduled_subject_code,actual_subject_code,status,notes,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(roll_number,date,timetable_id) DO UPDATE SET actual_subject_code=excluded.actual_subject_code,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at`)
    .run(id,req.user.rollNumber,date,timetableId,item.scheduledSubjectCode,subjectCode,status,String(notes),existing?.created_at||now,now)
  res.status(existing?200:201).json({ id, date, timetableId, actualSubjectCode:subjectCode, status, notes:String(notes) })
})

app.put('/api/attendance/entries/:id', (req,res) => {
  const existing = db.prepare('SELECT * FROM attendance_entries WHERE id=? AND roll_number=?').get(req.params.id,req.user.rollNumber)
  if (!existing) return res.status(404).json({ error:'Attendance entry not found' })
  const status = req.body?.status ?? existing.status
  const actualSubjectCode = req.body?.actualSubjectCode ?? existing.actual_subject_code
  const notes = req.body?.notes ?? existing.notes
  if (!attendanceStatuses.has(status)) return res.status(400).json({ error:'Invalid attendance status' })
  if (!db.prepare('SELECT code FROM subjects WHERE code=?').get(String(actualSubjectCode))) return res.status(400).json({ error:'Unknown subject' })
  db.prepare('UPDATE attendance_entries SET actual_subject_code=?,status=?,notes=?,updated_at=? WHERE id=? AND roll_number=?')
    .run(actualSubjectCode,status,String(notes),nowIso(),req.params.id,req.user.rollNumber)
  res.json({ ok:true })
})

app.delete('/api/attendance/entries/:id', (req,res) => {
  const result = db.prepare('DELETE FROM attendance_entries WHERE id=? AND roll_number=?').run(req.params.id,req.user.rollNumber)
  if (!result.changes) return res.status(404).json({ error:'Attendance entry not found' })
  res.status(204).end()
})

app.post('/api/attendance/leave-plan', (req,res) => {
  const { date, timetableIds=[] } = req.body || {}
  if (!validDate(date) || !Array.isArray(timetableIds)) return res.status(400).json({ error:'Date and class selections are required' })
  const schedule = scheduleForDate(date, req.user.rollNumber)
  const summary = attendanceSummary(req.user.rollNumber)
  const byCode = new Map(summary.subjects.map(row=>[row.code,{...row}]))
  const selected = schedule.items.filter(item=>timetableIds.includes(item.id) && item.trackAttendance && item.overrideStatus!=='cancelled')
  for (const item of selected) {
    const row = byCode.get(item.actualSubjectCode)
    if (row) {
      row.total += 1
      row.absent += 1
      row.percentage = Number(((row.attended/row.total)*100).toFixed(1))
      row.internalEligible = row.percentage >= 80
      row.eseEligible = row.percentage >= 75
      row.safeLeaves80 = safeLeaves(row.attended,row.total,0.80)
      row.safeLeaves75 = safeLeaves(row.attended,row.total,0.75)
    }
  }
  res.json({ date, selectedClasses:selected.map(item=>({id:item.id,subject:item.actualSubject,startTime:item.startTime,endTime:item.endTime})), projections:[...byCode.values()].filter(row=>selected.some(item=>item.actualSubjectCode===row.code)) })
})

app.post('/api/attendance/forecast', (req,res) => {
  const today = dateInIndia()
  const { subjectCode, from = today, through = teachingTermEnd, plannedAbsences = 0 } = req.body || {}
  if (!subjectCode || !validDate(from) || !validDate(through) || through < from) return res.status(400).json({ error:'Subject and a valid future date range are required' })
  const spanDays = Math.round((new Date(`${through}T12:00:00Z`) - new Date(`${from}T12:00:00Z`)) / 86400000)
  if (spanDays > 180) return res.status(400).json({ error:'Forecast range is limited to 180 days' })
  const summary = attendanceSummary(req.user.rollNumber)
  const subject = summary.subjects.find(row=>row.code===String(subjectCode))
  if (!subject) return res.status(404).json({ error:'Tracked subject not found' })
  const future = futureClassesForSubject(from, through, String(subjectCode), req.user.rollNumber)
  const remaining = future.length
  const absences = Math.min(Math.max(0, Math.trunc(Number(plannedAbsences)||0)), remaining)
  const maximumAttended = subject.attended + remaining
  const maximumTotal = subject.total + remaining
  const maximumPercentage = maximumTotal ? Number(((maximumAttended/maximumTotal)*100).toFixed(1)) : subject.percentage
  const plannedAttended = subject.attended + Math.max(0, remaining - absences)
  const plannedTotal = subject.total + remaining
  const plannedPercentage = plannedTotal ? Number(((plannedAttended/plannedTotal)*100).toFixed(1)) : subject.percentage
  const needed90 = neededClasses(subject.attended, subject.total, 0.90)
  const reachable90 = needed90 <= remaining
  const reachDate = reachable90 && needed90 > 0 ? future[needed90-1]?.date || null : (subject.percentage >= 90 ? today : null)
  const checkpoints = [...new Set([0, Math.min(3,remaining), Math.min(6,remaining), remaining])].sort((a,b)=>a-b)
  const milestones = checkpoints.map(count=>({
    label: count===0 ? 'Current' : count===remaining ? `All ${remaining} remaining` : `Attend next ${count}`,
    classes: count,
    percentage: Number((((subject.attended+count)/(subject.total+count))*100).toFixed(1))
  }))
  res.json({
    subject:{ code:subject.code, name:subject.name, shortName:subject.shortName },
    from, through, teachingTermEnd, forecastTeachingEnd:through, remainingClasses:remaining,
    current:{ attended:subject.attended, total:subject.total, percentage:subject.percentage },
    maximum:{ attended:maximumAttended, total:maximumTotal, percentage:maximumPercentage },
    planned:{ absences, attended:plannedAttended, total:plannedTotal, percentage:plannedPercentage, internalEligible:plannedPercentage>=80, eseEligible:plannedPercentage>=75 },
    target90:{ needed:needed90, reachable:reachable90, reachDate },
    milestones,
    futureClasses:future
  })
})

// Backwards-compatible attendance endpoint for the legacy cards.
app.get('/api/attendance', (req,res) => {
  const summary = attendanceSummary(req.user.rollNumber)
  res.json(summary.subjects.map(row=>({subject:row.name,attended:row.attended,total:row.total,percentage:row.percentage})))
})

app.get('/api/marks', (req, res) => {
  res.json(db.prepare(`SELECT semester, subject, component, obtained_marks AS obtainedMarks, max_marks AS maxMarks
    FROM marks WHERE roll_number = ? ORDER BY semester DESC, subject, component`).all(req.user.rollNumber))
})


app.get('/api/notifications', (req,res) => {
  const today = dateInIndia()
  const summary = attendanceSummary(req.user.rollNumber)
  const items = attendanceAlerts(summary).map((alert,index)=>({ id:`attendance-${index}-${alert.subjectCode}`, severity:alert.severity, title:'Attendance watch', message:alert.message, page:'Attendance' }))
  const upcoming = db.prepare(`SELECT id,start_date AS startDate,title,type,no_classes AS noClasses FROM academic_events WHERE start_date>=? AND start_date<=? ORDER BY start_date LIMIT 4`).all(today, addDaysIso(today,3))
  for (const event of upcoming) items.push({ id:`event-${event.id}`, severity:event.noClasses?'warning':'info', title:event.noClasses?'No regular classes':'Academic event', message:`${event.title} · ${event.startDate}`, page:'Academic Calendar' })
  const schedule=scheduleForDate(today,req.user.rollNumber)
  const indiaTime=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date())
  const current=Number(indiaTime.slice(0,2))*60+Number(indiaTime.slice(3,5))
  const next=schedule.items.find(item=>{const [h,m]=item.startTime.split(':').map(Number);return h*60+m>=current})
  if(next){const [h,m]=next.startTime.split(':').map(Number);const delta=h*60+m-current;if(delta<=45)items.unshift({id:`next-${next.id}`,severity:'info',title:'Class starting soon',message:`${next.actualSubject||next.scheduledSubject} starts in ${delta} min · ${next.room}`,page:'Timetable'})}
  res.json(items.slice(0,10))
})

app.get('/api/notices', (_req, res) => {
  res.json(db.prepare(`SELECT id,title,body,category,priority,posted_by AS postedBy,posted_at AS postedAt FROM notices ORDER BY posted_at DESC`).all())
})

app.get('/api/requests', (req, res) => {
  const rows = db.prepare('SELECT * FROM requests WHERE roll_number = ? ORDER BY created_at DESC').all(req.user.rollNumber)
  res.json(rows.map(normalizeRequest))
})

app.post('/api/requests', (req, res) => {
  const { type, details } = req.body || {}
  if (!type || !details || String(details).trim().length < 15) return res.status(400).json({ error: 'Request type and at least 15 characters of details are required' })
  const now = nowIso()
  const id = `REQ-${randomUUID().slice(0, 8).toUpperCase()}`
  db.prepare(`INSERT INTO requests (id,roll_number,type,details,status,remarks,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`).run(id, req.user.rollNumber, String(type), String(details).trim(), 'Submitted', '', now, now)
  res.status(201).json(normalizeRequest(db.prepare('SELECT * FROM requests WHERE id = ?').get(id)))
})

app.put('/api/requests/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM requests WHERE id=? AND roll_number=?').get(req.params.id, req.user.rollNumber)
  if (!existing) return res.status(404).json({ error: 'Request not found' })
  const type = req.body?.type ?? existing.type
  const details = req.body?.details ?? existing.details
  if (String(details).trim().length < 15) return res.status(400).json({ error: 'Details must contain at least 15 characters' })
  db.prepare('UPDATE requests SET type=?, details=?, updated_at=? WHERE id=? AND roll_number=?').run(String(type), String(details).trim(), nowIso(), req.params.id, req.user.rollNumber)
  res.json(normalizeRequest(db.prepare('SELECT * FROM requests WHERE id=?').get(req.params.id)))
})

app.delete('/api/requests/:id', (req, res) => {
  const result = db.prepare('DELETE FROM requests WHERE id=? AND roll_number=?').run(req.params.id, req.user.rollNumber)
  if (!result.changes) return res.status(404).json({ error: 'Request not found' })
  res.status(204).end()
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(port, '0.0.0.0', () => console.log(`RSMS Express API running on http://localhost:${port} (LAN enabled)`))
