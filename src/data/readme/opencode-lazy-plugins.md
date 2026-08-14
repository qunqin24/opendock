# opencode-lazy-plugins

An [oh-my-opencode](https://github.com/nicholasgriffintn/oh-my-opencode) plugin that declutters your slash-command autocomplete by hiding plugin commands behind a single `/plugins` gateway.

## The Problem

When you install several oh-my-opencode plugins, each one registers its own slash commands. The autocomplete list grows fast and becomes noisy — making it hard to find the commands you actually use.

## How It Works

`opencode-lazy-plugins` runs at config time and:

1. **Detects** all commands registered by other plugins (those with `(plugin: ...)` descriptions)
2. **Removes** them from the autocomplete namespace
3. **Registers** a single `/plugins` command that serves as an on-demand gateway to all hidden commands

Your core commands stay clean. Plugin commands remain accessible when you need them.

### `/plugins` Usage

```
/plugins                    # Interactive picker — browse all plugin commands
/plugins semgrep            # Fuzzy match — jumps straight to the best match
```

## Install

```bash
opencode plugins add opencode-lazy-plugins
```

Or add to your opencode config manually:

```json
{
  "plugin": [
    ...,
    "opencode-lazy-plugins@latest",
    ...
  ]
}
```

## Before / After

**Before** — autocomplete flooded with plugin commands:

```
/semgrep-rule-creator:semgrep-rule
/semgrep-rule-creator:semgrep-rule-creator
/building-secure-contracts:audit-prep-assistant
/building-secure-contracts:code-maturity-assessor
/building-secure-contracts:guidelines-advisor
/static-analysis:semgrep
/static-analysis:codeql
... (30+ more)
```

**After** — one entry point:

```
/plugins
```

## License

[MIT](LICENSE)
