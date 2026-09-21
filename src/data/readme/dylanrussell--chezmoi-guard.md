# chezmoi-guard

Native OpenCode V2 guard for chezmoi-managed files. **Managed target mutations are blocked; automatic redirection and apply are disabled.**

## Compatibility and installation

Version 2.0.0 targets OpenCode **2.0.8**, verified against that release's plugin types and tool-execution source. V1 users should stay on 1.1.2.

```jsonc
{
  "plugins": ["@dylanrussell/chezmoi-guard@2.0.0"]
}
```

For local integration, use a default-exporting entry in a discovered `.opencode/plugins/` definition directory that re-exports `dist/plugin.js`. Do not rely on `file:` plugin URLs for the installed 2.0.8 loader.

Requires a working `chezmoi` CLI and configuration. Missing CLI, configuration errors, malformed inventories and lookup failures **block mutations**. A successful inventory with no matching path leaves ordinary unmanaged files and explicit source edits unchanged for normal host permission checks.

## Authorization boundary

OpenCode 2.0.8 executes tool before-hooks **before** its built-in tools check permissions. Rewriting a denied target to an allowed source loses the original target's authorization check. Running `chezmoi apply` in an after-hook would also write the target outside the tool permission system.

The published plugin permission domain exposes pending-request `list/get/reply` and an evaluation hook, but no authorization-request/assert API. The guard therefore uses the conservative fallback:

- Never rewrites tool input or invokes `chezmoi apply`.
- Blocks `edit`, `write`, `patch` and compatible `apply_patch` calls addressing managed targets, including templates, modify scripts and managed symlinks.
- Inspects every Add/Update/Delete/Move patch header before execution; a managed path blocks the whole patch.
- Checks existing filesystem aliases and symlinked ancestors against the managed inventory.
- Preserves original input for unmanaged operations and explicit source edits so native host permissions remain authoritative.
- Makes no permission decisions that grant access, auto-approves nothing, and provides no option to re-enable unverified redirection/apply.

When blocked, read the indicated source, then explicitly edit it through normal permission-checked tools. Symlink sources contain link definitions: inspect the definition and explicitly address the referent. Have the user review and synchronize the target separately. This release deliberately does **not** preserve V1 automatic redirect/apply parity.

See [SECURITY.md](SECURITY.md) for the exact 2.0.8 audit evidence and verification limits.

## Read advisories

Reads remain unchanged. Template, modify-script and encrypted-source advisories are prepended to successful read results while preserving structured content, output and metadata. Advisory lookup is best-effort; mutation lookup uses a separate fresh, validated inventory and fails closed.

## Scope and TUI support

Shell commands and arbitrary custom mutation tools are outside this plugin's interception scope. This is a guard for the named file tools, not a filesystem sandbox.

The package includes a native OpenCode 2.0.8 CLI companion through `./tui` (and `tui.mjs` for local directory discovery). Its mounted `app` slot observes the current session's cached messages and shows read-only toasts for guard tool failures and successful reads carrying guard advisories. It subscribes to native session events and checks the cache once per second to catch navigation and delayed cache updates. It makes no network polling requests and needs no Solid runtime.

Notifications are deduplicated by session, message and tool-call identity for the lifetime of the companion. Opening a session can show previously recorded guard results once; multiple newly observed results are summarized in one toast. Background sessions are inspected only when opened. Full guidance stays in the tool result; paths and file contents are not copied into toasts. Unloading unsubscribes, stops the timer, unregisters the slot and clears the identity cache.

There are no apply/approve controls, pending-change state, or filesystem operations in the companion. It consumes projected tool results rather than server-side V1 toast calls. Recognition is limited to the guard's failure prefix and exact boxed advisory headers; ordinary assistant/user text and unrelated tool failures are ignored. This is a notification convenience, not an authenticated provenance signal for tool output.

## Development and verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:integration
python3 scripts/native-tui-smoke.py
```

Unit tests use a mocked V2 hook context. `test:integration` uses real isolated chezmoi files/processes and the built package, but a **mocked OpenCode host**. Its source-allowed/target-denied permission-order test remains a deterministic simulation, not a real-host permission-policy matrix.

TUI regressions cover native message shapes, read advisories, per-session deduplication, delayed results, event batching, navigation, remounting and cleanup with a mocked cache/event host. `scripts/native-tui-smoke.py` additionally runs an isolated real OpenCode 2.0.8 server and terminal with a scripted loopback model. It verifies a native patch is blocked, the refusal reaches the model, exactly one guard error toast renders, source/target bytes remain unchanged, and the companion and processes shut down cleanly. No real model credentials or user dotfiles are used. Set `TMPDIR` to select the fixture/evidence directory.

MIT © Dylan Russell
