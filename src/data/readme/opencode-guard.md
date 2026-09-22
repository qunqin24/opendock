# opencode-guard

Permission modes and a shell safety floor for [opencode](https://opencode.ai). It
lets a coding agent work without asking about every command, while still refusing
destructive commands, keeping it out of credential stores and scrubbing secrets
from what it reads. A language-model classifier is used for exactly one question,
and only when nobody is there to answer it instead: may this command run with
nobody to ask?

## Install

```sh
npm install -g opencode-guard      # the oc-mode, oc-auto, oc-check and oc-reveal commands
```

```jsonc
// ~/.config/opencode/opencode.json
{ "plugin": ["opencode-guard"], "permission": { "edit": "ask", "bash": "ask", "webfetch": "ask" } }
```

Restart opencode. The `permission` block matters: opencode's default is to allow
almost everything, and the modes below decide how the guard answers the prompts
opencode raises. With nothing set to `ask` there is nothing to answer, and only the
floor and the classifier gate (which do not depend on it) are left.

To run from a checkout instead, `npm install` in it and symlink `plugin.js` to
`~/.config/opencode/plugin/opencode-guard.js`; imports resolve against the
symlink's target, so `lib/` and `node_modules/` are found in the checkout.

## Quick start

With nothing configured you are in `manual` mode: opencode asks about everything it
normally asks about, and the floor runs under it. Try asking the agent to
`cat ~/.ssh/id_ed25519` or `git reset --hard`; both are refused with a reason,
whatever your permission rules say.

See what the guard would do with a command, without running it:

```sh
oc-check --static 'git push --force origin main'
oc-check --static 'cd src && rg TODO | head -20'
```

To let the agent work without prompts, point the guard at a classifier and switch
modes:

```sh
cat > ~/.config/opencode/classifier.json <<'EOF'
{ "url": "http://localhost:11434/v1/chat/completions", "model": "qwen2.5:7b-instruct", "private": true }
EOF
oc-mode auto
```

Any small instruction model that answers in one word will do; a model that thinks
out loud before answering needs its thinking turned off (see `extraBody` below), or
it spends its token budget before it says SAFE.

In `auto`, file edits and reads go through, shell commands on the static read list
run at once, and any other shell command runs only if the classifier answers SAFE.
Anything else is refused with a message the agent can act on. `oc-mode manual`
goes back.

Headless runs (`opencode run`, `opencode serve`, `--auto`) behave like `auto`
whatever the mode says, because nobody is there to answer a prompt.

## Configuration

Every file is optional. The switches are re-read on every decision, so a change
applies to running sessions without a restart.

| File | Set by | Purpose |
|---|---|---|
| `~/.config/opencode/mode` | `oc-mode` | Global mode: `manual`, `edits`, `auto`. |
| `~/.local/share/opencode/modes/<sessionID>` | a TUI integration | Per-session mode, including `god`. Overrides the global one. |
| `~/.config/opencode/autoclass` | `oc-auto` | Level: `on`, `static`, `off`. |
| `~/.config/opencode/reveal` | `oc-reveal` | Deadline of the reveal window. |
| `~/.config/opencode/classifier.json` | you | The classifier (below). Re-read on every classification. |
| `~/.config/opencode-guard/config.json` | you | Site policy (below). Read once at startup. |
| `~/.local/share/opencode/autoclass.log` | the plugin | Decision log, truncated at 512 KB. |
| `~/.local/share/opencode/classifier-verdicts.json` | the plugin | Verdict cache shared by sessions, keyed by a hash of directory and command, six-hour TTL. |

### Modes and levels

The table describes how the guard answers a permission opencode raises; "ask"
means it leaves the prompt to you.

| Mode | File edits and reads | Shell commands | Other permissions |
|---|---|---|---|
| `manual` (default) | ask | ask | ask |
| `edits` | allow | ask | ask |
| `auto` | allow | static read: allow. Otherwise the classifier: SAFE allows, anything else is refused | allow |
| `god` | allow | allow, floor off | allow |

`god` exists only per session, only in an attended session, and is never inherited
by a subagent. The floor (below) runs in every other mode. Redaction runs in all
four.

The level is the escape hatch: `on` is everything, `static` drops the classifier
(in `auto`, a command that is not a static read then gets a prompt instead of a
model call), and `off` turns the plugin off.

### Site policy: `~/.config/opencode-guard/config.json`

Also `$OPENCODE_GUARD_CONFIG`. See `examples/config.example.json`.

| Key | Meaning |
|---|---|
| `extraCredentialPatterns` | `[{ "pattern": "<regex>", "root": "<path under $HOME>" }]`. Paths refused like `~/.ssh/id_*`. `root` lets the native-tool guard see a glob or grep over a directory that contains one. |
| `extraPromptableCredentialPatterns` | `["<regex>"]`. Commands that read a secret and must reach a person: a prompt when attended, a refusal when not. `rbw`, `bw`, `op`, `pass` and `gopass` reads are built in. |
| `credentialAdvice` | One sentence appended to every credential refusal, telling the agent how secrets are meant to reach a process at your site. |
| `trustedSshHosts` | `["gpu-box", "*.lan"]`. Hosts whose `ssh host "<command>"` payload is judged by the static read table like a local command. Empty by default; `["*"]` trusts every host. |
| `loopGuard` | `{ "enabled": true, "warnAt": 12, "handBackAt": 25 }`. |

Extras can only add protection. A malformed file or pattern is ignored and the
built-in floor stands.

### The classifier: `~/.config/opencode/classifier.json`

Any OpenAI-compatible `/chat/completions` endpoint works: llama.cpp, Ollama, vLLM,
LM Studio, or a hosted API. The request is one system prompt and one line naming
the working directory and the command; the answer must start with `SAFE` for the
command to run.

| Key | Meaning |
|---|---|
| `url` | Endpoint. Also `$OPENCODE_GUARD_CLASSIFIER_URL`. |
| `model` | Model id sent in the request. |
| `authToken` | Bearer token. Also `$OPENCODE_GUARD_CLASSIFIER_TOKEN`. No header is sent without one. |
| `authTokenFile` | A file whose first line is the bearer token, read on each classification, so the token itself stays out of this file. `~/` is expanded. `authToken` wins when both are set. |
| `private` | `true` if the endpoint keeps data on machines you control. Only then may a session under a privacy profile use it. |
| `votes` | 1 to 5. Above 1, the classifier is asked that many times and SAFE needs a strict majority. |
| `timeoutMs` | Default 25000. |
| `extraBody` | Merged into the request body. A key set to `null` removes a default (`temperature`, `top_p`, `seed`, `max_tokens: 8`). For llama.cpp with a thinking model: `{ "chat_template_kwargs": { "enable_thinking": false } }`. |
| `promptAddendum` | Site rules appended to the built-in prompt, taking precedence over it, e.g. an operation that is routine on your machines but on the built-in RISKY list. |
| `systemPrompt` | Replaces the built-in prompt entirely. |
| `broker`, `brokerDir`, `brokerAgents`, `noThinkProviders` | The optional broker lane, below. |

A hosted endpoint:

```json
{ "url": "https://api.openai.com/v1/chat/completions", "model": "gpt-4.1-mini" }
```

with the key in `OPENCODE_GUARD_CLASSIFIER_TOKEN`. A small local instruction model
is usually the better choice: it is fast, free per call, and command text never
leaves the machine.

### The optional broker lane

[opencode-broker](https://github.com/sudolulo/opencode-broker) is a model router
for opencode. When its socket exists (`~/.local/share/opencode/model-routing/broker.sock`,
or `brokerDir`), the guard uses it in two ways. It reads the session's routing
profile, so that a privacy profile's command text never reaches a cloud classifier.
And it adds a second classifier lane: the guard leases a classifier target from the
broker and runs it as a disposable child session through an opencode agent named in
`brokerAgents` (see `examples/agents/` and `examples/classifier.broker.example.json`).
The direct endpoint is tried first when both exist; the broker lane is the fallback
when the direct one fails fast. `"broker": false` turns the lane off.

Without the broker, every session's profile is `auto` and the direct endpoint is
the only lane. Nothing else changes.

### Commands

| Command | Does |
|---|---|
| `oc-mode [manual\|edits\|auto\|next]` | Show or set the global mode. Refuses `god`. |
| `oc-auto [on\|static\|off\|next]` | Show or set the level. |
| `oc-check [--static] '<command>'` | Walk the same tiers as the plugin and report what each mode would do. |
| `oc-reveal [<seconds>\|off]` | Open or close the reveal window, 60 s by default, 600 s at most. |

All four refuse to change anything when run from inside opencode.

## Design

### One question

A safety layer for a coding agent is usually built as "ask a model whether this
command is dangerous". That is the wrong question. The question the layer has to
answer is narrower:

> May this run with nobody to ask?

When a person is there, the right answer to an ambiguous command is a prompt. A
prompt costs one keypress. A model's opinion in the same situation is strictly
worse: slower, sometimes wrong, and when it is wrong it ends the task instead of
asking. So in `manual` and `edits` the classifier is never called. No model call,
no latency, nothing to be wrong about.

The classifier is reached in exactly two situations: `auto` mode, where the person
has said they do not want to be asked, and a headless session, where nobody can
be. There it decides alone and fails closed. A static read passes without a call.
A SAFE verdict passes. RISKY, an unreadable answer, a timeout or an unreachable
endpoint are all refusals. The expensive path is also the rare one: most commands
are settled by the static tiers, and most attended sessions make no classifier
calls at all.

Why `auto` refuses rather than prompts: on opencode 1.18 the `permission.ask`
plugin hook never fires, so a plugin cannot turn a verdict into a dialog. It can
throw, stand aside, or answer a permission that has already been raised. A prompt
for every gray-zone command is what `manual` mode already is. A refusal that says
what was refused and why, and tells the agent to try a narrower way or stop and
ask, is what `auto` is for.

### The mode ladder

`manual`, `edits`, `auto`, `god`, in the shape of Claude Code's permission modes.
Two axes are kept apart on purpose. The mode says how much is waved through
without asking. The level says how hard the floor pushes back. Folding them into
one knob makes "turn the checks down a little" and "stop asking me" the same
action, and they are not.

`god` is a deliberate, per-session act. It is never the global default (`oc-mode`
refuses it, and a hand-written global `god` reads as `auto`), never inherited by a
subagent, and never honoured in a headless run, including a headless run that
resumes a session whose file says `god`. The point of having it is that "no
limits" is something a person switches on, rather than a reason to loosen the other
three modes until they are convenient.

A restrictive default is not automatically a safe one. A subagent used to fall
through to the global default, which was `manual`, the strictest mode. The result
was not extra safety: every permission the subagent raised landed on the operator
as a prompt, and its shell commands were never classified at all. A layer that asks
too often teaches people to stop reading what it asks.

### The floor

Two checks run on every process-spawning tool call (`bash`, and `pty_spawn`,
`pty_write` and `bg_run` from pty and background-shell plugins) in every mode but
`god`:

1. **cc-safety-net** static analysis. A deny verdict throws. So does an exception
   from the analyser: its API contract is that a throw means "do not run it".
2. **The credential guard.** Paths such as `~/.ssh/id_*`, `~/.aws/credentials`,
   `~/.kube/config`, `~/.docker/config.json`, `~/.gnupg/` and `/etc/shadow`, plus
   the site's own, are refused outright. Password-manager reads are refused when
   nobody is present and left to a prompt when someone is.

The credential guard lives in the plugin rather than in opencode's permission
globs, and this is the detail most worth knowing. opencode resolves permission
rules last match wins, and an agent's own `allow` block is appended after the
global rules. A single `cat *: allow` in any agent definition silently overrides a
global deny on credential paths. The declarative approach is unsound under that
ordering, so the check has to live somewhere that cannot be appended past.

### The static read table

About 140 inspection verbs (`ls`, `rg`, `jq`, `git log`, `docker ps`,
`kubectl get`, `systemctl status`, ...) settle without a model call. Many read by
default and write with one flag, so they carry per-verb guards: `sed` without `-i`,
`find` without `-exec` or `-delete`, `curl` without a body, upload, output file or
method flag (matched as prefixes, so `-XPOST` and `-sSLo` are caught), `git branch`
without `-D`, `kubectl get` of anything but a Secret.

The command line is lexed with quotes honoured and every segment of a pipeline or
`&&` chain has to be a read on its own, so `cd repo && rg foo` settles while
`rg -l x | xargs rm -f` does not. A redirect that can write, or a command
substitution, disqualifies its segment. Wrappers (`env`, `timeout`, `nice`, and the
output compressors `snip` and `rtk`) are looked through. The payload of
`ssh host "<command>"` is judged by the same rules when the host is in
`trustedSshHosts`: what a command does does not change because it runs elsewhere,
but whether you trust the machine it runs on is yours to say.

The table exists for determinism as much as for speed. A small classifier asked
the same read twice has been measured calling it SAFE once and RISKY once. A rule
does not flip, costs nothing and can be tested.

### The credential guard on native tools

`read`, `glob` and `grep` never produce a shell command, so their path arguments
are checked directly, after `~` expansion and symlink resolution of the deepest
existing prefix. A `read` of a protected path and a recursive `grep` over a tree
containing one are refused. A `glob` only lists names, so it is refused only when
its pattern could actually enumerate a credential file: `glob ~ **/*` reaches
`~/.ssh/id_ed25519` and is refused, `glob ~ **/src/cursor.py` cannot and is not.
The pattern is compiled to an anchored expression and tested against stand-ins for
each protected path.

### Redaction and the reveal window

The leak that actually happened was not a blocked command. It was an allowed one
whose output carried a live credential into a transcript: a management API's app
config with a database password, a backup job's query with a cloud storage key,
`docker inspect` printing an environment block. Transcripts are stored, backed up
and read by other agents.

So secret values are replaced in tool output in every mode, `god` included, since
redaction stops nothing from running. Matching is by key (`password`, `token`,
`secret`, a trailing `_key`, PEM blocks) across JSON, `KEY=value` and YAML shapes,
not by entropy: guessing that a string looks random mangles the hashes, ids and
base64 an agent legitimately needs. The output says how many values were redacted,
because an agent that silently receives a marker where a value should be assumes
the command failed and retries it.

Redaction needs a way out or it becomes the thing people switch off. `oc-reveal 60`
opens a window, for at most ten minutes, in which nothing is redacted and every
output that would have been is labelled as unredacted, so a transcript containing
a secret does not look like one that does not. The window is armed from a real
terminal only: the script refuses to run under opencode, and the plugin refuses any
tool call that names it or writes its file.

### The guard's own switches

The mode, level, reveal deadline and classifier config are plain files. A native
`write` to `~/.config/opencode/autoclass` in `auto` mode is an edit plus an
external-directory permission, and `auto` approves both. So a tool call that writes
one of those files, or a shell command that names one and is not a static read, is
refused, and the `oc-*` commands refuse to change anything when run under opencode.
Like the reveal guard, this stops a helpful model from unblocking itself. It is
not a sandbox.

### Subagents inherit their parent's mode

A subagent has no mode file of its own, so it tracks its parent's mode, capped
below `god`. When a subagent in an inherited mode is refused a permission, the
refusal is answered rather than left as a prompt for the operator, and the parent's
task result gets a list of what was refused and why. The parent holds the mode the
child was refused under, so it decides: run it itself, re-dispatch a narrower
brief, or ask the user. A credential request from such a child always fails
closed; fetching a secret is the parent's call.

### The dispatch gate

An agent can declare `capability: read`, `write` or `exec` in its frontmatter. A
`task` dispatch to a `read` agent must start its prompt with the line
`INTENT: read`; otherwise it is refused before a child session is created, with a
message naming the mismatch. Handing write work to an agent that cannot write fails
anyway, later, after the child was created and paid for, with an error that looks
like a permission problem instead of the dispatch mistake it is. Agents that
declare `write`, `exec` or nothing are untouched, so the gate cannot break a
dispatch that works today. It runs even in `god`: god lifts limits on what may run,
it is not licence for an incoherent tool call.

### Refusing tool calls after Esc

opencode 1.18 runs a tool call the model emitted without first checking whether the
turn was cancelled; it looks at the abort signal only after the tool ran. Normally
that window is milliseconds. With a starved event loop it was measured at minutes:
subagents kept reading files after the operator pressed Esc. Before every tool call
the guard reads the session status list, which holds only sessions that are busy or
retrying, and refuses a call for a session that is not on it. A status read that
fails allows, so this can never stall a live session.

### The loop guard, and how it differs from `doom_loop`

opencode has a built-in `doom_loop` permission, `ask` by default. It fires when the
last three tool calls in one assistant message are the same tool with identical
input. It is fast and it catches repeated writes, but it misses the loop that
actually happens: an agent rotating through a few read-only probes (A, B, C, A, B,
C), across many messages, getting the same answers back. One such session was
measured at 306 repeats. And because `doom_loop` is a permission prompt, it only
helps when someone answers it: a headless run answers it without a person
(`--auto` approves it, a plain `opencode run` rejects it), and this plugin's `auto`
and `god` modes approve it like any other non-shell permission.

The loop guard counts sterile repeats: a read-only tool call whose input and output
both match an earlier call in the same session, with no state-changing call in
between. Repeating a read of unchanged state acquires no information; that is a
fact about the call, not a guess about the model. The streak is global to the
session, so a rotation counts. Any state-changing call (an edit, a write, a task,
any tool not known to be read-only) clears the memory, so a long burst of edits to
one file never reads as a loop, and a read whose output changes (a log being
tailed) never counts. At 12 the tool result gets a warning; at 25 a subagent is
handed back: its parent is sent the evidence, then the child is aborted. A root
session is warned and never aborted. The thresholds come from recorded sessions,
where the looping one reached 306 and four long legitimate ones peaked at 2 to 5;
an earlier sliding-window design scored a legitimate editing burst worse than the
real loop and was dropped.

The two are complementary. Leave `doom_loop` on.

### Privacy profiles

With opencode-broker installed, a session can carry a privacy profile (`local`,
`private`, or one added later). Any profile other than `auto` and `manual` is
treated as one whose command text may not leave local infrastructure, including
names the guard has never seen: the check is on the shape of the name, not a list,
because a list would fail open the day the broker gains a profile. Such a session
is classified only by a direct endpoint marked `private`, or by a broker lease
requested with `localOnly`, whose target must come back as local. With neither, the
command is refused, not sent.

### What it is not

A sandbox. The guard is built to stop a well-meaning agent from doing something
harmful by mistake and from quietly unblocking itself. A process determined to
defeat it on a machine where it can already run code will find a way: build a path
the patterns do not match, or run an interpreter. The floor raises the cost of an
accident; isolation is a different tool.

## Integrations

All optional, all through documented contracts rather than code dependencies:
opencode-broker (profiles and a classifier lane), pty and background-shell plugins
(their process-spawning tools are judged like `bash`), the `snip` and `rtk` output
compressors (looked through as wrappers), and any TUI plugin that writes
per-session mode files.

## Compatibility

opencode 1.x, tested on 1.18.22 and later. A port to opencode 2.x is planned. The
plugin runs inside opencode; the `oc-*` commands and the tests need Node 20 or
later. cc-safety-net 2.4 is used as a library through its `checkCommand` API, so
its own plugin-installer requirements do not apply.

## Prior art

- **[cc-safety-net](https://github.com/kenryu42/cc-safety-net)** does the static
  analysis in the first tier of the floor, and does it far better than a regex
  table could: it parses the shell, follows `cd`, heredocs and interpreter bodies,
  and knows which `git` and `rm` forms destroy work. opencode-guard uses it as a
  library and adds what it does not cover: modes, the classifier, native-tool and
  site credential guards, redaction and the session-level checks.
- **Claude Code's permission modes** are the model for the mode ladder: ask by
  default, accept edits, an automatic mode, and an explicit bypass.
- **[opencode-permission-reviewer](https://github.com/warc0s/opencode-permission-reviewer)**
  reviews every `ask` permission with a tool-free model session, reading the
  request, transcript evidence and a policy you write, and allows, denies with
  feedback or escalates. It is broader than this plugin's classifier and asks the
  model about attended sessions too; opencode-guard's premise is that an attended
  session should get a prompt, not a model.
- **[opencode-safety-classifier](https://gitlab.com/lvq-consult/opencode-safety-classifier)**
  checks every `bash` command with an on-device parser first and a safety
  classifier at an endpoint you control second, and denies on any failure. The
  shape is close to this plugin's shell path; the difference is where the classifier
  is consulted (always, there; only when nobody can be asked, here) and the rest of
  the layer around it.

## License

MIT. See [LICENSE](LICENSE).
