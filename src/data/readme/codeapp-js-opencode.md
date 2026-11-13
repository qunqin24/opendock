# Code App OpenCode Plugin

`codeapp-js-opencode` is an **OpenCode V2 plugin** for Power Platform Code Apps. It adds a desktop side panel, slash commands, and agent tools for Code App operations, while OpenCode supplies the chat, model, sessions, and permissions. The underlying `cap` CLI and its Windows installer are available from the separate [`codeapp-js-cli`](https://www.npmjs.com/package/codeapp-js-cli) package.

## Install

Requires Node.js 22+ and OpenCode V2. Install the plugin in your project (or globally for the desktop GUI):

```powershell
npm install codeapp-js-opencode
```

Then add the package name to the `plugins` list in your project's `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["codeapp-js-opencode"]
}
```

Preserve other entries if you already have an OpenCode config.

Open OpenCode in the Code App project, then run `/cap-setup --app-name "My App" --description "My Code App"` to copy the bundled `codeapp-js` template and install `.opencode/agents/codeapp.md`, adapted from the bundled `codeapp-js` agent instructions. Existing agent and app files are left intact. Setup sets `"default_agent": "codeapp"` in the project's existing OpenCode config (preferring `.opencode/opencode.json(c)` when present), or creates `opencode.jsonc`. Comments and unrelated settings, including the model and plugins, are preserved. This sets the default for new sessions; it does not switch the agent of an existing session.

Add `--skills` to `/cap-setup` to copy the bundled `codeapp-js/AI/skills` into `.opencode/skills`; this is optional, and existing skills are left untouched. You can then ask the agent to load a matching skill or call the `skill` tool yourself. The bundled `start` skill may mention older CAP commands; use `/cap-setup` rather than `cap newApp` in OpenCode.

The installed **codeapp** agent asks for approval before running mutating `cap_*` tools. To get the same behavior with other agents, add `{ "action": "cap_mutation", "resource": "*", "effect": "ask" }` under `permissions` in `opencode.jsonc`. Explicit slash commands are user-initiated actions.

## Desktop side panel

Requires an OpenCode Desktop version supporting the experimental GUI plugin API (`@opencode/plugin` 2.2.0). Add the package to the `plugins` list in your **global** `~/.config/opencode/opencode.json(c)` so Desktop can load the GUI; keep the project entry for server operations. Preserve existing settings and plugin entries.

**Before sending any chat message:** click **Open controls** in the **Code App** bar at the bottom of the Home/new-session screen. This opens a separate workspace drawer, not a session side panel. Click **Choose folder…** to open the native folder picker; selecting a folder activates it immediately. Use **Change folder…** to pick another. Manual entry is available under **Enter a path manually** as a fallback. Then use **Sign in to Power Apps**, **Set up workspace**, and **Change environment**. No session or model request is created. The folder selection is explicit because the GUI SDK does not expose the new-session draft's selected folder; setup never falls back to the server's workspace.

**Within an existing chat session:** open **+** in the side panel and select **Code App**, or run **Open Code App controls** from the command palette. Controls are also available from the **Code App** Settings page. No Code App pill is added to the titlebar or tabs footer. The panel includes buttons for every command below, input forms, confirmation before mutations, and inline results/errors.

**Opt-in only:** the plugin does not auto-open controls when selecting a project or starting a session, including ordinary non-Code-App projects. The global installation makes the launcher available; it does not opt every project into Code App operations. Restored Code App tabs left by older auto-opening versions are closed in folders without `power.config.json` or `setup/power.config.json`. This only affects this plugin's tabs, not file explorer or other panels. Explicitly opening Code App controls still works in a new folder that has not been set up yet.

Click **Hide bar** to remove the bottom Code App bar and close its drawer. This preference is saved globally across app restarts, not per project (the draft project folder is not exposed by the host). Restore it using **Show Code App bar** in the command palette, or run **Open Code App controls** on Home/a draft to show and open the controls again.

- The last folder picked in the drawer and the last successfully selected environment are remembered across restarts. These are global plugin preferences, not guesses about the current draft. The session panel still targets its own session folder. The selected folder and environment remain visible, including in mutation confirmations.
- Click an action to run it directly. Operations with only optional settings (setup/deploy) run using defaults on the first click; optional fields below that section configure a subsequent run from the same action button. Operations requiring typed details show fields in their section; fill them in and press Enter (Ctrl+Enter in multiline fields) or click the original action again. There is no second submit button at the bottom of the panel.
- Import apps, environments, tables, connectors, flows, and mockups open searchable lists at the bottom of their own section. Selecting a resource starts its action, with confirmation before mutations. **Refresh list** only reloads options; it never runs the action. Search matches names and IDs. Loading spinners, failures, and results appear inside the relevant section.
- **Change environment** lives under **Power Platform** and saves the chosen environment to workspace configuration and the plugin's preference only after success. Other requests use that remembered selection, or the workspace default if none was saved. The old cloud/region and clear-override controls have been removed from the panel; normal authentication/cloud defaults are used. CLI cloud options remain available.
- **Open folder in Explorer** opens the selected folder with the desktop's default file manager. Choosing a mockup opens it directly in Review for sessions, or the default desktop app from the pre-chat drawer.
- Requests use the active session's server/location, or the explicitly chosen folder in the pre-chat workspace drawer. They never default to the CAP CLI checkout. Power Platform requests are serialized because its runtime uses process-wide state.

OpenCode reloads updated GUI bundles after `npm update codeapp-js-opencode`. Slash commands and tools also work without the desktop GUI.

## Commands

Slash commands perform operations directly. Matching namespaced agent tools (`cap_deploy`, `cap_add_dataverse`, etc.) accept structured inputs when you ask OpenCode to perform a task.

| Command | Example / purpose |
| --- | --- |
| `/cap-sign-in` | Sign in to Power Apps without requiring an existing app configuration |
| `/cap-setup` | `/cap-setup --app-name "My App" --description "Demo" --skills` — copy template, install agent, optionally install skills |
| `/cap-change-environment` | List environments; pass an environment ID or URL to select one in `power.config.json` |
| `/cap-deploy` | Push the Code App; optional `--environment <id>`, `--cloud <region>`, `--solution-id <id>` |
| `/cap-debugger` | Enable debugger bootstrap in `dist/index.js` and deploy |
| `/cap-add-dataverse` | `/cap-add-dataverse account` — add table data source |
| `/cap-add-connector` | `/cap-add-connector shared_sharepointonline` — add first matching connection |
| `/cap-add-flow` | `/cap-add-flow <workflow-id>` — add a Power Automate flow |
| `/cap-add-environment-variable` | `/cap-add-environment-variable --name "Service Settings" --publisher-prefix wd --value '{"enabled":true}'` |
| `/cap-create-table` | `/cap-create-table --display-name Project --plural-name Projects --field 'Status:choice:New|Active'` |
| `/cap-list-mockups` | List HTML mockups under `agent/` without opening a browser |
| `/cap-import` | `/cap-import "My Existing App"` — import an existing Code App by name or ID |

Use `--environment <id-or-url>` where supported, and quote values containing spaces. Import and add-flow require a specific app or flow identifier, since OpenCode's service is not a terminal picker. Power Apps authentication can open a browser on first use; make sure your OpenCode service runs in an environment where browser sign-in is possible.

**Side effects:** Deploy pushes an app; debugger changes `dist/index.js` before pushing; import copies app files into `dist/`; setup copies template files; table and environment-variable commands modify Dataverse. Unlike the CLI's existing post-generation cleanup, the plugin leaves generated `src/` and `.power/` files in place.

## Development

```powershell
npm install
npm test
npm run typecheck
npm run build
```

The plugin calls the [`codeapp-js-cli`](https://www.npmjs.com/package/codeapp-js-cli) package's exported functions in `lib/cap-core.js`, including non-interactive resource discovery.

## License

[MIT](LICENSE)
