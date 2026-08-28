# Omeglecode

Omegle-style group chat inside the OpenCode v2 sidebar. Each OpenCode session is assigned to a stable, short-lived room with at most eight connected users.

## Try it

Install the OpenCode v2 preview. It uses the separate `opencode2` command and does not replace an existing OpenCode v1 install.

```sh
npm install --global @opencode-ai/cli@beta
npx --yes opencode-omeglecode@latest install
opencode2
```

Then start or open a session and run `/omegle-nickname`. Join a shared room with `/omegle-connect weekend-test`, and run `/omegle-toggle` to show chat. Press `ctrl+shift+m` to focus the input and Enter to send.

### Join the same room

The installer adds the plugin to OpenCode's global `cli.json`. Room settings stay in OpenCode's plugin storage rather than its config file.

```json
{
  "plugins": [
    {
      "package": "/path/to/opencode-omeglecode/dist/tui.js",
      "options": {}
    }
  ]
}
```

Everyone using the same 3–32 character code joins the same room. Treat the code like an invite link; anyone who knows it can join, up to the eight-person limit. Run `/omegle-invite` to create an invite room and get the exact command to share.

## Packages

- `packages/plugin` — OpenCode v2 TUI plugin and sidebar UI
- `packages/worker` — Cloudflare Worker, matchmaker, and chat room Durable Objects
- `packages/protocol` — shared WebSocket messages and limits

## Run locally

```sh
pnpm install
pnpm dev
```

Build and link the plugin into this project's OpenCode v2 config in another terminal:

```sh
pnpm --filter opencode-omeglecode build
pnpm plugin:link
npm exec --yes --package=@opencode-ai/cli@beta -- opencode2
```

`pnpm plugin:link` writes this project's `.opencode/cli.json` with the shared local development room. The published package uses the hosted service by default.

## Deploy

Log in to Alchemy, then deploy the Worker and both Durable Object namespaces:

```sh
pnpm exec alchemy login
pnpm infra:deploy
```

`alchemy.run.ts` owns the Worker URL and Durable Object migrations. The service receives only a user-chosen nickname, a one-way hash of the OpenCode session ID, presence, and chat messages.
