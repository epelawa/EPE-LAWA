# PR #27 — Radio admin read-error state

These screenshots show the staff Radio page’s explicit read-error notice. They are **local** captures of the synthetic error state, not a hosted preview and not production data.

- Desktop, 1440 × 900: [local-1440x900-radio-read-error.png](local-1440x900-radio-read-error.png)
- Mobile, 375 × 812: [local-375x812-radio-read-error.png](local-375x812-radio-read-error.png)

The tested state reports failed programme, schedule and episode reads, avoids presenting those failures as empty catalogues, and hides the editing forms. No production Supabase data or schema was changed.