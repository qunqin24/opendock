# opencode-gh-search

<details>
<summary><b>Instructions for agents</b></summary>

To install this plugin for the user:

1. Requires `gh` logged in (`gh auth status`). Leave `gh auth login` to the user, since it's interactive.
2. Install with `opencode plugin add opencode-gh-search` (or `@<version>` to pin). Don't hand-edit the config unless the CLI is unavailable. In that case, add `"opencode-gh-search"` to `plugins` in the global `~/.config/opencode/opencode.json` and keep the other entries.
3. Config changes load automatically, so no restart is needed. Verify with `opencode plugin list`.

Then tell the user to try `/pr` and `/issue`. Usage and options are described below.

</details>

An [OpenCode](https://opencode.ai) plugin for Desktop and the TUI that adds live search for GitHub pull requests (`/pr`) and issues (`/issue`). Pick one and it is attached to your prompt as context.

In the TUI, the picked item's URL is typed into the prompt: TUI plugins can't add attachment chips yet. If the prompt can't be reached, it is copied to the clipboard instead.

- **Partial matching** on titles and numbers (`depen`, `#74`). GitHub's own search only matches whole words.
- **GitHub-style filters:** `author:`, `is:`, `label:`, `assignee:`, and for PRs `base:`, `head:`, `review:` and `review-requested:`. `@me` means you (`review-requested:@me`). Partial values count (`author:tom`, `is:merg`), and `-` excludes, e.g. `/pr @api is:open -author:dependabot login`. The search box shows them by example.
- **Multiple repos.** Run it from a folder that holds repos (up to three levels deep) and it searches all of them, or narrow with `@` and a short repo name: `/pr @api login` searches `acme-api` only.
- **Sorted** open → draft → merged → closed, newest first, with GitHub's state labels.
- **Stacks.** Open PRs based on another open PR's branch show their position, e.g. `2/3`.
- **Fast.** Each repo's PRs and issues are kept in a local index (`~/.cache/opencode-gh-search/`) that updates incrementally in the background, so searching takes milliseconds.

## Requirements

- OpenCode Desktop or CLI 2.2 or later (the GUI plugin API is experimental and may change)
- [`gh`](https://cli.github.com) logged in (`gh auth login`); the plugin uses its token

## Install

```sh
opencode plugin add opencode-gh-search
```

This adds it to your global `~/.config/opencode/opencode.json`, which Desktop needs to load plugin UIs. Unpinned, OpenCode keeps it up to date. To stay on a stable version, pin it; exact versions are never auto-updated:

```sh
opencode plugin add opencode-gh-search@0.1.0
```

Check for and apply updates with `opencode plugin check` and `opencode plugin update opencode-gh-search`. Remove it with `opencode plugin remove opencode-gh-search`.

### Let your agent install it

Paste this into OpenCode:

```text
Install the OpenCode plugin opencode-gh-search (https://github.com/TomUijtdehaag/opencode-gh-search):
1. Check `gh auth status`. If not logged in, ask me to run `gh auth login`; don't run it yourself.
2. Run `opencode plugin add opencode-gh-search`. It must go in the global config so Desktop loads its UI.
3. Confirm with `opencode plugin list`, then tell me to try `/pr` and `/issue`.
```

Agents: expand **Instructions for agents** at the top of this README.

### From source

Needs Node.js and npm.

```sh
git clone https://github.com/TomUijtdehaag/opencode-gh-search.git
cd opencode-gh-search
npm install
npm run build
```

Add the folder to your global `~/.config/opencode/opencode.json`:

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-gh-search"]
}
```

## Settings

Pass options through the plugin entry:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-gh-search",
      "options": {
        // Leave bot reviews (e.g. Copilot) out of the review status. Default true.
        "ignoreBotReviews": true,
        // More reviewer logins to leave out. Default none.
        "ignoreReviewers": ["some-ci-account"]
      }
    }
  ]
}
```

## Usage

`/issue` works the same as `/pr`.

| Where | Command | Searches |
| --- | --- | --- |
| inside a repo | `/pr login` | that repo |
| folder with repos | `/pr login` | every repo in the folder |
| folder with repos | `/pr @api login` | repos matching `api` (exact, then `*-api`, then containing) |
| anywhere | `/pr #42` | numbers containing 42 |
| anywhere | `/issue is:open label:bug` | open issues labelled `bug` |

Arrow keys to select, Enter to attach, scroll for more. The attachment gives the model the URL; it can fetch details with `gh`.

## Development

| File | Runs in | Does |
| --- | --- | --- |
| `src/rpc.ts` | everywhere | the contract: types, kinds, filters, matching, row text |
| `src/index.ts` | OpenCode server | repo discovery, GitHub sync, local index, search |
| `src/search.ts` | both UIs | the dialog's search state: debounce, paging, re-polling while indexing |
| `src/gui.tsx` | Desktop window | dialog and chip |
| `src/tui.tsx` | terminal UI | dialog and prompt insert |

[SPEC.md](SPEC.md) describes the behaviour both UIs must share. Run `npm run dev` to rebuild the GUI on change; Desktop reloads it automatically. The server reloads `src/index.ts` on change but not the files it imports: after changing `src/rpc.ts`, run `opencode service restart`.

### Release

Versions follow [semver](https://semver.org) and are immutable once published. To release:

```sh
npm version patch   # or minor / major: bumps package.json, commits, and tags v<version>
git push --follow-tags
```

The tag triggers `.github/workflows/publish.yml`, which typechecks, builds, publishes to npm with provenance through [trusted publishing](https://docs.npmjs.com/trusted-publishers) (no npm token), and creates the GitHub release.

## License

MIT. Includes GitHub [Octicons](https://github.com/primer/octicons) (MIT).
