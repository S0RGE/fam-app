# Architecture and boundaries

**Scope.** These rules govern Nuxt 3/Vue 3/TypeScript, Nitro API, domain services, repository ports, and Supabase adapters. They do not add product entities, routes, providers, or defaults.

## Rules

- **ARCH-001 — Server boundary.** Browser code MUST access family or medical data through `/api/v1`; it MUST NOT connect directly to PostgreSQL, Supabase Database, or object storage. **Verify:** search client imports and review network tests. **Exception:** none without security approval.
- **ARCH-002 — Dependency direction.** UI depends on API DTOs; handlers depend on application services; services depend on domain and ports; infrastructure adapters implement ports. Domain/application code MUST NOT import Vue, Nitro, Supabase, or generated database types. **Verify:** import/dependency checks. **Exception:** architecture owner approval recorded in a decision record.
- **ARCH-003 — Tenant ownership.** Every persisted family-owned row MUST carry `family_id`; constraints MUST prevent links across families and across the relevant person. Client `family_id` is never authorization context. **Verify:** migration and authorization integration tests. **Exception:** specification amendment.
- **ARCH-004 — Explicit contracts.** Handlers MUST validate input, invoke services, and map explicit stable DTOs and error envelopes. Database rows MUST NOT be returned directly. Nested IDs MUST be authorized against the authenticated family/person. **Verify:** API contract tests. **Exception:** none for protected data.
- **ARCH-005 — Ports.** Storage is reached through `ObjectStorage`; search through `SearchRepository`; persistence through repository ports. Supabase implementations live only in infrastructure adapters. **Verify:** dependency review. **Exception:** documented migration plan approved by architecture owner.
- **ARCH-006 — Writes.** Cross-aggregate writes MUST use one database transaction with explicit rollback semantics. File work uses staging and compensating cleanup; it MUST NOT be described as distributed ACID. **Verify:** failure and cleanup tests. **Exception:** decision record.
- **ARCH-007 — Provenance.** Imported aggregates MUST remain traceable to an import record. Raw submitted JSON MUST remain distinct from corrected validated drafts. **Verify:** import persistence tests. **Exception:** import contract amendment.
- **ARCH-008 — Time.** Date-only values and instants MUST use separate representations. Instants require an offset or `Z`, normalize to UTC for persistence/API, and convert only at presentation. **Verify:** boundary and timezone tests. **Exception:** specification amendment.

## Decision boundary

Guidelines may decide layering, ports, DTO discipline, transaction semantics, and validation placement. They MUST NOT decide membership cardinality, new fields/enums, file limits, retention/deletion, import envelope changes, image-measurement meaning, or pagination behavior. Surface those choices in the specification.

## Checklist

Confirm no direct client data access; all IDs are tenant/person checked; ports isolate providers; every family row and relation is constrained; DTOs are explicit; failure paths and provenance are tested.

**References:** [Nuxt server routes](https://nuxt.com/docs/guide/directory-structure/server), [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
