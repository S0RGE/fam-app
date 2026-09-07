---
name: backend-api
description: Activate when implementing or reviewing Nitro server handlers, application services, DTOs, validation, authentication, authorization, or API errors.
---

# Backend/API

## Activation
Use for `/api/v1` server boundaries and their application-service seams. Keep provider-specific details in infrastructure.

## Required reading
Read [backend/API rules](../../../docs/project-guidelines/BACKEND-API.md), [architecture rules](../../../docs/project-guidelines/ARCHITECTURE.md), [security rules](../../../docs/project-guidelines/SECURITY-PRIVACY-FILES.md), and the [specification](../../../docs/PROJECT_SPECIFICATION.md).

## Required inputs
Route and method, request/response contract, authenticated-family context, nested ownership relationships, schema, transaction needs, and abuse-control requirements.

## Workflow
1. Inspect existing handlers, services, ports, DTOs, and tests.
2. Authenticate server-side, derive family context from session, deny by default, and authorize every top-level/nested ID.
3. Validate path/query/body/upload metadata; call services; return explicit stable DTOs and safe machine-readable errors.
4. Apply CSRF/origin and rate-limit controls where required; test success, malformed, unauthenticated, unauthorized, not-found, error, and transaction failures.

## Stop/escalation
Stop for public access, new endpoint semantics, provider exposure, missing ownership rule, rate-limit/session choice, or security exception. Escalate rather than weakening checks (API-001–API-006, SEC-001, ARCH-004).

## Validation evidence
Report contract and authorization tests, schema/type/lint checks, error-envelope inspection, rollback evidence, and skipped infrastructure checks (VER-001, VER-003).

## Handoff format
`Routes: ...; services/ports: ...; auth/ownership: ...; DTO/errors: ...; checks/results: ...; risks/open decisions: ...`.
