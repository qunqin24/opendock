**English** | [简体中文](./README.zh-CN.md)

# opencode-remove-to-trash

An OpenCode plugin that routes AI-triggered `rm` commands and patch-based file deletions to the **system Trash** instead of deleting them permanently.

Deleted files stay recoverable, so a wrong delete is no longer a disaster.

---

## Features

- **Intercepts `rm`**: finds `rm` that is actually in command position inside a shell command, rewrites it to `trash`, and drops `rm`-only flags such as `-r` / `-f`.
- **Intercepts patch deletions**: for `*** Delete File:` lines in `apply_patch` / `patch`, it moves the file to the Trash first, removes that line from the patch, and lets other edits proceed.
- **No false positives**: strings like `echo rm foo`, `'rm ...'`, `"rm ..."`, or `confirm` are left untouched; quotes and escapes are parsed correctly.
- **Cross-platform backends**: prefers macOS `trash` and Linux `trash-put` / `gio trash`.
- **Built-in fallback, zero install**: when no backend is found, the plugin generates a pure `sh` trash script and uses it automatically.
- **No runtime dependencies**: the plugin uses only Node built-ins and runs as a single file.

---

## How it works

The plugin hooks `tool.execute.before` and rewrites tool arguments before they run:

| Tool | Behavior |
| --- | --- |
| `bash` / `shell` | A small lexer finds `rm` in command position, replaces it with `trash`, and strips its flags |
| `apply_patch` / `patch` | Extracts paths from `*** Delete File:` lines, moves them to the Trash, and removes those lines; if only deletions remain, the patch ends there |

Rewrite examples:

```text
rm -rf node_modules              ->  trash node_modules
cd build && rm -rf out           ->  cd build && trash out
find . -name '*.tmp' -exec rm {} ->  find . -name '*.tmp' -exec trash {} +
echo rm foo                      ->  echo rm foo        (unchanged)
sudo rm -rf /tmp/x               ->  sudo rm -rf /tmp/x (unchanged)
```

> For safety, `sudo rm ...` is never rewritten (and you should generally deny `sudo` in your permissions config).

---

## Requirements

- OpenCode (the plugin host)
- A trash backend (**optional**, probed in this order):
  1. macOS: `trash` (`brew install trash`)
  2. Linux: `trash-put` (`trash-cli`) or `gio trash` (`glib2`)
  3. Otherwise: **built-in fallback** — the plugin writes a pure `sh` script to `~/.cache/opencode/rm-to-trash/trash`; on macOS it moves files to `~/.Trash`, on Linux it follows the XDG spec and moves them to `~/.local/share/Trash` (with `.trashinfo`)

In other words, users do not have to install anything. The plugin only disables itself if the cache directory is not writable.

> On Windows, use it through a WSL Linux environment.

---

## One-line install

```bash
curl -fsSL https://raw.githubusercontent.com/Ryan9438/opencode-remove-to-trash/main/install.sh | bash
```

The script downloads `rm-to-trash.ts` into the global plugin directory `~/.config/opencode/plugins/` and checks for a trash backend. If none exists it makes a best effort to install one (Homebrew on macOS; `trash-cli` on Linux when passwordless `sudo` is available). If that fails, it does not matter — the plugin ships its own fallback. Restart OpenCode to load it.

Override the source with environment variables:

```bash
RM_TO_TRASH_REPO=owner/repo RM_TO_TRASH_BRANCH=main \
  curl -fsSL https://raw.githubusercontent.com/Ryan9438/opencode-remove-to-trash/main/install.sh | bash
```

---

## Other install methods

### 1. From npm (not published yet)

Add the package name to the `plugin` array in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-remove-to-trash"]
}
```

### 2. Local file

Drop `rm-to-trash.ts` into a project-level or global plugin directory:

- Global: `~/.config/opencode/plugins/`
- Project: `.opencode/plugins/`

You can also point at an absolute path in `opencode.json`:

```json
{
  "plugin": ["/absolute/path/to/rm-to-trash.ts"]
}
```

---

## Uninstall

- One-line install: delete `~/.config/opencode/plugins/rm-to-trash.ts`
- Config install: remove the entry from the `plugin` array in `opencode.json`

---

## FAQ

**Why is `sudo rm` not rewritten?**
Command-position detection only trusts a whitelist of prefix commands (`xargs`, `command`, `env`, `do`, `then`, etc.). `sudo` is not one of them, and you should generally deny `sudo` in your permissions config.

**Is a bare `rm` with no arguments rewritten?**
No. It is only replaced with `trash` when there are paths to delete; no-op flags like `rm -f` are left as is.

**What if a patch only deletes files?**
The plugin moves them to the Trash and throws a notice saying the patch has no remaining operations, so you never open an empty patch.

**What if `trash` / `trash-put` / `gio` are missing?**
The plugin generates the built-in fallback backend, so behavior is unchanged. It only logs a warning and disables rewriting if even the cache directory cannot be written.

**Where does the built-in fallback move files?**
macOS: `~/.Trash`; Linux: `~/.local/share/Trash` (per the XDG spec, with `.trashinfo` written so file managers can show and restore them).

---

## Development

```bash
bun install
bun test        # unit tests
bun run typecheck
```

The core logic lives in the pure functions `rewriteRmCommand()` and `splitPatchDeletes()`, which are independently testable.

---

## License

[MIT](./LICENSE) © 2026 Ryan9438
