---
name: documentation-decisions
description: Activate when authoring Family App documentation, linking canonical rules, or recording unresolved product and implementation decisions.
---

# Documentation and decisions

## Activation
Use for docs and decision records only. Keep product behavior, import syntax, and implementation policy in their canonical owners.

## Required reading
Read [documentation rules](../../../docs/project-guidelines/DOCUMENTATION-DECISIONS.md), [guidelines index](../../../docs/project-guidelines/README.md), and the relevant [specification](../../../docs/PROJECT_SPECIFICATION.md), [import contract](../../../docs/JSON_IMPORT_FORMAT.md), or topical guideline.

## Required inputs
Change purpose, canonical owner, audience, stable rule IDs, decision status/owners/context, relative-link base, and review evidence.

## Workflow
1. Identify the single canonical owner; link instead of duplicating normative policy.
2. Use clear normative language and stable IDs where guidance is enforceable; keep examples synthetic and free of secrets/medical data.
3. Record unresolved choices with context, owners, consequences, and status; do not silently settle open product decisions.
4. Check relative links, headings, terminology, whitespace, scope, and index discoverability.

## Stop/escalation
Stop for a competing source of truth, missing authority, product/contract choice, policy exception, or request to alter protected specification/import files without approval (DOC-001–DOC-006, GIT-001).

## Validation evidence
Report link resolution, rule-ID/reference checks, Markdown/frontmatter/whitespace checks, diff/status, and skipped checks with reasons.

## Handoff format
`Canonical owner: ...; files: ...; rule IDs/links: ...; decisions: ...; checks/results: ...; risks: ...`.
