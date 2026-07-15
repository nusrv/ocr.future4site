# Future OCR implementation plan

## Deployment posture

Future OCR is a Node.js application designed for Plesk with MariaDB. The web process serves the compiled subscriber/admin interface and the versioned API. A separate scheduled worker command claims OCR jobs from MariaDB, uses Tesseract 5 for images and Poppler for PDF rasterization, then records page-level results. Source files stay outside the public document root.

## Product surfaces

1. Public: product overview, privacy/retention explanation, plans, sign-in, registration.
2. Subscriber workspace: overview, document upload, jobs, result review/download, usage, API keys, webhooks, members, billing-ready plan view, settings.
3. Operator control panel: organizations, users, jobs, usage, plans, audit events, queue health, runtime readiness, and safe tenant suspension.
4. API: authenticated job submission/status/result/cancellation/deletion, usage, API-key and webhook management.

## Delivery phases

### Phase 0: foundation

- Product and design context, architecture decisions, schema, threat model, retention policy, test strategy, and Plesk runbook.
- Node.js/TypeScript monolith with a separately invokable worker.
- MariaDB-backed queue avoids requiring Redis on the initial Plesk deployment.

### Phase 1: private service

- Authentication, organizations, role-based access, API keys, upload validation, OCR processing, result access, cancellation, deletion, audit events, health checks, and usage ledger.
- English (`eng`), Arabic (`ara`), and bilingual (`eng+ara`) Tesseract modes.
- PNG, JPEG, WebP, and bounded PDF inputs.

### Phase 2: subscriber pilot

- Bilingual responsive workspace, onboarding, job history, result viewer, usage and quota display, API key management, and plan presentation.
- Invitation-only enrollment and manually assigned plans before payment automation.

### Phase 3: commercial operations

- Payment-provider adapter, trials, invoices, failed-payment lifecycle, usage alerts, webhook delivery, support procedures, and legal launch review.

## Release gates

- Cross-tenant access tests, hostile-file rejection, bounded resources, exactly-once usage events, retention verification, backup restore test, worker crash recovery, API compatibility tests, accessibility checks, and a controlled pilot must pass before public subscriptions.
- Billing activation remains disabled until a payment provider, currency, tax posture, and webhook secrets are configured and reviewed.
