# Admin API

Served by `apps/web` (Next.js route handlers). The admin SPA (`apps/admin`) is
served under `/admin` on the same origin, so the session cookie just works.
In development the admin Vite server proxies `/api` to `http://localhost:3000`.

All responses are JSON. Errors: `{ "error": "<message>" }` with a 4xx/5xx status.
`401` means not signed in (the SPA redirects to `/admin/sign-in`); `403` means
signed in but not allowed. `503` means the database is not configured.

## Auth

Session cookie `od_session` (httpOnly, SameSite=Lax, Secure in production),
14-day sliding expiry.

| Method & path | Body | Response |
|---|---|---|
| `POST /api/auth/login` | `{ username, password }` | `200 { user }` and sets the cookie; `401` on bad credentials; `429` after too many attempts |
| `POST /api/auth/logout` | — | `204`, clears the cookie |
| `GET /api/auth/me` | — | `200 { user }` or `401` |
| `POST /api/auth/password` | `{ current, next }` (next ≥ 10 chars) | `204`; `400` if `current` is wrong or `next` too short |

`user` = `{ id: string, username: string, role: 'admin', mustChangePassword: boolean, createdAt: string, lastLoginAt: string | null }`.

The first account is created automatically on first start when no user exists:
username `admin`, a random password printed once to the server log, and
`mustChangePassword: true`. The SPA should then push the user to the password
change form (Settings → Account) until they change it.

## Overview

`GET /api/admin/overview`

```jsonc
{
  "dataRefreshedAt": "2026-11-21T10:45:06.136Z",
  "totals": { "plugins": 3368, "downloadsMonth": 8032452, "stars": 1585826, "maintainers": 2395 },
  "health": { "ok": 2341, "warn": 978, "danger": 49 },
  "compat": { "v1": 1440, "v2": 999, "both": 441, "unknown": 488 },
  "categories": [{ "id": "tools", "label": "Tools & Commands", "count": 466 }],
  "topDownloads": [{ "name": "…", "slug": "…", "title": "…", "downloadsMonth": 1294059 }],
  "trending": [{ "name": "…", "slug": "…", "title": "…", "starsDelta7d": 332 }],
  "overrides": { "total": 4, "blocked": 1, "featured": 3, "recategorized": 2 },
  "installs": { "last30d": 0, "last7d": 0 }
}
```

## Plugins (manual curation)

`GET /api/admin/plugins?q=&category=&health=ok|warn|danger&overridden=1&sort=score|downloads|stars|updated&page=1&pageSize=20`

```jsonc
{
  "total": 3368,
  "page": 1,
  "pageSize": 20,
  "items": [
    {
      "name": "oh-my-opencode-slim", "slug": "oh-my-opencode-slim", "title": "Oh My Opencode Slim",
      "owner": "alvinunreal", "description": "…",
      "category": "agents", "categoryLabel": "Agent Orchestration",
      "downloadsMonth": 46911, "stars": 10300, "score": 91.2,
      "healthLevel": "ok", "opencode": "both", "pushedAt": "…",
      "featured": true, "blocked": false,
      "override": null | { "category": "agents" | null, "featured": true | null, "blocked": false | null, "note": "…", "updatedAt": "…", "updatedBy": "admin" }
    }
  ]
}
```

`featured` / `blocked` / `category` on an item are the effective values (data
plus override). Blocked plugins are included here (they are hidden only on the
public site).

`GET /api/admin/categories` → `[{ "id": "tools", "label": "Tools & Commands" }]`

`PUT /api/admin/overrides` body `{ name, category?: string | null, featured?: boolean | null, blocked?: boolean | null, note?: string }`
→ `200 { override }`. A field set to `null` means "no override, use the data".

`DELETE /api/admin/overrides?name=<package name>` → `204` (removes every override for that plugin).

Changes show on the public site within 15 seconds (each server process caches overrides briefly).

## Installs (telemetry)

`GET /api/admin/installs?days=30`

```jsonc
{
  "days": 30,
  "total": 0,
  "byDay": [{ "day": "2026-11-01", "install": 0, "update": 0, "uninstall": 0 }],
  "topPlugins": [{ "name": "…", "installs": 0, "uninstalls": 0 }],
  "byOpencodeVersion": [{ "version": "1.2.3", "count": 0 }]
}
```

Data arrives from the OpenDock OpenCode plugin (opt-in, anonymous):

`POST /api/telemetry` body `{ plugin, action: 'install' | 'update' | 'uninstall', opencodeVersion?, clientVersion? }` → `204`.
No cookies, no IP stored, rate-limited per IP in memory.
