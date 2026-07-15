# Future OCR Roadmap

Each phase has a hard gate. Do not begin the next phase until the current phase is reviewed and accepted.

## O0 — Product and architecture foundation

Deliver:

- Product requirements and supported-input matrix
- Architecture decision records and deployment topology
- OpenAPI 3.1 contract
- Tenant-aware relational data model
- Threat model and data-retention policy
- Pricing hypotheses and infrastructure cost envelope
- Test strategy, service-level objectives, and operational runbooks
- Local development and secret-management plan

Gate:

- No unresolved high-risk security boundary
- API supports idempotency, asynchronous jobs, bounded errors, and versioning
- CP remains untouched

## O1 — Private OCR API

Deliver:

- Tenant and service-account authentication
- Hashed, rotatable API keys
- Job submission, status, result, cancellation, and deletion endpoints
- Tesseract 5 engine adapter
- Poppler PDF rasterization
- English, Arabic, and bilingual processing
- Private temporary object storage
- Durable queue and resource-limited workers
- Page-level text, confidence, hashes, and engine metadata
- Audit events, structured logs, metrics, health checks, and backups
- Automated contract, security, failure, and retention tests

Gate:

- Independent staging deployment passes
- Malformed and hostile files fail safely
- Files expire and are verifiably removed
- Worker crashes do not lose or duplicate billable usage
- No public registration or billing

## O2 — CP pilot integration

Deliver:

- Stable remote-provider contract
- Separately approved CP adapter
- Signed authentication and checksum verification
- Polling and/or signed webhook completion
- Retry, timeout, cancellation, and reconciliation behavior
- Controlled Arabic, English, image, and scanned-PDF pilot

Gate:

- CP retains authoritative provenance and review
- Future OCR has no CP database or storage access
- Existing CP local OCR remains disabled or available only as an explicit fallback
- No automatic claim approval, AI generation, or publishing

## O3 — Multi-tenant customer pilot

Deliver:

- Organizations, memberships, roles, invitations, and account recovery
- Customer dashboard and API-key management
- Tenant-specific quotas and rate limits
- Usage dashboard and immutable usage ledger
- Webhooks with signing, replay protection, delivery history, and SSRF controls
- Support tooling with audited impersonation-free diagnostics
- Terms, privacy notice, retention controls, and deletion workflow

Gate:

- Cross-tenant isolation suite passes
- Abuse and resource-exhaustion tests pass
- Backup restoration and incident response drills pass
- Small invitation-only pilot completes successfully

## O4 — Commercial subscriptions

Deliver:

- Plans, trials, entitlements, credits, invoices, and payment-provider adapter
- Metered page billing and reconciliation
- Grace periods, suspension, cancellation, and refunds policy
- Usage alerts and spending controls
- Tax and legal review for launch markets
- Customer-facing status, documentation, SDK examples, and support process

Gate:

- Billing totals reconcile with the internal ledger
- Failed payments never cause data leakage or silent overages
- Operational capacity and support readiness are approved

## O5 — Quality and scale

Possible additions after evidence supports them:

- Deskew, rotation, denoise, and layout preprocessing
- Bounding boxes, tables, and searchable PDF output
- Additional languages
- Alternative OCR engines behind the engine interface
- Dedicated enterprise workers and regional data residency
- Accuracy benchmark corpus and regression dashboard

Do not promise handwriting, perfect tables, or factual correctness without separate validated capabilities.

