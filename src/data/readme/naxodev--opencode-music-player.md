# Naxodev AI Tools

TypeScript packages for OpenCode and Pi: shared macOS media controls, Vim-style prompt editing, and a multi-role development workflow. The host packages publish TypeScript source because OpenCode and Pi load source packages directly.

## Packages

| Package                                                                      | Purpose                                           | Platform and host support                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| [`@naxodev/music-core`](packages/music-core/README.md)                       | Shared music-session client, daemon, and APIs     | Cross-platform APIs; macOS media provider              |
| [`@naxodev/opencode-music-player`](packages/opencode-music-player/README.md) | OpenCode Now Playing sidebar and controls         | macOS; exact beta OpenCode version in its README       |
| [`@naxodev/pi-music-dock`](packages/pi-music-dock/README.md)                 | Pi Now Playing status, panel, and controls        | macOS; Pi 0.83.x or 0.84.x                             |
| [`@naxodev/opencode-vim`](packages/opencode-vim/README.md)                   | Vim-style modal editing for OpenCode prompts      | macOS, Linux, and Windows; exact beta OpenCode version |
| [`@naxodev/apnea`](packages/apnea/README.md)                                 | Host-neutral multi-role workflow engine and CLI   | Bun 1.3.7+; Herdr and an agent CLI                     |
| [`@naxodev/pi-apnea`](packages/pi-apnea/README.md)                           | Pi commands, tools, skills, and prompts for Apnea | Pi 0.83.x or 0.84.x                                    |

All packages are pre-1.0. Breaking host APIs may require coordinated minor releases. See each package README for exact installation and compatibility details.

## Music Session

OpenCode and Pi use lightweight clients connected to one same-user, machine-local music-session daemon. The daemon owns one provider and fans its state out to every connected client. Read the [music session architecture field guide](docs/music-session-architecture.html) for the ownership and failure model.

## Development

```sh
bun install --frozen-lockfile
bun run check
```

The full workspace gate requires the host tools documented in [CONTRIBUTING.md](CONTRIBUTING.md). Package-specific commands are available when a contributor cannot run macOS integration checks.

Use [GitHub Discussions](https://github.com/naxodev/ai/discussions) for usage questions, [GitHub Issues](https://github.com/naxodev/ai/issues) for reproducible defects, and [SECURITY.md](SECURITY.md) for private vulnerability reports. See [SUPPORT.md](SUPPORT.md) for support boundaries.
