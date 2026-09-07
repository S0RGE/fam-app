# Data and database

## Rules

- **DATA-001 — Tenant schema.** Every family-owned table MUST include `family_id`; foreign keys and composite constraints MUST prevent cross-family and cross-person links. **Verify:** clean migration and constraint tests. **Exception:** specification amendment.
- **DATA-002 — Migrations.** Migrations MUST be forward, reversible where the tooling supports it, and safe on a clean database. Destructive or lossy changes require an approved plan and backup/rollback evidence. **Verify:** migration integration tests. **Exception:** explicit delivery decision.
- **DATA-003 — Transactions.** Related domain/import rows MUST be committed in one database transaction; failed work MUST leave no partial domain rows. File staging and cleanup follow [security rules](SECURITY-PRIVACY-FILES.md). **Verify:** rollback and retry tests. **Exception:** documented distributed-storage limitation, never a claim of atomic files+DB.
- **DATA-004 — Import contract.** Version 1 JSON is strict: unknown fields reject, paths are reported, raw input is immutable, and corrections use a separate validated draft. `externalId` deduplication requires the contract's source/version semantics; do not invent missing fields. **Verify:** fixtures for every record type and invalid field. **Exception:** update `JSON_IMPORT_FORMAT.md` first.
- **DATA-005 — Provenance/idempotency.** Completed imports are traceable and retries/concurrent confirmation are idempotent. The documented nested measurement route does not redefine family ownership. **Verify:** concurrency and retry tests. **Exception:** approved contract decision.
- **DATA-006 — Dates.** Date-only values remain calendar dates; datetimes require offset or `Z` and normalize to UTC at persistence/API boundaries. **Verify:** timezone boundary tests. **Exception:** specification amendment.
- **DATA-007 — Search.** Search goes through `SearchRepository`; tenant filtering occurs before snippets, counts, ranking, or pagination are exposed. **Verify:** Russian text, filter, update/delete, and cross-family tests. **Exception:** security approval.

## Unresolved product decisions

Do not choose account/family cardinality, import `source` location, image-valued measurements, retention/deletion, attachment limits, link lifetime, or pagination defaults in schema code. Record them against the relevant specification before implementation.

**References:** [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html), [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations).
