# opencode-task-complete

The `task_complete` tool for **OpenCode v2** — the model's explicit "I am
finished" signal, and the thing that makes a watcher (auto-resume) stand down
instead of nudging a finished session back to life.

v2 removed v1's `task_complete`. This plugin puts it back, as a *general*
capability rather than a private copy inside one watcher: the tool registry is
**one global map per opencode server**, so every plugin can list it, extend it
and observe its calls.

```sh
# opencode.jsonc
"plugins": [
  "opencode-task-complete@latest"
]
```

or, from a checkout:

```json
{ "package": "file:///path/to/opencode-task-complete" }
```

**In the box:** the plugin (`index.js`), a test suite (`test/`), a worked
consumer example (`examples/watcher/`), a [changelog](CHANGELOG.md) and
[contributing notes](CONTRIBUTING.md). No runtime dependencies.

**Check it works in one turn** — with the plugin installed, ask for a no-op
task and look for the model calling `task_complete` and ending its reply with
`TASK COMPLETE` on its own last line:

```
> This is a no-op task: there is nothing to do here. Finish your turn now.
```

---

## The tool

| | |
|---|---|
| name | `task_complete` |
| arguments | none — the signal is the call, not a payload |
| surface | **direct**: the model calls it itself (see below) |
| result | `{ content, metadata: { completed: true } }` — or `metadata: { completed: false, openTodos: N }` when the todo gate refused it |

### Why it is a DIRECT tool

The tool registers with `options: { codemode: false }`. Without that option a
plugin tool lands in the **Code Mode catalog** and is only reachable through
the `execute` runtime — the model can never call it, and any instruction to do
so ends in an unknown-tool error. In opencode's core
(`packages/core/src/tool.ts`) the registry is split in two: `direct` — the
tools with `codemode === false` — and the Code Mode catalog, and only `direct`
reaches the model as a top-level tool. The `opencode-todolist` plugin (npm
`opencode-todolist@0.6.1`) uses the same switch.

### v1 semantics, kept

- **The todo gate.** A completion is refused while todos are still open, and
  the result names them. A model that keeps calling after that is a loop, not
  a worker, so the block is bounded (`maxOverrides`, default 3): after that the
  call is believed.

  The gate reads the `todowrite` history, so **it needs no todo plugin**:
  with none installed there is no list, the gate never refuses, and the tool
  is a pure completion signal. The model then tracks its work wherever the
  operator's protocol says — a findings file or a todo file — and the
  completion signal is the same either way.
- **The ack self-loop guard.** The ack is fed straight back into the turn, and
  a stuck model answers it by calling the tool again rather than ending with
  text (v1 logged 27 consecutive acked calls with zero new user input). So the
  first call acks with an explicit stop instruction, the second warns, the
  third throws to force the turn to end.
- **The counter resets** on a new inbound user message and on any other tool
  call, so the escalation measures a genuinely stuck loop and not several
  legitimate rounds of work.

### The two completion signals

There are two ways a model can say "I am finished", and a watcher has to
understand both:

1. **The tool call.** `task_complete` — structured, machine-readable, and the
   result says whether the todo gate accepted it. This is what this plugin
   provides.
2. **The bare line.** `TASK COMPLETE`, alone on the last line of the reply.
   Any watcher can read that out of the transcript, with no tool involved at
   all — which is why the protocol below teaches it **unconditionally**, even
   though the tool is right there:

   - opencode withholds tools from sessions created before the last restart,
     so a session that predates this plugin's install cannot call it at all;
   - a tool can be disabled for a session, or the plugin may not be installed
     on the box at all.

   The line is the signal that always works, so the model emits it either way.

Neither signal is auto-resume-specific. Any plugin that watches sessions can
use either; auto-resume is just one that does.

**Subagents are not counted.** A worker's completion is the *controller's*
business: the controller is already notified when a worker finishes, and what
it reads is the worker's own contract — the `DONE: <one-line summary>` the
controller specified for that worker. So the plugin does not teach workers the
protocol, and the tool's todo gate is skipped for them (v1 parity: v1
registered the tool globally, a subagent could call it, and it changed nothing
for the parent).

### The protocol

The plugin injects the completion rule into the session's system prompt, so
the model knows *when* to call the tool even in an install with no AGENTS.md
and no other plugin: opencode exposes a `context` session hook that fires
before every model request, and the rule is pushed onto the request's system
prompt there.

> Task completion: when all the requested work is done, call the task_complete
> tool once - that is what stops the automatic continue nudges. If todo tools
> are available, mark every todo completed first: a completion with open items
> is refused and you are told what is left. If there are no todo tools, keep
> the work list in a findings file or a todo file and mark items done there
> instead. Call it once, then end the turn with a brief text reply. Always end
> that reply with the bare words TASK COMPLETE on their own last line - even
> when the tool was available, because opencode withholds tools from sessions
> created before the last restart, and the line is the completion signal that
> always works: a watcher reads it from the transcript.

