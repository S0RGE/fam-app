# Project guidelines

These files are the implementation-policy layer for Family App. Product behavior remains in the [project specification](../PROJECT_SPECIFICATION.md), and import syntax remains in the [JSON import contract](../JSON_IMPORT_FORMAT.md).

| Guideline | Use for |
|---|---|
| [Architecture](ARCHITECTURE.md) | layers, ports, boundaries, tenant ownership |
| [Frontend](FRONTEND.md) | Vue/Nuxt client behavior and accessibility |
| [Backend/API](BACKEND-API.md) | Nitro handlers, DTOs, server validation |
| [Data/database](DATA-DATABASE.md) | PostgreSQL, migrations, transactions, import persistence |
| [Security/privacy/files](SECURITY-PRIVACY-FILES.md) | auth, authorization, medical data, storage |
| [Testing/quality](TESTING-QUALITY.md) | checks, test matrix, definition of done |
| [Git/delivery](GIT-DELIVERY.md) | commits, review, release and change safety |
| [Documentation/decisions](DOCUMENTATION-DECISIONS.md) | source of truth and unresolved choices |

Rules use **MUST**, **MUST NOT**, **SHOULD**, and **MAY** normatively. Rule IDs are stable references for future skills. Exceptions require the authority named in the owning file.

For delegation boundaries and the project-specific Pi roster, see [Agent routing](AGENT-ROUTING.md).
