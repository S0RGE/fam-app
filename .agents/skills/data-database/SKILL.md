---
name: data-database
description: Activate when changing PostgreSQL schema, migrations, repositories, constraints, transactions, dates, or search persistence boundaries.
---

# Data/database

## Activation
Use for schema and persistence work, including repository adapters and search storage; JSON syntax itself belongs to `json-import`.

## Required reading
Read [data rules](../../../docs/project-guidelines/DATA-DATABASE.md), [architecture rules](../../../docs/project-guidelines/ARCHITECTURE.md), [security rules](../../../docs/project-guidelines/SECURITY-PRIVACY-FILES.md), and the [specification](../../../docs/PROJECT_SPECIFICATION.md).

## Required inputs
Canonical entities/fields, family/person relationships, migration state, repository port, transaction boundary, date semantics, and search requirements.

## Workflow
1. Inspect migrations, constraints, ports, adapters, and tests.
2. Add only specified fields/tables; enforce `family_id` and composite ownership constraints.
3. Keep date-only values distinct from offset datetimes; normalize instants at persistence/API boundaries.
4. Use one transaction for related rows, prove rollback/idempotency, and filter search by tenant before ranking/snippets/pagination.

## Stop/escalation
Stop for new entities/fields/enums, destructive or lossy migration, retention, pagination defaults, import source semantics, image-valued measurements, or provider choice. Update/record the canonical decision first (DATA-001–DATA-007, DOC-004).

## Validation evidence
Report clean forward migration, constraint/family-filter tests, rollback and retry/concurrency tests, date/timezone tests, search tests, and skipped database checks (VER-001–VER-003).

## Handoff format
`Schema/migrations: ...; ports/adapters: ...; constraints/transactions: ...; checks/results: ...; open decisions/risks: ...`.
