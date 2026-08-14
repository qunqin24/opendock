[![CI](https://github.com/LLukas22/opencode-sandbox-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/LLukas22/opencode-sandbox-plugin/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/opencode-sandbox-win)](https://www.npmjs.com/package/opencode-sandbox-win)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# opencode-sandbox-win

An [OpenCode](https://opencode.ai) plugin that sandboxes agent-executed commands using [`@anthropic-ai/sandbox-runtime`](https://github.com/anthropic-experimental/sandbox-runtime). Every `bash` tool invocation is wrapped with OS-level filesystem and network restrictions.

| Platform | Mechanism | Bash FS isolation | File-tool FS policy | Network isolation |
|----------|-----------|:-----------------:|:-------------------:|:-----------------:|
| **macOS** | `sandbox-exec` (Seatbelt) | Yes | Yes | Yes |
| **Linux** | `bubblewrap` (namespaces) | Yes | Yes | Yes |
| **Windows** | `srt-win` (WFP) | No | Yes | Yes |

## Install

```json
// opencode.json
{
  "plugin": ["opencode-sandbox-win"]
}
```

### Linux prerequisites

**1. Install bubblewrap:**

```bash
# Debian/Ubuntu
sudo apt install bubblewrap

# Fedora
sudo dnf install bubblewrap

# Arch
sudo pacman -S bubblewrap
```

**2. Ubuntu 24.04+ (AppArmor fix):**

```bash
sudo apt install apparmor-profiles
sudo ln -s /etc/apparmor.d/bwrap-userns-restrict /etc/apparmor.d/force-complain/bwrap-userns-restrict
sudo apparmor_parser -r /etc/apparmor.d/bwrap-userns-restrict
```

Verify with: `bwrap --ro-bind / / --dev /dev --proc /proc -- echo "sandbox works"`

### Windows prerequisites

**1. Install srt-win:**

```bash
cargo install --git https://github.com/LLukas22/sandbox-runtime.git --branch elevation srt-win
```

**2. Set `SRT_WIN_PATH`:**

```powershell
$env:SRT_WIN_PATH = (Get-Command srt-win).Source
[System.Environment]::SetEnvironmentVariable("SRT_WIN_PATH", $env:SRT_WIN_PATH, "User")
```

**3. Install the network sandbox:**

```bash
srt-win install --name sandbox-runtime-net
```

Log out and back in after installing.

## What it does

- **Write protection** — commands can only write to the project directory and temp. Everything else is read-only.
- **Credential protection** — access to `~/.ssh`, `~/.aws/credentials`, `~/.gnupg`, etc. is blocked.
- **Network allowlist** — only approved domains (npm, PyPI, GitHub, etc.) are reachable.

If anything goes wrong (sandbox init fails, wrapping fails), commands run normally. The plugin never breaks your workflow.

## Default restrictions

| Deny-read path | Linux/macOS | Windows |
|----------------|:-----------:|:-------:|
| `~/.ssh`, `~/.aws/credentials`, `~/.azure` | Yes | Yes |
| `~/.kube`, `~/.docker/config.json` | Yes | Yes |
| `~/.npmrc`, `~/.netrc`, `~/.env`, `~/.gnupg` | Yes | Yes |
| `~/.config/gcloud`, `~/.config/gh` | Yes | — |
| `%APPDATA%\gnupg`, `%APPDATA%\gcloud`, `%APPDATA%\GitHub CLI` | — | Yes |

**Allow-write**: project directory, worktree, system temp.

**Network allow-only**: `registry.npmjs.org`, `pypi.org`, `crates.io`, `github.com`, `gitlab.com`, `bitbucket.org`, `api.openai.com`, `api.anthropic.com`, `*.googleapis.com` (and their wildcards).

## Configuration

The plugin uses `~/.srt-settings.json` as its config file (the same path used by `@anthropic-ai/sandbox-runtime`). On first run it creates the file with all defaults written out so you can edit them.

The `OPENCODE_SANDBOX_CONFIG` env var (JSON string) overrides the file. See the [sandbox-runtime configuration docs](https://github.com/anthropic-experimental/sandbox-runtime#configuration) for the full schema.

### Disable

```bash
OPENCODE_DISABLE_SANDBOX=1 opencode
```

Or set `"disabled": true` in the config file.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, architecture, and guidelines.

## Related

- [@anthropic-ai/sandbox-runtime](https://github.com/anthropic-experimental/sandbox-runtime)
- [OpenCode Plugins Docs](https://opencode.ai/docs/plugins)
