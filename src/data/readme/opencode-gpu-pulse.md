# gpu-pulse

OpenCode TUI plugin that shows, in the sidebar, the GPU used by the active local model and its inference metrics (tokens per second, model, context usage).

## Layout

| Path | Purpose |
| --- | --- |
| `apps/docs` | Astro + Starlight site: ADRs, architecture, metric specs, guides |
| `packages/collectors` | UI-free ports and adapters that read GPU and inference metrics |
| `packages/opencode-plugin` | OpenCode TUI plugin (`./tui` export) that renders the sidebar panel |

## MVP scope

- NVIDIA GPU on Windows, read through `nvidia-smi`.
- llama.cpp (`llama-server`) running on the same machine as OpenCode.

## Development

```sh
pnpm install
pnpm docs:dev     # docs site
pnpm typecheck    # all packages
```
