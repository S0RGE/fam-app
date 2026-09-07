# Testing and quality

## Principles

- **VER-001 — Evidence.** Use repository-defined scripts once tooling exists; never invent a passing command. Report every skipped check and reason. **Verify:** review report. **Exception:** none.
- **VER-002 — Synthetic data.** Tests MUST use synthetic family/medical data and valid UUIDs for another family in authorization cases. **Verify:** fixture review. **Exception:** security-approved investigation.
- **VER-003 — Failure proof.** Transaction tests MUST prove no partial rows; import tests MUST prove strict validation, correction separation, raw preservation, retry/concurrency idempotency, and rollback. **Verify:** focused integration tests. **Exception:** documented unavailable infrastructure.

## Change-to-check matrix

| Change | Minimum checks |
|---|---|
| TypeScript/domain/DTO | type check, lint, focused unit tests, DTO/schema compatibility |
| API endpoint | success, invalid input, unauthenticated, unauthorized/cross-family, not-found, stable error shape |
| Migration/repository/RLS | clean forward migration, constraints, rollback, family filtering, RLS |
| JSON import | each version/record fixture, strict unknown fields, field paths, corrections, deduplication, retry, rollback, raw source |
| Files | spoofed MIME, unsupported/oversize, unauthorized link, failed cleanup |
| Search | Russian text, case-insensitivity, filters, pagination/ranking, update/delete, cross-family non-disclosure |
| Frontend | loading/empty/error, keyboard/focus, touch, 320px, zoom, field-error mapping |
| Critical workflow | Playwright journey for the affected specification scenario |

## Definition of done

A change is done only when affected matrix checks pass, security and scope review is complete, documentation is updated, and command output is reported. Unavailable infrastructure is not silently treated as passing.

**References:** [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/), [WCAG 2.2](https://www.w3.org/TR/WCAG22/).
