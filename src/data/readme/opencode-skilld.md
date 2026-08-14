# opencode-skilld

An [OpenCode](https://opencode.ai) plugin that keeps skills from GitHub repositories up to date, in the background.

`gh skill install --all` takes upwards of a minute, and OpenCode loads plugins before it scans for skills — so refreshing on the critical path would put that minute on every single launch.
Skilld fires the refresh off unawaited and lets the next launch pick up whatever landed, with a pair of toasts so a first run does not just sit there looking broken.

> [!NOTE]
> Not built by the OpenCode team, and not affiliated with them in any way.
> The `opencode-` prefix names what this plugs into rather than who wrote it — [OpenCode asks third-party projects using the name to say so](https://github.com/anomalyco/opencode#building-on-opencode).

## Requirements

- [`gh`](https://cli.github.com) on `PATH`, logged in, recent enough to have `gh skill` — which is itself in preview and "subject to change without notice", so an older `gh` will not have it at all.

A missing or unauthenticated `gh` is not fatal: you get an error toast and whatever skills you already had.

Linux, macOS and Windows alike — `gh` is spawned directly rather than through a shell, so neither Git Bash nor WSL is involved. One variable name differs on Windows; see [Windows](#windows).

## Install

Name it in `opencode.jsonc`, together with the repositories you want. opencode resolves plugins from npm, so there is nothing to install by hand:

```jsonc
{
	"plugin": [
		["opencode-skilld", { "sources": ["anthropics/skills"] }]
	],
	"skills": {
		"paths": ["{env:HOME}/.local/share/opencode/skills/anthropics-skills"]
	}
}
```

The `skills.paths` entry is what actually makes OpenCode load them — the plugin only downloads. Unlike a `{file:}` reference, a path that does not exist yet is silently skipped rather than fatal, which is exactly what a machine that has never refreshed needs.

One entry per source, matching where that source installs: the `<slug>` default for a bare `"owner/repo"` string, or whatever `target` you gave it.

With no `sources`, the plugin does nothing at all.

On Windows, `{env:HOME}` is not the variable to reach for — see [Windows](#windows). The path itself is right on every platform.

> [!WARNING]
> Running from a local checkout instead of npm? Keep the file **out of `~/.config/opencode/plugin/`**.
> Everything in that directory is auto-loaded before the config is read and handed no options, and an explicit `plugin` entry pointing at it is deduped away — so `sources` never arrives and the plugin silently does nothing.
> Park it anywhere else (say, `~/.config/opencode/lib/`) and reference that path.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `sources` | `[]` | Repositories to refresh from. A plain `"owner/repo"` string, or an object (below). |
| `interval` | `86400000` (24 h) | How long a refresh stays fresh, in milliseconds. |

A source given as an object can override what the string form derives:

| Field | Default | Meaning |
| --- | --- | --- |
| `repo` | — | The GitHub `"owner/repo"` to install from. Required. |
| `target` | `~/.local/share/opencode/skills/<slug>` | Where to install. `<slug>` is `repo` with `/` turned into `-`. |
| `stamp` | `~/.local/state/opencode/<slug>-refreshed` | Where the last successful refresh is recorded. |
| `label` | `repo` | The name used in toasts. |
| `placeholder` | `"template"` | A placeholder skill directory to drop from each download, or `false` to keep whatever upstream ships. |

The `skills.paths` entry is what a per-source directory costs.
OpenCode discovers skills exactly one level deep — `<dir>/<name>/SKILL.md` — so a subdirectory under `~/.config/opencode/skills` is not found on its own and the entry is how you point OpenCode at it.
What it buys is a directory the refresh can own outright: a finished download *replaces* the whole directory rather than merging into it, which is what keeps OpenCode from ever scanning a half-written skill set (see [Behaviour](#behaviour)).
Landing outside the config directory also keeps a refresh out of `git status` for anyone who versions it.

That wholesale replacement is why `target` must not share a directory with anything else.
Pointing it at `~/.config/opencode/skills` itself looks tempting — OpenCode already looks there, so the `skills.paths` entry could go — but the next refresh would stand one repository's download in for the *entire* directory: another source's skills, the ones you wrote by hand, all gone with it.
Give every source a directory of its own, and keep handwritten skills somewhere no source targets.

A `~` on its own, or a leading `~/`, is expanded in `target` and `stamp`.
Nothing else is — not `$VAR`, not `~user`, and not a backslashed `~\` — because these go straight to `mkdirSync` and never near a shell. `skills.paths` is opencode's own business rather than the plugin's, which is why it takes `{env:...}` instead; all that matters is that the two spellings land on the same directory.

Options are read from a handwritten file, so none of the types above are enforced at runtime.
Anything that does not match is ignored with an error toast rather than taken literally — an option with an unknown name, a `sources` that is not an array, an entry that names no `repo` or gives `target`, `stamp` or `label` the wrong type or an empty string, an `interval` that is not a number.

```jsonc
{
	"plugin": [
		[
			"opencode-skilld",
			{
				"interval": 604800000,
				"sources": [
					"anthropics/skills",
					{
						"repo": "someone/their-skills",
						"target": "~/skills/theirs",
						"label": "their skills",
						"placeholder": false
					}
				]
			}
		]
	],
	"skills": {
		"paths": [
			"{env:HOME}/.local/share/opencode/skills/anthropics-skills",
			"{env:HOME}/skills/theirs"
		]
	}
}
```

Two sources, so two `skills.paths` entries: the derived `<slug>` one for the bare string, and the overridden `target` for the other.

### About `placeholder`

Repositories started from GitHub's skill template tend to ship a `template/` skill described as *"Replace with description of the skill and when Claude should use it."* It has a description, so OpenCode will not filter it out, and a trigger that vague fires on almost anything.
Skilld deletes it by default.
Point `placeholder` at a different directory name if a repository names its placeholder something else, or set it to `false` to keep everything.

It has to be a single directory name. A `""`, a `"."`, a `".."` or anything with a separator in it is refused and nothing is deleted — the deletion is recursive, forced, and aimed inside the finished download, so an empty string would take the whole download with it and a `..` would climb out of it entirely.

## Finding sources

Discovery ships with the same `gh skill` preview the refresh depends on:

```bash
gh skill search terraform
gh skill preview anthropics/skills pdf
```

That searches skills, though, and `sources` takes repositories. Topic search finds those directly — and does not share the Code Search API's ten-a-minute limit:

```bash
gh api "search/repositories?q=topic:agent-skills&sort=stars&per_page=20" --jq '.items[] | "★\(.stargazers_count)\t\(.full_name)"'
```

Then check the layout before adding one, because `--all` means a source is a repository you want *whole*, every launch:

```bash
gh api repos/<owner>/<repo>/contents/skills --jq '.[] | .type + " " + .name'
```

A flat list of directories, and not too many. A repository that files skills by category — `skills/engineering/<name>/SKILL.md` — sits a level deeper than OpenCode looks, so the refresh succeeds and nothing loads. Several hundred skills is not wrong either, but `--all` puts every one of those descriptions in front of the model at every launch.

And `placeholder` defaults to `"template"` because that is what GitHub's skill template ships; anything not descended from it wants `placeholder: false`.

## Windows

One variable name, and nothing else. Checked on Windows 11 with `gh` 2.97.

Leave `target` and `stamp` alone: OpenCode keeps its XDG-shaped paths on Windows rather than moving to `%APPDATA%`, so the defaults are already right.
`opencode debug paths` there reports `config` at `C:\Users\you\.config\opencode`, `data` at `C:\Users\you\.local\share\opencode` and `state` at `C:\Users\you\.local\state\opencode` — which is exactly where the defaults above land.
Relocating them into `AppData` would pick the one spelling OpenCode does not use.

No Git Bash and no WSL either.
`gh` installs as a genuine executable — `C:\Program Files\GitHub CLI\gh.exe` — and the plugin hands it an argument array rather than a shell command line, so the notorious Windows spawn `ENOENT` never comes up; that one only bites `.cmd` and `.bat` shims like `npm.cmd`.

What does break is `{env:HOME}`.
Windows leaves `HOME` unset and uses `USERPROFILE`, an unset variable substitutes to an empty string with no warning, and a `skills.paths` entry that does not exist is *silently skipped* rather than fatal — so `{env:HOME}/...` collapses to `C:\...` and you get a refresh that succeeds, announces itself, and loads nothing whatsoever.
Renaming the variable is the entire fix:

```jsonc
	"skills": {
		"paths": ["{env:USERPROFILE}/.local/share/opencode/skills/anthropics-skills"]
	}
```

`~` in `target` resolves through `os.homedir()`, which reads `USERPROFILE` too, so both spellings land on the same directory — the only thing that has to be true.

If you do override them, keep the forward slash after the tilde. `~\.local\share\...` is not expanded and would leave a directory literally named `~` wherever OpenCode was started.
Past the tilde it makes no difference: Windows takes `/` throughout, and the mixed `C:\Users\you/.local/share/...` that falls out is fine for every call this plugin makes.

## Behaviour

- Refreshes at most once per `interval` per source, tracked by a stamp file that is written **after** a refresh succeeds — so an interrupted one simply retries next launch.
- Downloads into a hidden staging directory beside `target` and stands it in for the live one only once `gh` has succeeded, so OpenCode never scans a half-written skill set. Beside it rather than under `TMPDIR` because a rename across filesystems fails, and hidden so a scan cannot mistake it for a skill. Nothing appears at `target` until a refresh has actually succeeded, so an interrupted first one leaves no empty directory to puzzle over. Not a single atomic step — nothing Node exposes can exchange two directories — but the live directory is absent for two renames rather than for the length of a download, and a swap that fails puts the previous skills back rather than leaving a gap.
- Never awaited, and the child process is unreferenced, so quitting OpenCode never waits on a download.
- Nothing throws. A missing `gh`, an expired login, a plane — all of them degrade to an error toast.
- Toasts are best-effort: under `opencode run` there is no TUI listening, and that is not an error.
- Every toast is held back a few seconds, because plugins load before the TUI starts listening and a toast fired into that gap is simply lost — which is exactly when a missing `gh` fails. A refresh that finishes inside that window cancels the "in the background" message rather than following it.

Because the refresh outlives the launch that started it, a download still running when you quit goes on to finish — but standing it in was the dead launch's job, so that never happens.
The skills you already had are left exactly as they were, the staging directory is swept on the next launch, and the cost is one redundant download.

## Development

```bash
bun install
bun test
bun run typecheck
```

There is no build step — OpenCode loads the TypeScript directly.
