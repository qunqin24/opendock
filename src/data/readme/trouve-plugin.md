# trouve

A protocol-first AI coding harness for running, supervising, and reviewing
agent work in isolated git worktrees.

Pronounced **"troov"** (rhymes with *groove*; French /tʁuv/). *Trouver* is
French for "to find." The full story is in [NAME.md](NAME.md).

> Looking for the fast, incremental code-search tool? See
> [trouve-search](crates/trouve-search/README.md) and its
> [agent installation guide](INSTALL.md).

## What trouve provides

- **Isolated sessions.** Each unit of work owns a git worktree and branch;
  parallel threads can collaborate inside the session.
- **A choice of agents and models.** Run Codex, Claude Code, or Cursor through
  their supported CLIs and subscription authentication, use hosted API
  providers, or run supported local models.
- **Visible, reviewable work.** Stream chat and tool activity, handle
  approvals, inspect diffs and files, use multiple integrated terminals, and
  create or merge pull requests without leaving the session.
- **Extensible workflows.** Add MCP servers and skills, schedule automations,
  and run self-hosted GitHub App-backed pull-request reviews.
- **One responsive product UI.** The Lit application powers both the Wry
  desktop client and the mobile-oriented PWA.

The product is chat-first rather than IDE-first: files and terminals support
the agent workflow, while the diff remains the primary review surface. See the
[UX screen map](docs/design/ux-screen-map.md) for the complete interaction
model.

## Architecture

Clients communicate with `trouve-server` exclusively through versioned HTTP
and SSE APIs. Durable user-visible state is reconstructed from one persisted,
cursor-addressed event log, and every agent side effect passes through the
same permission and audit boundary. The desktop application embeds a local
server but still talks to it over the protocol.

| Area | Location |
| --- | --- |
| Desktop product host | [`crates/trouve-app`](crates/trouve-app) |
| Shared Lit desktop/PWA frontend | [`web/app-ui`](web/app-ui) |
| Protocol server and harness engine | [`crates/trouve-server`](crates/trouve-server), [`crates/trouve-core`](crates/trouve-core) |
| Provider and vendor-agent integrations | [`crates/trouve-providers`](crates/trouve-providers), [`crates/trouve-agents`](crates/trouve-agents) |
| Published semantic code search | [`crates/trouve-search`](crates/trouve-search/README.md) |

The repository invariants and a crate overview are in
[AGENTS.md](AGENTS.md); architectural decisions are recorded in
[`docs/adr`](docs/adr/README.md).

## Run from source

The workspace currently requires Rust 1.92 and Node.js 24, plus the native
system dependencies required by Wry on your platform.

Start the frontend development server:

```bash
npm --prefix web/app-ui ci
npm --prefix web/app-ui run dev
```

Then launch the desktop host from another shell:

```bash
TROUVE_APP_UI_DEV_URL=http://127.0.0.1:5173 cargo run -p trouve-app
```

To build a release binary with the desktop assets embedded:

```bash
npm --prefix web/app-ui ci
npm --prefix web/app-ui run build
TROUVE_APP_UI_DIST="$PWD/web/app-ui/dist/desktop" \
  cargo build --release -p trouve-app
```

## Development

The main workspace checks are:

```bash
cargo fmt --all --check
cargo clippy --all-targets -- -D warnings
cargo test --workspace
npm --prefix web/app-ui run format:check
npm --prefix web/app-ui run lint
npm --prefix web/app-ui test
npm --prefix web/app-ui run build
```

Model-downloading and network tests stay ignored unless their documented
environment flags are enabled. Search-specific parity and benchmark commands
live in the [trouve-search README](crates/trouve-search/README.md#development).

Useful design and operations documentation:

- [Event-log design](docs/design/event-log.md)
- [Provider architecture](docs/design/providers.md)
- [MCP, skills, and GitHub integrations](docs/design/integrations.md)
- [Self-hosted pull-request reviews](docs/code-review.md)
- [Changelog](CHANGELOG.md)

## License

[MIT](LICENSE). The `trouve-search` package contains portions derived from
[MinishLab/semble](https://github.com/MinishLab/semble); see its
[acknowledgements](crates/trouve-search/README.md#acknowledgements).
