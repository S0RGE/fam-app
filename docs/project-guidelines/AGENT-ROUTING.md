# Agent routing

This roster is the project-specific execution layer for the approved [skills](../../.agents/skills/) and [guidelines](README.md). Agents are advertised under the `family-app-*` names and use fresh context by default, asynchronous defaults, and no inherited skills.

## Select by work

| Agent | Parent selects when |
|---|---|
| `family-app-planner` | Scope, affected layers, ownership, or validation order needs a read-only plan. |
| `family-app-feature-worker` | One approved feature crosses UI, API, service, persistence, or import seams and needs one coherent writer. |
| `family-app-frontend-worker` | The approved change is presentation-layer Vue/Nuxt work, including client API integration. |
| `family-app-backend-worker` | The approved change is a Nitro handler, service, DTO, validation, auth, authorization, or API-error change. |
| `family-app-data-import-worker` | The approved change is schema, migration, repository persistence, transaction, search, or JSON import behavior. |
| `family-app-reviewer` | An independent read-only review of scope, implementation, documentation, and delivery evidence is needed. |
| `family-app-security-reviewer` | A read-only review of tenant authorization, secrets, medical-data privacy, files, abuse controls, or cleanup is needed. |

Intended launch budgets are planner 8 turns + 2 grace, workers 16 + 2, and reviewers 6 + 1. The pi-subagents runtime does not enforce these budgets; they are parent launch guidance only, and task scope/timeouts are the actual boundary. The parent should plan first when boundaries are unclear, then select the narrowest specialist. Use the cross-layer worker instead of parallel specialist writers when the feature requires coordinated edits; use specialists sequentially when seams can be independently owned. Reviewers run after implementation, with the security reviewer additionally required for security, schema, import, file, or retention-sensitive changes.

## Writer and handoff rules

The parent owns delegation, product and contract decisions, final acceptance, and review fanout. Only one writer may edit the worktree at a time; do not run writer agents concurrently or overlap their file ownership. Planner and reviewers are read-only and receive no edit/write tools. Agents must not spawn other agents. Every worker must inspect existing source/tests first, make the smallest approved change, and leave unrelated files untouched.

Each handoff names changed files, tests and exact commands with pass/fail/not-run results, relevant rule IDs, skipped checks and reasons, residual risks, and unresolved decisions. Specialists also identify their boundary artifacts (UI journey and states; API routes/auth/DTOs; schema/ports/import/provenance). Reviewers report blockers before non-blocking findings with file/line evidence and do not repair findings.

## Escalation order

1. Stop at the affected worker when a product, specification, JSON contract, architecture, security exception, dependency/provider, destructive, retention, limit, or remote-change decision is required.
2. Notify the parent with the precise canonical owner and evidence; do not invent defaults or weaken controls.
3. The parent resolves or records the decision with the owning specification/guideline authority, then reassigns work.
4. Security findings take precedence over convenience; commits, staging, pushes, and remotes remain parent-authorized only.

All agents must report skipped infrastructure checks rather than treating them as passing. See [testing and quality](TESTING-QUALITY.md), [delivery](GIT-DELIVERY.md), and [documentation decisions](DOCUMENTATION-DECISIONS.md).
