# opencode-subagents-sidebar

Puts subagents back in the OpenCode sidebar. Lists the current session's subagent
child sessions, shows which are still running, and opens one when you click it.

OpenCode V2 dropped the sidebar list of subagent sessions: a child session is only
reachable from the composer's subagent tab or a timeline card. A session that fans
out work therefore loses the one view that showed all of it at once. This plugin
adds that view back, using the TUI slot API only, so nothing in the core changes.

## Install

```sh
opencode plugin add opencode-subagents-sidebar
```

It is a **terminal-only** plugin, so it also belongs in the `plugins` array of
`cli.json` (not `opencode.json`). If `opencode plugin add` wrote the server config,
add the entry there yourself:

```json title="cli.json"
{
  "plugins": ["opencode-subagents-sidebar"]
}
```

Then restart the terminal UI.

### From Git instead

OpenCode also installs npm-compatible Git specs, which needs no registry:

```sh
opencode plugin add github:germoran1-debug/opencode-subagents-sidebar
```

### Local checkout instead

Clone the repo and point `cli.json` at the folder — handy while editing:

```json title="cli.json"
{
  "plugins": ["C:/path/to/opencode-subagents-sidebar"]
}
```

## Use

- The sidebar shows a **Subagents** section, newest activity first, with a dot per
  row: green while the child is running, muted once it is idle.
- Click a row to open that child session.
- Click the header to collapse or expand the list. The choice is remembered.
- `/subagents`, or **Subagents: open one** in the command palette, opens a picker
  with the same list. Use it when your terminal does not deliver mouse clicks to
  slotted rows.
- A session with no children shows nothing, so ordinary sessions stay clean.

The list is capped at 10 rows; an orchestration session can spawn hundreds of
children and a sidebar listing all of them is unreadable. The count stays in the
header and a `+N more` row says what was left out.

## Requirements

OpenCode V2 (built and tested against v2.1.2) and a terminal that renders the TUI.
JSX plugins share the host's `solid-js` and `@opentui` packages, declared here as
peer dependencies.

## How it works

One file, `src/tui.tsx`. It appends a component to the `sidebar.content` slot,
reads direct children of the viewed session from `context.data.session`, and
navigates with `context.ui.router.navigate`. Collapse state is kept in
`context.storage.store`.

It is defensive on purpose: a throw inside a sidebar render can blank the whole
panel, so the session list is type-checked and every theme lookup has a fallback.

## Releasing

Publishing uses npm **trusted publishing**: the workflow authenticates with a
short-lived OIDC token, so there is no npm token in this repository and nothing to
rotate. Pushing a `v*` tag typechecks the plugin and publishes it with a provenance
attestation. There is no build step — the package is the source.

One-time setup, in this order:

1. The package must already exist before a trusted publisher can be attached, so
   publish once from a workstation where you can answer the 2FA prompt:
   `npm login` then `npm publish`. No token is created or stored.
2. Attach this workflow as a trusted publisher, from the same machine (needs npm
   ≥ 11.15 and 2FA enabled on the account):

   ```sh
   npm trust github opencode-subagents-sidebar \
     --file publish.yml \
     --repo germoran1-debug/opencode-subagents-sidebar \
     --allow-publish
   ```

   The npmjs.com equivalent is package settings → **Trusted Publisher** → GitHub
   Actions, with the same three values. The configuration expires if it does not
   complete a publish within two days, so tag a release soon after.
3. Set the package's publishing access to **Require two-factor authentication and
   disallow tokens**, so only this workflow can publish.

After that every release is just a tag.

## License

MIT
