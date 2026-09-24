# RSMS Reimagined — Smart Evaluation Build

A privacy-safe academic demonstration of a modern student portal. It uses a generic fictional account, a local Express API and SQLite database. It does **not** connect to the production RSMS, institutional authentication, banking systems, or a real student record.

## What is new in this final build

The main academic workflow is now based on the supplied **S5 CS A Odd Semester 2026 timetable** and the supplied **2026 academic calendar**.

### Live Today dashboard

The dashboard uses the current date and current time in `Asia/Kolkata` to determine:

- today's real weekday timetable
- class happening **Now**
- the **Up next** class
- when the teaching day is complete
- academic-calendar exceptions such as holidays/exam blocks
- upcoming academic events
- attendance warnings

### Timetable + real-life changes

The fixed timetable is treated as the default schedule, not as an immutable record.

The system stores the following separately:

```text
Base timetable
     ↓
Academic-calendar exception
     ↓
Faculty substitution/cancellation
     ↓
Actual class attended by the student
```

Faculty demo mode can:

- substitute a scheduled subject
- cancel a class
- add an extra/make-up class
- enter a reason
- review and undo timetable overrides

The original timetable remains unchanged.

### Attendance management

Students can mark every conducted class as:

- Present
- Absent
- OD / Duty attendance
- Cancelled

If the scheduled subject changes, the student can record the **actual subject** that was conducted. Attendance is then counted for the actual subject rather than the timetable's original subject.

The Attendance module calculates:

- classes attended / conducted / absent
- subject-wise percentage
- overall attendance
- recent attendance trend and most-at-risk subject
- **80% Internal Exam eligibility**
- **75% Main ESE eligibility**
- number of classes that can still be missed before falling below 80%
- number of classes that can still be missed before falling below 75%
- consecutive classes required to recover to 80%
- consecutive classes required to recover to 75%
- warning/critical alerts
- editable attendance history
- undo/delete for incorrect entries

### Leave planner

Choose a future date and one or more classes you expect to miss. The application calculates the projected subject attendance and shows whether the result remains:

- Internal + ESE eligible
- ESE eligible only
- below ESE eligibility

The planner is read-only; it does not alter recorded attendance.

### Academic calendar integration

The supplied 2026 calendar is stored in `data/academic-calendar.json`.

Calendar-aware scheduling prevents a normal timetable from being treated as a regular class day when the calendar marks the date as a no-class holiday/examination block. The current S5 teaching term is modelled as **15 June 2026 through 9 October 2026 (current extension)**.

### Role-based demonstration

Two generic accounts are provided:

```text
Student
Email: demo@rsms.local
Password: demo123

Faculty demo
Email: faculty@rsms.local
Password: demo123
```

The faculty account unlocks timetable override and extra-class controls. This is useful for demonstrating authentication, JWT claims, authorization middleware and conditional React rendering.

---

## Architecture

```text
React client (vinext / Vite)
        |
        | fetch + Bearer JWT
        v
Node.js + Express REST API     http://localhost:5001
        |
        v
SQLite (node:sqlite)
```

Reference datasets in `data/` initialize the database on first backend start.

## Evaluation-focused syllabus coverage

### React / client side

- JSX and functional components
- props and state
- `useState` and `useEffect`
- reusable components
- conditional rendering
- Context API in reusable UI infrastructure
- custom hook (`hooks/use-mobile.ts`)
- time-aware UI updates
- controlled forms and validation
- REST API integration
- role-based UI

### Node.js / Express

- ES modules
- NPM/pnpm package management
- asynchronous API handling
- Express server and routing
- middleware
- JSON request bodies
- REST API endpoints
- JWT authentication
- role-based authorization
- SQLite CRUD

## Important REST endpoints

```text
GET    /api/health
POST   /api/auth/login
GET    /api/session

GET    /api/schedule?date=YYYY-MM-DD
GET    /api/subjects
GET    /api/calendar

GET    /api/attendance/summary
GET    /api/attendance/history
POST   /api/attendance/entries
PUT    /api/attendance/entries/:id
DELETE /api/attendance/entries/:id
POST   /api/attendance/leave-plan

GET    /api/overrides
POST   /api/overrides                 faculty only
DELETE /api/overrides/:id             faculty only
POST   /api/extra-classes             faculty only
DELETE /api/extra-classes/:id         faculty only

GET    /api/profile
PUT    /api/profile

GET    /api/requests
POST   /api/requests
PUT    /api/requests/:id
DELETE /api/requests/:id
```

## Run in VS Code on macOS

Requirements: Node.js 22.13+.

Install pnpm once if necessary:

```sh
npm install -g pnpm
```

From the extracted project folder:

```sh
pnpm install --no-frozen-lockfile
pnpm dev:full
```

Expected services:

```text
Frontend: http://localhost:5173
API:      http://localhost:5001
```

The API uses watch mode, so backend edits restart automatically.

## Reset the local demo database

```sh
pnpm db:reset
pnpm dev:full
```

Use this after changing the seed timetable/calendar data or whenever you want a clean evaluation state.

## Suggested 15-minute live demonstration

1. Log in using the **student** account.
2. Show the Overview page detecting the current day/time.
3. Open Timetable and explain base timetable + academic-calendar exceptions.
4. Open Attendance → Daily log and mark a class Present/Absent/OD.
5. Change the **Actual class** for a substituted period and save attendance.
6. Show subject analytics: 80% Internal threshold and 75% ESE threshold.
7. Use Leave planner to project a future absence without changing the database.
8. Open History, correct an entry, then undo/delete it.
9. Log out and sign in with the **faculty** account.
10. Substitute/cancel a timetable period and show the override appearing in the student-facing schedule.
11. If time permits, demonstrate Requests CRUD as a second REST/SQLite example.

