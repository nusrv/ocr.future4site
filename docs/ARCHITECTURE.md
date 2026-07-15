# Architecture Baseline

This is a planning baseline, not a final technology decision.

## Trust boundaries

```text
Customer / CP
      |
      | HTTPS + API key/OAuth + idempotency key
      v
API gateway and application
      |---- tenant database and immutable usage ledger
      |---- private object storage with short-lived objects
      '---- durable job queue
                  |
                  v
        isolated non-root OCR workers
        Tesseract + Poppler, bounded resources
                  |
                  v
        results, audit, metrics, signed webhook
```

## Core domain

- Organization, User, Membership
- ApiKey and ServiceAccount
- SubscriptionPlan and Entitlement
- OcrJob, OcrPage, OcrArtifact
- UsageEvent and UsagePeriod
- WebhookEndpoint and WebhookDelivery
- AuditEvent

All tenant-owned records carry an organization identifier. Authorization must derive the organization from authenticated context, never from a trusted client-supplied tenant ID.

## API baseline

- `POST /v1/ocr/jobs`
- `GET /v1/ocr/jobs/:id`
- `GET /v1/ocr/jobs`
- `POST /v1/ocr/jobs/:id/cancel`
- `DELETE /v1/ocr/jobs/:id`
- `GET /v1/usage`
- `POST /v1/webhook-endpoints`
- `GET /v1/webhook-deliveries`

Large uploads should eventually use short-lived presigned upload URLs. A bounded multipart endpoint is acceptable for the private pilot.

## Job lifecycle

```text
UPLOADING -> QUEUED -> PROCESSING -> SUCCEEDED
                         |   |
                         |   '-> FAILED
                         '-----> CANCELLED

SUCCEEDED / FAILED / CANCELLED -> EXPIRED
```

Transitions are server-controlled and idempotent. Usage becomes billable according to a documented policy, recorded exactly once in an immutable ledger.

## Data minimization

- Default source retention should be measured in hours, not months.
- Result retention is plan-controlled with a conservative default.
- Deletion removes source objects, derived rasters, results, and signed access while retaining minimal non-content billing and audit facts where legally necessary.
- Logs contain identifiers and timings, not OCR text or documents.

## Availability model

The API accepts work quickly; workers process asynchronously. Queue depth, oldest-job age, success rate, p95 processing time, worker memory, temporary storage, webhook failures, and usage-ledger reconciliation require monitoring and alerts.

