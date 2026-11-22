# Admin UI

The OpenDock admin (`/admin`), rendered by `apps/web/app/admin`. Components,
layout and the shadcn/ui primitives in `ui/` are ported from
[satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin), MIT licensed:
see `LICENSE` in this folder. Admin-only styles live in `app/admin/admin.css`
and never load on the public site. API contract: `docs/admin-api.md`.
