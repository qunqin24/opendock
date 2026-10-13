# opencode-wsl-shim

Developing inside WSL2 against a Windows-side checkout means two toolchains
stare at the same files and disagree about them. The WSL binaries pay the
DrvFs translation tax on every file access, `inotify` never fires on
`/mnt/*` so dev servers silently stop reloading, and WSL `git` next to
`git.exe` churns line endings and index state in the same repo. This plugin
ends that negotiation with a single rule: the binary follows the data.
Commands whose working directory lives under `/mnt/*` run as native Windows
`.exe`; commands on the WSL-native filesystem stay on WSL binaries. The
decision is deterministic per cwd, so a repo is never touched by two
variants in the same session.

Rewriting happens in `tool.execute.before` on shell commands, before the
model's command runs. Absolute WSL paths in arguments become `C:\…` through
`wslpath -w`, so `git -C /mnt/c/Users/you/proj status` reaches the `.exe`
as `git.exe -C C:\Users\you\proj status`. Outside WSL the plugin does
nothing at all.

Three sources decide the variant, in this order. An explicit per-tool pin
always wins, so `"git": "win"` means win everywhere. Otherwise the
workspace-aware default applies the filesystem rule above. And when the
preferred variant is not installed, the fallback runs whichever binary
exists instead of failing — you never need cargo, node or python installed
twice. Each fallback direction is independently configurable, and the first
rescue per binary per session appends a one-line note to that tool's result
(`[wsl-win-tools] note: WSL 'python' not found, ran 'python.exe' instead`),
so the agent knows what actually ran. Clean policy rewrites stay silent
unless `debug` is on; every warning fires once per session.

A `.exe` running on the WSL-native filesystem pays the `\\wsl$\` 9P
penalty, the slowest combination of all, so that direction warns through
`warnOn9P` rather than failing. The reverse cost to know about is
authentication: Win `git` cannot see the WSL ssh-agent, which is what the
`wslenv` relay exists for.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-wsl-shim",
      "options": {
        "tools": { "git": "win", "cargo": "win", "python": "win", "node": "wsl" },
        "wslenv": ["SSH_AUTH_SOCK/p"]
      }
    }
  ]
}
```

All options are optional and per-tool values override `default`.

| Option | Type | Default | Description |
|---|---|---|---|
| `default` | `"wsl" \| "win"` | `"wsl"` | Used when `workspaceAware` is off and the tool is unpinned |
| `tools` | `Record<string, "wsl" \| "win">` | `{}` | Explicit per-tool pins, always win |
| `workspaceAware` | `boolean` | `true` | `/mnt/*` cwd → `win`, native cwd → `wsl` |
| `fallback` | `boolean \| { winToWsl?, wslToWin? }` | `true` | Run the other variant when the preferred binary is missing; `false` leaves the command untouched |
| `translatePaths` | `boolean` | `true` | Convert absolute WSL paths via `wslpath -w` |
| `onlyUnderMnt` | `boolean` | `false` | Rewrite only when cwd is under `/mnt/*` |
| `enabled` | `boolean` | `true` | Master switch; a project file can set `false` to disable the shim in that workspace |
| `warnOn9P` | `boolean` | `true` | Warn when a `.exe` runs on the WSL-native filesystem |
| `wslenv` | `string[]` | `[]` | Extra `WSLENV` entries relayed to Windows processes |
| `debug` | `boolean` | `false` | Log every rewrite (visible in the opencode server log) |

A project can override any of this with a `.opencode/wsl-shim.json` file,
searched upward from the command's cwd. It has the same shape and lower
priority than the plugin options, which is where target-specific choices
belong: a project that builds native ELF binaries pins `"tools":
{"cargo": "wsl"}`, and one that wants no rewriting at all sets `"enabled":
false`. The legacy fallback file `~/.config/opencode/wsl-win-tools.json`
keeps working with the lowest priority.

Managed today (102): version control (`git`, `git-lfs`, `gh`, `glab`,
`jj`); rust (`cargo`, `rustc`, `rustup`); go (`go`, `gofmt`,
`golangci-lint`); dotnet (`dotnet`, `msbuild`, `nuget`); java (`java`,
`javac`); js runtimes (`node`, `pnpm`, `bun`, `deno`); python (`python`,
`python3`, `pip`, `pip3`, `uv`, `ruff`, `poetry`, `pytest`, `mypy`,
`black`, plus env managers `rye`, `pipenv`, `pdm`, `hatch`, `conda`,
`mamba`, `micromamba`, `tox`, `nox`); `ruby`; `php`; native build (`cmake`,
`ninja`, `bazel`, `buck2`, `just`, `task`, `zig`); data runtimes
(`Rscript`, `julia`, `dart`); `pwsh`; editors (`code`, `zed`); file tools
(`jq`, `yq`, `ffmpeg`, `pandoc`, `typst`, `dot`, `magick`, `duckdb`,
`sops`, `age`); databases (`psql`, `pg_dump`, `pg_restore`, `mysql`,
`mysqldump`, `mysqladmin`, `sqlite3`, `mongosh`, `redis-cli`, `sqlcmd`);
cloud and infra (`kubectl`, `helm`, `terraform`, `tofu`, `aws`, `pulumi`,
`packer`, `vault`, `argocd`, `flux`); supply chain and linters (`trivy`,
`grype`, `syft`, `cosign`, `shellcheck`, `shfmt`, `actionlint`, `hadolint`,
`tflint`, `checkov`, `pre-commit`); firmware (`pio`, `arduino-cli`); tex
(`pdflatex`, `xelatex`, `lualatex`, `latexmk`, `bibtex`, `biber`).

Two classes stay unmanaged on purpose. Container runtimes (`docker`,
`docker-compose`, `podman`, `nerdctl`, `kind`, `minikube`, `k3d`,
`devcontainer`) are never rewritten: the Windows and Linux variants talk to
different engines and resolve bind mounts differently, so a wrong guess
breaks volumes without a sound. Call the `.exe` explicitly when that is
what you want. And tools whose Windows distribution is a batch wrapper can
never cross interop, which launches PE images only — `npm`/`npx`/`yarn`
and every npm `.bin` helper (`tsc`, `eslint`, `jest`, …), `mvn`/`gradle`,
`az`/`gcloud`, `gem`/`bundle`, `composer`, `sbt`/`kotlin`, `mix`,
`flutter`. They stay on the WSL toolchain; shim their runtime instead
(`node`, `python`, `ruby`, `java`), which routes the whole subtree anyway.

Untouched by the same logic: interactive shells and TUIs (`bash`, `vim`,
`lazygit`, `k9s`, `tmux`, …), version managers that own platform-specific
installs (`fnm`, `nvm`, `pyenv`, `sdkman`, …), system and Windows package
managers (`apt`, `brew`, `winget`, …), network and diagnostic tools where
the WSL binary is simply correct (`ssh`, `curl`, …), servers and daemons,
search and display pipes whose output feeds WSL pipelines (`rg`, `fd`,
`bat`), and cross-compilers without a canonical `.exe` (`gcc`, `make`).
When in doubt, check what your machine actually resolves:

```sh
for t in cmake ninja jq; do command -v "$t.exe"; done
```

Without npm, copy `src/index.ts` to
`~/.config/opencode/plugins/wsl-win-tools.ts` (autoloaded) and reference it
as `{ "package": "./plugins/wsl-win-tools.ts", "options": { … } }` to pass
options.

## Development

```sh
npm install
bun test
npm run typecheck
```

## License

MIT — © 2026 [Mateo Cerri](https://github.com/mateocerri)
