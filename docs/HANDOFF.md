# Future OCR: Current Handoff

Updated: 2026-07-15

## Start here

Future OCR is now an implemented private-pilot application. Continue on `develop`; do not scaffold again and do not modify the separate Future Foresight Control Panel.

## Repository

- Workspace: `G:\Other computers\My Computer\Dev_Projects\Future4site\future_OCR`
- GitHub: `https://github.com/nusrv/ocr.future4site`
- Production branch: `main`
- Working branch: `develop`
- Remote implementation commit: `8429914 Build deployable Future OCR platform`
- `main` and `develop` currently contain the same implementation.
- Local `develop` tracks `origin/develop` and was clean before this handoff edit.

## Final decisions

- Node.js on Plesk, MariaDB, private filesystem storage.
- Arabic and English UI with RTL; WCAG 2.2 AA target.
- Initial users are small businesses and developers.
- Self-hosted OCR only. The user rejected external OCR APIs, Docker, and browser-only OCR.
- Install Tesseract 5, English/Arabic trained data, and Poppler directly on the server.
- No automated payments for the private pilot.

## What is implemented

- Public landing page, registration, login, HTTP-only sessions, bilingual responsive subscriber UI.
- Tenant-scoped organizations, memberships, users, roles, and hashed API keys.
- PNG, JPEG, WebP, and bounded scanned-PDF uploads with content-based type detection.
- English (`eng`), Arabic (`ara`), and bilingual (`eng+ara`) OCR jobs.
- Job history, polling, result viewer, page count, confidence, SHA-256, cancellation, and deletion.
- Usage ledger, plan/quota display, API-key creation/list/revocation.
- Administrator overview, organizations, plans, quotas, status updates, and audit-event APIs.
- MariaDB queue using transactional claims and `FOR UPDATE SKIP LOCKED`.
- Tesseract TSV recognition and Poppler `pdftoppm` PDF rasterization at 300 DPI.
- Private storage outside the public root, expiry maintenance, stale-job recovery.
- Helmet/CSP, rate limits, secure cookies, bounded requests, and sensitive-header log redaction.
- Liveness and readiness endpoints.
- Compiled frontend/backend artifacts committed under `public/` and `dist/`.

## Verification completed

A clean non-synced temporary build passed:

- Frontend and backend TypeScript typechecks
- Vite production build
- Server, worker, migration, seed, and maintenance compilation
- Compiled JavaScript syntax checks
- Artifact-presence checks
- Private-key and issued-API-key pattern scan

The synced workspace corrupted long `node_modules` writes. Build with `npm ci` on Plesk or in a clean local temporary directory. No live MariaDB/Tesseract/Poppler integration test was possible locally because those services were absent.

## Server requirements

For Debian/Ubuntu:

```bash
sudo apt update
sudo apt install -y tesseract-ocr tesseract-ocr-eng tesseract-ocr-ara poppler-utils
```

Also required:

- Plesk Node.js Toolkit with Node.js 20 or 22
- MariaDB 10.6+
- HTTPS certificate and scheduled-task access
- Private writable storage outside `public`/`httpdocs`
- Permission for the Plesk user to spawn `/usr/bin/tesseract` and `/usr/bin/pdftoppm`

Verify `node --version`, `npm --version`, `tesseract --version`, `tesseract --list-langs`, and `pdftoppm -v`. Tesseract languages must include `eng` and `ara`.

## Deployment order

1. Point `ocr.future4site.com` to Plesk and enable HTTPS.
2. Create a dedicated MariaDB database and user.
3. Install/verify OCR packages and executable paths.
4. Create private storage owned by the Plesk subscription user with mode `700`.
5. Deploy GitHub `main` to the application root.
6. Configure Node 20/22, production mode, document root `public`, startup file `app.cjs`.
7. Add production variables from `.env.example`.
8. Run `npm ci --omit=dev`.
9. Run `npm run migrate` and `npm run seed:admin`.
10. Remove `ADMIN_PASSWORD` immediately after seeding.
11. Schedule every minute: `node dist/server/src/server/worker-cli.js`.
12. Schedule every five minutes: `node dist/server/src/server/maintenance-cli.js`.
13. Restart the app and verify `/api/health/live` and `/api/health/ready`.
14. Test English, Arabic, bilingual, multipage PDF, failure, cancellation, deletion, expiry, and usage.

Full runbook: `docs/PLESK_DEPLOYMENT.md`.

## Production environment

Important values:

- `APP_URL=https://ocr.future4site.com`
- Dedicated MariaDB `DATABASE_URL`
- `JWT_SECRET` from at least 32 random bytes
- Absolute private `STORAGE_PATH`
- `TESSERACT_PATH=/usr/bin/tesseract` (or verified path)
- `PDFTOPPM_PATH=/usr/bin/pdftoppm` (or verified path)
- `ALLOW_REGISTRATION=false` for the private pilot
- One-time `ADMIN_PASSWORD`, removed after seeding

No production credentials are stored in Git.

## Known gaps

- No live end-to-end suite against real MariaDB and OCR binaries
- No independent cross-tenant penetration test
- No hostile-PDF, decompression-bomb, pixel-limit, malware, or resource-exhaustion suite
- Monthly quotas are displayed but not enforced on job submission
- No API idempotency keys
- No webhook endpoint/delivery system
- No email verification, recovery, invitations, or administrator MFA
- No automated payments, invoices, taxes, refunds, or failed-payment lifecycle
- No backup-restore or formal retention/deletion evidence
- No Arabic/English accuracy benchmark corpus
- One job is processed per scheduled worker invocation; capacity is unmeasured
- Tesseract is the only engine; do not make accuracy or handwriting guarantees
- Privacy policy, terms, support process, and OCR-error disclaimer are not published

This is suitable only for a controlled private pilot after server verification, not a public commercial launch.

## First tasks next session

1. Ask whether domain, server packages, MariaDB, and private storage are ready.
2. If server access is available, deploy `main` using the Plesk runbook.
3. Record actual Node, Tesseract, Poppler, application-root, and storage paths.
4. Run migrations, seed, readiness checks, and controlled OCR smoke tests.
5. Fix server-specific issues on `develop`, verify, then merge/release to `main`.
6. Prioritize quota enforcement, idempotency, integration tests, and hostile-file hardening.

## Safety boundaries

- Treat every upload as hostile and never trust a client tenant ID.
- Never expose or log documents, OCR text, storage paths, database credentials, API secrets, authorization headers, or signed URLs.
- Keep storage outside the public root and do not run workers as root.
- Keep CP isolated; Future OCR must never receive CP database, storage, publishing, Gemini, or n8n credentials.
- Do not enable public subscriptions or billing until release gaps are closed and a controlled pilot passes.
