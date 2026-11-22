# OpenDock Admin

Admin SPA for OpenDock (Vite + React + TanStack Router/Query + shadcn/ui).
Ported from [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) (MIT, see `LICENSE`).

- Served under `/admin/` by `apps/web`; talks to `/api/*` on the same origin.
- `pnpm --filter @opendock/admin dev` runs on :5173 and proxies `/api` to `http://localhost:3000`.
- API contract: `docs/admin-api.md`.
