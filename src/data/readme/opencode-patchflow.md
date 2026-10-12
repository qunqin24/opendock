# opencode-patchflow

Anchor-based atomic batch edits for OpenCode: one auditable tool call instead of opaque `python3 <<'EOF'` heredocs or N chained `edit` calls.

> **Requires OpenCode 2.x.** Built against `@opencode/plugin` 2.0.26 and uses
> only the V2 plugin API (`Plugin.define`, `tool.transform`, `permission`
> and `tool` hooks). It does not work on OpenCode 1.x.

## Why

Agents often edit files through `shell` with a Python heredoc:

```sh
python3 - <<'EOF'
s = open(p).read()
s = s.replace(anchor, anchor + add)
open(p, 'w').write(s)
EOF
```

That works in one round-trip (see the Program-Aided LM literature: models fail
less when state stays in code rather than across tool-call turns), but it is
opaque to permissions, review, and diff logging. Chaining N `edit` calls is
auditable but costs N round-trips and N exact-match failures.

`patchflow_apply` keeps the single-call ergonomics with the audit trail:

- `edits: [{ path, anchor, text, mode, expectCount }]` — find an anchor,
  assert it occurs `expectCount` times (default 1), insert after it or replace it.
- All edits validate before any write (atomic per file group).
- `dryRun: true` previews without writing.
- One call can touch many files.

## Install

```jsonc
// opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-patchflow"]
}
```

Local development:

```jsonc
{ "plugins": [{ "package": "/home/mateo/opencode-patchflow/src/index.ts", "options": {} }] }
```

Options:

```jsonc
{ "package": "opencode-patchflow", "options": { "monitorOnly": true, "suggestOnAsk": true } }
```

- `monitorOnly` (default `true`): only log covert-write observations; never
  change a verdict. Static `deny` rules always win.
- `suggestOnAsk` (default `true`): when a shell request already resolves to
  `ask`, append a pointer to `patchflow_apply`.

## Usage

```ts
// One tool call, two files, asserted anchors:
patchflow_apply({
  edits: [
    { path: "src/a.rs", anchor: "assert!(x.is_none());\n", text: "// checked\n" },
    { path: "src/b.rs", anchor: "v=1", text: "v=2", mode: "replace", expectCount: 2 },
  ],
  dryRun: true,
});
```

The plugin also watches `shell`: when a command hides a file write
(`python open(w)`, `sed -i`, `perl -pi`, `tee`, `>`/`>>` to a file) it logs
`[patchflow] covert-write (...) observed` and, on an already-asking request,
suggests this tool. It never allows what rules deny and never denies what
rules allow — it is a nudge, not a gate. Pair it with a real policy engine
for enforcement.

## Development

```sh
npm install
npm test        # node --test, no build step
npm run typecheck
```

Requires Node >= 22 (type stripping runs `.ts` tests directly).

## License

MIT