**It checks first.** If the rule is already in effect - an operator's
AGENTS.md, an agent file, another plugin's injection - the plugin stays quiet
rather than saying the same thing twice on every request.

The bare-line fallback (`TASK COMPLETE` on its own last line) is the other
half of the protocol, and it needs no plugin: a watcher can detect the
end-anchored line itself.

---

## How a plugin checks for task completion

Two ways, and the second is the one that generalises.

### 1. Watch the tool call (recommended)

Every plugin in the server can observe the call through the registry's
`execute.after` hook. The event carries the tool name, the session, the status
and the result — so a consumer does not need to own the tool, and does not
need to poll anything:

```ts
ctx.tool.hook("execute.after", async (event) => {
  if (event.tool !== "task_complete") return
  if (event.status !== "completed") return

  const completed = event.result?.metadata?.completed !== false
  if (!completed) {
    // The todo gate refused it: event.result.metadata.openTodos says how
    // many are still open, and event.result.content names them.
    return
  }
  // The model says the work is done.
})
```

`event.result.metadata.completed` is the channel: `true` = the completion was
accepted, `false` = the todo gate refused it (`metadata.openTodos` says how
many are open). A consumer that only cares about "the work is done" checks
`completed === true` and ignores everything else.

### 2. Read the tool's own state

A plugin that wants the completion state of a session it is driving can also
look for the tool in the registry and call it the way a model would — the tool
is a normal tool, so `ctx.tool.list()` and the editor APIs work on it like on
any other.

### 3. The text fallback

With no tool in the session, the protocol's other half applies: the reply ends
with the bare words `TASK COMPLETE` on their own last line, and a watcher
detects that end-anchored line itself. A watcher that supports both is
covered whichever way the model signals.

---

## Example: auto-resume

**auto-resume** (the stall watchdog) is the worked example. It exists to wake
a session that stopped mid-flight — but a session that has *finished* must not
be woken, so it needs to know when the model says it is done. It does not own
the tool; it observes it:

```ts
// auto-resume: src/v2/index.ts
ctx.tool.hook("execute.after", async (event: any) => {
    if (event?.tool !== "task_complete") return
    if (event?.status !== "completed") return
    const sid = event?.sessionID
    if (!sid) return
    const w = ensureWatch(sid)
    const result = event?.result
    if (result?.metadata?.completed === false) {
        // The todo gate refused it: name the work that is left. The tool
        // result carries the reminder, but a collapsed tool result would hide
        // it, so auto-resume injects it too.
        const content = typeof result?.content === "string" ? result.content : ""
        if (content) await injectOnce(sid, content, "task-complete-blocked")
        return
    }
    // The stand-down: the completion latch stops the nudges.
    w.completionSignaled = true
    w.completionSignaledAt = Date.now()
})
```

auto-resume also keeps a **fallback copy** of the tool, registered only when
nothing else provides it, so it still works as-is in an install without this
plugin. It decides by two signals: the **live tool list** (does a
`task_complete` tool already exist in the registry?), and — decisively,
because plugins load in the order they are listed in the config, so a plugin
listed after auto-resume has not registered its tool yet — the **config file**
(does `opencode.jsonc` list a task-complete plugin at all?).

---

## Where the todo list comes from

When the `opencode-todolist` plugin (npm `opencode-todolist@0.6.1`) IS
installed, the list belongs to it, and plugin storage is namespaced per
plugin id, so the list is read the way that plugin's own TUI reads it: the
newest completed `todowrite` tool part in the session history. A
`todowrite` REPLACES the whole list, so the newest such call IS the current
list. An entry with an unrecognized status is kept rather than dropped: only
`pending`/`in_progress` count as open, so an unknown status reads as closed —
and dropping it would shrink the list, which is the dangerous direction (it
makes real open work look finished).

## Tests

```sh
bun test test/
```

## Repository

- source of record: <https://github.com/famewolf/opencode-task-complete>
- a mirror lives on gitea (`famewolf/opencode-task-complete`)

## License

MIT — see [LICENSE](./LICENSE). The session todo-list parser is derived from
the npm package `opencode-todolist@0.6.1` —
[aiev/opencode-todolist](https://github.com/aiev/opencode-todolist), tag
`v0.6.1`, file
[`src/tui-data.ts`](https://github.com/aiev/opencode-todolist/blob/v0.6.1/src/tui-data.ts)
(MIT, © 2026 aiev). The third-party notice is in the LICENSE file.
