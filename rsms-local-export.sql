PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  student_roll_number TEXT NOT NULL
);
INSERT INTO "users" ("id","email","password_hash","role","student_roll_number") VALUES(1,'demo@rsms.local','d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791','student','DEMO001');
INSERT INTO "users" ("id","email","password_hash","role","student_roll_number") VALUES(2,'faculty@rsms.local','d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791','faculty','DEMO001');
CREATE TABLE students (
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
INSERT INTO "students" ("roll_number","name","email","program","branch","semester","section","phone","bio") VALUES('DEMO001','Demo Student','demo.student@example.invalid','B.Tech Computer Science','Computer Science',5,'A','','Generic coursework demo profile. No real student identity is stored.');
CREATE TABLE requests (
  id TEXT PRIMARY KEY,
  roll_number TEXT NOT NULL,
  type TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Submitted',
  remarks TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT INTO "requests" ("id","roll_number","type","details","status","remarks","created_at","updated_at") VALUES('REQ-001','DEMO001','hostelRefund','Requesting a refund of the hostel caution deposit after vacating Block C in July.','resolved','Refund processed and credited to the registered bank account.','2026-07-20T10:00:00+05:30','2026-07-28T15:00:00+05:30');
INSERT INTO "requests" ("id","roll_number","type","details","status","remarks","created_at","updated_at") VALUES('REQ-002','DEMO001','messRefund','Was on approved leave for 6 days during the last billing cycle and would like a pro-rated mess fee refund.','resolved','Verified against the leave register. Refund approved.','2026-08-02T09:30:00+05:30','2026-08-09T12:00:00+05:30');
INSERT INTO "requests" ("id","roll_number","type","details","status","remarks","created_at","updated_at") VALUES('REQ-003','DEMO001','activityPoints','Requesting activity points for participating in the inter-college coding contest held last month.','inReview','','2026-09-05T11:00:00+05:30','2026-09-07T09:15:00+05:30');
INSERT INTO "requests" ("id","roll_number","type","details","status","remarks","created_at","updated_at") VALUES('REQ-004','DEMO001','facility','The reading room lights on the second floor of the library have been flickering for a week.','inReview','Forwarded to the facilities team for inspection.','2026-09-09T16:20:00+05:30','2026-09-10T10:00:00+05:30');
INSERT INTO "requests" ("id","roll_number","type","details","status","remarks","created_at","updated_at") VALUES('REQ-005','DEMO001','grievance','The projector in Seminar Hall 2 was not working during a scheduled class presentation.','submitted','','2026-09-12T13:45:00+05:30','2026-09-12T13:45:00+05:30');
INSERT INTO "requests" ("id","roll_number","type","details","status","remarks","created_at","updated_at") VALUES('REQ-006','DEMO001','suggestion','Suggesting an additional water dispenser near the third-floor labs, since the nearest one is a full floor away.','submitted','','2026-09-13T08:10:00+05:30','2026-09-13T08:10:00+05:30');
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roll_number TEXT NOT NULL,
  subject TEXT NOT NULL,
  attended INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percentage REAL NOT NULL
);
CREATE TABLE marks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roll_number TEXT NOT NULL,
  semester INTEGER NOT NULL,
  subject TEXT NOT NULL,
  component TEXT NOT NULL,
  obtained_marks REAL,
  max_marks REAL
);
INSERT INTO "marks" ("id","roll_number","semester","subject","component","obtained_marks","max_marks") VALUES(1,'DEMO001',5,'Web Programming','Mid Term 1',24,30);
INSERT INTO "marks" ("id","roll_number","semester","subject","component","obtained_marks","max_marks") VALUES(2,'DEMO001',5,'Web Programming','Assignment',9,10);
INSERT INTO "marks" ("id","roll_number","semester","subject","component","obtained_marks","max_marks") VALUES(3,'DEMO001',5,'Algorithm Analysis and Design','Mid Term 1',22,30);
INSERT INTO "marks" ("id","roll_number","semester","subject","component","obtained_marks","max_marks") VALUES(4,'DEMO001',5,'Algorithm Analysis and Design','Assignment',8,10);
INSERT INTO "marks" ("id","roll_number","semester","subject","component","obtained_marks","max_marks") VALUES(5,'DEMO001',5,'Computer Networks','Mid Term 1',25,30);
INSERT INTO "marks" ("id","roll_number","semester","subject","component","obtained_marks","max_marks") VALUES(6,'DEMO001',5,'Computer Networks','Assignment',9,10);
INSERT INTO "marks" ("id","roll_number","semester","subject","component","obtained_marks","max_marks") VALUES(7,'DEMO001',5,'Database Management Systems','Mid Term 1',23,30);
INSERT INTO "marks" ("id","roll_number","semester","subject","component","obtained_marks","max_marks") VALUES(8,'DEMO001',5,'Database Management Systems','Assignment',8,10);
INSERT INTO "marks" ("id","roll_number","semester","subject","component","obtained_marks","max_marks") VALUES(9,'DEMO001',5,'Design Thinking and Creativity','Mid Term 1',27,30);
INSERT INTO "marks" ("id","roll_number","semester","subject","component","obtained_marks","max_marks") VALUES(10,'DEMO001',5,'Design Thinking and Creativity','Assignment',9,10);
INSERT INTO "marks" ("id","roll_number","semester","subject","component","obtained_marks","max_marks") VALUES(11,'DEMO001',5,'S5 Elective (CG / SPM / MML)','Mid Term 1',21,30);
INSERT INTO "marks" ("id","roll_number","semester","subject","component","obtained_marks","max_marks") VALUES(12,'DEMO001',5,'S5 Elective (CG / SPM / MML)','Assignment',8,10);
INSERT INTO "marks" ("id","roll_number","semester","subject","component","obtained_marks","max_marks") VALUES(13,'DEMO001',5,'DBMS Lab','Sessional',45,50);
INSERT INTO "marks" ("id","roll_number","semester","subject","component","obtained_marks","max_marks") VALUES(14,'DEMO001',5,'Computer Networks Lab','Sessional',44,50);
CREATE TABLE notices (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  priority TEXT,
  posted_by TEXT,
  posted_at TEXT NOT NULL
);
INSERT INTO "notices" ("id","title","body","category","priority","posted_by","posted_at") VALUES('ntc-001','Web Programming project evaluation','Project evaluation is scheduled for 24 September 2026. All group members should be available. The presentation duration is 15 minutes and students should be prepared for viva, demonstration and small live code updates.','academic','urgent','Course Evaluation Desk','2026-09-22T09:00:00+05:30');
INSERT INTO "notices" ("id","title","body","category","priority","posted_by","posted_at") VALUES('ntc-002','Attendance eligibility reminder','The demo attendance intelligence uses 80% as the Internal Examination threshold and 75% as the Main ESE threshold, as provided for this project.','academic','important','Academic Portal','2026-09-21T12:00:00+05:30');
INSERT INTO "notices" ("id","title","body","category","priority","posted_by","posted_at") VALUES('ntc-003','Odd semester teaching period nearing completion','The original academic calendar marked 30 September 2026 as the semester end, but regular S5 teaching has been extended through 9 October 2026.','academic','normal','Academic Portal','2026-09-20T10:00:00+05:30');
INSERT INTO "notices" ("id","title","body","category","priority","posted_by","posted_at") VALUES('ntc-004','Library service demo notice','This is a fictional service notice included only to demonstrate notice filtering and rendering in the student portal.','administrative','normal','Demo Services','2026-09-18T10:00:00+05:30');
CREATE TABLE subjects (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  track_attendance INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "subjects" ("code","name","short_name","track_attendance") VALUES('WP','Web Programming','WP',1);
INSERT INTO "subjects" ("code","name","short_name","track_attendance") VALUES('AAD','Algorithm Analysis and Design','AAD',1);
INSERT INTO "subjects" ("code","name","short_name","track_attendance") VALUES('CN','Computer Networks','CN',1);
INSERT INTO "subjects" ("code","name","short_name","track_attendance") VALUES('DBMS','Database Management Systems','DBMS',1);
INSERT INTO "subjects" ("code","name","short_name","track_attendance") VALUES('DT','Design Thinking and Creativity','DT',1);
INSERT INTO "subjects" ("code","name","short_name","track_attendance") VALUES('ELECTIVE','Software Project Management (S5 Elective)','SPM',1);
INSERT INTO "subjects" ("code","name","short_name","track_attendance") VALUES('DBMSLAB','DBMS Lab','DBMS Lab',1);
INSERT INTO "subjects" ("code","name","short_name","track_attendance") VALUES('CNLAB','Computer Networks Lab','CN Lab',0);
INSERT INTO "subjects" ("code","name","short_name","track_attendance") VALUES('OPTIONAL','Honour / Course Tutorial / Add-on / Remedial','Optional',0);
INSERT INTO "subjects" ("code","name","short_name","track_attendance") VALUES('MENTORING','Mentoring / Activity Hour','Mentoring',0);
CREATE TABLE timetable_slots (
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
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('MON-1',1,'Monday',1,'WP','Web Programming','08:30','09:35','MB, LH4','Theory',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('MON-2',1,'Monday',2,'AAD','Algorithm Analysis and Design','09:35','10:40','MB, LH4','Theory',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('MON-3',1,'Monday',3,'CN','Computer Networks','11:00','12:00','MB, LH4','Theory',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('MON-4',1,'Monday',4,'DBMS','Database Management Systems','13:00','14:00','MB, LH4','Theory',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('MON-5',1,'Monday',5,'ELECTIVE','S5 Elective (CG / SPM / MML)','14:00','15:00','LH 4/5/6/8','Elective',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('MON-6',1,'Monday',6,'OPTIONAL','Honour / Course Tutorial / Add-on / Remedial','15:15','16:15','As allotted','Optional',0);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('TUE-1',2,'Tuesday',1,'DBMS','Database Management Systems','08:30','09:35','MB, LH4','Theory',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('TUE-2',2,'Tuesday',2,'WP','Web Programming Tutorial','09:35','10:40','MB, LH4','Tutorial',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('TUE-3',2,'Tuesday',3,'DT','Design Thinking and Creativity','11:00','12:00','MB, LH4','Theory',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('TUE-4',2,'Tuesday',4,'CN','Computer Networks','13:00','14:00','MB, LH4','Theory',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('TUE-5',2,'Tuesday',5,'WP','Web Programming','14:00','15:00','MB, LH4','Theory',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('TUE-6',2,'Tuesday',6,'AAD','Algorithm Analysis and Design Tutorial','15:15','16:15','MB, LH4','Tutorial',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('WED-LAB',3,'Wednesday',1,'DBMSLAB','DBMS Lab','08:30','12:00','Feynman Lab','Lab',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('WED-4',3,'Wednesday',4,'AAD','Algorithm Analysis and Design','13:00','14:00','MB, LH4','Theory',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('WED-5',3,'Wednesday',5,'DBMS','Database Management Systems Tutorial','14:00','15:00','MB, LH4','Tutorial',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('WED-6',3,'Wednesday',6,'OPTIONAL','Honour / Course Tutorial / Add-on / Remedial','15:15','16:15','As allotted','Optional',0);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('THU-1',4,'Thursday',1,'ELECTIVE','S5 Elective (CG / SPM / MML)','08:30','09:35','LH 4/5/6/8','Elective',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('THU-2',4,'Thursday',2,'DBMS','Database Management Systems','09:35','10:40','MB, LH4','Theory',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('THU-3',4,'Thursday',3,'DT','Design Thinking and Creativity','11:00','12:00','MB, LH4','Theory',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('THU-4',4,'Thursday',4,'AAD','Algorithm Analysis and Design','13:00','14:00','MB, LH4','Theory',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('THU-5',4,'Thursday',5,'CN','Computer Networks','14:00','15:00','MB, LH4','Theory',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('THU-6',4,'Thursday',6,'WP','Web Programming','15:15','16:15','Feynman Lab','Practical',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('FRI-1',5,'Friday',1,'AAD','Algorithm Analysis and Design','08:30','09:30','MB, LH4','Theory',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('FRI-2',5,'Friday',2,'CN','Computer Networks','09:30','10:30','MB, LH4','Theory',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('FRI-3',5,'Friday',3,'ELECTIVE','S5 Elective (CG / SPM / MML)','10:40','11:35','LH 4/5/6/8','Elective',1);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('FRI-4',5,'Friday',4,'MENTORING','Mentoring / Activity Hour','11:35','12:30','As allotted','Activity',0);
INSERT INTO "timetable_slots" ("id","day_index","day_name","period","subject_code","subject_label","start_time","end_time","room","kind","track_attendance") VALUES('FRI-LAB',5,'Friday',5,'CNLAB','Computer Networks Lab','14:00','16:30','Zuse Lab','Lab',1);
CREATE TABLE academic_events (
  id TEXT PRIMARY KEY,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  no_classes INTEGER NOT NULL DEFAULT 0,
  start_time TEXT,
  end_time TEXT
);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-01-02-001','2026-01-02','2026-01-02','Mannam Jayanthi','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-01-06-002','2026-01-06','2026-01-06','Founders Day & College Day (Dreams)','event',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-01-12-003','2026-01-12','2026-01-17','S2/S4/S6/S8 Internal Examinations - 1','exam',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-01-22-004','2026-01-22','2026-01-24','Bharatham 2026','event',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-01-26-005','2026-01-26','2026-01-26','Republic Day','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-01-31-006','2026-01-31','2026-01-31','Minor/Honours Internal Examinations','exam',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-01-31-007','2026-01-31','2026-01-31','Open House','event',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-02-07-008','2026-02-07','2026-02-07','Sports Day','event',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-02-15-009','2026-02-15','2026-02-15','Sivarathri','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-02-23-010','2026-02-23','2026-02-28','S2/S4/S6/S8 Internal Examination - 2','exam',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-03-13-011','2026-03-13','2026-03-13','Semester Ends for S8','academic',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-03-14-012','2026-03-14','2026-03-14','Farewell Day','event',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-03-14-013','2026-03-14','2026-03-14','S8 ESE Registration','academic',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-03-19-014','2026-03-19','2026-03-19','Semester Ends for S2/S4/S6','academic',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-03-20-015','2026-03-20','2026-03-20','Eid-ul-Fitr','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-03-21-016','2026-03-21','2026-03-21','In lieu of March 14','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-03-24-017','2026-03-24','2026-03-28','S8 ESE-Theory','exam',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-03-30-018','2026-03-30','2026-03-30','S2/S4/S6 ESE Theory','exam',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-03-30-019','2026-03-30','2026-03-30','S8 ESE-Theory','exam',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-03-31-020','2026-03-31','2026-03-31','S2/S4/S6 ESE Theory','exam',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-03-31-021','2026-03-31','2026-03-31','S8 ESE-Theory','exam',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-04-01-022','2026-04-01','2026-04-01','S2/S4/S6 ESE Theory','exam',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-04-01-023','2026-04-01','2026-04-01','S8 ESE-Theory','exam',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-04-02-024','2026-04-02','2026-04-02','Maundy Thursday','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-04-03-025','2026-04-03','2026-04-03','Good Friday','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-04-04-026','2026-04-04','2026-04-04','Holy Saturday','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-04-06-027','2026-04-06','2026-04-10','S2/S4/S6 ESE Theory','exam',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-04-06-028','2026-04-06','2026-04-10','S8 Project & Viva Voce','exam',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-04-13-029','2026-04-13','2026-04-13','S2/S4/S6 ESE Theory','exam',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-04-14-030','2026-04-14','2026-04-14','Ambedkar Jayanthi','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-04-15-031','2026-04-15','2026-04-18','S2/S4/S6 ESE Theory','exam',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-04-20-032','2026-04-20','2026-04-24','S2/S4/S6 ESE Theory','exam',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-05-01-033','2026-05-01','2026-05-01','May Day','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-05-16-034','2026-05-16','2026-05-16','Samavarthanam','event',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-05-27-035','2026-05-27','2026-05-27','Bakrid','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-05-28-036','2026-05-28','2026-05-28','Bakrid','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-06-15-037','2026-06-15','2026-06-15','Semester Begins (S3/S5/S7)','academic',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-06-26-038','2026-06-26','2026-06-26','Muharam','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-06-29-039','2026-06-29','2026-06-29','Honours & Minor course registration','academic',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-06-29-040','2026-06-29','2026-06-29','Student Course Registration','academic',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-07-03-041','2026-07-03','2026-07-03','St. Thomas Day','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-07-20-042','2026-07-20','2026-07-20','Govt. Declared Holiday','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-07-20-043','2026-07-20','2026-07-20','Internal Examination','exam',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-07-21-044','2026-07-21','2026-07-25','Internal Examination','exam',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-07-31-045','2026-07-31','2026-07-31','Techkshetra 2026','event',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-08-08-046','2026-08-08','2026-08-08','Open House and Honours/Minor Internal Examination','exam',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-08-12-047','2026-08-12','2026-08-12','Karkkidaka Vavu','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-08-15-048','2026-08-15','2026-08-15','Independence Day','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-08-21-049','2026-08-21','2026-08-21','Onam Celebration','event',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-08-24-050','2026-08-24','2026-08-29','Onam Holidays','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-08-31-051','2026-08-31','2026-08-31','Silver Jubilee Celebrations','event',0,'08:30','17:00');
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-09-01-052','2026-09-01','2026-09-01','Confluence 3.0','event',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-09-04-053','2026-09-04','2026-09-04','Sri Krishna Jayanthi','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-09-07-054','2026-09-07','2026-09-07','Holiday','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-09-21-055','2026-09-21','2026-09-21','Sree Narayanaguru Samadhi','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-09-24-056','2026-09-24','2026-09-24','Web Programming Project Evaluation (15 min presentation)','course',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-09-30-057','2026-09-30','2026-09-30','Semester ends for S3/S5/S7','academic',0,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-10-02-058','2026-10-02','2026-10-02','Gandhi Jayanthi','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-10-12-059','2026-10-12','2026-10-19','ESE-Theory','exam',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-10-20-060','2026-10-20','2026-10-20','Maha Navami','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-10-21-061','2026-10-21','2026-10-21','Vijaya Dasami','holiday',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-10-22-062','2026-10-22','2026-10-24','ESE-Theory','exam',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-10-26-063','2026-10-26','2026-10-31','ESE-Theory','exam',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-11-02-064','2026-11-02','2026-11-06','ESE-Theory','exam',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-11-09-065','2026-11-09','2026-11-13','Practical End Semester Examinations','exam',1,NULL,NULL);
INSERT INTO "academic_events" ("id","start_date","end_date","title","type","no_classes","start_time","end_time") VALUES('CAL-2026-12-25-066','2026-12-25','2026-12-25','Christmas','holiday',1,NULL,NULL);
CREATE TABLE class_overrides (
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
CREATE TABLE extra_classes (
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
CREATE TABLE attendance_baselines (
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
INSERT INTO "attendance_baselines" ("roll_number","subject_code","official_course_code","percentage","as_of_date","attended","total","source_note") VALUES('DEMO001','CN','102003/CS500A',96,'2026-09-12',43,45,'Reconstructed baseline: official RSMS rounded percentage + supplied S5 CS A timetable/calendar. Counts are estimates, not portal-reported exact counts.');
INSERT INTO "attendance_baselines" ("roll_number","subject_code","official_course_code","percentage","as_of_date","attended","total","source_note") VALUES('DEMO001','WP','102003/CS500B',87,'2026-09-12',39,45,'Reconstructed baseline: official RSMS rounded percentage + supplied S5 CS A timetable/calendar. Counts are estimates, not portal-reported exact counts.');
INSERT INTO "attendance_baselines" ("roll_number","subject_code","official_course_code","percentage","as_of_date","attended","total","source_note") VALUES('DEMO001','DBMS','102903/CO900C',90,'2026-09-12',38,42,'Reconstructed baseline: official RSMS rounded percentage + supplied S5 CS A timetable/calendar. Counts are estimates, not portal-reported exact counts.');
INSERT INTO "attendance_baselines" ("roll_number","subject_code","official_course_code","percentage","as_of_date","attended","total","source_note") VALUES('DEMO001','AAD','102903/CO500D',96,'2026-09-12',48,50,'Reconstructed baseline: official RSMS rounded percentage + supplied S5 CS A timetable/calendar. Counts are estimates, not portal-reported exact counts.');
INSERT INTO "attendance_baselines" ("roll_number","subject_code","official_course_code","percentage","as_of_date","attended","total","source_note") VALUES('DEMO001','ELECTIVE','102903/CO501E',93,'2026-09-12',27,29,'Reconstructed baseline: official RSMS rounded percentage + supplied S5 CS A timetable/calendar. Counts are estimates, not portal-reported exact counts.');
INSERT INTO "attendance_baselines" ("roll_number","subject_code","official_course_code","percentage","as_of_date","attended","total","source_note") VALUES('DEMO001','DT','102808/CO900G',88,'2026-09-12',21,24,'Reconstructed baseline: official RSMS rounded percentage + supplied S5 CS A timetable/calendar. Counts are estimates, not portal-reported exact counts.');
INSERT INTO "attendance_baselines" ("roll_number","subject_code","official_course_code","percentage","as_of_date","attended","total","source_note") VALUES('DEMO001','DBMSLAB','102903/CO922S',89,'2026-09-12',8,9,'Reconstructed baseline: official RSMS rounded percentage + supplied S5 CS A timetable/calendar. Counts are estimates, not portal-reported exact counts.');
CREATE TABLE attendance_entries (
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
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260914-MON-1','DEMO001','2026-09-14','MON-1','WP','WP','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260914-MON-2','DEMO001','2026-09-14','MON-2','AAD','AAD','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260914-MON-3','DEMO001','2026-09-14','MON-3','CN','CN','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260914-MON-4','DEMO001','2026-09-14','MON-4','DBMS','DBMS','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260914-MON-5','DEMO001','2026-09-14','MON-5','ELECTIVE','ELECTIVE','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260915-TUE-1','DEMO001','2026-09-15','TUE-1','DBMS','DBMS','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260915-TUE-2','DEMO001','2026-09-15','TUE-2','WP','WP','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260915-TUE-3','DEMO001','2026-09-15','TUE-3','DT','DT','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260915-TUE-4','DEMO001','2026-09-15','TUE-4','CN','CN','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260915-TUE-5','DEMO001','2026-09-15','TUE-5','WP','WP','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260915-TUE-6','DEMO001','2026-09-15','TUE-6','AAD','AAD','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260916-WED-LAB','DEMO001','2026-09-16','WED-LAB','DBMSLAB','DBMSLAB','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260916-WED-4','DEMO001','2026-09-16','WED-4','AAD','AAD','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260916-WED-5','DEMO001','2026-09-16','WED-5','DBMS','DBMS','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260917-THU-1','DEMO001','2026-09-17','THU-1','ELECTIVE','ELECTIVE','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260917-THU-2','DEMO001','2026-09-17','THU-2','DBMS','DBMS','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260917-THU-3','DEMO001','2026-09-17','THU-3','DT','DT','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260917-THU-4','DEMO001','2026-09-17','THU-4','AAD','AAD','absent','Verified from RSMS attendance screenshot: red subject/period means absent.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260917-THU-5','DEMO001','2026-09-17','THU-5','CN','CN','absent','Verified from RSMS attendance screenshot: red subject/period means absent.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260917-THU-6','DEMO001','2026-09-17','THU-6','WP','WP','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260918-FRI-1','DEMO001','2026-09-18','FRI-1','AAD','AAD','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260918-FRI-2','DEMO001','2026-09-18','FRI-2','CN','CN','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260918-FRI-3','DEMO001','2026-09-18','FRI-3','ELECTIVE','ELECTIVE','present','Reconstructed through 22-Sep-2026 from the supplied timetable/calendar; assumed present because no absence evidence was supplied. Editable by the student.','2026-09-22T12:00:00.000Z','2026-09-22T12:00:00.000Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260922-TUE-1','DEMO001','2026-09-22','TUE-1','DBMS','DBMS','absent','','2026-09-22T12:00:00.000Z','2026-09-24T01:41:39.957Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260922-TUE-2','DEMO001','2026-09-22','TUE-2','WP','WP','absent','','2026-09-22T12:00:00.000Z','2026-09-24T01:41:40.960Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260922-TUE-3','DEMO001','2026-09-22','TUE-3','DT','DT','absent','','2026-09-22T12:00:00.000Z','2026-09-24T01:41:42.326Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260922-TUE-4','DEMO001','2026-09-22','TUE-4','CN','CN','absent','','2026-09-22T12:00:00.000Z','2026-09-24T01:41:44.710Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260922-TUE-5','DEMO001','2026-09-22','TUE-5','WP','WP','absent','','2026-09-22T12:00:00.000Z','2026-09-24T01:41:55.545Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-20260922-TUE-6','DEMO001','2026-09-22','TUE-6','AAD','AAD','absent','','2026-09-22T12:00:00.000Z','2026-09-24T01:41:56.827Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-ff7aa8ba-bd75-4d69-b9db-ebfeca1becfb','DEMO001','2026-09-23','WED-LAB','DBMSLAB','DBMSLAB','present','','2026-09-24T01:42:06.678Z','2026-09-24T01:42:06.678Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-41596026-25b5-4ed4-b305-d1db93b77875','DEMO001','2026-09-23','WED-4','AAD','CN','present','','2026-09-24T01:42:11.026Z','2026-09-24T01:42:11.026Z');
INSERT INTO "attendance_entries" ("id","roll_number","date","timetable_id","scheduled_subject_code","actual_subject_code","status","notes","created_at","updated_at") VALUES('ATT-e6f1b3dc-b0cd-4c8f-a1f1-98cbf46b9e41','DEMO001','2026-09-23','WED-5','DBMS','DBMS','present','','2026-09-24T01:42:13.060Z','2026-09-24T01:42:13.060Z');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('users',2);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('marks',14);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('users',2);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('marks',14);
CREATE INDEX idx_attendance_entries_roll_date
ON attendance_entries (roll_number, date);
CREATE INDEX idx_timetable_day
ON timetable_slots (day_index, period);
CREATE INDEX idx_academic_events_dates
ON academic_events (start_date, end_date);
CREATE INDEX idx_requests_roll
ON requests (roll_number);