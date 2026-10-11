# opencode-pluginsearch

A `/pluginsearch` command for [OpenCode](https://opencode.ai) that finds
version-compatible plugins from reliable sources and lets you pick one
from a popup question. I was inspired by Codex for this.

```text
/pluginsearch orchestration
```

## How to use

1. Just run `/pluginsearch <query>`. The plugin searches two sources in
   one parallel pass:
   - **npm registry** - official, installable packages.
   - **Community marketplace** (`Tommertom/opencode-plugin-marketplace`,
     schema-validated) - used for declared `minimumVersion` /
     `maximumVersion` compatibility flags.
1. Results arrive to the agent as a file attachment plus a one-line prompt.
2. The agent shows the options in a picker (with the gist of the plugins) as well as `none`.
   Anything you type instead is treated as a refinement: the agent
   searches deeper itself and pops a second round of picks.
3. Picking a plugin installs it right away (`opencode plugin add …`,
   approval applies), the agent verifies with `opencode plugin list`, and gives a
   tiny usage summary for the plugin installed. `none` installs nothing.

Details worth knowing:

- **Strict keyword relevance.** Use keywords (e.g. orchestration,agents,memory) for searches as this plugin strictly asks for the query to be included somewhere in the listed plugins. If you want something really specific that keywords aren't enough for, type your own words whenever the first question is asked by the agent.
- **No tool footprint.** No tool is added because I did not want to fill up anyone's tool quotas.

## Install

```sh
opencode plugin add opencode-pluginsearch
```

(Or, to install straight from source:
`opencode plugin add github:Shadrous/opencode-pluginsearch`.)

Then restart the OpenCode service (or reload the session) and run
`/pluginsearch <query>`.

## Requirements

- OpenCode V2 (`@opencode/plugin` v2)
- Bun >= 1.0.0 (for local development)

## Important Notes

- The community marketplace is an independent project, not affiliated
  with OpenCode. Marketplace entries should be verified before install.
- Results flagged `compat unverified` declare no version range; check
  the package README when in doubt. (you can ask the agent for it if you are too lazy)

## License

MIT
