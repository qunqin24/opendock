# opencode-tool-templates

OpenCode V2 plugin that renders Handlebars templates into tool-call arguments
and calls the target tool in one step. A template can be inline or a file on
disk, which the plugin reads and renders; the model passes the template object
and small `$params` values. It can also assemble templates into text or files.

> Plugin ID: `tool-templates`. Default tool namespace: `template`.

Requires OpenCode 2.3.2+.

## Quick start

Install from npm:

```sh
opencode plugin add opencode-tool-templates
```

GitHub:

```sh
opencode plugin add github:finnseefly/opencode-tool-templates
```

After install, run `opencode reload` and ask the agent to call `template_call`.
For manual installation, see [installation](docs/installation.md).

## Tools

| Tool             | What it does                                                                  |
| ---------------- | ----------------------------------------------------------------------------- |
| `template_call`  | Render Handlebars templates into another tool's arguments and call that tool. |
| `template_build` | Assemble a template object and return text or write a file.                   |

In Code Mode, call these tools as `tools.template.call` and
`tools.template.build`.

The plugin also registers a `tool-templates` skill with usage guidance.

See the [tool reference](docs/reference.md) for inputs, outputs, and template
objects.

## Use cases

- **Use stored prompts.** Keep the full prompt in a file and a short
  `-header.md` beside it. The orchestrator reads only the header, fills
  `$params`, and calls `template_call`; the stored prompt never enters its
  context. This avoids reading the full prompt and rewriting it, saving input
  and output tokens.
- **Compose instructions at runtime.** Build a prompt from reusable `$parts`
  blocks and per-part `$params` instead of copying shared rules into every task.

See [use cases](docs/use-cases.md) for the stored-prompt pattern and runtime
composition examples.

## Configuration

Pass options with the object form of a `plugins` entry. Every option is
optional. The values below are the defaults.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-tool-templates",
      "options": {
        "namespace": "template",
        "templatePaths": ["**/*"],
        "buildPaths": ["**/*"],
        "allowHardLinkedTemplates": false,
        "allowedTools": [],
        "deniedTools": [],
        "defaultSeparator": "\n\n",
        "defaultSkipEmpty": true,
        "allowedOutputFormats": ["text", "json"],
        "registerSkill": true,
        "limits": {
          "maxTemplateBytes": 1048576,
          "maxRenderedBytes": 2097152,
          "maxChainParts": 100,
        },
      },
    },
  ],
}
```

See [configuration](docs/configuration.md) for ranges, path rules, and examples.

## Pitfalls

- **Templates are trusted content.** `template_call` can invoke side-effecting
  targets such as `shell`; restrict `allowedTools`/`deniedTools` and target
  permissions.
- **Target hooks are bypassed.** The nested call does not run the target's
  `execute.before`/`execute.after` hooks. Permission checks inside the target
  still run. Target lookup is not permission-filtered, so keep `allowedTools`
  narrow. See [target permissions](docs/security-model.md#target-permissions).
- **File access needs permissions.** `$file` templates need `read`; output
  writes need `edit`, and existing output files are refused unless
  `overwrite: true`. Allowlists do not bypass a deny rule. Hard-linked templates
  are refused by default;
  `allowHardLinkedTemplates: true` weakens the path boundary. External paths
  also need an explicit pattern and `external_directory`. See the
  [security model](docs/security-model.md).
- **Template syntax is explicit.** Plain strings do not render; use `$inline` or
  `$file` when `{{...}}` should be interpreted. Partials and custom helpers are
  not supported.
- **Target validation uses the target schema.** The plugin does not coerce
  values. If the schema rejects a rendered `"true"` for a boolean field, use
  `$type: "boolean"`. Some target schemas also coerce values during decode.

## Documentation

- [Tool reference](docs/reference.md) — inputs, outputs, template objects,
  helpers, and errors.
- [Use cases](docs/use-cases.md) — stored prompts and runtime composition.
- [Configuration](docs/configuration.md) — all options, defaults, ranges, and
  examples.
- [Installation](docs/installation.md) — npm, GitHub, local, manual, and packed
  installs, path rules, and dependencies.
- [Security model](docs/security-model.md) — trusted templates, allowlists vs
  permissions, external paths, target permissions, and write safety.
- [Limitations](docs/limitations.md) — hooks, output behavior, reserved keys,
  Windows paths, and other edge cases.
- [Development](docs/development.md) — source layout, tests, commands, CI, and
  verification.

## License

MIT. See [LICENSE](./LICENSE).
