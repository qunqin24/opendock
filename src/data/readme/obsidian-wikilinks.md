# obsidian-wikilinks

Resolve `[[wikilinks]]` typed in a Codex, Claude Code, or OpenCode prompt to
absolute paths in your Obsidian vault, and inject them as context so the agent
reads the right notes.

This is a **coding-agent** plugin (it teaches Codex / Claude Code / OpenCode
about `[[ ]]`), not an Obsidian-app plugin.

## How it works

The prompt is scanned for `[[...]]`, each target is fuzzy-matched against note
and folder names in your vault, and the resolved absolute paths are added to the
prompt as extra context. The agent can then read the referenced notes when they
are relevant to your request.

All hosts share one resolver, `hooks/wikilink-resolver.py`:

- Codex and Claude Code run it as a `UserPromptSubmit` hook.
- OpenCode runs it from `plugin/obsidian-wikilinks.js` on the `chat.message`
  hook, which appends the resolution as a synthetic text part.

## Install in Codex

```bash
codex plugin marketplace add DepickereSven/obsidian-wikilinks
codex plugin add obsidian-wikilinks@depickeresven-obsidian-wikilinks
```

Start a new thread, run `/hooks`, and review and trust the plugin's
`UserPromptSubmit` hook when Codex asks. Installed command hooks do not run until
they have been trusted.

## Install in Claude Code

```bash
claude plugin marketplace add DepickereSven/obsidian-wikilinks
claude plugin install obsidian-wikilinks@depickeresven-obsidian-wikilinks
```

## Install in OpenCode

### From npm (recommended)

```bash
opencode plugin obsidian-wikilinks
```

That installs the package and adds it to your config. Or add it by hand:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["obsidian-wikilinks"]
}
```

Use `~/.config/opencode/opencode.json` for every project, or `opencode.json` in
a repo for that project only.

> The package is not on npm yet. Until it is published, use one of the local
> options below, or publish it yourself from a checkout with `npm publish`.

### From a local checkout

OpenCode loads any `.js` / `.ts` file in a plugin directory, and follows
symlinks. Clone the repo once, then link the plugin:

```bash
git clone https://github.com/DepickereSven/obsidian-wikilinks.git ~/.config/opencode/obsidian-wikilinks
mkdir -p ~/.config/opencode/plugin
ln -s ~/.config/opencode/obsidian-wikilinks/plugin/obsidian-wikilinks.js ~/.config/opencode/plugin/
```

Use `.opencode/plugin/` instead of `~/.config/opencode/plugin/` to enable it for
a single project only.

Alternatively, reference the checkout from your config instead of symlinking —
`plugin` entries accept `file://` URLs and paths relative to the config file:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///Users/you/src/obsidian-wikilinks/plugin/obsidian-wikilinks.js"]
}
```

The plugin finds `hooks/wikilink-resolver.py` next to itself, in the checkout or
in `node_modules`. If you copy the `.js` file somewhere on its own, point it at
the resolver with
`OBSIDIAN_WIKILINKS_RESOLVER=/path/to/hooks/wikilink-resolver.py`.

In the common case, no configuration is needed on any host. The plugin reads
Obsidian's own vault registry and uses your active vault automatically.

## Examples

If your vault contains `Projects/Website Redesign.md`, this prompt:

```text
Summarize [[Website Redesign]] and list the next actions.
```

injects the note's absolute path so the agent can read and summarize it.

You can reference several notes, headings, and aliases in one prompt:

```text
Compare [[Research/AI Agents#Open questions]] with
[[Projects/Website Redesign|the project brief]].
```

The heading and alias are ignored during path lookup. Both note paths are added
to the prompt context. Folder wikilinks work too:

```text
Review the notes in [[Meetings]] and prepare a weekly summary.
```

When a name is ambiguous, the plugin provides up to three candidate paths. If
there is no match, it says so instead of guessing.

## Vault selection

Vault path resolution order:

1. The current host's explicit override:
   - Codex: `~/.codex/obsidian-wikilinks.json`
   - Claude Code: `~/.claude/obsidian-wikilinks.json`
   - OpenCode: `~/.config/opencode/obsidian-wikilinks.json`
     (or `$OPENCODE_CONFIG_DIR` / `$XDG_CONFIG_HOME` when set)
2. The other hosts' config files, as a compatibility fallback
3. `$OBSIDIAN_VAULT` environment variable
4. Obsidian's vault registry — auto-detected (prefers the open vault, else most
   recently opened). Cross-platform (macOS / Windows / Linux).
5. `~/Documents/Obsidian` (default fallback)

You only need an explicit override if you have **multiple vaults** and want to
pin a specific one. Create the config file for your host with:

```json
{ "vault": "/Users/you/Documents/Obsidian" }
```

The plugin itself is identical on every device. Update Claude Code with
`claude plugin update obsidian-wikilinks`. Re-run the Codex `plugin add` command
to install an updated version there. For OpenCode, re-run `opencode plugin
obsidian-wikilinks`, or `git pull` in the checkout.

## Environment variables

| Variable                        | Purpose                                                      |
|---------------------------------|--------------------------------------------------------------|
| `OBSIDIAN_VAULT`                | Vault path, used when no host config file sets one           |
| `OBSIDIAN_WIKILINKS_RESOLVER`   | Path to `wikilink-resolver.py` (OpenCode only)               |
| `OBSIDIAN_WIKILINKS_PYTHON`     | Python interpreter to use (default `python3`, OpenCode only) |
| `OBSIDIAN_WIKILINKS_TIMEOUT_MS` | Resolver timeout in ms (default `10000`, OpenCode only)      |

## Development

```bash
npm test          # smoke tests on Node
npm run test:bun  # same tests on Bun, the runtime OpenCode uses
```

No dependencies to install: the plugin uses Node/Bun built-ins and the resolver
is standard-library Python.

## Releasing

CI runs the test suite on Node 20/22/24 and on Bun for every push and pull
request, and checks that the packed tarball ships both `plugin/` and `hooks/`.

To cut a release:

```bash
npm version patch     # or minor / major
git push --follow-tags
gh release create "v$(node -p 'require("./package.json").version')" --generate-notes
```

`npm version` also rewrites the Claude Code and Codex manifests through
`scripts/sync-versions.mjs`, so all three stay on one version. Publishing the
GitHub release triggers `.github/workflows/publish.yml`, which re-runs the
tests, verifies the tag matches `package.json`, refuses to overwrite a version
already on npm, and publishes with provenance.

The workflow authenticates through **npm trusted publishing** (OIDC), so no
token is stored in the repository. One-time setup: on npmjs.com, open the
package's *Settings -> Trusted publishers*, and add this repository with
workflow `publish.yml`.

Trusted-publisher settings live on the package, so they can only be configured
once the package exists. Do the **first** publish by hand from a checkout with
`npm publish --access public`, then wire up the trusted publisher and let the
workflow handle every release after that.

To use a granular access token instead, save it as the `NPM_TOKEN` secret and
uncomment the `NODE_AUTH_TOKEN` block in the workflow.

Use the workflow's manual trigger (`workflow_dispatch`) with *dry run* enabled
to rehearse a publish without releasing anything.

## Requirements

- `python3` on PATH (standard-library only; no pip installs).
- OpenCode only: no extra dependencies — the plugin uses Node/Bun built-ins.
