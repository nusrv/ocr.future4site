# Future OCR â€” New Session Handoff

Updated: 2026-07-15

## Objective

Design and build a standalone commercial OCR service at a future domain such as `ocr.future4site.com`, with an authenticated API suitable for CP and independent subscribers.

This is a new product, not a feature branch or submodule of `ff-admin-finalize`.

## Repository state

- Workspace: `G:\Other computers\My Computer\Dev_Projects\Future4site\future_OCR`
- Status: planning documents only
- Git repository: not initialized by this handoff
- Technology stack: intentionally not selected yet
- Deployment target: intentionally not provisioned yet
- Credentials: none required or stored
- CP changes: none

## Product goals

- Arabic, English, and bilingual printed-text OCR
- PNG, JPEG, WebP, and bounded scanned-PDF input
- Asynchronous API jobs with polling and optional webhooks
- Tenant-isolated dashboard, API keys, quotas, and immutable usage accounting
- Page text, confidence, hashes, language, engine version, and machine-readable output
- Subscription-ready design without requiring billing in the first private pilot
- Horizontally scalable, resource-limited workers

## Explicit exclusions for the first release

- Handwriting guarantees
- Automatic translation
- Semantic search or generative AI
- Legal or factual verification
- Permanent customer document archiving
- CP database or private-storage access
- Automatic CP claim approval or publishing
- Public self-service billing before the private pilot is stable

## Required first-session decisions

Before scaffolding code, document and obtain agreement on:

1. Product name and domains.
2. Initial hosting model and budget.
3. Backend, dashboard, database, queue, and object-storage stack.
4. Authentication model for users and API clients.
5. Source/result retention defaults.
6. Initial file-size, page, concurrency, and monthly quota limits.
7. Countries, currency, tax responsibility, and payment provider for the later commercial phase.
8. Whether the first pilot uses Tesseract only or an engine abstraction from day one.

Reasonable default: build an engine interface immediately, implement only Tesseract 5 plus Poppler initially, and postpone billing.

## Recommended first work package

Complete Phase O0 in the roadmap. Produce architecture decision records, threat model, API specification, data model, deployment topology, cost envelope, and acceptance tests before creating production code.

Then implement Phase O1 as a private API. CP is the first integration consumer only after O1 passes its independent deployment gate.

## Safety requirements

- Treat every uploaded file as untrusted.
- Reject unsupported media using content inspection, not filename alone.
- Enforce upload bytes, raster bytes, pages, pixels, time, memory, CPU, processes, concurrency, and rate limits.
- Run OCR workers without root, with no host mounts or outbound network by default.
- Use private object storage, encryption in transit, short retention, and verified deletion.
- Hash API keys at rest; show each secret once.
- Enforce tenant ownership in every query and object-storage key.
- Use idempotency keys for job creation and webhook delivery.
- Sign webhooks, prevent SSRF, and retry with bounded backoff.
- Never log document content, API secrets, authorization headers, or signed URLs.
- Keep an immutable usage ledger independent of the payment provider.

## CP integration boundary

When Future OCR is stable, create a separate CP integration proposal. The future adapter should upload bytes over HTTPS, submit an immutable source checksum, poll or receive a signed callback, validate the result contract, and store approved OCR results inside CP. It must not expose CP storage paths or grant Future OCR database access.

Do not modify CP during Phases O0 or O1.

## Completion definition

Future OCR is not ready for subscribers until tenant-isolation tests, resource-exhaustion tests, deletion/retention verification, backup restoration, API compatibility tests, usage reconciliation, operational monitoring, and a controlled private pilot all pass.