## Privacy

The project contains a generic `Demo Student` profile and `DEMO001` roll number only. No team-member names, real student IDs, personal phone numbers, or real student email addresses are stored.

Faculty names from the supplied timetable are intentionally not stored in the application data; timetable subjects, periods and rooms are sufficient for the demonstration.

## Source fidelity

The timetable structure and period timings are based on the supplied S5 CS A timetable. The academic-event dates are based on the supplied 2026 calendar screenshots. A separate 24 September Web Programming project-evaluation event comes from the evaluation notice supplied in this conversation.

Where the supplied material does **not** provide information—such as subject-wise ESE dates, exam seating, or real marks—the project does not present that information as real. Any remaining marks/fees/service records are clearly treated as fictional demonstration data.

## Scope

The project does not artificially add every topic in the syllabus. EJS, Handlebars, GraphQL, WebSockets, PWA and class components remain viva concepts unless needed by the evaluator. The implementation focuses on the parts directly useful to this project and the evaluation rubric.


## Attendance baseline (student-supplied)

The attendance module contains the official RSMS percentages supplied for the period **15-Jun-2026 to 12-Sep-2026** for the enrolled subjects only: CN 96%, WP 87%, DBMS 90%, AAD 96%, SPM 93%, Design Thinking 88%, and DBMS Lab 89%. A dash in the source report means the course was not selected and is excluded.

The source report did not include exact attended/conducted counts. The project therefore does **not** reverse-engineer or invent denominators. Classes after 12-Sep-2026 are recorded separately from the Daily Log. Once exact baseline counts are available, the schema already supports them and exact safe-leave projections can be enabled.

### Attendance data model (current evaluation build)
The student portal screenshot gives official subject percentages through **12 Sep 2026**, but not the raw attended/conducted counts. This build reconstructs plausible whole-number baseline counts using the supplied timetable and academic calendar, then continues the class log through **22 Sep 2026**. These baseline counts are estimates rather than portal-reported exact values. From **13–22 Sep**, scheduled enrolled classes are assumed present unless the user supplied contrary evidence; the confirmed **17 Sep AAD and Computer Networks periods are absent**. Reconstructed entries can be edited from the Attendance screen.

## Universal desktop + mobile access

The evaluation build is a web application and now runs on macOS, Windows and Linux with the same commands (Node.js 22.13+ and pnpm required):

```bash
pnpm install --no-frozen-lockfile
pnpm dev:full
```

`pnpm dev:universal` is an alias for the same cross-platform launcher. It prints both `localhost` and the computer's LAN address. Open the LAN address on a phone/tablet or another computer connected to the same Wi-Fi. The frontend dynamically points its REST requests to port `5001` on the same host, so mobile browsers no longer try to call `localhost` on the phone itself.

On Windows, allow Node.js through **Private networks** if Windows Firewall prompts. No Bash shell is required for the normal install/run flow.

The UI includes a mobile bottom navigation, responsive timetable/attendance layouts, touch-friendly controls and a PWA manifest/service worker. Local-LAN browsing works over HTTP; full installable-PWA behavior on phones requires HTTPS deployment (or localhost), as required by browsers.

## Attendance prediction simulator

Attendance → **Forecast** models a subject without modifying real attendance. It shows the current reconstructed count, remaining scheduled classes through a chosen date, maximum possible final percentage if all remaining classes are attended, the result after a user-selected number of future absences, and whether 90% is still reachable under the current timetable/calendar.

The current teaching extension is configured through **9 October 2026**. If the college changes the final teaching date again, set `TEACHING_TERM_END=YYYY-MM-DD` in `.env` and restart. The Forecast screen also treats its selected end date as the assumed teaching-extension boundary, so it can model future extensions without being capped by the older academic-calendar semester-end marker.

## Smart experience upgrades

This build also includes five optional student-experience features:

- **Live Today Engine** — current-period progress, minutes remaining, next-class countdown and calendar-aware live states.
- **Installable/offline PWA** — app-shell caching, install prompt, last-synced academic reads and queued attendance/timetable mutations that replay when connectivity returns.
- **What-If attendance** — after running a Forecast, tap specific future subject periods to simulate which classes you might miss without changing real attendance.
- **Smart notifications** — generated from attendance risk, near-term academic events and the next scheduled class rather than static notification text.
- **Theme system** — Light, Dark and System modes, persisted per device.

## Build v3 cache note
This package uses a network-first service worker (`rsms-reimagined-v3-20260922`) so an older localhost PWA cache should not hide updated UI files. The PWA registration also requests an update without using the HTTP cache.


## v4 deployment-ready polish
- Consistent Today Engine states: LIVE / NEXT / FINISHED / NO CLASS.
- Attendance watch distinguishes subjects below 80% from subjects near the threshold.
- Clean notification count/dropdown and explicit empty states.
- Dedicated API sync status, build version and reset-demo controls in Profile → Preferences.
- Stronger validation/toasts for attendance and timetable overrides.
- Improved keyboard focus states and mobile off-canvas sidebar styling.
- Network/server fallback messaging and last-updated labels.
- Production-style `pnpm build && pnpm start` path plus Docker packaging.

See `DEPLOYMENT.md` for deployment steps.
