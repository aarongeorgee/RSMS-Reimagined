# Final Evaluation Upgrade Summary

## Academic intelligence
- Current India date/time drives the Overview page.
- Supplied S5 CS A timetable replaces the old generic timetable.
- Supplied 2026 academic calendar is integrated into schedule logic.
- Holidays and configured exam blocks can suppress normal timetable rows.
- Current class, upcoming class and completed-day states are calculated live.

## Attendance
- Class-level attendance stored in SQLite.
- Present, Absent, OD/Duty and Cancelled states.
- Actual-subject override when the timetable changes in real life.
- 80% Internal Exam eligibility.
- 75% Main ESE eligibility.
- Safe-leave calculations for both thresholds.
- Recovery-class calculations for both thresholds.
- Subject analytics, recent attendance trend, risk focus and attendance alerts.
- Daily log, editable history and undo/delete.
- Future leave planner with projected percentages.

## Timetable administration
- Faculty-only substitution and cancellation API.
- Extra/make-up class creation.
- Override history and rollback.
- Base timetable is never overwritten.

## Authentication / backend
- Generic Student and Faculty demo accounts.
- JWT role claim.
- Faculty authorization middleware.
- Express REST endpoints for schedule/calendar/attendance/overrides.
- SQLite persistence.

## Privacy
- No project-member or real student names.
- Generic demo identity only.
- Faculty names from the timetable are not stored.

## Attendance reconstruction update — 22 Sep 2026
- Attendance now runs continuously from the semester start (15 Jun) through 22 Sep instead of showing post-baseline records as a separate 0% block.
- Official RSMS percentages through 12 Sep remain the anchor values.
- Historical attended/conducted counts are reconstructed estimates using the supplied S5 CS A timetable/calendar and the nearest whole-number counts consistent with the displayed rounded percentages.
- 13–22 Sep timetable classes are reconstructed as present unless evidence says otherwise.
- 17 Sep AAD and Computer Networks are explicitly marked **Absent** from the supplied red-period RSMS evidence.
- 21 Sep is suppressed as a holiday.
- All reconstructed post-12-Sep entries can be corrected from Attendance → Daily log / History.
- Safe-leave and 80% internal / 75% ESE projections now use the reconstructed continuous counts.

## Attendance analytics UI fix
- Fixed light-mode contrast in the Risk focus explanation text.
- Recent attendance trend now shows attended/recorded counts beside the percentage.
- Zero-attendance days render a visible red marker instead of appearing as an empty/broken bar.
- Attendance data and percentages were not changed by this UI fix.
