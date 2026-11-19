# opencode-kube-context

Know where kubectl points by default. A `⎈` badge for the active kubectl context and its
default namespace in the OpenCode TUI footer, updated the moment you switch context or
namespace.

```
⎈ prod-eu-west-1:kube-system
```

- **Footer badge** in the session prompt footer and on the home screen, showing the active
  context and its default namespace.
- **Colour-coded**: red for `prod` / `production` / `prd`, yellow for `stg` / `stage` /
  `staging` / `preprod` / `uat`, muted otherwise.
- **Live**: follows your kubeconfig, so `kubectl config use-context …` (or `kubectx`) and
  `kubectl config set-context --current --namespace …` show up without restarting OpenCode.
- **`/kube`**: a palette and slash command that shows the full context, namespace, and the
  kubeconfig file the context was read from.
- **Read-only**: it never writes to your kubeconfig, and it does not need `kubectl` on
  `PATH`. It reads the same files kubectl does: `$KUBECONFIG` (in order) or
  `~/.kube/config`. The first file with a non-empty `current-context` wins, and the namespace
  comes from the first file that defines that context.

## Install

Requires OpenCode v2 (2.2 or newer).

```sh
opencode plugin add opencode-kube-context
```

The package has only a TUI part, so `plugin add` records it in
`~/.config/opencode/cli.json` rather than `opencode.json(c)`. Restart the TUI afterwards.

Or add it by hand:

```jsonc title="~/.config/opencode/cli.json"
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["opencode-kube-context"]
}
```

Because it is a CLI-side plugin, it also works when the TUI talks to a remote OpenCode
server. The badge describes the machine running the TUI; see [Limitations](#limitations) for
what that does and does not tell you.

## Usage

The badge appears on its own when a context is set. With no `current-context` in your
kubeconfig, it stays hidden. The namespace is the context's default; the badge shows `default`
when the context does not set one.

| Command | What it does |
| --- | --- |
| `/kube` | Shows the current context, namespace, and the kubeconfig file the context was read from |
| `Kubernetes: kubectl context` | Same command, in the command palette |

Long names are shortened for the footer. EKS ARNs (`arn:aws:eks:…:cluster/name`) show the
cluster name; contexts over 36 characters and namespaces over 24 are middle-truncated.

## Limitations

- The badge shows the **default kubectl context and namespace for processes that inherit the
  TUI's environment**. It is informational, not a guardrail: any command can override it with
  `--context` or `-n`/`--namespace`, run under a different `KUBECONFIG`, or bypass kubectl
  entirely through cloud credentials or direct API access. A muted badge does not mean
  production is out of reach, and a red one is not an access control.
- In a **remote-server setup**, tool calls run on the server, not on the machine running the
  TUI. The badge reads the TUI's kubeconfig, so it may not be the context or namespace those
  commands use.
- It reads the kubeconfig, so it cannot see a `--context` or `-n`/`--namespace` flag passed to
  a single `kubectl` call, or credentials resolved by an auth plugin.
- The kubeconfig reader expects the block YAML that kubectl and the cloud CLIs write. A context
  written in an unusual shape may show `default` for its namespace.
- Context switching is left to `kubectl` on purpose: the plugin only observes.

## Development

The published `./tui` entrypoint is `dist/tui.js`. It has to be prebuilt: OpenCode skips the
host's Solid source transform for packages inside `node_modules`, so shipping raw `.tsx` would
compile JSX against React. `scripts/build.ts` compiles the Solid JSX and rewrites the imports
the host already owns (`@opencode/plugin/tui`, `@opentui/*`, `solid-js`) to the host's runtime
module ids, so the plugin shares the host's signals and renderables.

```sh
npm install
npm test           # kubeconfig parsing and display helpers
bun run build      # writes dist/tui.js
npm run typecheck
npm run pack:dry
```

To try a checkout locally, point OpenCode at it instead of installing:

```sh
bun run build
ln -s "$PWD" ~/.config/opencode/plugins/kube-context
```

Plugins under `~/.config/opencode/plugins/` load automatically, and edits reload in every
running TUI window. Remove that directory before installing the npm package, or the same
footer badge shows up twice.

## License

Apache-2.0
