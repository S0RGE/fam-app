---
name: validation-review
description: Activate when validating, reviewing, or preparing evidence for a Family App change across code, tests, documentation, scope, and delivery checks.
---

# Validation and review

## Activation
Use as the independent review workflow after implementation or for a focused quality assessment; it does not replace specialist policy.

## Required reading
Read [testing rules](../../../docs/project-guidelines/TESTING-QUALITY.md), [Git/delivery rules](../../../docs/project-guidelines/GIT-DELIVERY.md), and the affected topical guideline plus canonical contract.

## Required inputs
Diff/status, affected matrix row, test scripts, synthetic fixtures, changed links/docs, and claimed acceptance criteria.

## Workflow
1. Inspect the diff and classify affected layers, security, schema, import, and UI checks.
2. Run only repository-defined/dependency-free checks that exist; verify Markdown links, rule-ID citations, frontmatter, whitespace, and scope.
3. Review success and failure evidence, tenant isolation, raw-data privacy, rollback/idempotency, accessibility, and unresolved decisions as applicable.
4. Report blockers separately from residual risks; do not modify unrelated files or stage changes.

## Stop/escalation
Stop and escalate blockers involving contract/product/architecture choices, security exceptions, destructive changes, dependency installation, commit, or push (VER-001–VER-003, GIT-001–GIT-005).

## Validation evidence
Record exact commands and pass/fail/not-run results, concise output, changed files, tests added, residual risks, no-staged-files state, and diff summary.

## Handoff format
`Verdict: ...; blockers: ...; findings: ...; commands/results: ...; changed/tests: ...; residual risks: ...; next step: ...`.
