# opencode-glm-plugin

[简体中文](https://github.com/huanlis/opencode-glm-plugin/blob/main/README.md) | **English**

[![npm](https://img.shields.io/npm/v/opencode-glm-plugin)](https://www.npmjs.com/package/opencode-glm-plugin)
[![license](https://img.shields.io/npm/l/opencode-glm-plugin)](./LICENSE)

Source and issues: <https://github.com/huanlis/opencode-glm-plugin>

A quota panel for the GLM Coding Plan (Zhipu AI), as an OpenCode Desktop plugin.

It adds a **GLM Quota** tab to the right sidebar of the desktop GUI. Tabs at the top switch between **Overview / Personal plan / Team plan**: the overview shows each plan's progress and usage trend as donut and line charts, and every plan gets its own page with limit progress bars, reset countdowns, and its own usage for today and the last 7 / 30 days (tokens, cache hit rate, breakdown by model). It also adds a sidebar + menu launcher and a titlebar usage pill (hover for each plan's percentage, click to open the panel).

![GLM quota panel: overview, personal plan, team plan](https://raw.githubusercontent.com/huanlis/opencode-glm-plugin/main/assets/panel-tabs.en.png)

## Install

```sh
opencode plugin add opencode-glm-plugin@latest
```

Or add it to the global `~/.config/opencode/opencode.json` directly:

```json
{
  "plugins": ["opencode-glm-plugin@latest"]
}
```

`@latest` makes OpenCode check for updates on startup (once every 24 hours); a bare package name stays on the installed version.

Then open the desktop app: it shows up under **Settings → Extensions → Plugins**. Open the panel from the sidebar **+ menu → GLM Quota**, or by clicking the titlebar pill.

> If you previously loaded it from a local directory (`file://…/opencode-glm-plugin`), remove that entry from `plugins` before adding the npm package, so the same plugin is not loaded twice.

The API key is read automatically from OpenCode's stored credentials (`zhipuai-coding-plan` in `~/.local/share/opencode/auth.json`); it can also come from the `GLM_API_KEY` environment variable or the plugin options.

## Options

```json
{
  "plugins": [
    {
      "package": "opencode-glm-plugin@latest",
      "options": {
        "apiKey": "optional, overrides auth.json",
        "baseUrl": "optional, defaults to https://open.bigmodel.cn; https://api.z.ai for the international edition",
        "organization": "org-xxx, required by the newer credit-based plans",
        "project": "proj_xxx, required by the newer credit-based plans",
        "planType": 1
      }
    }
  ]
}
```

`planType`: the plan-type query for the newer credit-based plans (1 personal / 2 team). If the panel says "No quota data returned", copy the `bigmodel-organization` / `bigmodel-project` headers and the `type` parameter from the `quota/limit` request in the bigmodel.cn console (DevTools) into these options.

### Multiple plans

When an account has both a personal and a team plan, the plugin finds and shows them all automatically: it queries `type=1` and `type=2` with the current configuration (personal first, then team; any other configured `planType` is queried too), ignores empty responses, and never shows the same plan twice. The team plan needs the `organization` / `project` pair above; the personal plan needs no extra configuration.

`organization` is the console's organization ID (「组织ID」) and `project` is the team project's project ID (「项目ID」). Both are on the [organization management page](https://bigmodel.cn/usercenter/proj-mgmt/org-mgmt) — switch to the team's organization at the top left first:

![Organization ID and project ID on the console's organization management page](https://raw.githubusercontent.com/huanlis/opencode-glm-plugin/main/assets/org-mgmt.png)

For full control (several teams, custom names, or only some plans), list them explicitly in a `plans` array. When it is set, nothing is discovered automatically:

```json
{
  "options": {
    "plans": [
      { "label": "Personal", "planType": 1 },
      { "label": "Team", "planType": 2, "organization": "org-xxx", "project": "proj_xxx" }
    ]
  }
}
```

Each entry takes `label` / `planType` / `organization` / `project`; fields you leave out inherit the top-level options. The list is queried exactly as written, and plans that come back empty or failed are still shown so the problem is visible.

Note: usage is fetched per plan — today / 7 days / 30 days on a plan page is that plan's own data, while the overview shows the sum of all plans (labelled "Account-wide"). The usage API does not report call counts, so the panel shows tokens and the cache hit rate instead.

The plugin reloads automatically after its options change; no need to restart the app.

## Data sources

- `GET {base}/api/monitor/usage/quota/limit` — plan window limits and reset times
- `GET {base}/api/monitor/token-usage/usage-detail?startTime=&endTime=&type=&usageType=MODEL` — per-plan usage series (personal `type=1`, team `type=3`), per-model totals and the cache hit rate

The two endpoints number the plans differently: `planType` in the options keeps the quota endpoint's meaning (1 personal / 2 team), and the plugin maps team to `type=3` when it fetches usage; the quota endpoint's `type=2` is the enterprise aggregate on the usage endpoint (main accounts only).

Authentication: `Authorization: <raw key>` (no Bearer prefix).

## Compatibility

- Built for OpenCode Desktop **2.4.x** (`@opencode/plugin` pinned to 2.4.1).
- The GUI plugin API is still marked experimental; update the plugin after a major desktop upgrade.
- Only the official GLM Coding Plan from Zhipu AI is supported; third-party relays and unofficial billing channels have no matching usage API.

## Architecture

- `src/index.ts` — the server half (declares the plugin id only)
- `src/gui.tsx` — the `./gui-experimental` entry: the window runs `setup`, the Electron main process runs `main`
- `src/gui/main.ts` — fetches and caches data in the main process (Node fetch, no CORS) and hands it to the window through the `Ipc` contract
- `src/gui/window.tsx` — registers the Panel / MenuItem / TitlebarItem, 5-minute auto refresh
- `src/gui/panel.tsx` — the quota panel UI (Solid): progress bars, countdowns, SVG charts

## Development

```sh
npm install
npm run dev      # vite build --watch, hot-reloads in the window after changes
npm run smoke    # evaluates the bundle with host stubs and runs the real data path
npm run typecheck
```

To load it from a local directory while developing, put `"file://E:/opencodeProject/opencode-glm-plugin"` in `plugins`; `npm run dev` hot-reloads after code changes.

## Publishing

```sh
npm whoami       # confirm you are logged in first
npm run check    # typecheck + build + smoke
npm publish      # prepack runs typecheck and build again
```

`files` only ships `src` and `dist`; `prepack` keeps `dist/gui-experimental.cjs` in the tarball up to date.

## License

MIT
