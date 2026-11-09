<p>
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="assets/banner-light.png">
    <img src="assets/banner-dark.png" alt="opencode-links: every PR, Linear issue and local page your chat produced">
  </picture>
</p>

<p>
  <a href="https://www.npmjs.com/package/opencode-links"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/npm/opencode-links.svg?variant=outline&font=geist-mono&mode=dark"><source media="(prefers-color-scheme: light)" srcset="https://shieldcn.dev/npm/opencode-links.svg?variant=outline&font=geist-mono&mode=light"><img src="https://shieldcn.dev/npm/opencode-links.svg?variant=secondary&font=geist-mono&mode=dark" alt="npm"></picture></a>
  <a href="https://github.com/carson2222/opencode-links/actions/workflows/ci.yml"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/github/ci/carson2222/opencode-links.svg?variant=outline&font=geist-mono&mode=dark"><source media="(prefers-color-scheme: light)" srcset="https://shieldcn.dev/github/ci/carson2222/opencode-links.svg?variant=outline&font=geist-mono&mode=light"><img src="https://shieldcn.dev/github/ci/carson2222/opencode-links.svg?variant=secondary&font=geist-mono&mode=dark" alt="CI"></picture></a>
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/OpenCode-2.0.24%2B.svg?variant=outline&font=geist-mono&logo=lu:Terminal&mode=dark"><source media="(prefers-color-scheme: light)" srcset="https://shieldcn.dev/badge/OpenCode-2.0.24%2B.svg?variant=outline&font=geist-mono&logo=lu:Terminal&mode=light"><img src="https://shieldcn.dev/badge/OpenCode-2.0.24%2B.svg?variant=secondary&font=geist-mono&logo=lu:Terminal&mode=dark" alt="OpenCode 2.0.24+"></picture>
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/license-MIT.svg?variant=outline&font=geist-mono&logo=lu:Scale&mode=dark"><source media="(prefers-color-scheme: light)" srcset="https://shieldcn.dev/badge/license-MIT.svg?variant=outline&font=geist-mono&logo=lu:Scale&mode=light"><img src="https://shieldcn.dev/badge/license-MIT.svg?variant=secondary&font=geist-mono&logo=lu:Scale&mode=dark" alt="MIT license"></picture>
</p>

![The sidebar of an OpenCode chat listing its Linear issues, pull requests and local pages](assets/sidebar.png)

Shown in the terminal sidebar and in OpenCode Desktop. Each chat shows only its own links and its subagents'. Status is the color of the number: open, draft, merged or closed for PRs, and the workflow color for Linear issues. A local page whose server is down is dimmed.

## Install

Add the plugin to `~/.config/opencode/opencode.json`. This turns it on in Desktop and in the terminal:

```json
{
  "plugins": ["opencode-links"]
}
```

The terminal reads plugin options only from `~/.config/opencode/cli.json`. To set options, put the same entry in both files:

```json
{
  "plugins": [
    {
      "package": "opencode-links",
      "options": { "linear": { "workspace": "acme", "teams": ["ENG"] } }
    }
  ]
}
```

You need OpenCode 2.0.24 or newer (Desktop: 2.2.0 or newer) and a signed-in [GitHub CLI](https://cli.github.com). For Linear, also install the [Linear CLI](https://github.com/schpet/linear-cli) and sign in. OpenCode checks for plugin updates once a day.

## Options

| Option    | Default    | Values                                                                                      |
| --------- | ---------- | ------------------------------------------------------------------------------------------- |
| `linear`  | `false`    | `true` tracks Linear issue URLs. `{ "workspace", "teams" }` also matches bare IDs like `ENG-123`. |
| `prs`     | `true`     | Show pull requests.                                                                         |
| `pages`   | `true`     | Show local pages.                                                                           |
| `colors`  | `"github"` | `"theme"` uses your OpenCode theme colors instead of GitHub's and Linear's.                 |
| `refresh` | adaptive   | Longest refresh interval in seconds for open PRs and active issues. Minimum 15.             |

## What counts

Detection is strict. It would rather miss a link than show one the chat didn't produce.

- **Pull requests** the chat created with `gh pr create`, acted on (`merge`, `close`, `ready`, `reopen`, `edit`, `comment`, `review`, `checkout`) or watched with `gh pr checks` or `gh pr view --json`, plus PR links you paste.
- **Linear issues** you ask the chat to work on, and issues it created, updated or started. Mentions, searches and comments don't count. **Link issue to this chat** in the command palette adds one by hand.
- **Local pages**: `localhost`, `127.x`, `[::1]` and `*.localhost` URLs the agent wrote in a reply, and dev servers it started.

Hover a row and click `×` to hide it in this chat. **Restore hidden links** in the command palette brings them back. Desktop shows links as chips in the chat's title row; `+N` opens the full list.

## How it behaves

- Read-only. It reads through your `gh` and `linear` logins, stores no tokens and never writes to GitHub or Linear.
- Only the chat on screen starts requests, and only while its window is focused. Merged PRs keep their status without re-checks.
- A local page is checked with a `HEAD` request to its own origin.

Remote servers, Windows and Node-based terminals are untested. Desktop support uses OpenCode's experimental GUI plugin API.

## Development

```sh
bun install
bun test
bunx tsc --noEmit
bun run build
bun run smoke          # macOS: the real TUI in a sandbox with fake links
bun run smoke:refresh
```

To try a change, run `bun run build` and point a `plugins` entry at your checkout's absolute path. Releases publish to npm when a version bump lands on `main`.

## License

MIT
