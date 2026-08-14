# opencode-update-notifier

An [OpenCode](https://opencode.ai) plugin that checks if your pinned npm plugins have newer versions available and shows a TUI notification.

## Why pinned versions?

Pinning exact versions of your OpenCode plugins (e.g. `my-plugin@1.2.3` instead of `my-plugin` or `my-plugin@^1.2.3`) is the recommended way to defend against npm supply-chain attacks:

- **No silent code execution.** Floating ranges (`^1.2.3`, `~1.2.3`, `latest`) automatically pull new code the next time anything resolves dependencies. A compromised or hijacked release can therefore reach your machine without you ever editing your config. Pinning forces every upgrade to be an explicit, reviewable change.
- **Smaller blast radius for malicious releases.** Recent npm incidents (account takeovers, malicious post-install scripts, typosquatted dependencies) have repeatedly shipped through patch and minor releases. A pinned version is unaffected until you opt in.
- **Auditable upgrades.** Because each version bump is a config diff, you can review the changelog and the registry entry before adopting it, rather than discovering a new version was loaded after the fact.

The security trade-off is that pinned versions never update on their own, so it is easy to drift behind upstream — including behind releases that fix real vulnerabilities. That is exactly the gap this plugin closes: it watches the npm registry for newer versions of your pinned plugins and surfaces them as a single toast, so you can review and adopt security fixes deliberately, without ever handing the decision to a resolver.

## What it does

On the first session start after OpenCode loads, this plugin:

1. Reads all your OpenCode config files to find version-pinned plugin entries.
2. Queries the npm registry for the latest version of each pinned plugin.
3. Shows a single aggregated toast notification if any plugins have updates available.
4. Caches the registry results locally for 6 hours.

It does **not** auto-update anything. You decide when to run your package manager.

## Installation

Add `opencode-update-notifier` to your OpenCode config:

```jsonc
// ~/.config/opencode/opencode.json
{
  "plugin": [
    "opencode-update-notifier@0.3.3"
  ]
}
```

## Cache

Results are cached at `~/.cache/opencode-update-notifier/cache.json` (or `$XDG_CACHE_HOME/opencode-update-notifier/cache.json`).

To force a fresh registry check, delete this file:

```sh
rm -f ~/.cache/opencode-update-notifier/cache.json
```

## How update detection works

Only **pinned** plugin entries are checked:
- npm-pinned entries: `@scope/name@version` or `name@version`
- GitHub git-pinned entries: `name@git+https://github.com/<owner>/<repo>[.git]#vX.Y.Z`

Unpinned entries (e.g. `my-plugin` or `./local-plugin`), non-GitHub git URLs, and git refs that aren't SemVer versions are silently ignored.

## License

MIT © Tim Hildebrandt
