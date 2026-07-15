# Plesk deployment runbook

## Server prerequisites

- Plesk Obsidian with the Node.js Toolkit extension.
- Node.js 20 or 22 LTS.
- MariaDB 10.6 or newer, with a dedicated database and user.
- Tesseract 5 packages for English and Arabic.
- Poppler utilities, including `pdftoppm`.
- HTTPS certificate and a dedicated domain such as `ocr.future4site.com`.

Typical Debian/Ubuntu OCR packages are `tesseract-ocr`, `tesseract-ocr-eng`, `tesseract-ocr-ara`, and `poppler-utils`. Confirm exact package names with the server administrator.

## Build and upload

On a clean build machine:

```text
npm ci
npm run check
```

Upload the repository including `public`, `dist`, `database`, `app.cjs`, `package.json`, and `package-lock.json`. Do not upload `.env`, local storage, logs, or development credentials. On Plesk, run `npm ci --omit=dev` after the compiled artifacts are present.

## Plesk Node settings

- Application root: the uploaded project directory.
- Document root: `public`.
- Application mode: `production`.
- Application startup file: `app.cjs`.
- Node.js version: 20 or 22 LTS.

Plesk expects the startup file inside the application root. The application listens on the `PORT` value supplied by Plesk/Passenger.

## Required environment

Copy the names from `.env.example` into Plesk Custom Environment Variables. Generate `JWT_SECRET` from at least 32 random bytes. Use an absolute `STORAGE_PATH` outside the public document root and owned only by the subscription system user. Set `APP_URL` to the final HTTPS origin.

Never keep `ADMIN_PASSWORD` in the environment after running the seed command.

## Database initialization

From the application root using the same environment as the web application:

```text
npm run migrate
npm run seed:admin
```

Run migrations before restarting the application. Back up MariaDB immediately before later schema upgrades.

## OCR worker and maintenance tasks

Create Plesk scheduled tasks under the subscription user:

1. Every minute: `cd /absolute/application/root && node dist/server/worker-cli.js`
2. Every five minutes: `cd /absolute/application/root && node dist/server/maintenance-cli.js`

Use absolute paths when Plesk scheduled tasks run in a chrooted shell. For higher throughput, run the worker command multiple times per minute only after observing memory and CPU use. Each invocation claims at most one job safely.

## Deployment verification

1. Open `/api/health/live`; expect HTTP 200.
2. Open `/api/health/ready`; expect database, Tesseract, and Poppler to be `true`.
3. Sign in as the seeded administrator, then remove `ADMIN_PASSWORD`.
4. Register or create a pilot subscriber.
5. Process one English image, one Arabic image, one bilingual image, and one scanned PDF.
6. Confirm page usage increments exactly once per successful job.
7. Cancel a queued job and confirm it is not billed.
8. Delete a job and confirm its private directory and OCR content are removed.
9. Run the maintenance task manually from Plesk and inspect its output.
10. Confirm HTTPS, secure cookies, CSP headers, upload limits, backups, and log redaction.

## Rollback

Keep the previous application directory and database backup. To roll back, point the Plesk application root at the previous release, restore the compatible database backup if the schema changed, and restart the Node application. Uploaded documents remain in the shared private storage path only if both releases use a compatible storage layout.

## Known release boundary

This deployment is suitable for a controlled private pilot after its server checks pass. Automated payment collection is intentionally absent. Plans and quotas are operator-managed until a payment provider, launch currency, tax responsibility, refund policy, and signed webhook flow are approved.
