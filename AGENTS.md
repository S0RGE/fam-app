# Family App agent rules

Family App processes private family medical data. These rules make implementation policy enforceable without changing product scope.

## Authority and precedence

1. Explicit task instructions and approved decisions.
2. [`docs/PROJECT_SPECIFICATION.md`](docs/PROJECT_SPECIFICATION.md) for product behavior.
3. [`docs/JSON_IMPORT_FORMAT.md`](docs/JSON_IMPORT_FORMAT.md) for the import wire contract within its scope.
4. The topical rule file below for implementation policy; security/privacy constraints override convenience.
5. Existing code and tests describe current behavior but cannot silently override canonical requirements; surface discrepancies.
6. README, plans, comments, and skills are explanatory only.

`AGENTS.md` routes work; it does not duplicate topical rules. Future nested agent files may narrow workflow, never authority. A future skill MUST cite rule IDs and link to the canonical text, not copy or weaken it.

## Required reading

| Work | Read |
|---|---|
| Any implementation | [Architecture](docs/project-guidelines/ARCHITECTURE.md), [Security](docs/project-guidelines/SECURITY-PRIVACY-FILES.md) |
| UI/client | [Frontend](docs/project-guidelines/FRONTEND.md) |
| API/server | [Backend/API](docs/project-guidelines/BACKEND-API.md) |
| Schema, repository, migration, import, files, search | [Data](docs/project-guidelines/DATA-DATABASE.md), [Verification](docs/project-guidelines/TESTING-QUALITY.md) |
| Delivery or history | [Git/delivery](docs/project-guidelines/GIT-DELIVERY.md) |
| Documentation or decisions | [Documentation](docs/project-guidelines/DOCUMENTATION-DECISIONS.md) |
| JSON import | Also read [`JSON_IMPORT_FORMAT.md`](docs/JSON_IMPORT_FORMAT.md) |

## Agent protocol

- Inspect relevant source and tests before changing behavior.
- Stay within the product specification, API/data ports, and the requested task; do not invent concepts, limits, defaults, providers, or workflows.
- Stop and surface unresolved product or contract choices. Security exceptions require explicit approval; policy changes update the owning guideline and its checks together.
- Report only validations actually run, including skipped checks and why.

## Canonical index

- [Architecture and boundaries](docs/project-guidelines/ARCHITECTURE.md) — layers, ports, tenant ownership, transactions.
- [Frontend](docs/project-guidelines/FRONTEND.md) — Russian UI, responsive and accessible client behavior.
- [Backend/API](docs/project-guidelines/BACKEND-API.md) — handlers, DTOs, errors, and server trust boundaries.
- [Data/database](docs/project-guidelines/DATA-DATABASE.md) — schema, migrations, persistence, imports, dates.
- [Security, privacy, and files](docs/project-guidelines/SECURITY-PRIVACY-FILES.md) — authorization, secrets, logs, private storage.
- [Testing and quality](docs/project-guidelines/TESTING-QUALITY.md) — validation matrix and evidence.
- [Git and delivery](docs/project-guidelines/GIT-DELIVERY.md) — reviewable changes and release safety.
- [Documentation and decisions](docs/project-guidelines/DOCUMENTATION-DECISIONS.md) — canonical docs and ADRs.
- [Agent routing](docs/project-guidelines/AGENT-ROUTING.md) — project-specific Pi roster and delegation boundaries.
