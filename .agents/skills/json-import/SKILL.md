---
name: json-import
description: Activate when implementing or reviewing Family App JSON import parsing, preview, correction, attachments, persistence, or deduplication.
---

# JSON import

## Activation
Use for the versioned import workflow from input through confirmation. Do not alter the wire contract implicitly.

## Required reading
Read [JSON import format](../../../docs/JSON_IMPORT_FORMAT.md), [data rules](../../../docs/project-guidelines/DATA-DATABASE.md), [architecture rules](../../../docs/project-guidelines/ARCHITECTURE.md), and [frontend import rules](../../../docs/project-guidelines/FRONTEND.md).

## Required inputs
Schema version/record type, fixture, selected person, correction model, attachment mappings, import status, deduplication key, and transaction boundary.

## Workflow
1. Select the versioned strict schema; reject unknown fields and report precise paths.
2. Preserve immutable raw JSON separately from the validated corrected draft; preview and allow person/type/link corrections.
3. Keep local paths out of requests; stage attachments through the private-file workflow.
4. Confirm once, persist all domain rows in one transaction, retain provenance, and make retries/concurrent confirmation idempotent.

## Stop/escalation
Stop for envelope/source changes, new record types, deduplication semantics not in the contract, attachment limits/retention, partial-save behavior, or schema ambiguity. Update `JSON_IMPORT_FORMAT.md` or record an approved decision first (DATA-004–DATA-005, ARCH-006–ARCH-007, UI-007).

## Validation evidence
Report fixtures for every supported type/version, unknown-field/path tests, correction/raw-separation tests, attachment cleanup, rollback, retry/concurrency, and status-transition tests (VER-003).

## Handoff format
`Version/types: ...; schemas/transformers: ...; preview/corrections: ...; persistence/attachments: ...; checks/results: ...; risks/open decisions: ...`.
