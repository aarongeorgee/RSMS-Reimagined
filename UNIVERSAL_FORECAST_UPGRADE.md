# Universal + Attendance Forecast Upgrade

## Added

- Attendance → **Forecast** simulator.
- Forecasts current percentage, remaining timetable periods, maximum attainable percentage, a user-selected number of future absences, and whether 90% is reachable.
- Forecast counts future periods from the timetable while respecting academic-calendar no-class days and saved timetable overrides.
- Teaching-term end is configurable using `TEACHING_TERM_END`.
- Dynamic API host selection: phones/tablets use the computer's LAN host instead of their own `localhost`.
- Vite listens on the LAN in development; Express listens on all local interfaces.
- CORS supports localhost and private-LAN origins.
- Cross-platform `pnpm dev:full` / `pnpm dev:universal` launcher for macOS, Windows and Linux.
- Launcher prints LAN URLs for mobile testing.
- PWA manifest, icons and service-worker registration.
- Additional mobile/touch responsive styles for the Forecast view.

## Platform notes

- Desktop: macOS / Windows / Linux with Node.js 22.13+.
- Mobile/tablet: open the printed LAN URL while on the same Wi-Fi.
- Installable PWA behavior on phones requires HTTPS (or localhost) because of browser security rules; ordinary LAN browser access works over HTTP.
