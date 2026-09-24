export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

type JwtUser = {
  sub?: number;
  email: string;
  role: string;
  rollNumber: string;
  iat?: number;
  exp?: number;
};

const TEACHING_TERM_START = "2026-06-15";
const TEACHING_TERM_END = "2026-10-09";
const ATTENDANCE_STATUSES = new Set(["present", "absent", "duty", "cancelled"]);

const requestTypeLabels: Record<string, string> = {
  hostelRefund: "Hostel fee refund",
  messRefund: "Mess fee refund",
  activityPoints: "Activity points request",
  facility: "Facility maintenance request",
  grievance: "Grievance",
  suggestion: "Suggestion",
};

const requestStatusLabels: Record<string, string> = {
  resolved: "Resolved",
  inReview: "Under review",
  submitted: "Submitted",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function empty(status = 204) {
  return new Response(null, { status, headers: corsHeaders });
}

function validDate(value: unknown) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function nowIso() {
  return new Date().toISOString();
}

function dayIndex(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function dateInIndia(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDaysIso(date: string, amount: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}

function safeLeaves(attended: number, total: number, target: number) {
  if (!total || !attended) return 0;
  return Math.max(0, Math.floor(attended / target - total + 1e-9));
}

function neededClasses(attended: number, total: number, target: number) {
  if (total === 0 || attended / total >= target) return 0;
  return Math.max(
    0,
    Math.ceil((target * total - attended) / (1 - target) - 1e-9)
  );
}

function base64urlEncode(input: string | ArrayBuffer) {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);

  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64urlDecode(value: string) {
  let normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  while (normalized.length % 4 !== 0) normalized += "=";
  return atob(normalized);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );

  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signToken(user: {
  id: number;
  email: string;
  role: string;
  student_roll_number: string;
}, secret: string) {
  const header = base64urlEncode(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  );

  const now = Math.floor(Date.now() / 1000);
  const payload = base64urlEncode(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role,
      rollNumber: user.student_roll_number,
      iat: now,
      exp: now + 60 * 60 * 4,
    })
  );

  const data = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );

  return `${data}.${base64urlEncode(signature)}`;
}

async function verifyToken(token: string, secret: string): Promise<JwtUser | null> {
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBinary = base64urlDecode(signature);
    const signatureBytes = Uint8Array.from(
      signatureBinary,
      (c) => c.charCodeAt(0)
    );

    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      new TextEncoder().encode(`${header}.${payload}`)
    );
    if (!ok) return null;

    const decoded = JSON.parse(base64urlDecode(payload)) as JwtUser;
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) return null;

    return decoded;
  } catch {
    return null;
  }
}

async function authenticate(request: Request, env: Env) {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token || !env.JWT_SECRET) return null;
  return verifyToken(token, env.JWT_SECRET);
}

function isFaculty(user: JwtUser) {
  return user.role === "faculty";
}

function normalizeRequest(row: any) {
  return {
    id: row.id,
    type: requestTypeLabels[row.type] || row.type,
    details: row.details,
    status: requestStatusLabels[row.status] || row.status,
    remarks: row.remarks || "",
    date: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(row.created_at)),
    updatedAt: row.updated_at,
  };
}

async function eventsForDate(env: Env, date: string) {
  const result = await env.DB.prepare(`
    SELECT
      id,
      start_date AS startDate,
      end_date AS endDate,
      title,
      type,
      no_classes AS noClasses,
      start_time AS startTime,
      end_time AS endTime
    FROM academic_events
    WHERE start_date <= ? AND end_date >= ?
    ORDER BY start_date, title
  `).bind(date, date).all<any>();

  return result.results.map((row: any) => ({
    ...row,
    noClasses: Boolean(row.noClasses),
  }));
}

async function subjectCatalog(env: Env) {
  const result = await env.DB.prepare(`
    SELECT
      code,
      name,
      short_name AS shortName,
      track_attendance AS trackAttendance
    FROM subjects
    ORDER BY track_attendance DESC, name
  `).all<any>();

  return result.results.map((row: any) => ({
    ...row,
    trackAttendance: Boolean(row.trackAttendance),
  }));
}

