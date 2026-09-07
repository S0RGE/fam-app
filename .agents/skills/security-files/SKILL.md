---
name: security-files
description: Activate when handling authentication, family authorization, secrets, medical-data privacy, uploads, private storage, signed links, or cleanup.
---

# Security and files

## Activation
Use for security/privacy review and file lifecycle implementation. Treat medical data as sensitive in code, tests, logs, and tooling.

## Required reading
Read [security rules](../../../docs/project-guidelines/SECURITY-PRIVACY-FILES.md), [architecture rules](../../../docs/project-guidelines/ARCHITECTURE.md), [backend rules](../../../docs/project-guidelines/BACKEND-API.md), and the [specification](../../../docs/PROJECT_SPECIFICATION.md).

## Required inputs
Threat/flow, session and family context, file allowlist/configuration, storage adapter, link authorization/lifetime, staging lifecycle, logging surfaces, and synthetic fixtures.

## Workflow
1. Trace server authentication, ownership checks, RLS, and secret/config boundaries.
2. Validate upload size/type/name/content server-side; stage safely, clean failures predictably, and use private buckets with freshly authorized finite signed links.
3. Inspect logs, errors, traces, bundles, fixtures, and caches for medical content, raw JSON, credentials, or URLs.
4. Test cross-family denial, spoofed/unsupported/oversize files, expiry, cleanup, abuse controls, and synthetic data.

## Stop/escalation
Stop for public files, secret exposure, security exceptions, retention/deletion/audit timing, attachment limits, or signed-link lifetime. Escalate to security/product authority; never invent a workaround (SEC-001–SEC-008).

## Validation evidence
Provide security/config scans, authorization and upload tests, cleanup/expiry evidence, log/error review, and skipped checks with reasons (VER-001–VER-002).

## Handoff format
`Threat/flow: ...; controls: ...; files/storage: ...; tests/scans: ...; findings: ...; residual risks/owner: ...`.
