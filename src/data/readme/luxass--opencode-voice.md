# Agent extensions

Extensions for [Pi](https://pi.dev) and [OpenCode](https://opencode.ai), published as separate npm packages. See each package's documentation for installation and usage.

## Pi extensions

| Package                | What it does                                                                      | Documentation                                |
| ---------------------- | --------------------------------------------------------------------------------- | -------------------------------------------- |
| `@luxass/pi-questions` | Ask tabbed questions with choices, notes, and Markdown previews.                  | [Questions](packages/pi-questions/README.md) |
| `@luxass/pi-btw`       | Ask side questions in a popover, then optionally send a summary to the main chat. | [btw](packages/pi-btw/README.md)             |
| `@luxass/pi-personal`  | Load defaults and extensions tuned to a single personal workflow.                 | [personal](packages/pi-personal/README.md)   |
| `@luxass/pi-voice`     | Record speech and transcribe it for your prompts.                                 | [Voice](packages/pi-voice/README.md)         |
| `@luxass/pi-whimsical` | Display playful working messages while the agent runs.                            | [Whimsical](packages/pi-whimsical/README.md) |

## OpenCode plugins

| Package                     | What it does                                                 | Documentation                                    |
| --------------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| `@luxass/opencode-personal` | Load Git, package-manager, and generated worker-file guards. | [Personal](packages/opencode-personal/README.md) |
| `@luxass/opencode-voice`    | Record speech and transcribe it for your prompts.            | [Voice](packages/opencode-voice/README.md)       |

## Development

Use Node.js 24 and the pnpm version pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm check
```

Try an extension from the checkout:

```sh
pi -e ./packages/pi-btw
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for shared TypeScript settings, linting, formatting, and the new-package checklist. There is no build step. The packages ship TypeScript source.

## Pi package gallery

The [Pi package gallery](https://pi.dev/packages) discovers npm packages tagged with the `pi-package` keyword. Pi's [package documentation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md#create-a-package) describes the discovery metadata.

Each Pi extension in this repository already has:

- The `pi-package` keyword.
- A `pi.extensions` manifest pointing to its source entry point.
- A description and repository URL.
- Public npm publishing configured.

Publish each extension as its own npm package through the existing Changesets release workflow. The private repository-root package is not published. The keyword makes a published package eligible for gallery discovery; it does not guarantee immediate indexing. No separate submission step is documented.

Optional `pi.image` and `pi.video` fields add gallery previews. Packages with covers set `pi.image` to a generated PNG committed under `packages/*/docs/`. Run `pnpm covers` to regenerate them, and push the result to `main` so the raw GitHub URLs resolve. `pi.video` can add a video preview.

## License

[MIT](LICENSE). Each package includes its own MIT license file.
