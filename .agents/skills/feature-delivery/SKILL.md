---
name: feature-delivery
description: Activate when delivering a Family App feature spanning product layers and needing scope, boundary, and handoff coordination.
---

# Feature delivery

## Activation
Use for a cross-layer feature or a change whose correct owner is not yet clear. Stay at orchestration and implementation workflow level; specialist skills own detailed policy.

## Required reading
Read the [specification](../../../docs/PROJECT_SPECIFICATION.md), relevant [guidelines index](../../../docs/project-guidelines/README.md), and [architecture rules](../../../docs/project-guidelines/ARCHITECTURE.md). Route to the specialist guideline before editing.

## Required inputs
Approved feature scope, affected module and files, acceptance scenarios, known decisions, and available test commands.

## Workflow
1. Map the request to canonical specification sections and rule IDs; identify affected layers and ownership.
2. Inspect existing code/tests and preserve current seams; split work among frontend, API, data, import, security, documentation, and validation concerns.
3. Implement the smallest coherent change through DTOs, services, ports, and adapters as applicable.
4. Check scope, tenant boundaries, failure paths, and documentation impact; run affected checks.

## Stop/escalation
Stop for a missing product/contract/architecture choice, new provider/dependency, destructive operation, retention decision, or security exception. Record the open decision against its canonical owner; do not invent defaults (ARCH-Decision boundary, DOC-004, GIT-001).

## Validation evidence
Report changed paths, focused tests, type/lint results, link checks, `git diff --check`, status, skipped checks, and residual risks (VER-001, GIT-003).

## Handoff format
`Scope: ...; files: ...; rule IDs: ...; checks/results: ...; open decisions: ...; risks: ...; next owner: ...`.
