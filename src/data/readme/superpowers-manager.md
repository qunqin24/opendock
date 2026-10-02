# Superpowers Manager

Install [`obra/superpowers`](https://github.com/obra/superpowers) directly from upstream for Codex, the Pi coding agent, OpenCode, and Claude Code. Stay on a known-good release or commit, try a branch, and upgrade when you choose—without waiting for a marketplace copy to catch up.

> Unofficial community integration. Not affiliated with the `obra/superpowers` maintainers.

## Choose what you run

Start with the latest stable release by default, or choose the upstream version that works for you. There is no background updater.

| What you want                          | How to choose it                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| Stay on a known-good version           | `pin` a release tag or full 40-character commit SHA                           |
| Try an upstream fix before its release | Set `SUPERPOWERS_REF` to a branch or other resolvable ref for that invocation |
| Return to the latest stable release    | Save `track-latest`, then explicitly install or update                        |

For example, save a release pin and install it for your agent:

```sh
npx superpowers-manager pin v6.1.1
npx superpowers-manager install --harness codex
```

Use `--harness pi` for Pi, `--harness opencode` for OpenCode, or `--harness claude-code` for Claude Code. The pin is shared by all harnesses, but each installation changes only when you run its `install` or `update` command. A saved pin keeps subsequent installs and updates on that version unless you change or override the selection.

To try a branch, replace `feature/foo` with an existing upstream branch:

```sh
SUPERPOWERS_REF=feature/foo npx superpowers-manager install --harness codex
```

This override applies only to that command and leaves your saved selection unchanged; the installed version remains until you explicitly change it. Branches can move. Persistent `pin` accepts exact version tags (including prereleases) and full commit SHAs.

When you are ready to return to the latest stable release:

```sh
npx superpowers-manager track-latest
npx superpowers-manager update --harness codex
```

See [version selection](https://github.com/j7an/superpowers-manager/blob/main/docs/usage.md#choosing-a-source) for source overrides, precedence, and `unpin`.

## Start with your agent

The four harnesses share upstream selection, while each has independent prepared and installed state. Omitting `--harness` selects Codex.

### Codex

```sh
npx superpowers-manager install --harness codex
npx superpowers-manager probe --harness codex
npx superpowers-manager update --harness codex
```

Codex installs the Manager-owned marketplace plugin after preparation and
validation. Review upstream hook definitions with Codex's `/hooks` flow before
trusting or running them; updates can change a referenced script or surface a
new definition. The manager neither creates hooks nor changes Codex trust state.
See the [Codex reference](https://github.com/j7an/superpowers-manager/blob/main/docs/codex.md#durable-storage-migration-and-recovery) for durable storage, migration, and recovery.

### Pi

```sh
npx superpowers-manager install --harness pi
npx superpowers-manager probe --harness pi
npx superpowers-manager update --harness pi
```

Pi installs a separately validated, Manager-owned frozen snapshot. Restart Pi
after a successful install, activating update, or removal. See the
[Pi reference](https://github.com/j7an/superpowers-manager/blob/main/docs/pi.md)
for compatibility, experimental opt-in, and recovery behavior.

### OpenCode

```sh
npx superpowers-manager install --harness opencode
npx superpowers-manager probe --harness opencode
npx superpowers-manager update --harness opencode
```

OpenCode installs a separately validated, Manager-owned frozen snapshot. Restart
OpenCode after a successful install, activating update, or removal. See the
[OpenCode reference](https://github.com/j7an/superpowers-manager/blob/main/docs/opencode.md)
for global configuration, conflicts, and recovery behavior.

### Claude Code

```sh
npx superpowers-manager install --harness claude-code
npx superpowers-manager probe --harness claude-code
npx superpowers-manager update --harness claude-code
```

Claude Code installs a validated, Manager-owned local marketplace snapshot.
Restart Claude Code or run `/reload-plugins` after an install, activating update,
or removal. See the [Claude Code reference](https://github.com/j7an/superpowers-manager/blob/main/docs/claude-code.md)
for conflicts, hooks, and recovery.

To remove a Manager-owned installation, choose one harness explicitly:

### Uninstall Codex

```sh
npx superpowers-manager uninstall --harness codex
```

### Uninstall Pi

```sh
npx superpowers-manager uninstall --harness pi
```

### Uninstall OpenCode

```sh
npx superpowers-manager uninstall --harness opencode
```

### Uninstall Claude Code

```sh
npx superpowers-manager uninstall --harness claude-code
```

The manager never removes another Superpowers provider. See the [ownership guidance](https://github.com/j7an/superpowers-manager/blob/main/docs/usage.md#provider-ownership) before switching providers.

## Shared selection and lifecycle

The [selection commands above](#choose-what-you-run) save shared upstream intent. They do not activate Codex, Pi, OpenCode, or Claude Code; run the selected harness's `install` or `update` to apply that choice. `unpin` restores the packaged fallback policy.

See [targeted lifecycle commands](https://github.com/j7an/superpowers-manager/blob/main/docs/usage.md#targeted-lifecycle) for preparation, inspection, installation, updates, and removal.

Use `--harness codex`, `--harness pi`, `--harness opencode`, or `--harness claude-code` with each targeted lifecycle command.

```text
shared selection -> prepare / inspect / activate Codex
                 -> prepare / inspect / activate Pi
                 -> prepare / inspect / activate OpenCode
                 -> prepare / inspect / activate Claude Code
```

The [usage reference](https://github.com/j7an/superpowers-manager/blob/main/docs/usage.md) covers version selection, precedence, offline behavior, `prepare`, validators, and every lifecycle command. The harness references cover [Codex registration and hooks](https://github.com/j7an/superpowers-manager/blob/main/docs/codex.md), [Pi snapshots and recovery](https://github.com/j7an/superpowers-manager/blob/main/docs/pi.md), [OpenCode snapshots](https://github.com/j7an/superpowers-manager/blob/main/docs/opencode.md), and [Claude Code marketplace registration](https://github.com/j7an/superpowers-manager/blob/main/docs/claude-code.md).

## Requirements and platforms

The installed package requires Node >=24. Native source, tests, and packaging tooling target latest Node 24. Every other requirement is command-specific and is checked before dispatch. This table is derived from production by `tests/bin/readme-requirements.test.ts`.

<!-- requirements:begin -->

| Command        | git | Codex CLI (default) | Pi CLI (`--harness pi`) | OpenCode CLI (`--harness opencode`) | Claude Code CLI (`--harness claude-code`) |
| -------------- | --- | ------------------- | ----------------------- | ----------------------------------- | ----------------------------------------- |
| `pin`          | yes | no                  | no                      | no                                  | no                                        |
| `track-latest` | no  | no                  | no                      | no                                  | no                                        |
| `unpin`        | no  | no                  | no                      | no                                  | no                                        |
| `prepare`      | yes | no                  | no                      | no                                  | no                                        |
| `probe`        | yes | yes                 | no                      | no                                  | yes                                       |
| `install`      | yes | yes                 | yes                     | yes                                 | yes                                       |
| `update`       | yes | yes                 | yes                     | yes                                 | yes                                       |
| `uninstall`    | no  | yes                 | yes                     | no                                  | yes                                       |

<!-- requirements:end -->

Generated Codex manifests preserve upstream JSON number tokens while rejecting non-finite decimal or exponent values.

macOS and Linux are tested. WSL2 is supported for the established Codex path; Pi in WSL2 and native Windows remain untested. The manager runs in-process and does not require Git Bash. The [Pi reference](https://github.com/j7an/superpowers-manager/blob/main/docs/pi.md#runtime-compatibility) explains its runtime qualification and admission checks. OpenCode support currently covers 1.x; OpenCode 2.x is untested and not certified as compatible (see the [OpenCode reference](https://github.com/j7an/superpowers-manager/blob/main/docs/opencode.md)).

Native test versions qualify integration mechanisms; they are not runtime allowlists, and an untested runtime is not automatically certified as compatible.

## Contributing

See [the contributor guide](https://github.com/j7an/superpowers-manager/blob/main/CONTRIBUTING.md) for development, testing, packaging, CI, and repository layout. Architecture details live in the [harness interface](https://github.com/j7an/superpowers-manager/blob/main/docs/harness-interface.md) and [adapter result contract](https://github.com/j7an/superpowers-manager/blob/main/docs/adapter-result-contract.md).
