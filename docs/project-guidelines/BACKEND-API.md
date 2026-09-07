# Backend and API

## Rules

- **API-001 — Authentication.** Every protected endpoint MUST authenticate server-side and establish family context from the session/account; client-supplied `family_id` MUST be ignored for authorization. **Verify:** authenticated, unauthenticated, and expired-session tests. **Exception:** only an explicitly public endpoint in the specification.
- **API-002 — Authorization.** Handlers MUST deny by default, authorize every top-level and nested identifier against the authenticated family and relevant person, then call the service. RLS is defense in depth, not a substitute for ownership checks. **Verify:** cross-family UUID tests. **Exception:** approved security decision.
- **API-003 — Input and output.** Request bodies, query parameters, path IDs, and upload metadata MUST be schema-validated. Responses MUST use stable explicit DTOs and a machine-readable error code plus safe field paths; internal exceptions and database rows MUST NOT escape. **Verify:** contract tests. **Exception:** versioned contract change.
- **API-004 — Scope.** Routes MUST implement only behavior in the specification and import contract. Handlers MUST NOT introduce provider-specific response shapes or silently add fields. **Verify:** contract review. **Exception:** specification update.
- **API-005 — Abuse controls.** Login, recovery, import, signed-link creation, and similarly abuse-prone endpoints MUST have rate limiting appropriate to the chosen session architecture. **Verify:** security tests/config review. **Exception:** explicit risk acceptance.
- **API-006 — Mutations.** Mutating requests MUST use explicit CSRF/origin protection appropriate to the selected session model and MUST preserve idempotency semantics where the contract requires retries. **Verify:** integration tests. **Exception:** documented session/security decision.

## Checklist

For each endpoint test success, malformed input, unauthenticated, unauthorized/cross-family, not-found/non-disclosure, stable error shape, and transaction failure where applicable.

**References:** [OWASP API Security Top 10](https://owasp.org/API-Security/), [Nuxt server routes](https://nuxt.com/docs/guide/directory-structure/server).
