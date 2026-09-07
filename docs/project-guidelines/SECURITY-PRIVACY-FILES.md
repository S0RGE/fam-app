# Security, privacy, and files

Family medical information is sensitive. These rules are deny-by-default and apply to production, development, tests, logs, and support tooling.

## Rules

- **SEC-001 — Authorization.** Authentication and family authorization MUST be checked server-side on every protected request and enforced again with Supabase RLS. RLS is defense in depth. **Verify:** cross-family UUID tests. **Exception:** explicit security approval.
- **SEC-002 — Secrets.** Service-role/server keys MUST NOT enter client bundles, public runtime config, logs, traces, fixtures, or errors. **Verify:** build/config scans and review. **Exception:** none.
- **SEC-003 — Inputs and abuse.** Uploads MUST validate configured size, allowlisted type, safe filename, and server-inspected content; extension/browser MIME alone is insufficient. Abuse-prone endpoints MUST be rate limited. **Verify:** spoofed MIME, unsupported, oversize, and rate-limit tests. **Exception:** approved risk acceptance.
- **SEC-004 — Private files.** Buckets MUST remain private; persistent public medical-file URLs are forbidden. Signed links require fresh authorization and a configured finite lifetime. **Verify:** unauthorized-link and expiry tests. **Exception:** security approval; exact lifetime remains a product decision.
- **SEC-005 — Staging.** Temporary/failed uploads MUST be isolated and cleaned predictably. Database records commit transactionally; file success is represented explicitly and failures use compensating cleanup. **Verify:** failed-upload, abandoned-stage, and retry tests. **Exception:** documented operational limitation.
- **SEC-006 — Disclosure.** Logs, metrics, traces, snapshots, fixtures, and error payloads MUST exclude medical contents, raw import JSON, signed URLs, credentials, and secrets. User errors MUST NOT reveal another family's object existence. **Verify:** log/error inspection tests. **Exception:** none without security approval.
- **SEC-007 — Development data.** Production-derived medical data MUST NOT be used in development or tests; use synthetic data. **Verify:** fixture review and repository scans. **Exception:** approved, access-controlled security investigation.
- **SEC-008 — Retention.** No code may invent hard deletion, archival, audit-history, import-source retention, or attachment purge timing. These remain blocked until product approval. **Verify:** review against specification. **Exception:** specification amendment.

## Checklist

Review session/auth flow, ownership checks, RLS, secret exposure, CSRF/origin protection, private bucket policy, signed links, upload inspection, cleanup, safe errors, and synthetic fixtures.

**References:** [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/), [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
