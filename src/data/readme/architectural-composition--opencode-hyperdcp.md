# OpenCode-HyperDCP

**OpenCode-HyperDCP** is a context management plugin for the [OpenCode](https://opencode.ai) AI coding agent, forked from [**opencode-dynamic-context-pruning**](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning) (v3.1.12, [this commit](https://github.com/yuriha-chan/OpenCode-HyperDCP/tree/0657cd2fd50e9891cd69eae3787bcf280fabc2ba)).

One npm package supports **OpenCode v1 and v2**, with separate native server and TUI registrations sharing the same DCP operations and persisted state. See [CHANGELOG.md](CHANGELOG.md) for the planned **102.0.0** release.

## Philosophy

An AI agent's context window is not a black box. Most tools silently compress, summarize, or drop conversation history, and you are left hoping nothing important was lost. HyperDCP takes the opposite stance: **the context window should be 100% observable and 100% controllable by you.**

Every compression is a _visible block_. Nothing is hidden, nothing is automatic:

- **Observable** — you can inspect exactly what was compressed, what survived, and how much was saved.
- **Controllable** — you can rewrite a summary, switch to a different version, protect a message, or cull a block entirely.
- **Lossless-in-practice** — nothing is forgotten unless you decide it should be; uncovered content is surfaced rather than quietly discarded.

The plugin never compresses on its own. It only _reminds_ (a nudge) that context is getting large, so the decision stays with you — unless you opt in to let the agent act on its own (see below).

## Automatic, yet observable

HyperDCP also gives the **agent** the same controls you have, so Context management can happen mid-task without breaking the observable model. Each action stays a visible block or edit rather than a silent side effect.

- `recall_compressed` — search and retrieve the original messages that were folded into any compressed block, so the agent can recover exact detail on demand.
- `rewrite_summary`, `edit_summary`, `append_summary`, `fetch_summary_versions` — read and revise a block's summary as new versions.
- `expand_block` — extend a block's range to absorb newly uncovered messages.
- `edit_memo` / `read_memo` — maintain durable project memory outside the volatile chat history.

Context-maintenance tools run inside a transaction. Call `enter_housekeeping` to receive eligible ranges and detailed instructions. Complete and review all planned memo updates, compression, and summary edits across every affected block before calling `leave_housekeeping` once to publish the complete maintenance pass. Keep the transaction open between individual edits and blocks. While the transaction is active, ordinary tools are blocked by default. Configure exact tool-name exceptions with `housekeeping.allowedTools` in DCP configuration; OpenCode permissions continue to apply.

When **autotoggle** is enabled, the agent may also call `toggle_summary_version` itself to switch a block to a different version, or to version `v0` to **cull** a block entirely — the same actions you can take by hand, just automated. Every change remains visible in the block list and reversible.

## Feature tour

### Block list — see every compressed range at a glance

The sidebar lists each block with its range, mode, active version, token cost, and topic. A summary header shows the running total of raw tokens saved.

![DCP block list](docs/screenshots/dcp-blocks-list.png)

### Block detail — per-version tabs

Open a block to read its summary. Every block keeps multiple versions; tabs mark the currently active one with `*` (here `[*v2]`). Switching tabs is view-only — it does not change which version is live.

Long summaries scroll with the mouse wheel or **Up/Down**, **Page Up/Page Down**, and **Home/End**. The header, version tabs, and Edit control stay visible. Block summaries and memo documents render Markdown with colored headings.

![Block detail with version tabs](docs/screenshots/dcp-block-detail.png)

### Culling — deliberately forget a range

A block can be set to version `v0`, which hides its summary while still pruning the covered messages. The detail page shows `(disabled)`, and the block reads `31.2K→0 tok`. This is how you intentionally drop context you no longer need.

![A culled block](docs/screenshots/dcp-block-culled.png)

### Edit summaries in `$EDITOR`

Click **Edit (e)** or press **e** on a block to hand the summary to your `$EDITOR` through a header-delimited temp file; save and quit to apply it as a new active version. The editable document excludes the `[Compressed conversation section]` header and trailing block-reference tag. Summary tools use the same document-only representation; DCP supplies those wrappers separately in model context. The sidebar list can also be collapsed to reclaim screen space.

![Editing a block summary in $EDITOR](docs/screenshots/dcp-block-edit-key.png)

### Messages view — inspect the tracked chain

Browse the underlying messages and their compression state, page by page. Use **<** for Newer and **>** for Older, or click the paging buttons. Conversation changes refresh after the assistant finishes, without jumping away from a valid current page.

![DCP messages view](docs/screenshots/dcp-messages.png)

### Memo — durable, editable project memory

A per-session memo that survives compaction and can be edited with **Edit (e)**, keeping working commands, constraints, and takeaways out of the volatile chat history.

![DCP memo view](docs/screenshots/dcp-memo.png)

### Skills — immediate loading, stable protected context

The native `skill` tool still loads skills through OpenCode. A successful load immediately marks the skill loaded; loading it again fails unless `force: true` is supplied. A failed load leaves it unloaded, including a failed forced reload. `unload_skill` removes a skill from the loaded list. Both tools are allowed during housekeeping, subject to OpenCode permissions, and entry guidance lists the loaded skills.

The protected list is separate: only a successful `leave_housekeeping` copies the loaded list into it. Protected skill calls and results are injected immediately after the memo, or at the same context anchor when there is no memo. Loading or unloading during housekeeping does not change that injected prefix until leave succeeds. Reverting housekeeping restores its protected list without rolling back immediate loaded status. Skill management alone does not satisfy the leave guard.

Open **DCP Skills** (`/dcp-tui-skills`) to inspect the current session's loaded list. Each row shows its name/title and status: **in context** means loaded but not protected; **injected** means loaded and protected. The list updates when loaded or protected state changes, without waiting for housekeeping leave to reflect a load or unload. It is read-only and does not list the host's entire skill inventory.

Skills are not blanket-protected by default. Unloading stops the protected injection after the next successful leave; original skill messages remain in history and can be compressed normally. Explicit `protectedTools` configuration is still respected. Existing sessions start with both lists empty rather than inferring loads from old tool calls. Skill lifecycle tracking uses each host's native tool interfaces.

### Refresh — committed state without losing your place

The sidebar and pages share a session-scoped cache. Conversation updates are fetched incrementally after assistant completion, rather than reloading the entire conversation on every event. Block, memo, and skill views observe persisted state; draft block and memo edits remain private until housekeeping commits. Editor saves use the same refresh path. Valid page, block, and explicit summary-version selections are preserved as data changes.

## Installation

OpenCode installs plugins directly from npm by name — no local build required.

1. Add the package (and its TUI companion) to your OpenCode config,
   `~/.config/opencode/opencode.json`:

    ```json
    {
        "$schema": "https://opencode.ai/config.json",
        "plugin": ["@architectural-composition/opencode-hyperdcp"]
    }
    ```

    Scoped npm packages are supported. OpenCode installs the plugin automatically
    with Bun at startup and caches it under `~/.cache/opencode/node_modules/`.

2. The TUI pages and sidebar are registered through `~/.config/opencode/tui.json`:

    ```json
    {
        "$schema": "https://opencode.ai/tui.json",
        "plugin": ["@architectural-composition/opencode-hyperdcp"]
    }
    ```

    Alternatively, add the package with the CLI, which writes these entries for you:

    ```sh
    opencode plugin @architectural-composition/opencode-hyperdcp
    ```

3. Restart OpenCode. Package updates are managed with `opencode plugin list`,
   `opencode plugin check`, and `opencode plugin update`.

## Usage

1. Open the DCP pages from the command palette (`ctrl+p`) with `/dcp-tui-blocks`,
   `/dcp-tui-messages`, `/dcp-tui-memo`, or `/dcp-tui-skills`. Use **Esc** to go back.
2. When context grows, act on the nudge:
    - review blocks in the **DCP Blocks** sidebar,
    - rewrite or switch a summary version,
    - protect messages you must keep, or cull blocks you no longer need.

The plugin ships alongside server-side commands (`/dcp ...`) and AI tools (search & retrieve of compressed messages) for finer-grained control.

On v2, informational command output and message-style compression notifications are queued without waking the agent just to display them; immediate transcript display is not guaranteed. `/dcp compress` and `/dcp rewrite` deliberately invoke the agent. Toast notifications use the TUI connection.

For example, to allow a specific read-only tool during housekeeping, add this to the DCP configuration:

```json
{
    "housekeeping": {
        "allowedTools": ["read"]
    }
}
```

Compression protection is configured separately from command protection:

```json
{
    "compress": {
        "protectSubagent": "metadata",
        "protectedTools": ["read"]
    }
}
```

`compress.protectSubagent` accepts `none`, `metadata`, or `full` and defaults to `metadata`. `compress.protectedTools` protects configured tool outputs during compression; `task` and `subagent` outputs are not appended through this generic list.

- `none` leaves subagent messages subject to ordinary compression.
- `metadata` retains every running execution, plus terminal executions whose termination message is covered by the last summary block projected in conversation order. Records appear after protected skills and include the calling reference, child session, status, title, steering references, and a result reference for completed executions.
- `full` also retains that execution's delivered report, without fetching a later answer from the child session.

Steering a running child adds to its execution entry; resuming after termination creates a separate entry. Canceled and failed executions follow the same coverage rule as completed executions, but omit the result reference. Command protection defaults are independent of these settings.

## Notes

- This README is an overview, not a manual. See the code and `KNOWN-ISSUES.md` for current behavior and limitations.
- Screenshots are generated by the PTY-driven capture harness in `scripts/` (see `scripts/README.md`).
