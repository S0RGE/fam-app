# Git and delivery

## Rules

- **GIT-001 — Scope.** A change MUST remain limited to its approved product and documentation scope. Do not initialize packages, install dependencies, change remote state, or add providers/frameworks without approval. **Verify:** diff/status review. **Exception:** explicit task approval.
- **GIT-002 — Reviewability.** Changes SHOULD be small, coherent, and independently reviewable. Generated files, secrets, local medical data, and unrelated formatting MUST NOT be committed. **Verify:** staged diff and secret scan. **Exception:** generated artifacts required by existing tooling.
- **GIT-003 — Checks.** Before delivery, run available relevant checks from [testing](TESTING-QUALITY.md), inspect Markdown links/paths, and report commands and skipped checks. **Verify:** delivery report. **Exception:** infrastructure outage, recorded.
- **GIT-004 — History.** Commits (when authorized) MUST describe intent and MUST NOT claim checks that were not run. Pushes, merges, releases, and remote changes require explicit authorization. **Verify:** review metadata. **Exception:** none.
- **GIT-005 — Sensitive changes.** Security, schema, import-contract, and retention changes require targeted review by the owning authority before delivery. **Verify:** review record. **Exception:** emergency procedure with follow-up decision record.

## Delivery checklist

Inspect `git diff` and `git status`; confirm no secrets/medical fixtures; run available checks; confirm documentation and migration impact; list residual risks and unresolved decisions. This file does not prescribe package commands before repository tooling exists.
