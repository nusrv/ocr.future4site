# Future OCR

Future OCR is a planned standalone, multi-tenant OCR platform with a web dashboard and authenticated API. It is intentionally isolated from the Future Foresight Control Panel (CP).

## Current status

Planning only. No application has been scaffolded, no infrastructure has been provisioned, and no CP code has been changed.

Start the next Codex session with [docs/HANDOFF.md](docs/HANDOFF.md), then follow [docs/ROADMAP.md](docs/ROADMAP.md).

## Non-negotiable boundary

- This project owns OCR execution, temporary source handling, job processing, tenant usage, and its public API.
- CP remains a separate production system and must not be modified during the initial Future OCR build.
- Future OCR never receives CP database credentials, filesystem paths, storage keys, publishing credentials, Gemini credentials, or n8n credentials.
- Any later CP integration must be a separately approved phase using the stable OCR API.

