# opencode-dap

DAP (Debug Adapter Protocol) client for OpenCode — ported from [oh-my-pi](https://github.com/anomalyco/oh-my-pi).

Lets AI coding agents debug programs via the Debug Adapter Protocol — supports 14 debug adapters covering ~18 languages. Drop it into OpenCode with a single `plugin` entry or use it as a standalone Bun/Node library.

## Quick Start

```bash
opencode plugin @debugtalk/opencode-dap
```

Restart OpenCode. The `debug` tool is available with 30+ actions. Debug sessions are automatically cleaned up on session idle/deleted.

### Upgrade

```bash
opencode plugin @debugtalk/opencode-dap --force
```

### Verify

```bash
grep "opencode-dap" ~/.local/share/opencode/log/opencode.log
```

Then in OpenCode, run `debug action=sessions` to confirm the tool is registered.

### Manual install (not recommended)

```bash
npm install @debugtalk/opencode-dap --save-dev
```

Then add to `opencode.json`:

```json
{ "plugin": ["@debugtalk/opencode-dap"] }
```

### Install debug adapters

```bash
pip install debugpy          # Python
brew install llvm            # macOS: C/C++/Rust/Swift (lldb-dap)
go install github.com/go-delve/delve/cmd/dlv@latest  # Go
npm install -g @vscode/js-debug      # JavaScript / TypeScript
npm install -g @vscode/bash-debug    # Bash / Shell
```

## Standalone API

For use outside OpenCode or when building custom integrations:

```ts
import { DapSessionManager, selectLaunchAdapter } from "@debugtalk/opencode-dap";

const cwd = process.cwd();
const adapter = selectLaunchAdapter("src/main.py", cwd);
if (!adapter) throw new Error("No debug adapter available");

const mgr = new DapSessionManager();

// Launch
const snapshot = await mgr.launch({ adapter, program: "src/main.py", cwd });
console.log("Status:", snapshot.status);

// Set breakpoint
const bp = await mgr.setBreakpoint("src/main.py", 10);

// Continue
const outcome = await mgr.continue();

// Evaluate when stopped
const result = await mgr.evaluate("myVar", "repl", undefined);
console.log("myVar =", result.evaluation.result);

// Terminate
await mgr.terminate();
```

To build a custom tool, import `DapSessionManager`, `selectLaunchAdapter`, etc. from the library. See [src/plugin.ts](https://github.com/debugtalk/opencode-dap/blob/main/src/plugin.ts) for the reference implementation.

## Supported Adapters

| Adapter | Languages | Command | Install |
|---|---|---|---|
| `gdb` | C, C++, Rust | `gdb -i dap` | system package |
| `lldb-dap` | C, C++, ObjC, Swift, Rust, Zig | `lldb-dap` | `brew install llvm` (macOS), `apt install lldb` |
| `codelldb` | C, C++, Rust, Zig | `codelldb` | VS Code extension |
| `debugpy` | Python | `python -m debugpy.adapter` | `pip install debugpy` |
| `dlv` | Go | `dlv dap` | `go install github.com/go-delve/delve/cmd/dlv@latest` |
| `js-debug-adapter` | JavaScript, TypeScript | `js-debug-adapter` | `npm install -g @vscode/js-debug` |
| `netcoredbg` | C#, F# | `netcoredbg --interpreter=vscode` | [GitHub](https://github.com/Samsung/netcoredbg) |
| `kotlin-debug-adapter` | Kotlin | `kotlin-debug-adapter` | [GitHub](https://github.com/fwcd/kotlin-debug-adapter) |
| `rdbg` | Ruby | `rdbg --open --command --` | `gem install debug` |
| `php-debug-adapter` | PHP | `php-debug-adapter` | VS Code extension |
| `bash-debug-adapter` | Bash/Shell | `bash-debug-adapter` | `npm install -g @vscode/bash-debug` |
| `dart-debug-adapter` | Dart | `dart debug_adapter` | Dart SDK |
| `flutter-debug-adapter` | Dart (Flutter) | `dart debug_adapter` | Flutter SDK |
| `elixir-ls-debugger` | Elixir | `elixir-ls-debugger` | [GitHub](https://github.com/elixir-lsp/elixir-ls) |

**Adapter auto-selection** works by file extension and project root markers. For example, `.py` files → `debugpy`, `.go` files → `dlv`, `Cargo.toml` → `lldb-dap` or `gdb`.

## API Reference

### `DapSessionManager`

Stateful orchestrator. Holds a single active session at a time.

| Method | Description |
|---|---|
| `launch(options, signal?, timeoutMs?)` | Start a debug session. Returns `DapSessionSummary`. |
| `attach(options, signal?, timeoutMs?)` | Attach to a running process. Returns `DapSessionSummary`. |
| `terminate(signal?, timeoutMs?)` | Terminate the active session. Returns `DapSessionSummary \| null`. |
| `getActiveSession()` | Get summary of the active session, or `null`. |
| `listSessions()` | List all session summaries. |
| `getCapabilities()` | Get adapter capabilities, or `null`. |

**Execution control:**

| Method | Description |
|---|---|
| `continue(signal?, timeoutMs?)` | Continue execution. Returns `DapContinueOutcome` with state. |
| `pause(signal?, timeoutMs?)` | Pause execution. |
| `stepIn(signal?, timeoutMs?)` | Step into. Returns `DapContinueOutcome`. |
| `stepOut(signal?, timeoutMs?)` | Step out. Returns `DapContinueOutcome`. |
| `stepOver(signal?, timeoutMs?)` | Step over (next). Returns `DapContinueOutcome`. |

**Breakpoints:**

| Method | Description |
|---|---|
| `setBreakpoint(file, line, condition?, signal?, timeoutMs?)` | Set a source breakpoint. |
| `removeBreakpoint(file, line, signal?, timeoutMs?)` | Remove a source breakpoint. |
| `setFunctionBreakpoint(name, condition?, signal?, timeoutMs?)` | Set a function breakpoint. |
| `removeFunctionBreakpoint(name, signal?, timeoutMs?)` | Remove a function breakpoint. |
| `setInstructionBreakpoint(instructionReference, offset?, condition?, hitCondition?, signal?, timeoutMs?)` | Set an instruction breakpoint. |
| `removeInstructionBreakpoint(instructionReference, offset?, signal?, timeoutMs?)` | Remove an instruction breakpoint. |
| `dataBreakpointInfo(name, variablesReference?, frameId?, signal?, timeoutMs?)` | Get data breakpoint info for a variable. |
| `setDataBreakpoint(dataId, accessType?, condition?, hitCondition?, signal?, timeoutMs?)` | Set a data breakpoint. |
| `removeDataBreakpoint(dataId, signal?, timeoutMs?)` | Remove a data breakpoint. |

**State inspection:**

| Method | Description |
|---|---|
| `stackTrace(frameCount?, signal?, timeoutMs?)` | Get stack frames. |
| `scopes(frameId?, signal?, timeoutMs?)` | Get scopes for a frame. |
| `variables(variablesReference, signal?, timeoutMs?)` | Get variables in a scope. |
| `evaluate(expression, context, frameId?, signal?, timeoutMs?)` | Evaluate an expression. |
| `threads(signal?, timeoutMs?)` | List threads. |
| `getOutput(limitBytes?)` | Get captured stdout/stderr. |

**Memory & introspection:**

| Method | Description |
|---|---|
| `disassemble(memoryReference, instructionCount, offset?, instructionOffset?, resolveSymbols?, signal?, timeoutMs?)` | Disassemble instructions. |
| `readMemory(memoryReference, count, offset?, signal?, timeoutMs?)` | Read memory. |
| `writeMemory(memoryReference, data, offset?, allowPartial?, signal?, timeoutMs?)` | Write memory. |
| `modules(startModule?, moduleCount?, signal?, timeoutMs?)` | List modules. |
| `loadedSources(signal?, timeoutMs?)` | List loaded sources. |
| `customRequest(command, args?, signal?, timeoutMs?)` | Send an arbitrary DAP request. |

### Adapter Resolution

| Function | Description |
|---|---|
| `getAvailableAdapters(cwd)` | List all adapters resolvable from `$PATH` or local bins. |
| `resolveAdapter(adapterName, cwd)` | Resolve a specific adapter by name. |
| `selectLaunchAdapter(program, cwd, adapterName?, programKind?)` | Auto-select the best adapter for a program. |
| `selectAttachAdapter(cwd, adapterName?, port?)` | Auto-select the best adapter for attach. |
| `resolveLaunchOverrides(adapter, program, programKind)` | Get adapter-specific launch arguments (e.g., dlv mode). |
| `getAdapterConfigs()` | Get the raw adapter config map from the bundled catalog. |

### Key Types

| Type | Description |
|---|---|
| `DapSessionSummary` | Snapshot of session state (status, stop location, breakpoint counts, output stats). |
| `DapContinueOutcome` | Result of continue/step: `{ snapshot, state, timedOut }`. |
| `DapResolvedAdapter` | Adapter with resolved binary path, file types, root markers. |
| `DapCapabilities` | Adapter-reported capabilities (what features it supports). |
| `DapClient` | Low-level DAP wire protocol client. Direct use is rare; prefer `DapSessionManager`. |

## How It Works

```
┌─────────────────────────────────────────────────────┐
│ opencode plugin (opencode.json)                     │
│   "plugin": ["@debugtalk/opencode-dap"]             │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│ DapSessionManager (singleton)                       │
│   session lifecycle, breakpoint serialization,      │
│   step/continue orchestration, event handling       │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│ DapClient (per-session)                             │
│   Content-Length framing, request/response matching,│
│   async event dispatch, reverse request handling    │
└──────────────────┬──────────────────────────────────┘
                   │  stdio pipe or Unix/TCP socket
┌──────────────────▼──────────────────────────────────┐
│ Debug Adapter (external process)                    │
│   debugpy, dlv, lldb-dap, gdb, js-debug-adapter ... │
└─────────────────────────────────────────────────────┘
```

### Wire Protocol

The DAP client implements the full [Debug Adapter Protocol](https://microsoft.github.io/debug-adapter-protocol/) framing:

```
Content-Length: {byteCount}\r\n
\r\n
{JSON body}
```

Messages are typed as `request`, `response`, or `event`. Requests are matched to responses by `seq`/`request_seq`. Events are dispatched to registered handlers.

### Connection Modes

- **stdio** (default): Spawn adapter as child process, communicate via stdin/stdout.
- **socket**: For adapters that use network sockets (e.g., `dlv` on Unix domain sockets on Linux, TCP on macOS).

### Safety

- **Non-interactive environment**: All debugger child processes inherit `TERM=dumb`, disabled pagers, and CI flags to prevent SIGTTIN.
- **Request timeout**: Every DAP request times out at 30s by default.
- **Breakpoint serialization**: Concurrent breakpoint mutations are queued to prevent `setBreakpoints` from silently overwriting each other.
- **Race-condition safety**: Event subscriptions are registered before sending commands that trigger them.

## Troubleshooting

### "No debug adapter available for this program"

Install the appropriate adapter for your language (see the [Supported Adapters](#supported-adapters) table). You can check which adapters are available on your system:

```ts
import { getAvailableAdapters } from "@debugtalk/opencode-dap";
console.log(getAvailableAdapters(process.cwd()).map(a => a.name));
```

### "Failed to launch debug adapter"

Common causes:
- Adapter binary not in `$PATH` or project-local bin directory.
- Python virtual environment not activated — the resolver checks `.venv/bin/`, `venv/bin/`, and `.env/bin/` for Python projects.
- Missing runtime (e.g., `python` not found when using `debugpy`).

### "Time out" during launch/attach

Some adapters are slow to initialize. Increase the timeout:

```ts
await mgr.launch(options, undefined, 60_000); // 60 seconds
```

### "Not a tty" or hung processes

The package sets non-interactive environment variables automatically (`TERM=dumb`, disabled pagers). If your adapter still hangs, ensure it doesn't try to read from `/dev/tty`.

### "Adapter exited unexpectedly"

Check stderr from the adapter process. Common causes:
- Missing dependencies (e.g., `debugpy` not installed: `pip install debugpy`).
- Wrong architecture (e.g., 64-bit adapter on 32-bit binary).
- Permission issues when attaching to a process.