async function scheduleForDate(
  env: Env,
  date: string,
  rollNumber: string,
  options: { teachingTermEnd?: string } = {}
) {
  const events = await eventsForDate(env, date);
  const effectiveTeachingEnd = options.teachingTermEnd || TEACHING_TERM_END;
  const outsideTeachingTerm =
    date < TEACHING_TERM_START || date > effectiveTeachingEnd;

  if (outsideTeachingTerm) {
    events.push({
      id: "TERM-BOUNDARY",
      startDate: date,
      endDate: date,
      title: "Outside the S5 teaching term",
      type: "academic",
      noClasses: true,
      startTime: null,
      endTime: null,
    });
  }

  const noClasses =
    outsideTeachingTerm || events.some((event: any) => event.noClasses);

  const base = await env.DB.prepare(`
    SELECT
      id,
      day_name AS day,
      period,
      subject_code AS scheduledSubjectCode,
      subject_label AS scheduledSubject,
      start_time AS startTime,
      end_time AS endTime,
      room,
      kind,
      track_attendance AS trackAttendance
    FROM timetable_slots
    WHERE day_index = ?
    ORDER BY start_time
  `).bind(dayIndex(date)).all<any>();

  const overrides = await env.DB.prepare(`
    SELECT * FROM class_overrides WHERE date = ?
  `).bind(date).all<any>();

  const entries = await env.DB.prepare(`
    SELECT * FROM attendance_entries
    WHERE roll_number = ? AND date = ?
  `).bind(rollNumber, date).all<any>();

  const subjects = await subjectCatalog(env);

  const overrideMap = new Map(
    overrides.results.map((row: any) => [row.timetable_id, row])
  );
  const entryMap = new Map(
    entries.results.map((row: any) => [row.timetable_id, row])
  );
  const subjectMap = new Map(subjects.map((row: any) => [row.code, row]));

  const items = base.results.map((slot: any) => {
    const override: any = overrideMap.get(slot.id);
    const entry: any = entryMap.get(slot.id);

    const actualSubjectCode =
      override?.status === "cancelled"
        ? null
        : override?.actual_subject_code ||
          entry?.actual_subject_code ||
          slot.scheduledSubjectCode;

    const actualSubject = actualSubjectCode
      ? (subjectMap.get(actualSubjectCode) as any)?.name || actualSubjectCode
      : null;

    return {
      ...slot,
      trackAttendance: Boolean(slot.trackAttendance),
      overrideId: override?.id || null,
      overrideStatus: override?.status || null,
      overrideReason: override?.reason || "",
      actualSubjectCode,
      actualSubject,
      attendanceEntryId: entry?.id || null,
      attendanceStatus: entry?.status || null,
      attendanceNotes: entry?.notes || "",
      calendarSuppressed: noClasses,
    };
  });

  const extraRows = await env.DB.prepare(`
    SELECT
      id,
      date,
      subject_code AS actualSubjectCode,
      label AS actualSubject,
      start_time AS startTime,
      end_time AS endTime,
      room,
      reason
    FROM extra_classes
    WHERE date = ?
    ORDER BY start_time
  `).bind(date).all<any>();

  const extras = extraRows.results.map((extra: any) => {
    const key = `EXTRA:${extra.id}`;
    const entry: any = entryMap.get(key);

    return {
      id: key,
      extraId: extra.id,
      day: new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        timeZone: "UTC",
      }).format(new Date(`${date}T12:00:00Z`)),
      period: 99,
      scheduledSubjectCode: extra.actualSubjectCode,
      scheduledSubject: extra.actualSubject,
      actualSubjectCode: extra.actualSubjectCode,
      actualSubject: extra.actualSubject,
      startTime: extra.startTime,
      endTime: extra.endTime,
      room: extra.room,
      kind: "Extra class",
      trackAttendance: true,
      overrideStatus: "extra",
      overrideReason: extra.reason,
      attendanceEntryId: entry?.id || null,
      attendanceStatus: entry?.status || null,
      attendanceNotes: entry?.notes || "",
      calendarSuppressed: false,
    };
  });

  return {
    date,
    dayIndex: dayIndex(date),
    events,
    noClasses,
    items: noClasses
      ? []
      : [...items, ...extras].sort((a, b) =>
          a.startTime.localeCompare(b.startTime)
        ),
    suppressedItems: noClasses ? items : [],
  };
}

async function attendanceSummary(env: Env, rollNumber: string) {
  const baselineRows = await env.DB.prepare(`
    SELECT
      subject_code AS code,
      official_course_code AS officialCourseCode,
      percentage AS officialPercentage,
      as_of_date AS officialAsOf,
      attended AS baselineAttended,
      total AS baselineTotal,
      source_note AS baselineSourceNote
    FROM attendance_baselines
    WHERE roll_number = ?
  `).bind(rollNumber).all<any>();

  const baselineByCode = new Map(
    baselineRows.results.map((row: any) => [row.code, row])
  );

  const catalog = (await subjectCatalog(env)).filter((subject: any) =>
    baselineByCode.has(subject.code)
  );

  const trackedRows = await env.DB.prepare(`
    SELECT
      actual_subject_code AS code,
      SUM(CASE WHEN status IN ('present','duty') THEN 1 ELSE 0 END) AS attended,
      SUM(CASE WHEN status IN ('present','duty','absent') THEN 1 ELSE 0 END) AS total,
      SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent
    FROM attendance_entries
    WHERE roll_number = ? AND date > '2026-09-12'
    GROUP BY actual_subject_code
  `).bind(rollNumber).all<any>();

  const byCode = new Map(
    trackedRows.results.map((row: any) => [row.code, row])
  );

  const subjects = catalog.map((subject: any) => {
    const base: any = baselineByCode.get(subject.code);
    const row: any = byCode.get(subject.code) || {
      attended: 0,
      total: 0,
      absent: 0,
    };

    const trackedAttended = Number(row.attended || 0);
    const trackedTotal = Number(row.total || 0);
    const trackedPercentage = trackedTotal
      ? Number(((trackedAttended / trackedTotal) * 100).toFixed(1))
      : null;

    const hasExactBaselineCounts =
      base.baselineAttended != null && base.baselineTotal != null;

    let attended = trackedAttended;
    let total = trackedTotal;
    let percentage = Number(base.officialPercentage);

    if (hasExactBaselineCounts) {
      attended += Number(base.baselineAttended);
      total += Number(base.baselineTotal);
      percentage = total
        ? Number(((attended / total) * 100).toFixed(1))
        : Number(base.officialPercentage);
    }

    return {
      ...subject,
      officialCourseCode: base.officialCourseCode,
      officialPercentage: Number(base.officialPercentage),
      officialAsOf: base.officialAsOf,
      baselineCountsKnown: hasExactBaselineCounts,
      baselineEstimated: Boolean(
        base.baselineSourceNote?.startsWith("Reconstructed baseline:")
      ),
      baselineSourceNote: base.baselineSourceNote || "",
      baselineAttended: Number(base.baselineAttended || 0),
      baselineTotal: Number(base.baselineTotal || 0),
      trackedAttended,
      trackedTotal,
      trackedPercentage,
      attended,
      total,
      absent: Number(row.absent || 0),
      percentage,
      internalEligible: percentage >= 80,
      eseEligible: percentage >= 75,
      safeLeaves80: hasExactBaselineCounts
        ? safeLeaves(attended, total, 0.8)
        : null,
      safeLeaves75: hasExactBaselineCounts
        ? safeLeaves(attended, total, 0.75)
        : null,
      neededFor80: hasExactBaselineCounts
        ? neededClasses(attended, total, 0.8)
        : null,
      neededFor75: hasExactBaselineCounts
        ? neededClasses(attended, total, 0.75)
        : null,
    };
  });

  const attended = subjects.reduce(
    (sum: number, row: any) => sum + row.attended,
    0
  );
  const total = subjects.reduce(
    (sum: number, row: any) => sum + row.total,
    0
  );

  return {
    attended,
    total,
    overallPercentage: total
      ? Number(((attended / total) * 100).toFixed(1))
      : null,
    officialAsOf: "2026-09-12",
    reconstructedThrough: "2026-09-22",
    internalThreshold: 80,
    eseThreshold: 75,
    subjects,
    note: "Attendance data is current through 22-Sep-2026.",
  };
}

