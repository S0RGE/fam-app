# Frontend

## Rules

- **UI-001 — Data boundary.** Components and composables MUST consume application DTOs and `/api/v1`; they MUST NOT import Supabase/database types or secrets. Client validation improves feedback but never replaces server validation. **Verify:** type/import checks and API tests. **Exception:** none for protected data.
- **UI-002 — Russian UX.** User-facing labels, validation messages, and errors MUST be Russian. Machine-readable server error codes and field paths MUST drive mapping; raw server/internal errors MUST NOT be shown. **Verify:** component and contract tests. **Exception:** approved accessibility or technical terminology.
- **UI-003 — States.** Every asynchronous view MUST define loading, empty, success, recoverable-error, and terminal-error states. **Verify:** focused UI tests. **Exception:** none; document genuinely inapplicable states.
- **UI-004 — Responsive access.** Core flows MUST work at 320px without page-level horizontal scrolling; navigation and the main add action remain reachable. **Verify:** browser viewport checks. **Exception:** none for core flows.
- **UI-005 — Accessibility.** Controls MUST support keyboard, pointer, and touch; focus MUST remain visible; state MUST not use color alone; zoom/text resizing MUST preserve required actions and data. **Verify:** accessibility checks and keyboard journey. **Exception:** approved browser/platform limitation with alternative interaction.
- **UI-006 — Time and sensitivity.** Date-only values MUST NOT shift by timezone; formatting happens at the presentation boundary. Sensitive values MUST NOT enter browser logs or unnecessary persistent caches. **Verify:** timezone tests and storage/log review. **Exception:** explicit security approval.
- **UI-007 — Import/files.** Preview MUST distinguish local selection, staged upload, validation error, corrected draft, and confirmed record. Physical local paths MUST never be sent. **Verify:** import journey tests. **Exception:** import contract amendment.
- **UI-008 — Destructive changes.** Destructive actions require confirmation; meaningful unsaved changes require a guard. Pagination versus infinite scrolling and other optional workflows MUST NOT be invented here. **Verify:** interaction tests. **Exception:** approved product decision.

## Checklist

Test the affected DTO/error mapping, all async states, 320px and zoom, keyboard focus, touch targets, and sensitive-data handling with synthetic data.

**References:** [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Nuxt data fetching](https://nuxt.com/docs/getting-started/data-fetching).
