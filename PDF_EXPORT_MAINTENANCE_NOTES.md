# Maintenance notes — Jan 14, 2026

- Centralized logging: replaced remaining direct console.\* calls in core modules with the `logger` wrapper.
- Robust exports: added `exportWithRetry` helper and exponential backoff for PDF downloads to handle transient failures.
- Accessibility & UX: added `aria-busy`/`title` attributes and inline spinners for export/apply actions; added skeleton placeholders and lazy-loading for heavy charts.
- Stress tab: added disabled/loading states for apply/export actions and improved feedback.

Notes: Manual QA recommended before broad production rollout; these maintenance changes improve resilience and perceived performance.
