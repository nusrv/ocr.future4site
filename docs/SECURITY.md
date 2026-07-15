# Security and retention baseline

- Every tenant query derives organization ownership from the authenticated session or hashed API key.
- API-key secrets are displayed once and only SHA-256 hashes are stored.
- Passwords use bcrypt with cost 12; sessions use HTTP-only, secure, same-site cookies in production.
- Upload type is determined from file content. Filename and browser MIME declarations are not trusted.
- Upload bytes, PDF pages, process time, child-process output, queue attempts, and rate limits are bounded.
- Source files are created with private permissions outside the public document root.
- Logs redact authorization, cookies, and response cookies and must never include OCR text or source bytes.
- OCR workers should run as the Plesk subscription user with no root privilege and no unnecessary outbound network access.
- Results and sources are erased by the maintenance task after expiry; minimal usage and audit facts remain.
- Usage events have a unique job/event key so retries cannot duplicate billable pages.
- Administrator screens do not return OCR text. Content access stays tenant-scoped.

Before public launch, add independent penetration testing, malware scanning appropriate to the hosting environment, backup restoration evidence, webhook SSRF protection, account recovery, email verification, MFA for administrators, and a formal privacy/legal review.
