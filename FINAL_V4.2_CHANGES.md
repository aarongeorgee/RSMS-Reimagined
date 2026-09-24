# RSMS Reimagined v4.2 — Final changes

- Added Forgot Password flow with one-time reset codes and 15-minute expiry.
- Added password reset support to both the local Express/SQLite API and Cloudflare Worker/D1 API.
- Added automatic logout after 5 minutes without user activity.
- Removed the bright desktop sidebar divider/seam.
- Removed reconstruction/provenance explanations from the Attendance UI and simplified attendance copy.
- Preserved attendance updates: 17 Sep verified AAD/CN absences, full-day absence on 22 Sep, and 23 Sep class updates including AAD → CN substitution.
- Production API routing now falls back to the live Cloudflare Worker instead of port 5001 on public hosts.
- Added Cloudflare API Worker, D1 schema/seed files, password-reset migration, frontend/API Wrangler configs, and final deployment instructions.
- No R2 Response Store is required.

## Premium installed-app icon refresh
- Replaced the low-resolution PWA launcher artwork with a new high-resolution RSMS icon rendered from a 1254 px master.
- Added dedicated 192, 512 and 1024 px launcher assets plus 192/512 maskable icons and a 180 px Apple touch icon.
- Updated `manifest.webmanifest` to use versioned icon filenames so installed browsers do not keep serving the old blurred artwork.
- Updated Next metadata to expose the high-resolution launcher and Apple touch assets.
- Changed the PWA splash background to the RSMS navy theme for a cleaner native-app launch experience.
- Bumped the service-worker cache key and precache list so the new icon set replaces stale cached assets after deployment.
