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
