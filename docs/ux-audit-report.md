# UX audit sweep

Generated 2026-11-28T04:30:43.034Z

Scope: frontend/apps + frontend/packages/ui (.tsx). Checks: native popups (alert/confirm/prompt), native validation (reportValidity/checkValidity), bare <dialog> without branded chrome, unstyled <select>, server-page submit buttons without a pending-state component.

| Status | Kind | Location | Detail |
| --- | --- | --- | --- |
| INFO | unstyled-select | frontend/apps/main/components/business/directory-controls.tsx:40 | `<select id={`${id}-area`} name="area" defaultValue={query.area}>` |
| INFO | unstyled-select | frontend/apps/main/components/business/directory-controls.tsx:77 | `<select id={`${id}-sort`} name="sort" defaultValue={query.sort} onChange={(event) => {` |
| INFO | unstyled-select | frontend/apps/main/components/support-ticket-form.tsx:51 | `<select id={`${id}-category`} name="category" required defaultValue="general">` |
