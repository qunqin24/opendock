# opencode-tool-repair

[![npm](https://img.shields.io/npm/v/opencode-tool-repair)](https://www.npmjs.com/package/opencode-tool-repair)

An OpenCode 2.x plugin that fixes tool calls local models send in another agent's format, before OpenCode rejects them.

Some local models (Flint, for one) were trained on agents whose tools take different argument names. In OpenCode their edits fail with "oldString: Missing key", the model sends the same call again, and nothing changes. This plugin rewrites those calls:

- **edit with an `edits` list** (`[{oldText, newText}, …]`, as an array or a JSON string): one change becomes a normal edit. Several are written together when each old text is found exactly once, Windows line endings included. Otherwise the first is applied and the model is told to send the rest one per call.
- **Other names for the same argument:** `oldText`/`old_string` become `oldString`, `newText`/`new_string` become `newString`, `file_path`/`filePath` become `path`, `contents` becomes `content`, and `replace_all` becomes `replaceAll`.
- **Garbled edit keys.** Flint sometimes splits `newString` into `"new": "String"` plus an empty `""` key holding the text, or writes `edString` for `oldString`; both are put back. An edit with no `newString` at all can't be recovered, so the model is told to send all three fields in one call, or to use `write` for a large change.
- **Bad optional values,** like `"offset": ""`, `"limit": "10"` or `"replaceAll": "true"`, and an empty `""` key.
- **Mistyped paths.** Some models drop or add an underscore (`cloudsave` for `cloud_save`) or lose a couple of letters in a long folder name. When a path in `read`, `edit`, `write`, `glob` or `grep` doesn't exist, and exactly one existing path differs from it only that way, that path is used and the model is told. A shell `workdir` is corrected only when it's the project folder misspelled. Paths inside shell commands are never changed, so `rm -rf` on a missing folder fails instead of hitting a real folder with a similar name. A `write` keeps its new file name; only the folders above it are corrected, only for an underscore or dash slip, and never onto a file that already exists. Paths that could mean two things, short names, and paths with no close match are left alone.

Whenever it changes a call, it adds a line to the tool result naming the right form, so the model can switch to it.

OpenCode drops argument names a tool doesn't declare before plugins see a call. So the plugin rebuilds the `edit` and `write` tools' input as the same JSON Schema (same fields, types, descriptions and required list) that also lets extra fields through. The fields models are shown don't change. If a future OpenCode gives those tools fields that aren't plain text or true/false, the plugin leaves their schema as it is.

## Install

Add it to `opencode.json`:

```json
{ "plugins": ["opencode-tool-repair"] }
```

or copy `index.js` to `~/.config/opencode/plugins/tool-repair.js`. Restart OpenCode. To turn it off, remove it from the list or delete that file.

## Test

```bash
npm test
```
