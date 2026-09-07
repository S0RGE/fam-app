# Documentation and decision records

## Rules

- **DOC-001 — Canonical ownership.** Product behavior belongs in `docs/PROJECT_SPECIFICATION.md`; JSON syntax belongs in `docs/JSON_IMPORT_FORMAT.md`; implementation policy belongs in one topical guideline. A rule MUST have one canonical owner. **Verify:** link and duplication review. **Exception:** none.
- **DOC-002 — Normative language.** Enforceable guidance MUST use stable IDs and clear MUST/MUST NOT/SHOULD/MAY language, with verification and exception authority. **Verify:** Markdown review. **Exception:** explanatory prose only.
- **DOC-003 — References.** Guidelines SHOULD link to canonical documents rather than copy requirements. Future skills MUST cite IDs and links and MUST NOT become competing sources of truth. **Verify:** skill/documentation review. **Exception:** short routing summaries in `AGENTS.md`.
- **DOC-004 — Decision records.** An unresolved product or contract choice MUST be recorded as open against the owning specification; an implementation-policy change MUST update its guideline and affected verification expectations together. Do not invent answers. **Verify:** review record. **Exception:** explicit approved decision.
- **DOC-005 — Examples and privacy.** Examples MUST be synthetic and MUST NOT contain real medical data, secrets, local paths, or persistent signed links. **Verify:** content review. **Exception:** none.
- **DOC-006 — Link integrity.** Relative links MUST resolve from the file containing them; headings and rule IDs SHOULD be unique and terminology consistent. **Verify:** link/heading checks. **Exception:** documented external-link outage.

## Open decisions from the current specification

The guidelines intentionally do not decide: account-to-family cardinality; import `source` and attachment-envelope placement; image-valued measurements; deletion/retention/audit behavior; file-size, link-lifetime, text/array, and pagination limits. Resolve these in the relevant product contract before implementation.

## Decision record template

```markdown
# Decision: <short title>
Status: proposed | accepted | rejected | superseded
Owners: <responsible authority>
Context: <product or policy constraint>
Decision: <one explicit answer, or list as open>
Consequences: <affected rules, tests, and docs>
```
