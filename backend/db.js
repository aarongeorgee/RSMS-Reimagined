import { DatabaseSync } from 'node:sqlite'
import { readFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, randomUUID } from 'node:crypto'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const runtimeDir = resolve(here, 'runtime')
mkdirSync(runtimeDir, { recursive: true })
const dbPath = resolve(runtimeDir, 'rsms.sqlite')
const firstRun = !existsSync(dbPath)

export const db = new DatabaseSync(dbPath)
db.exec('PRAGMA foreign_keys = ON;')
db.exec('PRAGMA journal_mode = WAL;')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  student_roll_number TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS students (
  roll_number TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  program TEXT,
  branch TEXT,
  semester INTEGER,
  section TEXT,
  phone TEXT DEFAULT '',
  bio TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  roll_number TEXT NOT NULL,
  type TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Submitted',
  remarks TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roll_number TEXT NOT NULL,
  subject TEXT NOT NULL,
  attended INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percentage REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS marks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roll_number TEXT NOT NULL,
  semester INTEGER NOT NULL,
  subject TEXT NOT NULL,
  component TEXT NOT NULL,
  obtained_marks REAL,
  max_marks REAL
);
CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  priority TEXT,
  posted_by TEXT,
  posted_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS subjects (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  track_attendance INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS timetable_slots (
  id TEXT PRIMARY KEY,
  day_index INTEGER NOT NULL,
  day_name TEXT NOT NULL,
  period INTEGER NOT NULL,
  subject_code TEXT NOT NULL,
  subject_label TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  room TEXT,
  kind TEXT,
  track_attendance INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS academic_events (
  id TEXT PRIMARY KEY,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  no_classes INTEGER NOT NULL DEFAULT 0,
  start_time TEXT,
  end_time TEXT
);
CREATE TABLE IF NOT EXISTS class_overrides (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  timetable_id TEXT NOT NULL,
  actual_subject_code TEXT,
  status TEXT NOT NULL,
  reason TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(date, timetable_id)
);
CREATE TABLE IF NOT EXISTS extra_classes (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  label TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  room TEXT DEFAULT '',
  reason TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attendance_baselines (
  roll_number TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  official_course_code TEXT NOT NULL,
  percentage REAL NOT NULL,
  as_of_date TEXT NOT NULL,
  attended INTEGER,
  total INTEGER,
  source_note TEXT DEFAULT '',
  PRIMARY KEY (roll_number, subject_code)
);
CREATE TABLE IF NOT EXISTS attendance_entries (
  id TEXT PRIMARY KEY,
  roll_number TEXT NOT NULL,
  date TEXT NOT NULL,
  timetable_id TEXT NOT NULL,
  scheduled_subject_code TEXT NOT NULL,
  actual_subject_code TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(roll_number, date, timetable_id)
);
`)

function json(name) {
  return JSON.parse(readFileSync(resolve(root, 'data', name), 'utf8'))
}

function seedCore() {
  const profile = json('profile.json').profile
  const marks = json('marks.json').marks
  const notices = json('notices.json').notices
  const requests = json('requests.json').requests
  const timetable = json('timetable.json').timetable
  const calendar = json('academic-calendar.json').events

  const subjectNames = {
    WP: ['Web Programming', 'WP', 1],
    AAD: ['Algorithm Analysis and Design', 'AAD', 1],
    CN: ['Computer Networks', 'CN', 1],
    DBMS: ['Database Management Systems', 'DBMS', 1],
    DT: ['Design Thinking and Creativity', 'DT', 1],
    ELECTIVE: ['Software Project Management (S5 Elective)', 'SPM', 1],
    DBMSLAB: ['DBMS Lab', 'DBMS Lab', 1],
    CNLAB: ['Computer Networks Lab', 'CN Lab', 0],
    OPTIONAL: ['Honour / Course Tutorial / Add-on / Remedial', 'Optional', 0],
    MENTORING: ['Mentoring / Activity Hour', 'Mentoring', 0],
  }

  db.exec('BEGIN')
  try {
    db.prepare(`INSERT OR REPLACE INTO students
      (roll_number,name,email,program,branch,semester,section,phone,bio)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(
      profile.rollNumber, profile.name, profile.email, profile.program, profile.branch,
      profile.semester, profile.section, '', 'Generic coursework demo profile. No real student identity is stored.'
    )

    const passwordHash = createHash('sha256').update('demo123').digest('hex')
    const userStmt = db.prepare(`INSERT OR REPLACE INTO users (email,password_hash,role,student_roll_number)
      VALUES (?,?,?,?)`)
    userStmt.run('demo@rsms.local', passwordHash, 'student', profile.rollNumber)
    userStmt.run('faculty@rsms.local', passwordHash, 'faculty', profile.rollNumber)

    const subjectStmt = db.prepare(`INSERT OR REPLACE INTO subjects (code,name,short_name,track_attendance) VALUES (?,?,?,?)`)
    for (const [code, [name, shortName, tracked]] of Object.entries(subjectNames)) {
      subjectStmt.run(code, name, shortName, tracked)
    }

    // Official RSMS percentages are exact as displayed for 15-Jun-2026 to
    // 12-Sep-2026. Because the portal screenshot does not expose attended /
    // conducted counts, the counts below are RECONSTRUCTED estimates: we use
    // the supplied S5 CS A timetable + academic-calendar no-class dates and
    // choose the nearest whole-number denominator that reproduces the official
    // rounded percentage. These estimates are intentionally labelled in the UI
    // and can be corrected later if the portal exposes exact counts.
    const baselineStmt = db.prepare(`INSERT OR REPLACE INTO attendance_baselines
      (roll_number,subject_code,official_course_code,percentage,as_of_date,attended,total,source_note)
      VALUES (?,?,?,?,?,?,?,?)`)
    const officialAttendance = [
      ['CN','102003/CS500A',96,43,45],
      ['WP','102003/CS500B',87,39,45],
      ['DBMS','102903/CO900C',90,38,42],
      ['AAD','102903/CO500D',96,48,50],
      ['ELECTIVE','102903/CO501E',93,27,29],
      ['DT','102808/CO900G',88,21,24],
      ['DBMSLAB','102903/CO922S',89,8,9],
    ]
    for (const [code, courseCode, percentage, attended, total] of officialAttendance) {
      baselineStmt.run(
        profile.rollNumber, code, courseCode, percentage, '2026-09-12', attended, total,
        'Reconstructed baseline: official RSMS rounded percentage + supplied S5 CS A timetable/calendar. Counts are estimates, not portal-reported exact counts.'
      )
    }

    const slotStmt = db.prepare(`INSERT OR REPLACE INTO timetable_slots
      (id,day_index,day_name,period,subject_code,subject_label,start_time,end_time,room,kind,track_attendance)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    for (const row of timetable) {
      slotStmt.run(row.id, row.dayIndex, row.day, row.period, row.subjectCode, row.subject, row.startTime, row.endTime, row.room || '', row.kind || 'Class', row.trackAttendance === false ? 0 : 1)
    }

    const eventStmt = db.prepare(`INSERT OR REPLACE INTO academic_events
      (id,start_date,end_date,title,type,no_classes,start_time,end_time) VALUES (?,?,?,?,?,?,?,?)`)
    calendar.forEach((event, index) => {
      const id = `CAL-${event.date}-${String(index + 1).padStart(3, '0')}`
      eventStmt.run(id, event.date, event.endDate || event.date, event.title, event.type, event.noClasses ? 1 : 0, event.startTime || null, event.endTime || null)
    })

    const markStmt = db.prepare(`INSERT INTO marks
      (roll_number,semester,subject,component,obtained_marks,max_marks) VALUES (?,?,?,?,?,?)`)
    if (db.prepare('SELECT COUNT(*) AS count FROM marks').get().count === 0) {
      for (const row of marks) markStmt.run(profile.rollNumber, row.semester, row.subject, row.component, row.obtainedMarks, row.maxMarks)
    }

    const noticeStmt = db.prepare(`INSERT OR REPLACE INTO notices
      (id,title,body,category,priority,posted_by,posted_at) VALUES (?,?,?,?,?,?,?)`)
    for (const n of notices) noticeStmt.run(n.id, n.title, n.body, n.category, n.priority, n.postedBy, n.postedAt)

    const requestStmt = db.prepare(`INSERT OR REPLACE INTO requests
      (id,roll_number,type,details,status,remarks,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`)
    for (const r of requests) {
      requestStmt.run(r.id.toUpperCase(), profile.rollNumber, r.type, r.description, r.status, r.remarks ?? '', r.submittedAt, r.updatedAt ?? r.submittedAt)
    }

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function seedAttendanceReconstruction() {
  // Attendance from 13-Sep through 22-Sep is reconstructed from the supplied
  // timetable/calendar. Scheduled enrolled classes are assumed PRESENT unless
  // the user supplied evidence otherwise. The two 17-Sep red periods are
  // VERIFIED absences. Every reconstructed row is editable from the Daily Log.
  const profile = json('profile.json').profile
  const stmt = db.prepare(`INSERT OR IGNORE INTO attendance_entries
    (id,roll_number,date,timetable_id,scheduled_subject_code,actual_subject_code,status,notes,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
  const enrolled = new Set(['CN','WP','DBMS','AAD','ELECTIVE','DT','DBMSLAB'])
  const verifiedAbsent = new Set(['2026-09-17|THU-4','2026-09-17|THU-5'])
  const fullDayAbsent = new Set(['2026-09-22'])
  const start = new Date('2026-09-13T00:00:00Z')
  const end = new Date('2026-09-22T00:00:00Z')
  const timetable = json('timetable.json').timetable
  const calendar = json('academic-calendar.json').events
  const noClass = date => calendar.some(event => event.noClasses && event.date <= date && (event.endDate || event.date) >= date)
  const stamp = '2026-09-22T12:00:00.000Z'
  for (let day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const date = day.toISOString().slice(0,10)
    if (noClass(date)) continue
    const dayIndex = day.getUTCDay()
    for (const slot of timetable) {
      if (slot.dayIndex !== dayIndex || !slot.trackAttendance || !enrolled.has(slot.subjectCode)) continue
      const key = `${date}|${slot.id}`
      const isVerifiedAbsence = verifiedAbsent.has(key) || fullDayAbsent.has(date)
      const status = isVerifiedAbsence ? 'absent' : 'present'
      const notes = isVerifiedAbsence
        ? (date === '2026-09-22' ? 'Absent for the full teaching day.' : 'Verified absence.')
        : 'Attendance entry.'
      const id = `ATT-${date.replaceAll('-','')}-${slot.id}`
      stmt.run(id, profile.rollNumber, date, slot.id, slot.subjectCode, slot.subjectCode, status, notes, stamp, stamp)
    }
  }

  // Verified 23-Sep updates: AAD slot was conducted as CN, followed by DBMS and DBMS Lab records.
  const day23 = [
    ['ATT-20260923-WED-4','2026-09-23','WED-4','AAD','CN','present','Subject substitution recorded.'],
    ['ATT-20260923-WED-5','2026-09-23','WED-5','DBMS','DBMS','present','Attendance entry.'],
    ['ATT-20260923-WED-LAB','2026-09-23','WED-LAB','DBMSLAB','DBMSLAB','present','Attendance entry.'],
  ]
  for (const [id,date,timetableId,scheduled,actual,status,notes] of day23) {
    stmt.run(id, profile.rollNumber, date, timetableId, scheduled, actual, status, notes, '2026-09-23T12:00:00.000Z', '2026-09-23T12:00:00.000Z')
  }
}

export function resetDemoData() {
  db.exec('PRAGMA foreign_keys = OFF; BEGIN;')
  try {
    for (const table of ['password_reset_tokens','attendance_entries','class_overrides','extra_classes','requests','attendance','marks','notices','attendance_baselines','timetable_slots','academic_events','subjects','users','students']) {
      db.exec(`DELETE FROM ${table};`)
    }
    db.exec('COMMIT; PRAGMA foreign_keys = ON;')
    seedCore()
    seedAttendanceReconstruction()
  } catch (error) {
    try { db.exec('ROLLBACK; PRAGMA foreign_keys = ON;') } catch {}
    throw error
  }
}

const studentCountBeforeSeed = db.prepare('SELECT COUNT(*) AS count FROM students').get().count
if (firstRun || studentCountBeforeSeed === 0) {
  seedCore()
  seedAttendanceReconstruction()
} else {
  // Keep reference data synchronized without re-creating attendance that the
  // student may have edited or deleted after the first run.
  seedCore()
}
