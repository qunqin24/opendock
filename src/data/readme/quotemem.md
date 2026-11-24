# QuoteMem

QuoteMem is an auditable long-term memory service for conversational agents.
Each memory is a short statement tied to the exact words it came from. When a
fact changes, the old version is kept and marked as replaced. A user can ask the
agent to forget something: the memories the request matches are taken out of
reads and are not learned again later, except from the user's own later, dated
statement of it in the `agent` Add mode.

**What it does**

- **Quoted evidence.** Every memory points to the original message by exact
  UTF-8 byte ranges, so any answer can be traced back to the words that
  support it.
- **Versioned supersession.** An update or correction writes a new version and
  closes the old one. History stays readable through `/memory/history`.
- **Forgetting with tombstones.** Forgetting is a two-step prepare/confirm
  call. A forgotten fact leaves a tombstone that the review step checks, so
  a later restatement of it is not stored again. In the `agent` Add mode one
  thing brings it back: the user's own later, dated statement of it
  (see [Forgetting](#forgetting)).
- **Recorded review decisions.** Before a new memory is written, a review step
  compares it with the existing memories it may update. Each decision is
  stored with the snapshot of neighbours it was made against, so it can be
  audited and replayed.
- **Review modes.** `agent` (the default of `quotemem serve`) sends a new
  memory to a judge model only when it may repeat, update or correct a stored
  one, and reviews the rest with local rules. `lean-local` (the default of
  `quotemem bench serve`) reviews with deterministic local rules. `full` sends
  every candidate to a judge model. The mode is fixed when a store is created.
  In the `agent` mode you choose how strongly it reviews: `fast`, `standard`
  (the default) or `full` (`QUOTEMEM_REVIEW`, see [Review](#review)).

**How it differs.** Many memory layers store free-text summaries or embeddings
only. QuoteMem stores each memory together with its source quote, its version
history and its review decision, so every stored fact can be checked against
the conversation.

**Result.** In the Agent Memory Leaderboard (AMLB) Cycle 2 official results,
QuoteMem scored **59.83** overall and ranked **23rd of 125** entries in
*Textual Memory · Closed-source Methods*, where it is listed as "QuoteMem"
with a link to this repository:
<https://agentmemoryleaderboard.ai/results/cycle-2/#industry-textual>.

A paper describing the system is in preparation.

## Works with your tools, and they share one memory

QuoteMem runs once on your computer, as one local service (`quotemem serve`, on
`127.0.0.1:8765`). Every tool's plugin talks to that same service, so what you
tell one tool is recalled in the others, and what you ask one tool to forget is
forgotten in all of them (a second person signed in at the same time gets a
service and a port of their own). They use the same memory by default:
`QUOTEMEM_USER_ID`, which defaults to your OS user name.

1. Set up your tool. The `quotemem install` rows need the npm package once:
   `npm install -g quotemem`.

   | Tool | Set it up |
   |---|---|
   | Claude Code | `claude plugin marketplace add edsml-jz2321/QuoteMem --sparse .claude-plugin integrations`, then `claude plugin install quotemem@quotemem` |
   | Codex CLI | `codex plugin marketplace add edsml-jz2321/QuoteMem --sparse .agents --sparse integrations/codex`, then `codex plugin add quotemem@quotemem`, then trust the hooks once with `/hooks` |
   | Cursor | `quotemem install cursor --write`, plus the rule it prints, in each project |
   | OpenCode | `quotemem install opencode` prints the block to merge into `opencode.jsonc` |
   | Gemini CLI | `quotemem install gemini` prints the `gemini extensions install` command |
   | Cline (VS Code) | `quotemem install cline --write`, then turn on Enable Hooks |
   | goose | `quotemem install goose --write`, then set `GOOSE_MOIM_MESSAGE_FILE` as it prints |
   | OpenClaw | `quotemem install openclaw` prints the `openclaw plugins install` command |
   | DSH | `dsh plugin --profile quotemem add quotemem`, then start `dsh --profile quotemem` |

2. Run `npx quotemem setup` once. It asks for the models and the key the service
   uses, and the tools share that setup too.
3. Use your tools as usual. In the tools marked "seamless" below, conversations
   are saved and recalled by themselves, and "forget my ..." is carried out for
   you. Ask "what do you remember about me?" in any of them.

More tools, other ways to install, and what each tool can do:
[Use with your agents](#use-with-your-agents), the
[install matrix](#install-matrix) and
[agent support at a glance](#agent-support-at-a-glance). You can also install
from a clone (see [Install](#install)).

## Status

This is an early public release of the code. Please note:

- **Tests.** The Node tests of the agent plugins are included under
  `integrations/` (`npm test`). The Python test suite is not included yet: it
  depends on benchmark fixtures whose licences need review first.
- **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs ruff, a
  strict pyright check, a byte-compile and an import of every Python module,
  the benchmark tool's `--help`, a smoke test of `quotemem check` and
  `quotemem serve` against a stub provider, and a build whose sdist and wheel
  are checked file by file. It also runs the Node tests (`npm test`) and the
  npm package check (`npm run check`) on Node 20 and 24.
- Changes are listed in [CHANGELOG.md](CHANGELOG.md).

## Install

Requirements:

- Python 3.12, and [uv](https://docs.astral.sh/uv/) 0.11.21 or later for
  `uvx` or a clone.
- HeavenBase (MIT), which stores the data, is included (a pre-release build of
  0.1.2.3, in `src/quotemem/_vendor`); you do not install it yourself. Do not
  import another HeavenBase in the same Python process.

Run the service without installing it, or install the `quotemem` command:

```bash
uvx quotemem serve       # run it straight from PyPI
pip install quotemem     # or install it, then run `quotemem serve`
```

Or install from a clone:

```bash
git clone https://github.com/edsml-jz2321/QuoteMem.git
cd QuoteMem
uv sync                  # core service
uv sync --extra bench    # also the benchmark tools (pyarrow, tiktoken)
```

From a clone, run each `quotemem` command below as `uv run quotemem ...`.

There is no `uv.lock` yet. `pyproject.toml` pins only the direct
dependencies, so `uv sync` resolves the newest allowed versions of the
transitive ones. CI also pins those, with
[`.github/ci/constraints.txt`](.github/ci/constraints.txt); to install that
exact set, run `uv venv` and then
`uv pip install --constraints .github/ci/constraints.txt -e ".[bench]"`.

## Run the HTTP service

There are two ways to run the service:

- `quotemem serve` is the long-lived memory service for agents and the
  plugins below. Start here.
- `quotemem bench serve` is the benchmark service with the Agent Memory
  Leaderboard (AMLB) `/add` and `/search` routes (see
  [Benchmark service](#benchmark-service-quotemem-bench-serve)).

### Quickstart: `quotemem serve`

The service works with any OpenAI-compatible chat and embedding endpoints.
Keys are read only from environment variables; never put them on the command
line.

```bash
export QUOTEMEM_CHAT_BASE_URL=https://api.deepseek.com/v1   # any OpenAI-compatible chat API
export QUOTEMEM_CHAT_MODEL=deepseek-chat
export QUOTEMEM_CHAT_API_KEY=...
export QUOTEMEM_CHAT_STRUCTURED_OUTPUT=json_object          # for providers without strict JSON schemas
export QUOTEMEM_EMBED_BASE_URL=https://api.openai.com/v1    # defaults to the chat URL
export QUOTEMEM_EMBED_MODEL=text-embedding-3-small          # bound to the store on first start
export QUOTEMEM_EMBED_API_KEY=...                           # else DASHSCOPE_API_KEY, else the chat key

quotemem check   # read-only: checks the settings and probes both providers
quotemem serve   # http://127.0.0.1:8765; the bearer token goes to <data-dir>/token
```

- The service URL is `http://127.0.0.1:8765` by default; `--port` changes
  the port.
- The service listens on loopback only, unless `--allow-remote` is given.
- Data lives in `QUOTEMEM_DATA_DIR` or `--data-dir` (default
  `$XDG_DATA_HOME/quotemem` or `~/.local/share/quotemem`). One store serves
  every `user_id`, each in its own scope.
- Without a token in the environment, one is generated into
  `<data-dir>/token` (mode 0600) on the first start. Clients and the commands
  below read it from there. Do not export the token in the shell that starts
  an agent: the agent's own shell tool would inherit it.
- The port is bound before the providers are probed. Until the store is open,
  the memory routes and `GET /health` answer 503 with `Retry-After`, and
  `GET /agent/status` says what is failing and how to fix it.
- Stop it with Ctrl-C; it drains in-flight requests before it exits.

Write a conversation turn, then search it. The token file is `token` in the
data directory; with `--data-dir`, use that directory instead. If
`QUOTEMEM_TOKEN` or `QUOTEMEM_HTTP_AUTH_SECRET` is set, the service uses that
token and writes no file; send that value instead.

```bash
TOKEN_FILE="${QUOTEMEM_DATA_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/quotemem}/token"

curl -s http://127.0.0.1:8765/memory/add \
  -H "Authorization: Bearer $(cat "$TOKEN_FILE")" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "u1", "session_id": "s1", "request_id": "r1",
       "messages": [{"role": "user", "content": "I moved to Lisbon last spring."}]}'

curl -s http://127.0.0.1:8765/memory/search \
  -H "Authorization: Bearer $(cat "$TOKEN_FILE")" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "u1", "query": "Where do I live?"}'
```

- `/memory/add` returns after the new memories are stored and searchable.
  With the header `Prefer: respond-async` it answers `202` as soon as the
  turns are durably saved; send the same request again to read the result.
- `/memory/add` and `/memory/search` take the AMLB `/add` and `/search`
  bodies, relaxed for ordinary chat: `user_id`, `session_id`, `request_id`
  and `top_k` may be omitted.
- Search makes no model call besides the query embedding and keeps to a
  2.5-second deadline. Each memory hit carries a `Status:` line (`current`,
  `past` or `possibly_outdated`).

Routes:

| Route | Purpose |
|---|---|
| `POST /memory/add`, `POST /memory/search` | Write turns; search memories (AMLB `/add` and `/search` bodies) |
| `POST /memory/history` | Version history of a memory |
| `POST /memory/provenance` | The evidence behind a memory |
| `POST /memory/add-results` | Memories written by one Add |
| `POST /memory/list` | One page of a user's memories, with their status and quotes ([List the memories](#list-the-memories)) |
| `POST /memory/forget/prepare` | Step 1 of a forget: the body names exactly one of `statement` (the user's words) or `memory_id` with `expected_revision_id` |
| `POST /memory/forget/confirm` | Step 2: send back the prepare's `confirmation` unchanged |
| `GET /agent/ready` | 200 once serving (no token) |
| `GET /agent/status` | Phase, store binding, provider health and counters, without content |
| `POST /agent/admin/delete-user` | Erase one user |
| `POST /agent/admin/repair` | Inspect, resume or skip a quarantined user |
| `GET /health` | 200 once the store is open and accepts traffic, 503 before |

- A forget prepare that names both `statement` and `memory_id`, or neither,
  answers 422 `invalid_request`. A prepare by statement that matches no
  memory returns `"status": "nothing_matched"` and `"confirmation": null`.
- Forget bodies also carry `schema_version: 1`, `user_id`,
  `client_session_id` and `request_id`. Send the confirm before the
  prepare's `expires_at`.
- The bench route names (`/add`, `/search`, `/memory/why`,
  `/memory/add-items`, `/memory/forget`, `/memory/forget/statement/prepare`
  and `/memory/forget/statement`) answer 422 `invalid_request` here; there
  are no aliases. `quotemem bench serve` keeps them.

Other commands, all with `--help`:

- `quotemem export` writes a backup of the store's source messages and
  forgets; `quotemem rebuild --from OLD --to NEW` replays one into a new store.
  A store is never migrated in place.
- `quotemem delete-user --user-id X` erases one user.
- `quotemem repair --user-id X` inspects (`--inspect`), resumes or skips
  (`--skip`) a quarantined user.
- `delete-user` and `repair` call the running service
  ([Reaching the service](#reaching-the-service)).
- `quotemem memories` lists one user's memories ([List the memories](#list-the-memories)).
- Each command exits 0 on success, 1 on a failure and 2 on a usage error.
- `install`, `mcp`, `hook`, `doctor`, `setup`, `status` and `stop` are commands
  of the npm package `quotemem`. The Python command answers them with
  ``that is a plugin command: run `npx quotemem <command>` `` on stderr and
  exits 2.

### Review

The review decides whether a new memory repeats, updates or corrects a stored
one. Set `QUOTEMEM_REVIEW` (or pass `--review`) to choose it for a new store:

| Review | What decides | Judge model calls per Add |
|---|---|---|
| `fast` | Local rules only. A change of state retires the old memory only when the user says it outright ("Hangzhou, not Beijing"); "I moved to Hangzhou" leaves "I live in Beijing" current too. | none |
| `standard` (default) | A new memory that may repeat, update or correct a stored one goes to the judge model; local rules review the rest. | only for those memories |
| `full` | The judge model reviews every new memory. | one per four new memories |

- Every review keeps the other rules of the `agent` Add mode: forgetting,
  history and status work the same.
- Only the `agent` Add mode lets you choose. The `lean-local` Add mode always
  reviews `fast`, and the `full` Add mode always reviews `full`. In those
  modes, a new store given any other `--review` or `QUOTEMEM_REVIEW` value is
  refused with `schema_invalid`.
- The review is fixed per store. Starting an existing store, in any Add mode,
  with another review is refused with `workspace_binding_mismatch`, which
  names the store's review.
  Leave `QUOTEMEM_REVIEW` unset (or set it to the store's review) to keep it.
- To switch, stop the service and rebuild the store into a new data
  directory:
  `quotemem rebuild --from <old data dir> --to <new data dir> --review full`.
  The rebuild takes `--review`, else `QUOTEMEM_REVIEW`, else `standard`; it
  never copies the old store's review.
- `GET /agent/status` and `quotemem check` report the store's review as
  `store.review`.

### Forgetting

A forget takes the fact out of Search, History, Provenance and the memory
list, and withholds its quoted words. Its tombstone then denies every later
restatement, with one exception in the `agent` Add mode: the fact is learned
again when the user states it again in their own words after the forget.
That statement must meet every one of these conditions:

- It is in a user message that the service received after the forget, by
  the service's clock. The message's own date must be after the forget too,
  so a late batch of older messages never counts.
- It states something: it is not a question or a forget request, and it does
  not name forgetting, erasing or the memory ("forget", "remember",
  "delete", "忘", "记住" and the like).
- It states the forgotten fact: it holds at least two of the fact's content
  words (all of them for a shorter fact) and at least half of them, or the
  message's embedding has a cosine of 0.6 or more to the forgotten statement.

Nothing else brings a forgotten fact back:

- the assistant's messages;
- the forget request and the words it quotes;
- a question;
- a message without a date, or one dated or received before the forget, such
  as a late batch from another tool;
- a later user sentence about something else.

The old messages stay withheld. The `lean-local` and `full` Add modes deny
every restatement.

In the `agent` Add mode, a forget also works inside sentences and on names:

- Forgetting one detail of a sentence keeps the other facts the sentence
  states, with the words that state them, in Chinese and mixed-script
  sentences too. After "请忘掉我的猫的名字" on "我的猫叫Bob，它三岁了", the
  memories that the user has a cat and that it is three years old stay.
- When the detail cannot be cut out cleanly, for example when it is a word
  inside the user's phrase ("我的橘猫" for the cat's colour), the whole quote
  is withheld, and a memory that rested only on it can no longer be recalled
  (listed as `unreadable` in `affected`).
- A request to forget the name of the user's own person or pet, ending with
  the name phrase ("forget my brother's name", "forget my friend Alice's name",
  "忘掉我弟弟的名字", "忘掉我朋友小雪的名字") takes the memories that give that
  name, when they are about just one person or pet. Other memories about that
  person or pet that show the name are reworded to leave it out, or taken when
  they cannot be reworded; the prepare lists each in `affected` with its effect
  (`reworded`, `unreadable` or `forgotten`). A request for a nickname ("my
  cat's nickname", "小名") is handled like any other forget.

A model decides which memories a request matches. The prepare returns
`confirmation_required` or `nothing_matched`, the matched memories in
`candidates`, and the other memories the forget changes in `affected`, so a
client can show the list before it confirms.

### List the memories

`POST /memory/list` returns one page of a user's memories. It takes the same
bearer token as `/memory/search` (`TOKEN_FILE` is set as in the quickstart).

```bash
curl -s http://127.0.0.1:8765/memory/list \
  -H "Authorization: Bearer $(cat "$TOKEN_FILE")" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "u1", "status": "current", "limit": 50}'
```

- The body takes `user_id` (required), `status` (`current`, `past`,
  `possibly_outdated` or `all`, the default), `limit` (1 to 200, default 50)
  and `cursor` (the `next_cursor` of the previous page). Any other body
  answers 422 `invalid_request`.
- The answer holds `schema_version` (`1`), `memories`, `next_cursor`
  (`null` on the last page) and `counts`: how many memories have each status,
  whatever the filter.
- Each memory has `memory_id`, `statement`, `status`, `kind`,
  `created_at_ms`, `updated_at_ms`, `quotes` (each with `role`, `speaker`,
  `said_at_ms` and `text`), `supersedes` and `superseded_by`.
- The status is the one Search's `Status:` line gives. The newest change
  comes first (`updated_at_ms`, then `memory_id`), so a page boundary stays
  stable while memories are added.
- Nothing forgotten is listed, and withheld words are never shown. A user the
  store has never seen gets an empty list.

`quotemem memories` shows the same list in a terminal:

```bash
quotemem memories --user u1                       # text
quotemem memories --user u1 --json                # the /memory/list answer, pages merged, with its source
quotemem memories --user u1 --html memories.html  # one read-only HTML page
```

- The text shows each memory's status, statement, dates and up to three
  quotes, then the counts.
- `--user` (default: `QUOTEMEM_USER_ID`, else your OS user name, else `default`;
  pass `--user default` to see what `quotemem serve` stored for requests that
  name no user), `--status` (`all`, `current`, `past` or
  `possibly_outdated`) and `--limit` choose what to list. `--limit` defaults
  to 50; with `--html` every memory is listed.
- It asks the running service, or reads the stopped store read-only
  ([Reaching the service](#reaching-the-service)). It refuses while another
  process holds the store. Read from the store, a quote names only the
  speaker's role.
- `--html FILE` writes one self-contained page with a filter box (mode 0600).
  It holds no token and loads nothing from the network. A file already at
  `FILE` is replaced.

### Reaching the service

`quotemem memories`, `quotemem repair` and `quotemem delete-user` find the
service as the plugins do.

- The URL is `--url`, else `QUOTEMEM_URL`, else `http://127.0.0.1:8765`.
- The token is `QUOTEMEM_TOKEN` (`QUOTEMEM_HTTP_AUTH_SECRET` also works),
  then the file that `QUOTEMEM_TOKEN_FILE` names. For a service on this
  computer only, it is then `<data-dir>/token` (`--data-dir`, else
  `QUOTEMEM_DATA_DIR`).
- A service is on this computer when its host is `localhost`, `127.0.0.1` or
  `[::1]`. `127.0.0.2`, `0.0.0.0`, `[::]` and `localhost.` are not.
- A URL is refused with `schema_invalid` exactly when the plugins refuse it.
  After `http://` or `https://` it needs a host of letters, digits and
  `._~-`, or a bracketed IPv6 address. An optional `:port` of digits may
  follow, then `/`, `?`, `#` or the end. So a backslash, a space, `%` or `@`
  in the address is refused: a browser's URL parser and Python's would read
  another host.
- A host that a browser's parser would rewrite is refused too. An IPv4
  address must be four decimal numbers without a final dot (`127.0.0.1.`,
  `127.1` and `2130706433` are refused). An IPv6 address must be in its
  shortest form (`[0:0:0:0:0:0:0:1]` is refused).
- `npx quotemem <command>` hands these commands the plugins' settings
  ([Install matrix](#install-matrix)).

`quotemem memories` also decides where to read:

- When no service on this computer answers, it reads the stopped store in the
  data directory. A service on another computer that does not answer is
  `service_unreachable`.
- Without a token, it refuses with `authentication_failed` when a service
  answers at the URL, rather than read a store that may not be that
  service's.
- A service on this computer may serve (`/agent/ready`) and refuse the token
  while no process holds the data directory's store. That service serves
  another store, so `memories` reads the stopped one. While what answers
  there is not serving (a service still starting, or not a QuoteMem service),
  the refusal stands.
- The listing always says where it came from: a last `source:` line, and
  `source` in `--json` and in the `--html` report
  (`{"kind": "service", "url": ...}` or `{"kind": "store", "data_dir": ...}`).

### Benchmark service: `quotemem bench serve`

`quotemem bench serve` is the composition used for the Agent Memory
Leaderboard. It serves the AMLB `/add` and `/search` routes with the
benchmark Search contract.

```bash
export DASHSCOPE_API_KEY=...          # embeddings (Alibaba Cloud Model Studio)
export OPENAI_API_KEY=...             # chat model, through an OpenAI-compatible gateway
export OPENAI_BASE_URL=https://<your-gateway>/v1
export QUOTEMEM_HTTP_AUTH_SECRET=...  # clients send "Authorization: Bearer <secret>"
export QUOTEMEM_JOB_ID=local-1        # any non-empty identifier for this deployment

quotemem bench serve --workspace ./qm-workspace --host 127.0.0.1 --port 8000
```

Set these exports in the benchmark service shell. Never start an agent from
that shell. For the curl examples, set only `QUOTEMEM_HTTP_AUTH_SECRET` in a
separate client shell to the same bearer token.

`quotemem bench serve` creates and initializes the workspace on first start
(`quotemem bench init --workspace DIR --profile bench` only initializes it). Stop it with
Ctrl-C; it drains in-flight requests before it exits.

```bash
curl -s http://127.0.0.1:8000/add \
  -H "Authorization: Bearer $QUOTEMEM_HTTP_AUTH_SECRET" -H "Content-Type: application/json" \
  -d '{"user_id": "u1", "session_id": "s1", "request_id": "r1",
       "messages": [{"role": "user", "speaker": "Rowan",
                     "content": "I moved to Lisbon last spring."}]}'

curl -s http://127.0.0.1:8000/search \
  -H "Authorization: Bearer $QUOTEMEM_HTTP_AUTH_SECRET" -H "Content-Type: application/json" \
  -d '{"user_id": "u1", "query": "Where does Rowan live?", "top_k": 10}'
```

`/add` returns after the new memories are stored and searchable. The
benchmark service keeps its own route names and bodies: `/memory/history`,
`/memory/why`, `/memory/add-items`, the by-memory forget pair
`/memory/forget/prepare` and `/memory/forget`, and the by-statement pair
`/memory/forget/statement/prepare` and `/memory/forget/statement`. They take
the same request bodies as `/memory/history`, `/memory/provenance`,
`/memory/add-results` and the forget pair of `quotemem serve`.
`quotemem bench route --shard http://127.0.0.1:8001 --shard ...` spreads
users over several `quotemem bench serve` processes by `user_id`. Run
`quotemem bench serve --help` for the remaining flags.

## Configuration

Secrets are read only from environment variables. Command-line flags, and the
optional `--provider-config` JSON file of `quotemem bench serve`, hold
non-secret settings only.

**`quotemem serve`:**

| Variable | Meaning | Default |
|---|---|---|
| `QUOTEMEM_CHAT_BASE_URL` | Chat service root (`https`, or `http` on loopback) | `OPENAI_BASE_URL` |
| `QUOTEMEM_CHAT_MODEL` | Chat model name | `OPENAI_MODEL` |
| `QUOTEMEM_CHAT_API_KEY` | Chat key | `OPENAI_API_KEY` |
| `QUOTEMEM_CHAT_STRUCTURED_OUTPUT` | `json_schema` (strict schemas) or `json_object` (JSON mode) | `json_schema` |
| `QUOTEMEM_CHAT_REASONING` | `off` asks every call for no extended thinking; `high` asks every call for thinking (see below); `none` sends no reasoning parameters, so the provider's default applies; `effort` sends only `reasoning_effort`; `passthrough` sends the service's own reasoning parameters | `off` |
| `QUOTEMEM_CHAT_REASONING_TOKENS` | Under `high`: the reasoning tokens added to every call's output bound (1024 to 131072) | `24576` |
| `QUOTEMEM_CHAT_REASONING_SECONDS` | Under `high`: the longest wait for one reasoning reply, in seconds (10 to 900) | `120` |
| `QUOTEMEM_CHAT_MODEL_PATTERN` | A regular expression that the model id of every chat reply must fully match | the model, optionally with a date suffix |
| `QUOTEMEM_EMBED_BASE_URL` | Embedding service root; local servers such as Ollama work on loopback `http` | the chat URL |
| `QUOTEMEM_EMBED_MODEL` | Embedding model name; bound to the store on first start | required |
| `QUOTEMEM_EMBED_API_KEY` | Embedding key | `DASHSCOPE_API_KEY`, then the chat key |
| `QUOTEMEM_EMBED_SEND_DIMENSIONS` | Set `false` for embedding models without a `dimensions` parameter | `true` |
| `QUOTEMEM_EMBED_MODEL_PATTERN` | A regular expression that the model id of every embedding reply must fully match | the model, optionally with a date suffix |
| `QUOTEMEM_TOKEN` | HTTP bearer token (`QUOTEMEM_HTTP_AUTH_SECRET` also works) | generated into `<data-dir>/token` |
| `QUOTEMEM_DATA_DIR` | Data directory | `$XDG_DATA_HOME/quotemem` or `~/.local/share/quotemem` |
| `QUOTEMEM_DAILY_BUDGET_USD` | Most one UTC day may spend on provider calls; needs `QUOTEMEM_CHAT_PRICE_INPUT_PER_MTOK`, `QUOTEMEM_CHAT_PRICE_OUTPUT_PER_MTOK` and `QUOTEMEM_EMBED_PRICE_PER_MTOK` (US dollars per million tokens) | uncapped |
| `QUOTEMEM_DAILY_CHAT_CALLS`, `QUOTEMEM_DAILY_EMBED_CALLS` | Most calls one role may make in one UTC day | uncapped |
| `QUOTEMEM_SCRUB_PII` | `1` replaces email addresses and phone numbers in every text sent to a provider | off |
| `QUOTEMEM_AUTO_REPAIR` | `resume` or `skip`: repair quarantined users automatically | off |
| `QUOTEMEM_REVIEW` | The review of a new store: `fast`, `standard` or `full` ([Review](#review)); fixed per store; `--review` overrides it | `standard` |

Thinking (`QUOTEMEM_CHAT_REASONING`):

- `off` sends `thinking: {"type": "disabled"}` on every call.
- `high` sends `thinking: {"type": "enabled"}` and
  `reasoning_effort: "high"` on every call. Thinking counts toward the output
  bound, so `QUOTEMEM_CHAT_REASONING_TOKENS` is added to it.
- Under `off` and `high`, once the provider answers 400 naming `thinking`,
  later calls leave it out and that call is sent again without it. Under
  `high`, `reasoning_effort` is still sent.
- Under `high`, a reasoning reply that its bound cuts off, or that takes longer
  than `QUOTEMEM_CHAT_REASONING_SECONDS`, is asked again without thinking.
  Thinking thus never truncates a reply or loses a fact.
- A reasoning attempt also waits at most half of the call's remaining time,
  and leaves at least 30 seconds for the resend. A call with too little time
  for that goes without thinking.

Flags: `--data-dir`, `--host`, `--port` (0 picks a free port and prints it),
`--allow-remote`, `--user-id` (the user of requests that name none,
`default`), `--default-top-k` (10), `--request-timeout-seconds` (the budget
of one Add or Search, 600), `--search-deadline-seconds` (2.5),
`--search-profile {interactive,bench}` (`interactive`), `--concurrency
{interactive,bench}` (`interactive`: Search never waits for an Add) and, for a
new store only, `--embedding-dimensions {1024,2048}`,
`--add-mode {agent,lean-local,full}` (`agent`) and
`--review {fast,standard,full}` (`QUOTEMEM_REVIEW`, else `standard`).
Starting an existing store with another embedding model is refused; use a new
data directory or `quotemem rebuild`.

**`quotemem bench serve`:**

| Variable | Needed for | Notes |
|---|---|---|
| `DASHSCOPE_API_KEY` | Embeddings | Model `qwen3.7-text-embedding` through the Model Studio OpenAI-compatible endpoint |
| `OPENAI_API_KEY` | Extraction and review | Chat model `deepseek-v4.1-flash`, the gateway's alias for its current dated snapshot (now `deepseek-v4-1-flash-261017`, the model DashScope names `deepseek-v4.1-flash-1017`). A reply must name a dated `deepseek-v4-1-flash-YYMMDD` snapshot or `deepseek-v4.1-flash-1017`. |
| `OPENAI_BASE_URL` | Extraction and review | HTTPS root of an OpenAI-compatible gateway that serves that model. `api.openai.com` is refused for it. |
| `QUOTEMEM_HTTP_AUTH_SECRET` | The service | Non-empty printable ASCII |
| `QUOTEMEM_HTTP_AUTH_MODE` | The service | `bearer` (default), `token` or `x-api-key` |
| `QUOTEMEM_JOB_ID` | The service | Non-empty identifier |

Useful flags:

- `--add-mode {lean-local,full,agent}` sets the Add mode of a new
  workspace (default `lean-local`; `agent` is the default of
  `quotemem serve`). The mode is frozen when the workspace is created;
  reopening it with a different mode is refused.
- `--embedding-dimensions {1024,2048}` sets the vector size of a new workspace.

## Use with your agents

One npm package, `quotemem`, carries every agent adapter, the MCP server and
a small command, `quotemem`. Everything runs on your own computer: the agents'
plugins share one memory service (`quotemem serve`, on `127.0.0.1:8765`), so a
fact learned in one agent is recalled in the others. Every adapter uses the
same memory by default: `QUOTEMEM_USER_ID`, which defaults to your OS user name.

Quick start (to run a clone instead, follow "From a clone" below):

1. Install the plugin for your agent (see the [install matrix](#install-matrix)).
2. Run this once:

   ```bash
   npx quotemem setup
   ```

   It asks which models the service calls, saves the settings to
   `~/.quotemem/service.env` (mode 600), and checks them with
   `quotemem check`. Keys are typed without echo and never put on a command
   line. Three choices are offered:

   | Preset | Models | Trade-off |
   |---|---|---|
   | `default` (recommended) | The competition configuration: chat `deepseek-v4.1-flash-1017` with thinking at high effort, embeddings `qwen3.7-text-embedding` (1024 dimensions), both through Alibaba Cloud Model Studio (DashScope), one API key | Saving memories is slower: a large batch of corrections can take several minutes. Thinking tokens are billed as output tokens. |
   | `fast` | The same models and key, thinking off | Memories are saved in seconds. It scored slightly lower in our test: 60.8 against 62.6 on 240 BEAM 100K questions, a difference that is not statistically significant. |
   | `custom` | Any OpenAI-compatible chat and embedding endpoints, models and keys; structured output `json_schema` or `json_object`; thinking off, high or the provider's default | Yours to choose |

   Then it asks the review, which decides whether a new memory repeats,
   updates or corrects a stored one (`--review` sets it without asking;
   saved as `QUOTEMEM_REVIEW`):

   | Review | What decides | Trade-off |
   |---|---|---|
   | `fast` | The local review rules of the competition submission; no review calls | The fastest and cheapest. A change of state retires the old memory only when said outright ("Hangzhou, not Beijing"); "I moved to Hangzhou" can leave "I live in Beijing" current too. |
   | `standard` (default) | The chat model reviews only the new memories that may repeat, update or correct a stored one | Review calls only where they matter |
   | `full` | The chat model reviews every new memory | The slowest and most careful, with the most model calls |

   The review is fixed when the memory store is created: the service refuses
   to open a store with another one. To change it later, stop the service and
   rebuild the store into a new data directory
   (`npx quotemem stop`, then
   `npx quotemem rebuild --from ~/.local/share/quotemem --to ~/.local/share/quotemem-full --review full`),
   then run `npx quotemem setup --review full` and put
   `QUOTEMEM_DATA_DIR=~/.local/share/quotemem-full` in
   `~/.quotemem/service.env`. `npx quotemem status` shows the review.

   Both presets bill your own Model Studio account at its usual prices. To
   switch later, run `npx quotemem setup` again (`--preset fast` skips the
   question), or edit a line of `~/.quotemem/service.env`: each
   `QUOTEMEM_*` value there overrides the preset, for example
   `QUOTEMEM_CHAT_REASONING=off` turns thinking off. For scripts,
   `npx quotemem setup --yes --preset default|fast|custom --review fast|standard|full` asks nothing and
   takes the keys from `QUOTEMEM_CHAT_API_KEY` and `QUOTEMEM_EMBED_API_KEY`
   (or `DASHSCOPE_API_KEY` for the presets); `npx quotemem setup --help`
   lists the options.
3. Done. When an agent first needs memory, its plugin starts the service in
   the background (`uvx --from quotemem==<plugin version> quotemem serve`,
   so [uv](https://docs.astral.sh/uv/) must be installed). That turn goes on
   without memory; the next ones use it. The first start downloads the
   service and can take a few minutes; `~/.quotemem/service.log` shows its
   progress.

The service keeps running after the agents exit, because they all share it.
`npx quotemem status` shows whether it runs, its pid, URL and log;
`npx quotemem stop` stops it. It starts again when an agent needs it, unless
`QUOTEMEM_AUTOSTART=0` is set where the agents start. Only one instance is
ever started, and only for a service URL on this computer (`QUOTEMEM_URL`
unset, or `localhost`, `127.0.0.1` or `[::1]`).

**Two people signed in at once** on one computer (fast user switching,
remote desktop, a shared server) cannot both use port 8765: the second
person's plugins reach the first person's service, which refuses their
token, so they get no memory. `npx quotemem doctor`, `npx quotemem status`
and the plugins' log say so, and name a port of that person's own
(20000–25999, from the user name and home folder). Put it in that person's
`~/.quotemem/env` (`QUOTEMEM_URL=http://127.0.0.1:<port>`), and their
plugins start their own service there. The first person keeps 8765.

**If several people use the computer at once**, give yourself a port of your
own as above, start the service before you open your tools, and use QuoteMem
there only with people you trust.

No token needs to be copied: the service creates one in `<data-dir>/token` on
its first start, and every plugin reads it from there. The data folder is
`~/.local/share/quotemem`; a `QUOTEMEM_DATA_DIR` line in
`~/.quotemem/service.env` moves it. The started service takes its settings,
token and data folder from that file only, never from the environment of the
tool that happened to start it, so every tool gets the same service. Leave
`QUOTEMEM_TOKEN` unset for it (or put the same token in `service.env`), and
use the same `QUOTEMEM_URL`, or none, in every tool.

**Running the service yourself** still works: start
`uvx quotemem serve` (or `quotemem serve`) with the model settings of
[Run the HTTP service](#run-the-http-service) in its environment. Only the
npm command reads `~/.quotemem/service.env`: `npx quotemem serve` and
`npx quotemem check` add its settings, while a plain `uvx quotemem serve` or
`quotemem serve` from pip does not. The plugins find a running service and start
nothing. Started by hand, it keeps its data in `~/.local/share/quotemem`, or
in `$XDG_DATA_HOME/quotemem` when that is set (`QUOTEMEM_DATA_DIR` moves it),
and the agents read its `<data-dir>/token` the same way, so they need no token
setting either.

**From a clone.** The automatic start and setup's check run
`uvx --from quotemem==<plugin version>`, the published package. To run a clone
instead (after `uv sync`), write the settings without the check, then check and
start the service from the clone with the same file:

```bash
node integrations/cli/quotemem.mjs setup --no-check
uv run --env-file ~/.quotemem/service.env quotemem check
uv run --env-file ~/.quotemem/service.env quotemem serve
```

Set `QUOTEMEM_AUTOSTART=0` where the agents start, so no plugin tries to
start the published service while yours is stopped.

**Do not export the token in the shell that starts an agent.** The agent's
own shell tool inherits that environment, so the model could print the token
with `env`. For a service on another computer, keep its token in a file that
only you can read, and point the agents at the file:

- **DSH, Claude Code and Codex** read `QUOTEMEM_URL` and
  `QUOTEMEM_TOKEN_FILE` (the file's path, not the token) from the environment
  they start in. Claude Code can instead keep the token in its plugin option,
  which goes only to the plugin's hooks and MCP server.
- **The other agents** often start hooks without your shell environment.
  They also read `~/.quotemem/env`:

  ```bash
  mkdir -p ~/.quotemem && chmod 700 ~/.quotemem
  # save the service's token, and nothing else, in ~/.quotemem/token; then:
  chmod 600 ~/.quotemem/token
  printf 'QUOTEMEM_URL=https://memory.example.org\nQUOTEMEM_TOKEN_FILE=~/.quotemem/token\n' > ~/.quotemem/env
  chmod 600 ~/.quotemem/env
  ```

A variable set in the environment wins over the file. `QUOTEMEM_TOKEN` itself
is still read when it is set, so unset it if an old setup exported it. The
adapters need Node 20.3 or later on `PATH`.

### See what is remembered

Ask any agent, for example "what do you remember about me?": it lists the
memories with the `quotemem_memories` tool. In a terminal,
`quotemem memories` (or `npx quotemem memories`) prints each memory's status,
statement, dates and quotes; `--json` prints the same list as JSON, and
`--status current|past|possibly_outdated|all` and `--user` choose what to list.
`npx quotemem memories` lists the plugins' user (`QUOTEMEM_USER_ID`, else your
OS user name) unless `--user` is given; the service's own command needs
`--user` for that user.
`quotemem memories --html memories.html` writes one local, read-only page
with a search box: it holds no token, loads nothing from the network and only
you can read it. These only read the memory, from the running service or,
when it is stopped, from its data folder. Forgotten memories never appear.

### Install matrix

For the rows that use `quotemem`, install the package once with
`npm install -g quotemem`. `quotemem install <tool>` only prints what it
would do; add `--write` to write the files. It never writes the token.
A file it changes keeps its permissions, is written through a symlink, and
its old text is kept as `<file>.quotemem.bak`.
`quotemem doctor` checks the settings, the token, the service, its
autostart and `uvx`. The service's own commands also run through this
command: `quotemem serve`, `check`, `memories`, `export`, `rebuild`, `delete-user`,
`repair` and `bench` are handed to `uvx quotemem` with their arguments and
the settings of `~/.quotemem/service.env`. `memories`, `delete-user` and
`repair` call the running service as the plugins do: with their
`QUOTEMEM_URL`, user and token, from the environment or `~/.quotemem/env`.
The token of `service.env`, or of the service's data folder, goes only to a
service on this computer, never to another one. The Python package installs a
command named `quotemem` too, which runs only the service commands. With both
installed, the first one on `PATH` answers; `npx quotemem` always runs the npm one.

| Agent | Install | Memory |
|---|---|---|
| DSH | `dsh plugin --profile quotemem add quotemem`, then start `dsh --profile quotemem` | seamless |
| Claude Code | `claude plugin marketplace add edsml-jz2321/QuoteMem --sparse .claude-plugin integrations`, then `claude plugin install quotemem@quotemem` | seamless |
| Codex CLI | `codex plugin marketplace add edsml-jz2321/QuoteMem --sparse .agents --sparse integrations/codex`, then `codex plugin add quotemem@quotemem`, then trust the hooks once with `/hooks` (without the plugin system: `quotemem install codex --write`) | seamless after the one-time trust |
| OpenCode 1.x, 2.x | `quotemem install opencode` prints the block to merge into `opencode.jsonc` | seamless |
| Gemini CLI | `quotemem install gemini` prints the `gemini extensions install` command | seamless |
| Cline (VS Code) | `quotemem install cline --write`, then turn on Enable Hooks | seamless |
| goose | `quotemem install goose --write`, then set `GOOSE_MOIM_MESSAGE_FILE` as it prints | seamless |
| OpenClaw | `quotemem install openclaw` prints the `openclaw plugins install` command | seamless |
| Cursor | `quotemem install cursor --write`, plus the rule it prints, in each project | Cursor CLI in interactive mode, 2026.11.19 and later: seamless through the turn hooks (per-turn recall and the forget note seen on Windows). Cursor CLI in print mode (`-p`): recall is a session-start digest plus the tools; each run's turns are saved at its end, from the chat's transcript that `sessionEnd` names; forget through the tools or when the conversation is saved; the MCP tools need `--approve-mcps --force`. Keep `QUOTEMEM_*` settings in `~/.quotemem/env`, since the CLI does not pass the shell's to the MCP tools. App: per-turn recall through the prompt hook seen on 3.31.15 (expected on 3.20.17 and later; it relies on a prompt-hook field Cursor does not document); the app runs no `sessionEnd` when a chat tab is closed, so its turns are saved by the turn hooks; on older app versions, recall is a session digest plus the tools, and a forget gets no note to the model |
| Devin CLI and Desktop | `quotemem install devin --write` in each project | seamless with Devin CLI 3000.5.20 and later; older versions save only your messages |
| Continue | `quotemem install continue --write` in each project | partial: the model saves and searches through the tools |
| Any other MCP client | command `quotemem-mcp` (stdio) | tools only |

**From a clone** (`git clone https://github.com/edsml-jz2321/QuoteMem.git`),
run `node integrations/cli/quotemem.mjs install <tool>` in place of
`quotemem install <tool>`. The files it writes then point at the clone. The
Claude Code and Codex marketplace commands read this GitHub repository, so
they need no npm package. DSH installs the bundle from npm, or from a packed
tarball of the clone (see the [DSH guide](integrations/dsh/README.md)).

"Seamless" means the agent's own hooks or plugin do the work: the
conversation is saved every few turns, memory questions get the relevant
quoted memories as hidden context, and "forget …" requests are carried out
and confirmed through a note to the model. The plugins read everyday
requests such as "forget Ben's name" and "could you please not remember my
phone number?" The done note counts related memories without quoting them
and counts reworded memories separately. A follow-up note reports any extra
removals from saving the request turn. The user calls no tool. When a
new chat starts, the same agent's other chats' unsent turns go out, and the
new chat's first question about memory waits up to 3 s for them to be
stored. When depends on whether the agent reports a chat's end:
- **Cursor and Cline** (a closed Cursor tab runs no session end, a closed
  console may run none; Cline has none): at the new chat's start (Cursor)
  and at its first prompt,
  every other chat with no turn running goes out at once. A fact said seconds
  before in a chat closed just now is then found by the new chat's first
  question, when the service stores it within those 3 s. A chat whose turn
  still runs keeps its batch, and goes once it has been idle a minute.
- **Claude Code, Codex, Gemini CLI, Devin, goose, OpenCode, OpenClaw and
  DSH**: a closed chat goes out at its own session end. A new chat sends the
  other chats only once they have been idle a minute, at its start (Claude
  Code, Codex) or at any of its prompts in its first 10 minutes, so chats in
  use (many workers at once) keep their batches. A fact said seconds before
  in a chat left open goes out at the new chat's first hook after that chat
  has been idle a minute.

Otherwise a chat's last turns go out when it ends, at a later hook once it
has been idle 5 minutes, or before a forget. The MCP tools stay available for explicit requests: search, history,
provenance (the quoted evidence behind a memory), a list of what is
remembered (`quotemem_memories`) and a two-step forget.
When the service cannot be reached, the turns wait on disk and go out on a
later hook, after a retry delay of up to 5 minutes, or at once when a hook's
search reaches the service again. The same holds when an agent's console is
closed while the background sender runs: it may stop with the console, and
the queued turns go out on a later hook.

To keep a forget in force, the plugins keep each forget request locally:
the user's statement, secrets redacted, in `forgotten/` under `~/.quotemem`,
and also under `QUOTEMEM_STATE_DIR` when that is set (one file per user and
service; mode 600 in a 700 folder on macOS and Linux, the user profile's
own access rights on Windows). So the statement text of a kept forget is
also stored under `~/.quotemem/forgotten` (mode 600), even when
`QUOTEMEM_STATE_DIR` points elsewhere, such as another volume. Set
`QUOTEMEM_STATE_DIR` only in `~/.quotemem/env`, never in one agent's or MCP
server's own settings: the hooks and the MCP server then use one folder,
and `quotemem doctor` warns about a server it finds with another. A forget
is kept in force for a week, at most 200 per user; its text stays in the file
until a later forget rewrites it, so delete the file to remove the text sooner.
Words said before a forget and saved later normally get it again; words known
to be said after it are kept.
A forget through the MCP tools is kept only next to an automatic-memory
plugin, once confirmed or when nothing matched.

How the install commands were tested: every `quotemem install` dry run, and
each bin's `--help`, ran from the packed npm tarball installed in a temp
folder. The `--write` paths ran in unit tests against a temp home. The
agents' own commands in the table (`dsh plugin add`, `claude plugin`,
`codex plugin`, `gemini extensions install`, `openclaw plugins install`) follow each agent's
documentation; the next table says which agents ran the adapter for real.
To install from a clone instead, use the "from a clone" line.

### Agent support at a glance

| Agent | Silent capture | Silent recall | Silent forget | MCP tools | How it was tested |
|---|---|---|---|---|---|
| DSH | yes | yes | yes, with a note to the model | yes | real DSH 0.2.2-rc.5 with a live QuoteMem service and model, and simulated host events |
| Claude Code | yes | yes | yes, with a note to the model | yes | hook processes fed Claude Code's documented inputs; plugin validated and loaded by the real CLI |
| Codex CLI | yes, after a one-time `/hooks` trust | yes | yes, with a note | yes | real Codex CLI with a local stub model |
| OpenCode 1.x and 2.x | yes | yes | yes, with a note | yes | OpenCode's plugin and event shapes; not yet run in OpenCode |
| Gemini CLI | yes | yes | yes, with a note | yes | hook processes fed the documented inputs |
| Cline (VS Code) | yes, once hooks are turned on | yes | yes, with a note | yes | same |
| goose | yes | yes, through its context file | yes, with a note | yes | same |
| Devin CLI and Desktop | yes, with Devin CLI 3000.5.20 and later; before, user messages only | yes | yes, with a note | yes | hook processes fed the documented inputs and sample transcripts |
| OpenClaw | yes | yes | yes, with a note | yes | a fake plugin API; not yet run in OpenClaw |
| Cursor | CLI print mode: at the end of each run, from the chat's transcript; CLI interactive mode and app: each turn | CLI interactive mode: yes, 2026.11.19 and later; app: yes, seen on 3.31.15, expected on 3.20.17 and later; everywhere, a session-start digest, and the model can search | CLI print mode: when the conversation is saved, without a note, or through the tools; CLI interactive mode: with a note; app: with a note expected on 3.20.17 and later | yes | Cursor CLI 2026.11.19 run for real on Windows, in print mode (it runs only the session start and end hooks) and in interactive mode (every hook; recall and the forget note reached the model); the desktop app 3.31.15 run on Windows, where the prompt hook's recall reached the model; that prompt-hook field is not in Cursor's docs |
| Continue | no | no | no | yes, with a rule (the model decides) | configuration only |
| Any other MCP client | no | no | no | yes | — |

The rows marked "documented inputs" have not yet been run inside the agent
itself. Cursor's per-turn recall uses `additional_context` on its prompt
hook, a field Cursor does not document; another project saw it reach the
model on Cursor 3.20.17, in one test on Windows, and it reached the model in
the desktop app 3.31.15 on Windows. Cursor and Devin also run
the hooks in Claude Code's settings files; when their own QuoteMem hooks are
installed, those Claude Code hooks stay silent inside them, so a turn is
saved once. Until that has been seen on a real Devin, do not set up both the
Claude Code hooks and the Devin hooks where Devin reads them.

### Where each adapter lives

| Folder | What it is | Guide |
|---|---|---|
| [`integrations/dsh`](integrations/dsh) | DSH bundle: automatic memory plugin, MCP server and skill | [README](integrations/dsh/README.md) |
| [`integrations/claude-code`](integrations/claude-code) | Claude Code plugin: hooks and MCP server | [README](integrations/claude-code/README.md) |
| [`integrations/codex`](integrations/codex) | Codex plugin, and `install.mjs` for a setup without plugins | [README](integrations/codex/README.md) |
| [`integrations/opencode`](integrations/opencode) | OpenCode plugin for 1.x and 2.x | [README](integrations/opencode/README.md) |
| [`integrations/hooks`](integrations/hooks) | One hook program for Gemini CLI, Cursor, Cline, goose and Devin; the OpenClaw plugin; Continue | [README](integrations/hooks/README.md) |
| [`integrations/core`](integrations/core) | The zero-dependency code every adapter shares, and the guide to writing a new adapter | [README](integrations/core/README.md) |
| [`integrations/cli`](integrations/cli) | The `quotemem` command: `setup`, `status` and `stop` of the local service, plugin setup, and the service commands through `uvx quotemem` | `quotemem --help` |

The package's entry points:

- bins: `quotemem`, `quotemem-mcp` (the MCP server) and `quotemem-hook`
  (the hook program for Gemini CLI, Cursor, Cline, goose and Devin);
- `quotemem hook <agent> <event>` runs the hook for `claude-code`, `codex`,
  `gemini`, `cursor`, `cline`, `goose` or `devin`;
- subpath exports: `quotemem/dsh` (also the package's main entry, for DSH),
  `quotemem/core`, `quotemem/opencode` and `quotemem/openclaw`.

The adapters and the MCP server run on Node 20.3 or later and have no
dependencies. DSH itself needs DSH 0.1.2-rc.1 or later (no upper bound), with
its own prerequisites (Node 24 and pnpm).

## Benchmark tools

`python -m quotemem.bench.cli` downloads public benchmark files, replays them over
HTTP and computes local diagnostic scores. Benchmark data is not included in
this repository. [`benchmarks/`](benchmarks) lists each source by URL, pinned
revision, SHA-256 and licence, and the tool downloads it from its publisher:

```bash
uv run --extra bench python -m quotemem.bench.cli \
  --sources benchmarks/sources.json --dataset ./data/longmemeval_oracle.json --variant oracle download
```

From a pip install, add the extra first: `pip install 'quotemem[bench]'`.

Each dataset keeps its own licence (see [NOTICE](NOTICE)). LoCoMo-Refined is
CC BY-NC 4.0 (non-commercial) and BEAM data is CC BY-SA 4.0.

## Contact

Please open a GitHub issue for questions, bug reports and suggestions.

## License

QuoteMem is released under the MIT License, see [LICENSE](LICENSE).
The included HeavenBase is MIT-licensed; its licence is in
`src/quotemem/_vendor/heavenbase-0.1.2.3.dist-info/licenses/LICENSE`.
Third-party components and the licences of the benchmark sources are listed
in [NOTICE](NOTICE). Benchmark datasets are not redistributed here and keep
their own licences.
