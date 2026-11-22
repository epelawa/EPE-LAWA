# UX audit sweep

Generated 2026-11-22T09:18:26.849Z

Scope: frontend/apps + frontend/packages/ui (.tsx). Checks: native popups (alert/confirm/prompt), native validation (reportValidity/checkValidity), bare <dialog> without branded chrome, unstyled <select>.

| Status | Kind | Location | Detail |
| --- | --- | --- | --- |
| INFO | unstyled-select | frontend/apps/main/app/dashboard/news-content.tsx:265 | `<select name="category" defaultValue={category}>` |
