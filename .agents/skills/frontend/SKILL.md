---
name: frontend
description: Activate when implementing or reviewing Vue/Nuxt UI, composables, forms, navigation, responsive behavior, or client-side API integration.
---

# Frontend

## Activation
Use for presentation-layer work only. Do not move authorization, persistence, or provider types into the client.

## Required reading
Read [frontend rules](../../../docs/project-guidelines/FRONTEND.md), [architecture rules](../../../docs/project-guidelines/ARCHITECTURE.md), the [specification](../../../docs/PROJECT_SPECIFICATION.md), and relevant API contract.

## Required inputs
Screen/user journey, DTOs and error envelope, affected components/composables, Russian copy requirements, viewport/accessibility targets, and test tooling.

## Workflow
1. Inspect nearby components and tests; consume `/api/v1` DTOs rather than database/provider types.
2. Implement loading, empty, success, recoverable-error, and terminal-error states; map machine errors to Russian field/user messages.
3. Verify keyboard, focus, pointer/touch, 320px layout, zoom, date presentation, unsaved-change guards, and destructive confirmation.
4. Keep sensitive values out of logs and caches; add focused UI/contract tests.

## Stop/escalation
Stop for a new route/field, pagination choice, contract change, security exception, or unresolved product behavior. Escalate to the canonical owner (UI-001–UI-008, ARCH-004, DOC-004).

## Validation evidence
Provide component/API tests, type/lint output, responsive and accessibility results, synthetic-data review, and skipped checks with reasons (VER-001, UI-003–UI-006).

## Handoff format
`Journey: ...; UI files: ...; DTO/errors: ...; states/accessibility: ...; checks/results: ...; risks/open decisions: ...`.
