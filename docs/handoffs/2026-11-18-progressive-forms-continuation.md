# Progressive forms continuation

The owner requested step/progress-based forms throughout the platform. This change is **partial**, not a platform-wide conversion:

- New newsroom article creation has three steps, percentage progress, per-step browser validation, back navigation and retained in-page values. Existing guarded create/publish actions and cover rights fields remain unchanged.
- Business submission has two steps with percentage progress and the existing server-side member authorization and validation.
- Existing sign-up/auth steps were already progressive. Other member, public and Admin forms, including article editing, have not been converted or comprehensively audited.
- These changes do not implement private autosave or refresh recovery, image upload, or server-confirmed recovery feedback. A refresh or a server redirect after an error may still lose unsaved values. Do not describe this work as completing the full newsroom authoring backlog.
- Component tests use mocked server actions and jsdom; actual browser/mobile interactions, authenticated writes, error recovery and production deployment remain unverified. No production content or submissions were created.

Continue by inventorying complex forms, grouping logical steps while preserving server-side checks, testing keyboard/validation and error recovery, and designing private recovery with appropriate access and retention controls. Keep short, single-purpose forms usable rather than adding artificial steps.
