# opencode-patchflow

Anchor-based atomic batch edits for OpenCode: one auditable tool call where
the agent would otherwise smuggle writes through `shell` or chain N fragile
`edit` calls.

> **Requires OpenCode 2.x.** Built against `@opencode/plugin` 2.x and the V2
> plugin API only (`Plugin.define`, `tool` and `permission` hooks). There is
> no 1.x support.

Agents under pressure edit files the way that costs the fewest round-trips,
which usually means a Python heredoc through `shell`:

```sh
python3 - <<'EOF'
s = open(p).read()
s = s.replace(anchor, anchor + add)
open(p, 'w').write(s)
EOF
```

One call, but opaque to permissions, review, and diff logging — and silent
about partial failure. The honest alternative, chaining N `edit` calls,
restores the audit trail at N times the latency and N exact-match
rollbacks. `patchflow_apply` keeps the single-call ergonomics with the
trail intact: each edit names a file, an anchor, and the text to insert
after it or replace it with, asserting the anchor occurs exactly
`expectCount` times (default 1). Every edit in the call validates before
anything is written, so a batch lands atomically per file group instead of
halfway. `dryRun: true` previews the whole batch without touching disk, and
one call can span as many files as the change needs.

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

The plugin also watches `shell` for the heredoc habit itself. When a
command hides a file write — `open(p, 'w')` in Python, `sed -i`, `perl
-pi`, `tee`, a bare `>`/`>>` redirect — it logs a `[patchflow]
covert-write (…) observed` line, and when that request already resolves to
`ask`, it appends a pointer to `patchflow_apply`. It never allows what your
rules deny and never denies what they allow; it is a nudge, not a gate, so
pair it with a real policy engine where enforcement matters.

```jsonc
// opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-patchflow"]
}
```

Two options tune the monitor,
`{ "monitorOnly": true, "suggestOnAsk": true }`. The first keeps the plugin
to observation, never touching a permission verdict (static `deny` rules
win regardless). The second controls the pointer appended to
already-asking shell requests. A third option, `{ "metrics": true }`,
keeps session-aggregated counters — successful applies and dry runs with
edit and file totals, errors, observed covert writes, and built-in `edit`
calls as the comparison baseline — in
`~/.local/share/opencode/log/patchflow-metrics.json`. Only counts, never
commands or contents; at most twenty sessions are kept, oldest first out,
with cumulative totals beside them. It defaults to off. Local development points at the source
directly:

```jsonc
{ "plugins": [{ "package": "/home/mateo/opencode-patchflow/src/index.ts", "options": {} }] }
```

## Development

```sh
npm install
npm test        # node --test, no build step
npm run typecheck
```

Needs Node 22 or newer: the test files run straight through type
stripping, with no compilation involved.

## License

MIT