function attendanceAlerts(summary: any) {
  const alerts: any[] = [];

  for (const subject of summary.subjects) {
    if (!subject.total) continue;

    if (subject.percentage < 75) {
      alerts.push({
        severity: "critical",
        subjectCode: subject.code,
        message: `${subject.shortName} is below ESE eligibility at ${subject.percentage}%. Attend ${subject.neededFor75} consecutive class${subject.neededFor75 === 1 ? "" : "es"} to reach 75%.`,
      });
    } else if (subject.percentage < 80) {
      alerts.push({
        severity: "warning",
        subjectCode: subject.code,
        message: `${subject.shortName} is ESE-eligible but below the 80% internal-exam threshold.`,
      });
    } else if (
      subject.safeLeaves80 != null &&
      subject.safeLeaves80 <= 1
    ) {
      alerts.push({
        severity: "info",
        subjectCode: subject.code,
        message: `${subject.shortName} has only ${subject.safeLeaves80} safe leave${subject.safeLeaves80 === 1 ? "" : "s"} before dropping below 80%.`,
      });
    }
  }

  return alerts.slice(0, 8);
}

async function futureClassesForSubject(
  env: Env,
  from: string,
  through: string,
  subjectCode: string,
  rollNumber: string
) {
  const rows: any[] = [];
  const today = dateInIndia();

  const indiaTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());

  const [hh, mm] = indiaTime.split(":").map(Number);
  const nowMinutes = hh * 60 + mm;

  for (
    let date = from;
    date <= through;
    date = addDaysIso(date, 1)
  ) {
    const schedule = await scheduleForDate(env, date, rollNumber, {
      teachingTermEnd: through,
    });

    if (schedule.noClasses) continue;

    for (const item of schedule.items) {
      if (!item.trackAttendance || item.overrideStatus === "cancelled") continue;
      if (item.actualSubjectCode !== subjectCode) continue;
      if (item.attendanceStatus) continue;

      if (date === today) {
        const [h, m] = item.endTime.split(":").map(Number);
        if (h * 60 + m <= nowMinutes) continue;
      }

      rows.push({
        date,
        id: item.id,
        startTime: item.startTime,
        endTime: item.endTime,
        subject: item.actualSubject || item.scheduledSubject,
      });
    }
  }

  return rows;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") return empty();

    try {
      if (path === "/api/health" && request.method === "GET") {
        return json({
          ok: true,
          service: "RSMS Cloudflare API",
          database: "D1",
          features: [
            "JWT",
            "REST",
            "D1",
            "attendance",
            "live-timetable",
            "calendar-overrides",
          ],
        });
      }

      if (path === "/api/auth/login" && request.method === "POST") {
        const body = await request.json<{
          email?: string;
          password?: string;
        }>();

        const email = body.email?.trim().toLowerCase();
        const password = body.password;

        if (!email || !password) {
          return json({ error: "Email and password are required" }, 400);
        }

        const user = await env.DB.prepare(`
          SELECT id,email,password_hash,role,student_roll_number
          FROM users
          WHERE email = ?
        `).bind(email).first<any>();

        const passwordHash = await sha256(password);

        if (!user || passwordHash !== user.password_hash) {
          return json({ error: "Invalid email or password" }, 401);
        }

        const student = await env.DB.prepare(`
          SELECT * FROM students WHERE roll_number = ?
        `).bind(user.student_roll_number).first<any>();

        return json({
          token: await signToken(user, env.JWT_SECRET),
          user: {
            email: user.email,
            role: user.role,
            rollNumber: user.student_roll_number,
            student,
          },
        });
      }

      if (path === "/api/auth/forgot-password" && request.method === "POST") {
        const body = await request.json<{ email?: string }>();
        const email = body.email?.trim().toLowerCase();
        if (!email) return json({ error: "Email is required" }, 400);
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS password_reset_tokens (token_hash TEXT PRIMARY KEY,email TEXT NOT NULL,expires_at TEXT NOT NULL,used_at TEXT,created_at TEXT NOT NULL)`).run();
        const user = await env.DB.prepare(`SELECT email FROM users WHERE email=?`).bind(email).first<any>();
        const response: any = { ok: true, message: "If the account exists, a reset code has been generated." };
        if (!user) return json(response);
        const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
        const tokenHash = await sha256(code);
        const createdAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await env.DB.prepare(`DELETE FROM password_reset_tokens WHERE email=? OR expires_at<?`).bind(email, createdAt).run();
        await env.DB.prepare(`INSERT INTO password_reset_tokens (token_hash,email,expires_at,used_at,created_at) VALUES (?,?,?,?,?)`).bind(tokenHash,email,expiresAt,null,createdAt).run();
        if (email.endsWith(".local")) response.demoCode = code;
        return json(response);
      }

      if (path === "/api/auth/reset-password" && request.method === "POST") {
        const body = await request.json<{ email?: string; code?: string; password?: string }>();
        const email = body.email?.trim().toLowerCase();
        const code = body.code?.trim().toUpperCase();
        const password = body.password || "";
        if (!email || !code || password.length < 8) return json({ error: "Email, reset code and a password of at least 8 characters are required" }, 400);
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS password_reset_tokens (token_hash TEXT PRIMARY KEY,email TEXT NOT NULL,expires_at TEXT NOT NULL,used_at TEXT,created_at TEXT NOT NULL)`).run();
        const tokenHash = await sha256(code);
        const token = await env.DB.prepare(`SELECT * FROM password_reset_tokens WHERE token_hash=? AND email=? AND used_at IS NULL`).bind(tokenHash,email).first<any>();
        if (!token || token.expires_at < new Date().toISOString()) return json({ error: "Invalid or expired reset code" }, 400);
        const passwordHash = await sha256(password);
        const result = await env.DB.prepare(`UPDATE users SET password_hash=? WHERE email=?`).bind(passwordHash,email).run();
        if (!result.meta.changes) return json({ error: "Invalid or expired reset code" }, 400);
        await env.DB.prepare(`UPDATE password_reset_tokens SET used_at=? WHERE token_hash=?`).bind(new Date().toISOString(),tokenHash).run();
        return json({ ok: true, message: "Password updated successfully" });
      }

      const currentUser = await authenticate(request, env);

      if (!currentUser) {
        return json({ error: "Invalid or expired token" }, 401);
      }

      if (path === "/api/session" && request.method === "GET") {
        return json({
          email: currentUser.email,
          role: currentUser.role,
          rollNumber: currentUser.rollNumber,
        });
      }

      if (path === "/api/profile" && request.method === "GET") {
        const row = await env.DB.prepare(`
          SELECT * FROM students WHERE roll_number = ?
        `).bind(currentUser.rollNumber).first<any>();

        if (!row) return json({ error: "Student not found" }, 404);

        return json({
          rollNumber: row.roll_number,
          name: row.name,
          email: row.email,
          program: row.program,
          branch: row.branch,
          semester: row.semester,
          section: row.section,
          phone: row.phone,
          bio: row.bio,
        });
      }

      if (path === "/api/profile" && request.method === "PUT") {
        const body = await request.json<any>();
        const { name, email, phone = "", bio = "" } = body || {};

        if (!name || !email) {
          return json({ error: "Name and email are required" }, 400);
        }

        await env.DB.prepare(`
          UPDATE students
          SET name=?, email=?, phone=?, bio=?
          WHERE roll_number=?
        `).bind(
          String(name),
          String(email),
          String(phone),
          String(bio),
          currentUser.rollNumber
        ).run();

        const row = await env.DB.prepare(`
          SELECT * FROM students WHERE roll_number = ?
        `).bind(currentUser.rollNumber).first<any>();

        return json({
          rollNumber: row.roll_number,
          name: row.name,
          email: row.email,
          program: row.program,
          branch: row.branch,
          semester: row.semester,
          section: row.section,
          phone: row.phone,
          bio: row.bio,
        });
      }

      if (path === "/api/subjects" && request.method === "GET") {
        return json(await subjectCatalog(env));
      }

      if (path === "/api/calendar" && request.method === "GET") {
        const from = validDate(url.searchParams.get("from"))
          ? String(url.searchParams.get("from"))
          : "2026-01-01";
        const to = validDate(url.searchParams.get("to"))
          ? String(url.searchParams.get("to"))
          : "2026-12-31";

        const result = await env.DB.prepare(`
          SELECT
            id,
            start_date AS startDate,
            end_date AS endDate,
            title,
            type,
            no_classes AS noClasses,
            start_time AS startTime,
            end_time AS endTime
          FROM academic_events
          WHERE end_date >= ? AND start_date <= ?
          ORDER BY start_date, title
        `).bind(from, to).all<any>();

        return json(
          result.results.map((row: any) => ({
            ...row,
            noClasses: Boolean(row.noClasses),
          }))
        );
      }

      if (path === "/api/timetable" && request.method === "GET") {
        const result = await env.DB.prepare(`
          SELECT * FROM timetable_slots
          ORDER BY day_index, period
        `).all<any>();
        return json(result.results);
      }

      if (path === "/api/schedule" && request.method === "GET") {
        const date = String(url.searchParams.get("date") || "");
        if (!validDate(date)) {
          return json(
            { error: "A date in YYYY-MM-DD format is required" },
            400
          );
        }

        return json(
          await scheduleForDate(env, date, currentUser.rollNumber)
        );
      }

      if (path === "/api/overrides" && request.method === "GET") {
        const limit = Math.min(
          100,
          Math.max(1, Number(url.searchParams.get("limit") || 30))
        );

        const result = await env.DB.prepare(`
          SELECT
            o.id,
            o.date,
            o.timetable_id AS timetableId,
            o.actual_subject_code AS actualSubjectCode,
            o.status,
            o.reason,
            o.updated_at AS updatedAt,
            t.subject_label AS scheduledSubject,
            t.start_time AS startTime,
            t.end_time AS endTime,
            s.name AS actualSubject
          FROM class_overrides o
          LEFT JOIN timetable_slots t ON t.id=o.timetable_id
          LEFT JOIN subjects s ON s.code=o.actual_subject_code
          ORDER BY o.date DESC,t.start_time DESC
          LIMIT ?
        `).bind(limit).all<any>();

        return json(result.results);
      }

      if (path === "/api/overrides" && request.method === "POST") {
        if (!isFaculty(currentUser)) {
          return json({ error: "This action requires faculty access" }, 403);
        }

        const body = await request.json<any>();
        const {
          date,
          timetableId,
          status,
          actualSubjectCode = null,
          reason = "",
        } = body || {};

        if (
          !validDate(date) ||
          !timetableId ||
          !["substituted", "cancelled"].includes(status)
        ) {
          return json(
            {
              error:
                "Date, timetable slot and a valid override status are required",
            },
            400
          );
        }

        const slot = await env.DB.prepare(`
          SELECT * FROM timetable_slots WHERE id=?
        `).bind(String(timetableId)).first<any>();

        if (!slot) return json({ error: "Timetable slot not found" }, 404);

        if (status === "substituted") {
          const subject = await env.DB.prepare(`
            SELECT code FROM subjects WHERE code=?
          `).bind(String(actualSubjectCode)).first<any>();

          if (!subject) {
            return json({ error: "Choose a valid replacement subject" }, 400);
          }
        }

        const existing = await env.DB.prepare(`
          SELECT id FROM class_overrides
          WHERE date=? AND timetable_id=?
        `).bind(date, timetableId).first<any>();

        const id = existing?.id || `OVR-${crypto.randomUUID()}`;
        const now = nowIso();

        await env.DB.prepare(`
          INSERT INTO class_overrides
            (id,date,timetable_id,actual_subject_code,status,reason,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?)
          ON CONFLICT(date,timetable_id)
          DO UPDATE SET
            actual_subject_code=excluded.actual_subject_code,
            status=excluded.status,
            reason=excluded.reason,
            updated_at=excluded.updated_at
        `).bind(
          id,
          date,
          timetableId,
          status === "cancelled" ? null : String(actualSubjectCode),
          status,
          String(reason),
          now,
          now
        ).run();

        if (status === "cancelled") {
          await env.DB.prepare(`
            UPDATE attendance_entries
            SET status='cancelled', updated_at=?
            WHERE date=? AND timetable_id=?
          `).bind(now, date, timetableId).run();
        }

        return json({ ok: true, id }, existing ? 200 : 201);
      }

      const overrideMatch = path.match(/^\/api\/overrides\/([^/]+)$/);
      if (overrideMatch && request.method === "DELETE") {
        if (!isFaculty(currentUser)) {
          return json({ error: "This action requires faculty access" }, 403);
        }

        const result = await env.DB.prepare(`
          DELETE FROM class_overrides WHERE id=?
        `).bind(overrideMatch[1]).run();

        if (!result.meta.changes) {
          return json({ error: "Override not found" }, 404);
        }

        return empty();
      }

      if (path === "/api/extra-classes" && request.method === "POST") {
        if (!isFaculty(currentUser)) {
          return json({ error: "This action requires faculty access" }, 403);
        }

        const body = await request.json<any>();
        const {
          date,
          subjectCode,
          label,
          startTime,
          endTime,
          room = "",
          reason = "",
        } = body || {};

        if (
          !validDate(date) ||
          !subjectCode ||
          !label ||
          !/^\d{2}:\d{2}$/.test(startTime || "") ||
          !/^\d{2}:\d{2}$/.test(endTime || "")
        ) {
          return json(
            {
              error:
                "Date, subject, label and valid start/end times are required",
            },
            400
          );
        }

        const subject = await env.DB.prepare(`
          SELECT code FROM subjects WHERE code=?
        `).bind(String(subjectCode)).first<any>();

        if (!subject) return json({ error: "Unknown subject" }, 400);

        const id = `EXT-${crypto.randomUUID()}`;
        const now = nowIso();

        await env.DB.prepare(`
          INSERT INTO extra_classes
            (id,date,subject_code,label,start_time,end_time,room,reason,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?)
        `).bind(
          id,
          date,
          subjectCode,
          label,
          startTime,
          endTime,
          room,
          reason,
          now,
          now
        ).run();

        return json({ id }, 201);
      }

      const extraMatch = path.match(/^\/api\/extra-classes\/([^/]+)$/);
      if (extraMatch && request.method === "DELETE") {
        if (!isFaculty(currentUser)) {
          return json({ error: "This action requires faculty access" }, 403);
        }

        const extraId = extraMatch[1];

        const result = await env.DB.prepare(`
          DELETE FROM extra_classes WHERE id=?
        `).bind(extraId).run();

        if (!result.meta.changes) {
          return json({ error: "Extra class not found" }, 404);
        }

        await env.DB.prepare(`
          DELETE FROM attendance_entries
          WHERE timetable_id=?
        `).bind(`EXTRA:${extraId}`).run();

        return empty();
      }

      if (
        path === "/api/attendance/summary" &&
        request.method === "GET"
      ) {
        const summary = await attendanceSummary(
          env,
          currentUser.rollNumber
        );

        return json({
          ...summary,
          alerts: attendanceAlerts(summary),
        });
      }

      if (
        path === "/api/attendance/history" &&
        request.method === "GET"
      ) {
        const limit = Math.min(
          500,
          Math.max(1, Number(url.searchParams.get("limit") || 150))
        );

        const result = await env.DB.prepare(`
          SELECT
            a.id,
            a.date,
            a.timetable_id AS timetableId,
            a.scheduled_subject_code AS scheduledSubjectCode,
            a.actual_subject_code AS actualSubjectCode,
            a.status,
            a.notes,
            a.updated_at AS updatedAt,
            s.name AS actualSubject,
            s.short_name AS shortName,
            t.subject_label AS scheduledSubject,
            t.start_time AS startTime,
            t.end_time AS endTime
          FROM attendance_entries a
          LEFT JOIN subjects s ON s.code=a.actual_subject_code
          LEFT JOIN timetable_slots t ON t.id=a.timetable_id
          WHERE a.roll_number=?
          ORDER BY a.date DESC,COALESCE(t.start_time,'23:59') DESC
          LIMIT ?
        `).bind(currentUser.rollNumber, limit).all<any>();

        return json(result.results);
      }

      if (
        path === "/api/attendance/entries" &&
        request.method === "POST"
      ) {
        const body = await request.json<any>();
        const {
          date,
          timetableId,
          status,
          actualSubjectCode,
          notes = "",
        } = body || {};

        if (
          !validDate(date) ||
          !timetableId ||
          !ATTENDANCE_STATUSES.has(status)
        ) {
          return json(
            { error: "Date, class and attendance status are required" },
            400
          );
        }

        const schedule = await scheduleForDate(
          env,
          date,
          currentUser.rollNumber
        );

        const item = [
          ...schedule.items,
          ...schedule.suppressedItems,
        ].find((row: any) => row.id === timetableId);

        if (!item) {
          return json({ error: "Class is not available for that date" }, 404);
        }

        if (schedule.noClasses) {
          return json(
            {
              error:
                "Attendance cannot be recorded on a calendar-suppressed day",
            },
            400
          );
        }

        const subjectCode = String(
          actualSubjectCode ||
            item.actualSubjectCode ||
            item.scheduledSubjectCode
        );

        const subject = await env.DB.prepare(`
          SELECT code FROM subjects WHERE code=?
        `).bind(subjectCode).first<any>();

        if (!subject) return json({ error: "Unknown actual subject" }, 400);

        const existing = await env.DB.prepare(`
          SELECT id,created_at
          FROM attendance_entries
          WHERE roll_number=? AND date=? AND timetable_id=?
        `).bind(
          currentUser.rollNumber,
          date,
          timetableId
        ).first<any>();

        const id = existing?.id || `ATT-${crypto.randomUUID()}`;
        const now = nowIso();

        await env.DB.prepare(`
          INSERT INTO attendance_entries
            (id,roll_number,date,timetable_id,scheduled_subject_code,actual_subject_code,status,notes,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?)
          ON CONFLICT(roll_number,date,timetable_id)
          DO UPDATE SET
            actual_subject_code=excluded.actual_subject_code,
            status=excluded.status,
            notes=excluded.notes,
            updated_at=excluded.updated_at
        `).bind(
          id,
          currentUser.rollNumber,
          date,
          timetableId,
          item.scheduledSubjectCode,
          subjectCode,
          status,
          String(notes),
          existing?.created_at || now,
          now
        ).run();

        return json(
          {
            id,
            date,
            timetableId,
            actualSubjectCode: subjectCode,
            status,
            notes: String(notes),
          },
          existing ? 200 : 201
        );
      }

      const attendanceEntryMatch = path.match(
        /^\/api\/attendance\/entries\/([^/]+)$/
      );

      if (attendanceEntryMatch && request.method === "PUT") {
        const id = attendanceEntryMatch[1];

        const existing = await env.DB.prepare(`
          SELECT * FROM attendance_entries
          WHERE id=? AND roll_number=?
        `).bind(id, currentUser.rollNumber).first<any>();

        if (!existing) {
          return json({ error: "Attendance entry not found" }, 404);
        }

        const body = await request.json<any>();
        const status = body?.status ?? existing.status;
        const actualSubjectCode =
          body?.actualSubjectCode ?? existing.actual_subject_code;
        const notes = body?.notes ?? existing.notes;

        if (!ATTENDANCE_STATUSES.has(status)) {
          return json({ error: "Invalid attendance status" }, 400);
        }

        const subject = await env.DB.prepare(`
          SELECT code FROM subjects WHERE code=?
        `).bind(String(actualSubjectCode)).first<any>();

        if (!subject) return json({ error: "Unknown subject" }, 400);

        await env.DB.prepare(`
          UPDATE attendance_entries
          SET actual_subject_code=?,status=?,notes=?,updated_at=?
          WHERE id=? AND roll_number=?
        `).bind(
          actualSubjectCode,
          status,
          String(notes),
          nowIso(),
          id,
          currentUser.rollNumber
        ).run();

        return json({ ok: true });
      }

      if (attendanceEntryMatch && request.method === "DELETE") {
        const result = await env.DB.prepare(`
          DELETE FROM attendance_entries
          WHERE id=? AND roll_number=?
        `).bind(
          attendanceEntryMatch[1],
          currentUser.rollNumber
        ).run();

        if (!result.meta.changes) {
          return json({ error: "Attendance entry not found" }, 404);
        }

        return empty();
      }

      if (
        path === "/api/attendance/leave-plan" &&
        request.method === "POST"
      ) {
        const body = await request.json<any>();
        const { date, timetableIds = [] } = body || {};

        if (!validDate(date) || !Array.isArray(timetableIds)) {
          return json(
            { error: "Date and class selections are required" },
            400
          );
        }

        const schedule = await scheduleForDate(
          env,
          date,
          currentUser.rollNumber
        );
        const summary = await attendanceSummary(
          env,
          currentUser.rollNumber
        );

        const byCode = new Map(
          summary.subjects.map((row: any) => [row.code, { ...row }])
        );

        const selected = schedule.items.filter(
          (item: any) =>
            timetableIds.includes(item.id) &&
            item.trackAttendance &&
            item.overrideStatus !== "cancelled"
        );

        for (const item of selected) {
          const row: any = byCode.get(item.actualSubjectCode);
          if (!row) continue;

          row.total += 1;
          row.absent += 1;
          row.percentage = Number(
            ((row.attended / row.total) * 100).toFixed(1)
          );
          row.internalEligible = row.percentage >= 80;
          row.eseEligible = row.percentage >= 75;
          row.safeLeaves80 = safeLeaves(row.attended, row.total, 0.8);
          row.safeLeaves75 = safeLeaves(row.attended, row.total, 0.75);
        }

        return json({
          date,
          selectedClasses: selected.map((item: any) => ({
            id: item.id,
            subject: item.actualSubject,
            startTime: item.startTime,
            endTime: item.endTime,
          })),
          projections: [...byCode.values()].filter((row: any) =>
            selected.some(
              (item: any) => item.actualSubjectCode === row.code
            )
          ),
        });
      }

      if (
        path === "/api/attendance/forecast" &&
        request.method === "POST"
      ) {
        const today = dateInIndia();
        const body = await request.json<any>();
        const {
          subjectCode,
          from = today,
          through = TEACHING_TERM_END,
          plannedAbsences = 0,
        } = body || {};

        if (
          !subjectCode ||
          !validDate(from) ||
          !validDate(through) ||
          through < from
        ) {
          return json(
            {
              error:
                "Subject and a valid future date range are required",
            },
            400
          );
        }

        const spanDays = Math.round(
          (new Date(`${through}T12:00:00Z`).getTime() -
            new Date(`${from}T12:00:00Z`).getTime()) /
            86400000
        );

        if (spanDays > 180) {
          return json({ error: "Forecast range is limited to 180 days" }, 400);
        }

        const summary = await attendanceSummary(
          env,
          currentUser.rollNumber
        );

        const subject = summary.subjects.find(
          (row: any) => row.code === String(subjectCode)
        );

        if (!subject) {
          return json({ error: "Tracked subject not found" }, 404);
        }

        const future = await futureClassesForSubject(
          env,
          from,
          through,
          String(subjectCode),
          currentUser.rollNumber
        );

        const remaining = future.length;
        const absences = Math.min(
          Math.max(0, Math.trunc(Number(plannedAbsences) || 0)),
          remaining
        );

        const maximumAttended = subject.attended + remaining;
        const maximumTotal = subject.total + remaining;
        const maximumPercentage = maximumTotal
          ? Number(((maximumAttended / maximumTotal) * 100).toFixed(1))
          : subject.percentage;

        const plannedAttended =
          subject.attended + Math.max(0, remaining - absences);
        const plannedTotal = subject.total + remaining;
        const plannedPercentage = plannedTotal
          ? Number(((plannedAttended / plannedTotal) * 100).toFixed(1))
          : subject.percentage;

        const needed90 = neededClasses(subject.attended, subject.total, 0.9);
        const reachable90 = needed90 <= remaining;
        const reachDate =
          reachable90 && needed90 > 0
            ? future[needed90 - 1]?.date || null
            : subject.percentage >= 90
              ? today
              : null;

        const checkpoints = [
          ...new Set([
            0,
            Math.min(3, remaining),
            Math.min(6, remaining),
            remaining,
          ]),
        ].sort((a, b) => a - b);

        const milestones = checkpoints.map((count) => ({
          label:
            count === 0
              ? "Current"
              : count === remaining
                ? `All ${remaining} remaining`
                : `Attend next ${count}`,
          classes: count,
          percentage: Number(
            (
              ((subject.attended + count) /
                (subject.total + count)) *
              100
            ).toFixed(1)
          ),
        }));

        return json({
          subject: {
            code: subject.code,
            name: subject.name,
            shortName: subject.shortName,
          },
          from,
          through,
          teachingTermEnd: TEACHING_TERM_END,
          forecastTeachingEnd: through,
          remainingClasses: remaining,
          current: {
            attended: subject.attended,
            total: subject.total,
            percentage: subject.percentage,
          },
          maximum: {
            attended: maximumAttended,
            total: maximumTotal,
            percentage: maximumPercentage,
          },
          planned: {
            absences,
            attended: plannedAttended,
            total: plannedTotal,
            percentage: plannedPercentage,
            internalEligible: plannedPercentage >= 80,
            eseEligible: plannedPercentage >= 75,
          },
          target90: {
            needed: needed90,
            reachable: reachable90,
            reachDate,
          },
          milestones,
          futureClasses: future,
        });
      }

      if (path === "/api/attendance" && request.method === "GET") {
        const summary = await attendanceSummary(
          env,
          currentUser.rollNumber
        );

        return json(
          summary.subjects.map((row: any) => ({
            subject: row.name,
            attended: row.attended,
            total: row.total,
            percentage: row.percentage,
          }))
        );
      }

      if (path === "/api/marks" && request.method === "GET") {
        const result = await env.DB.prepare(`
          SELECT
            semester,
            subject,
            component,
            obtained_marks AS obtainedMarks,
            max_marks AS maxMarks
          FROM marks
          WHERE roll_number = ?
          ORDER BY semester DESC, subject, component
        `).bind(currentUser.rollNumber).all<any>();

        return json(result.results);
      }

      if (path === "/api/notifications" && request.method === "GET") {
        const today = dateInIndia();
        const summary = await attendanceSummary(
          env,
          currentUser.rollNumber
        );

        const items: any[] = attendanceAlerts(summary).map(
          (alert: any, index: number) => ({
            id: `attendance-${index}-${alert.subjectCode}`,
            severity: alert.severity,
            title: "Attendance watch",
            message: alert.message,
            page: "Attendance",
          })
        );

        const upcoming = await env.DB.prepare(`
          SELECT
            id,
            start_date AS startDate,
            title,
            type,
            no_classes AS noClasses
          FROM academic_events
          WHERE start_date >= ? AND start_date <= ?
          ORDER BY start_date
          LIMIT 4
        `).bind(today, addDaysIso(today, 3)).all<any>();

        for (const event of upcoming.results) {
          items.push({
            id: `event-${event.id}`,
            severity: event.noClasses ? "warning" : "info",
            title: event.noClasses
              ? "No regular classes"
              : "Academic event",
            message: `${event.title} · ${event.startDate}`,
            page: "Academic Calendar",
          });
        }

        const schedule = await scheduleForDate(
          env,
          today,
          currentUser.rollNumber
        );

        const indiaTime = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(new Date());

        const current =
          Number(indiaTime.slice(0, 2)) * 60 +
          Number(indiaTime.slice(3, 5));

        const next = schedule.items.find((item: any) => {
          const [h, m] = item.startTime.split(":").map(Number);
          return h * 60 + m >= current;
        });

        if (next) {
          const [h, m] = next.startTime.split(":").map(Number);
          const delta = h * 60 + m - current;

          if (delta <= 45) {
            items.unshift({
              id: `next-${next.id}`,
              severity: "info",
              title: "Class starting soon",
              message: `${next.actualSubject || next.scheduledSubject} starts in ${delta}min · ${next.room}`,
              page: "Timetable",
            });
          }
        }

        return json(items.slice(0, 10));
      }

      if (path === "/api/notices" && request.method === "GET") {
        const result = await env.DB.prepare(`
          SELECT
            id,
            title,
            body,
            category,
            priority,
            posted_by AS postedBy,
            posted_at AS postedAt
          FROM notices
          ORDER BY posted_at DESC
        `).all<any>();

        return json(result.results);
      }

      if (path === "/api/requests" && request.method === "GET") {
        const result = await env.DB.prepare(`
          SELECT * FROM requests
          WHERE roll_number = ?
          ORDER BY created_at DESC
        `).bind(currentUser.rollNumber).all<any>();

        return json(result.results.map(normalizeRequest));
      }

      if (path === "/api/requests" && request.method === "POST") {
        const body = await request.json<any>();
        const { type, details } = body || {};

        if (
          !type ||
          !details ||
          String(details).trim().length < 15
        ) {
          return json(
            {
              error:
                "Request type and at least 15 characters of details are required",
            },
            400
          );
        }

        const now = nowIso();
        const id = `REQ-${crypto.randomUUID()
          .slice(0, 8)
          .toUpperCase()}`;

        await env.DB.prepare(`
          INSERT INTO requests
            (id,roll_number,type,details,status,remarks,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?)
        `).bind(
          id,
          currentUser.rollNumber,
          String(type),
          String(details).trim(),
          "Submitted",
          "",
          now,
          now
        ).run();

        const row = await env.DB.prepare(`
          SELECT * FROM requests WHERE id = ?
        `).bind(id).first<any>();

        return json(normalizeRequest(row), 201);
      }

      const requestMatch = path.match(/^\/api\/requests\/([^/]+)$/);

      if (requestMatch && request.method === "PUT") {
        const id = requestMatch[1];

        const existing = await env.DB.prepare(`
          SELECT * FROM requests
          WHERE id=? AND roll_number=?
        `).bind(id, currentUser.rollNumber).first<any>();

        if (!existing) return json({ error: "Request not found" }, 404);

        const body = await request.json<any>();
        const type = body?.type ?? existing.type;
        const details = body?.details ?? existing.details;

        if (String(details).trim().length < 15) {
          return json(
            { error: "Details must contain at least 15 characters" },
            400
          );
        }

        await env.DB.prepare(`
          UPDATE requests
          SET type=?, details=?, updated_at=?
          WHERE id=? AND roll_number=?
        `).bind(
          String(type),
          String(details).trim(),
          nowIso(),
          id,
          currentUser.rollNumber
        ).run();

        const row = await env.DB.prepare(`
          SELECT * FROM requests WHERE id=?
        `).bind(id).first<any>();

        return json(normalizeRequest(row));
      }

      if (requestMatch && request.method === "DELETE") {
        const result = await env.DB.prepare(`
          DELETE FROM requests
          WHERE id=? AND roll_number=?
        `).bind(requestMatch[1], currentUser.rollNumber).run();

        if (!result.meta.changes) {
          return json({ error: "Request not found" }, 404);
        }

        return empty();
      }

      return json({ error: "Route not found" }, 404);
    } catch (error) {
      console.error(error);

      return json(
        {
          error: "Internal server error",
          message:
            error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  },
};
