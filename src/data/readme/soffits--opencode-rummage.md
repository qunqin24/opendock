# rummage

Search your files by what they mean and by the exact words in them, on your own machine. rummage indexes notes,
documents, PDFs, pictures, recordings, videos and archives with [EmbeddingGemma 2](https://huggingface.co/google/embeddinggemma-2), run on
the CPU through [llama.cpp](https://github.com/ggml-org/llama.cpp), and keeps everything in one SQLite file. Nothing you
index is sent anywhere.

It's a command-line tool with JSON output, so scripts, scheduled jobs and agents can use it as easily as people can.
Sources are plugins: the core reads folders, and plugins add services such as Seafile or chat histories.

```console
$ rummage search "the clause about pets in the lease"
 4.31  [docs] housing/lease-2026.pdf  (housing/lease-2026.pdf@5400)  meaning z=4.3
       …Tenants may keep one cat or one small dog with the landlord's written consent…
$ rummage search "INV-20931" --words-only --json
```

## What it finds

- Passages by meaning, in 100+ languages: a query in one language finds text written in another.
- Pictures by what they show ("a dog on the beach", "a receipt from a restaurant"), and by the text in them, read on
  this machine by OCR in Chinese (simplified and traditional), Japanese, Korean, English and other Latin-script
  languages (`rummage[ocr]`). HEIC and other formats the model can't open go through ffmpeg.
- Pictures sent in a chat (DeepSeek Harness sessions) the same way: part of the message they came with, found by what
  they show or by the words in them, and pointing to that message (`rummage get --around` opens the turn).
- Recordings by what they sound like and videos by what they show and sound like, each hit at its moment (`0:01:25`):
  the model hears 30-second windows and sees a frame per shot. Needs ffmpeg. It doesn't transcribe: an agent that
  needs the words can transcribe that window itself.
- PDFs page by page; a scanned page is matched as a picture of the page and by the text OCR finds in it
  (`rummage[pdf-scans]`, `rummage[ocr]`).
- Documents: Office Open XML and OpenDocument, the older Word, Excel and PowerPoint files (`.doc`, `.xls`, `.ppt`;
  `rummage[office]`), Pages, Keynote and Numbers, RTF, EPUB, saved mail, Jupyter notebooks (cells and their text
  output), and any file whose content is text, whatever its extension (source code, configs, logs).
- JSON, JSON Lines, CSV and TSV files of records (an array of objects, or a table with a header row): one result per record, so an order or a row is found by what it holds.
- Names, IDs and numbers exactly as written, through a keyword index that also handles CJK text (Chinese, Japanese, Korean).
- Each result points back to where it is: a file and character offset, or whatever a plugin uses (a chat message,
  a library path).

## Install

Needs Python 3.11+. On Linux, macOS and Windows (x64 or ARM), `rummage setup` downloads the pinned llama.cpp build
and the model files and checks their SHA-256; elsewhere, point `runtime.llama_server` at a `llama-server` you built.
When the machine has a GPU (Vulkan on Linux and Windows, Metal on macOS), setup also tries llama.cpp's GPU build once
and keeps it only if it embeds clearly faster than the CPU and gives the model's reference vectors; `rummage status`
shows which one runs and why. `rummage setup --backend auto` checks again, `--backend cpu` stays on the CPU.

```sh
uv tool install 'git+https://github.com/soffits/rummage'          # core
uv tool install 'git+https://github.com/soffits/rummage[archives]' # + 7z and rar listings
uv tool install 'git+https://github.com/soffits/rummage[office,ocr,pdf-scans]'  # + .doc/.xls/.ppt, OCR, scans
rummage setup            # ~330 MB text model; ~880 MB with the image encoder
```

The `ocr` extra (RapidOCR on ONNX Runtime, about 300 MB installed with OpenCV) downloads its models (about 45 MB)
into the data folder the first time it reads a picture; pictures never leave the machine. It holds a few hundred MB
of memory while a source with pictures is read and frees it afterwards.

## Configure

`~/.config/rummage/config.toml` (Windows: `%APPDATA%\rummage\config.toml`; or `$RUMMAGE_CONFIG`). Each source has a
name you choose and a `type`. On Windows, write paths in single quotes (`root = 'C:\Users\me\Documents'`), which
TOML reads without escapes:

```toml
data_dir = "~/.local/share/rummage"   # index, runtime files, logs (Windows default: %LOCALAPPDATA%\rummage)

[runtime]
threads = 2                           # CPU threads for llama.cpp while indexing (searches use one)
# max_threads = "auto"                # while indexing, use up to cores - 1 when the machine is otherwise idle
# background_threads = "auto"         # reading (OCR, pictures) and making vectors together (auto: cores - 1);
#                                     # vectors get `threads`, reading the rest; searches aren't counted
nice = 10

[embedder]
model = "embeddinggemma-2"            # the embedding model (`rummage models`); change it to switch, see below
# url = "http://gpu-box:8080"         # index with a llama-server elsewhere running the same model (faster
#                                     # backfills); used only while it answers and its vectors agree

# [ocr]
# url = "http://gpu-box:8081"         # read pictures and scanned pages on a faster machine running
#                                     # `rummage ocr-serve` (pictures go to it; the cache stays here)

[sources.documents]
type = "files"                        # any text, Markdown, HTML, PDF, Office (old and new), iWork, notebooks, RTF,
                                      # EPUB, .eml, pictures, recordings, videos, archive listings
root = "~/Documents"
exclude = [".*", "node_modules"]      # name patterns to skip (these are the defaults)
images = true                         # embed pictures (needs the image encoder)
ocr = true                            # read the text in pictures and scanned pages (needs rummage[ocr])
recordings = true                     # embed audio and video (needs the encoders and ffmpeg)
# read_secret_files = false           # keys, certificates, password stores, .env and .ssh are never read unless true

[sources.notes]
type = "markdown"                     # a Markdown vault: frontmatter title, aliases and tags, heading paths
root = "~/notes"
```

`rummage sources` lists the configured sources, the agent histories it finds on this machine, and the source types
installed. A source can be switched off with `enabled = false` and keep its settings.

Histories of other programs (the agent sessions below) are never read unless you switch them on:

```sh
rummage sources                          # e.g. "found on this machine: claude-code, codex"
rummage sources enable codex             # adds [sources.codex] to the config
rummage sources disable codex --drop     # switches it off and drops its items from the index
```

The index keeps text as written, credentials included, in a file only its owner can read (mode 600). What rummage
prints (`search`, `get`, `recent`, `recall`) has anything that looks like a credential replaced
with `[secret]`; `--show-secrets` shows it, and `mask_secrets = false` on a source turns masking off for it. The
output says when it masked something: each result carries `masked` (how many values), the JSON summary
`masked_secrets`, and `next_actions` (or a closing note in text output) gives the same command with
`--show-secrets`.

### Limits

Some files are too big to index whole. These limits apply per item and can be raised on the source:

| Setting | Default | What happens past it |
|---|---|---|
| `max_chars` | 400,000 | the item's text is indexed up to here (files, notes, mail and attachments) |
| `limits.text`, `.html`, `.office`, `.legacy-office`, `.iwork`, `.notebook`, `.pdf`, `.image` | 4, 8, 64, 64, 256, 32, 128, 40 MB | the file is indexed by name only (`files`, `seafile`) |
| `limits.tar` | 256 MB | a compressed tar is indexed by name only, without its listing |
| `max_pdf_pages` | 5000 | later pages are left out |
| `max_archive_names` | 5,000 | the archive's later entries are left out of its listing |
| `max_bytes` | 2 MB for `markdown`, none for `files` | the file is indexed by name only |
| `max_attachment_bytes` | 32 MB | a mail attachment's text is left out |
| `keep_chars` | 12,000 | chat sources keep this much of each message and of each reply |

Nothing is cut silently. An item a limit cut keeps a `partial` list (what was cut, how much was kept of how much,
and the setting to raise, e.g. `sources.documents.max_chars`); search results, `get`, `recent` and `recall` show
it, and `rummage status` counts such items per source along with the files `exclude` left out. `rummage get <ref>
--original` reads the whole file from disk now, without the limits; `<ref>` can also be the file's path. After
raising a limit, `rummage index --reload -s <source>` reads the items again.

A file rummage can't read at all (an encrypted PDF or Office file, a binary format with no reader, a picture without
the `ocr` extra's text) is still indexed by its name, and says why. `rummage status` counts these per source by
reason, with their file types and a few examples, so "what can't it read?" has one answer:

```
documents: 12 items found only by name: 9 a binary format rummage has no reader for (.pyc 5, .psd 2, .exe 2);
  3 needs a password to open (.pdf 2, .doc 1)
```

## Use

```sh
rummage index              # incremental: new and changed items go into keyword search at once, then get vectors
rummage search "query"     # --json, -s SOURCE, -k KIND, -n LIMIT, --words-only (no model, instant)
rummage search "lease" --path housing --glob '*.pdf'   # only part of a source
rummage search "receipt" --since 2026-10-01 --until 2026-10-31   # a dated note (weekly/2026-W44.md) counts as its period
rummage search "Ana Souza" --sort newest -n 50   # the newest of the matches first (--sort oldest: where it was first said)
rummage get "#3f2a9c"     # a result's text by its id (or ref); --loc for one passage, --head N
rummage get "#3f2a9c" --around 3   # with context: 3 chat turns before and after, or 3 lines around a passage
rummage get ~/Documents/report.pdf --original   # a file's whole text, read now, past the indexing limits
rummage recent --minutes 30          # the latest chat turns and changed files, newest first
rummage search "retry policy" --cwd ~/code/app   # what a query from that folder sees (default: this folder); --all for everything
rummage project ensure     # make the git repository you are in part of memory (agents' hooks do this by themselves)
rummage pause recall --for 2h        # no recall for two hours; `pause index`, `--private`, `--here`, `rummage resume`
rummage exclude --since 2h # keep the last two hours out of the index; `--session ID`, `--list`, `--remove ID`
rummage status --json      # counts, last run per source, failures
rummage status --watch     # follow indexing live: per source read and with vectors, pace, time left, pauses, errors
rummage status --line      # one short line while indexing is unfinished or broken, nothing once complete
rummage doctor             # runtime files, model vectors, freshness; exit 1 on a problem
rummage models             # embedding models; `models use NAME` switches, `models compare NAME` compares first
rummage watch              # index changes as they happen (install the `watch` extra for file events)
                           # while it runs, an `index` it didn't start leaves the work to it
rummage service install    # run watch at login: systemd user unit, launchd agent or Windows scheduled task
rummage export DIR         # the index as plain files; `rummage import DIR` fills an empty index from them
rummage daemon --idle-minutes 30   # keep the query model loaded; searches use it automatically
```

`search --json` prints one `rummage.search.v1` object: `status` (`ok`, `no_results`, `empty_index`), the request, a
summary (result count, how many are strong, meaning and word matches), the results (each with an `id` for `get`),
and `next_actions`: the commands that show what the output left out (masked credentials, the rest of a partially
indexed item) or build a missing index. Which query to run next is up to the caller. `--files` prints only refs,
and `--budget-tokens N` trims the JSON to about N tokens, keeping the top result. Exit codes: 0 success
(including no results), 1 failure, 2 usage, 3 index missing, 4 index busy, 5 model files
missing; with `--json`, failures print a `rummage.error.v1` object with `next_actions` too.

### Switching models

Most of what search finds depends on the embedding model, so the model is a setting. A model profile says where it
runs and how it wants its inputs written; EmbeddingGemma 2 is built in, and more go in the config:

```toml
[models.qwen3-0.6b]
gguf = "https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF/resolve/<revision>/Qwen3-Embedding-0.6B-Q8_0.gguf"
sha256 = "..."                        # a downloaded file is checked against it
query = "Instruct: Given a web search query, retrieve relevant passages that answer the query\nQuery: {text}"
document = "{title}\n{text}"
document_untitled = "{text}"
# dim = 512                           # keep only the first N dimensions (for Matryoshka models)

[models.openai-small]
url = "https://api.openai.com/v1"     # any OpenAI-compatible embeddings endpoint: llama-server, vLLM, TEI, hosted
api_model = "text-embedding-3-small"
api_key_env = "OPENAI_API_KEY"
```

```sh
rummage models compare qwen3-0.6b --public   # both models on your own passages, and on BEIR SciFact
rummage models use qwen3-0.6b                # fetch it and start switching
rummage status                               # progress: passages per source, rate, time left
rummage models rollback                      # after the swap, go back while the old vectors are kept
rummage models prune                         # free them
```

A switch builds the new model's vectors beside the old ones while searches keep using the old model, then swaps in
one step once every passage has one. On the way it calibrates the new model's thresholds against the old model on your
own index (how far a match must stand out depends on the model) and checks that the new model finds sampled passages
at least as well; if it does worse, it waits for `rummage models swap`. `rummage watch`, a scheduled `rummage index`
or a manual one all move it along, and it goes on where it stopped after a restart. `rummage models cancel` drops a
switch that hasn't finished.

`index` and `doctor` exit with 1 and one line per problem on stderr, so a scheduler that reports failures shows
them. An index run has two speeds: it reads what changed into keyword search right away, then makes vectors for it,
oldest first; until then those items are found by their words (`pending_vectors` in the JSON says how many wait).
Reading and making vectors take separate locks, so a long embedding run never holds up new items. A second run
that finds another one reading exits 0 at once (`--wait N` waits instead, and exits 4 if it still can't get in);
`--no-embed` only reads, `--embed-only` only makes vectors, and `--max-minutes` stops a long first run cleanly; the
next run continues where it stopped.

A run keeps a small `progress.json` in the data folder current (about once a second), and everything that reports
progress reads that file, never the index, so a status bar can ask every few seconds. Until the index is complete,
`search`, `get` and `recall` say so: their JSON carries an `index` object (`state`, a one-sentence `note`, items read,
passages with vectors, time left, why it paused or what failed) and their text output adds the note. Once it's
complete they add nothing.

## Coming from another memory system

`rummage setup` and `rummage project ensure` list the agent histories they find on the machine (Claude Code, Codex,
Gemini CLI, OpenCode, Hermes Agent, DeepSeek Harness) with the command that switches each on, and setup asks about
each one when you run it in a terminal. Nothing is read until you say so; `rummage sources disable <name>` switches one off again.

What another memory system has stored comes over through its export, with a `memory-export` source per system:

```toml
[sources.mem0]
type = "memory-export"
format = "mem0"
path = "~/exports/mem0"        # one file, or a folder of them
```

| `format` | Where the file comes from |
|---|---|
| `mem0` | The JSON of `Memory.get_all()` (open source) or `MemoryClient.get_all()` (platform), saved as `.json` or one memory per line in `.jsonl`, or `mem0 list --output json`. |
| `letta` | A Letta Agent File (`.af`, exported from the ADE or the API): its memory blocks. Agent Files don't hold archival memory, so passages come from a JSON list of what the passages API returns. Memory kept by Letta Code is Markdown files under `~/.letta/agents/<id>/memory`; point a `markdown` source at that folder instead. |
| `zep` | Facts (edges) from Zep's `graph.edge.get_by_user_id` / `get_by_graph_id` or Graphiti's `EntityEdge`s, as a JSON list or under `edges`. A fact that stopped being true says since when. |
| `lines` | A text or Markdown file with one memory per line, optionally starting with `[YYYY-MM-DD] - `. ChatGPT, Claude and Gemini have no memory file to download: copy the list from their memory settings, or ask the assistant to "list every memory you have stored about me" and save the answer (when it has a code block, only the lines in it are read). |

The export files are only read. Writing a newer export over the old file replaces the memories that changed and
drops the ones that are gone.

## Agents

Agents use the same CLI: `search --json`, `get` and `recent`. `rummage recall` gives prompt hooks a short block of
cited passages, or nothing when nothing clearly matches; it also adds what was said minutes ago in another chat
session when it holds a good part of the prompt's words, so a conversation can go on in a new window. Within a chat
session it doesn't repeat a passage it showed in the last few hours. A prompt with pictures (`--image FILE`, or the
hook's `images`) also finds items with pictures that look like them, if the query daemon embeds the picture within
two seconds; the cues from the words never wait for it.
[docs/integrations.md](docs/integrations.md) has hook snippets for Claude Code, Codex, OpenCode, Hermes Agent and
DeepSeek Harness, and [skills/rummage](skills/rummage/SKILL.md) is an Agent Skill to drop into an agent's skills
folder.

What a query sees depends on where it runs. Inside a git repository it sees that project: its own files and the
chats held in it, not your notes on another drive. A hook that passes its working folder adds a new repository to
memory by itself (the files git keeps, minus anything that holds keys) and reads it in the background. A repository
nothing reads yet is not a scope: a search there sees the default scope and says that `rummage project ensure` adds
the repository. A
`[scopes.<name>]` table gives a folder, such as an assistant's home, a wider view:

```toml
[scopes.assistant]
dirs = ["~/assistant"]
sources = ["*"]                       # everything
```

Every output says which scope applied; `--all` sees the whole index. Details in
[docs/integrations.md](docs/integrations.md#what-a-query-sees-scopes).

## Available plugins

These ship with rummage and are enabled by naming their type in the config (or, for the agent histories, with
`rummage sources enable`); extras pull in what they need. Every chat source has `user_name` and `assistant_name`
settings for the speaker labels.

| Type | Extra | Indexes |
|---|---|---|
| `seafile` | `seafile` | Files in [Seafile](https://www.seafile.com) libraries, through the web API with an account token (share the libraries with it read-only), a library's own API token, or both; rummage only reads, so a read-only token is enough. Text and documents as in `files`, archives listed over HTTP range requests, file bytes kept in memory. Config: `url`; for an account `token_env`, `token_file` or `env_file` + `token_env` (a KEY=value file), optional `libraries`; for library API tokens `library_tokens`, a list of tables with the same token settings, one per library (`[{ env_file = "~/Documents.env", token_env = "SEAFILE_REPO_TOKEN" }]`); optional `exclude_paths`, `internal_url`. |
| `claude-code` | | [Claude Code](https://docs.anthropic.com/en/docs/claude-code) sessions (`~/.claude/projects`). One item per message you wrote, with the visible reply after it, the project folder, the model and the time; tool calls and their output, thinking and subagents are left out. Read as append-only logs, so `watch` picks up new lines within seconds. Off until enabled. |
| `codex` | `dsh-sessions` | [Codex CLI](https://github.com/openai/codex) sessions (`~/.codex/sessions`, archived and compressed ones too), the same way. Off until enabled. |
| `gemini-cli` | | [Gemini CLI](https://github.com/google-gemini/gemini-cli) sessions (`~/.gemini/tmp/*/chats`), the same way. Off until enabled. |
| `opencode` | | [OpenCode](https://github.com/anomalyco/opencode) 2 sessions in its `opencode.db`, the same way. Off until enabled. |
| `dsh-sessions` | `dsh-sessions` | Chats in [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) session logs: one item per message a person wrote, with the reply after it. Config: optional `projects` (default: all), `people` (a JSON map of sender ids to names), `assistant_name`, `principals_since` (when every channel began recording its sender as `source.principal`; from then the principal alone decides, and a message without one is no person's), `web_senders_since` (for older history: when the Web login began recording every sender; later Web prompts with no sender are an agent's). Messages agents send each other, and the replies to them, are left out. Pictures sent with a message are read from DSH's attachment store (`attachments`, default `<dsh home>/attachments/v1`) into the message's item like a file's picture: an image vector and the text OCR finds in them (`rummage[ocr]`), at `image N` in the message; `images = false` leaves them out, `ocr = false` skips the text, `limits.image` caps their size. A message of only pictures is a message too. Off until enabled. |
| `hermes` | | Chats in a [Hermes Agent](https://github.com/NousResearch/hermes-agent) `state.db`, the same way. Config: `db` (default: Hermes's home), optional `people`, `exclude_sessions`, `frontends`, and `sessions`: Hermes's `sessions` folder, whose `session_<id>.json` snapshots and `<id>.jsonl` logs add the turns the database lacks (older versions, messages Hermes couldn't store). Off until enabled. |
| `mail` | | Mail in a Maildir, an mbox, an IMAP or a JMAP account (read-only: nothing is marked read). One item per message: subject, sender, recipients, date, body, and the text of attached documents. Every folder but junk, trash and drafts by default. Config: `maildir` or `mbox`, or `imap_host` + `imap_user`, or `jmap_session` + `jmap_user`; `password_env`, `password_file` or `password_command` (or `oauth_token_command` for OAuth/XOAUTH2 IMAP); optional `folders`, `since` (`2024-01-01`, `2y`). |
| `memory-export` | | Memories exported from another memory system, one item per memory with its time, user, agent and origin, embedded again with rummage's model (vectors in the file are not used). Config: `format` (`mem0`, `letta`, `zep` or `lines`), `path` (a file or a folder of them), optional `user` and `agent` for files that don't say, `origin` for a `lines` file. See [Coming from another memory system](#coming-from-another-memory-system). |
| `telegram-stickers` | | The sticker library kept by [dsh-telegram-bot](https://github.com/soffits/dsh-telegram-bot): each sticker's saved meaning, and its picture, so a sticker is found by what it says or shows. Needs ffmpeg and the bot token. |

A plugin of your own is a class registered in the `rummage.sources` entry-point group; the docstring of
`rummage.sources` describes the interface.

## Quality

On public retrieval slices rummage ranks the right document first more often than fidx and qmd's keyword mode:
SciFact nDCG@10 0.92 (fidx 0.83), Korean MIRACL 0.80 (fidx 0.46). Setup, every number and what they don't show:
[docs/benchmarks.md](docs/benchmarks.md).

## Speed

On a desktop CPU (Intel i5-13400, 2 threads): ~1.35 s per passage of ~500 tokens while indexing, ~2 s per picture,
and a search takes about 1.5 s when it loads the text model itself, or about 0.25 s with `rummage daemon` running
(mostly Python starting up). The first search after a quiet spell starts the daemon itself and waits for it to load;
the daemon exits after `[daemon] idle_minutes` (default 20) without a query, so the memory comes back.
`--words-only` needs no model at all.
After the first index, a run only embeds what changed.

## How it ranks

Every stored vector is scored against the query. Scores are put on one scale per query (z-scores, with a separate
mean per modality so pictures and passages compare), and only segments well above the rest count as meaning
matches, which also gives an honest "nothing found". Exact-word matches from SQLite FTS5 add a bonus that grows
with how many of the query's words an item has, weighed by how many of the meaning matches are in the query's
script, so a question about a note in another language is decided by meaning. Among plausible matches, newer ones
get a small bonus that halves with every three days of age, so a current note comes before an older chat line that says
something different. CJK text (Chinese, Japanese, Korean) is indexed one character per token and queried by character pairs, so
two-character words match. The ranking is adapted from [DigUp](https://github.com/ARahim3/DigUp). More in
[docs/design.md](docs/design.md).

## License

AGPL-3.0-or-later (versions up to 0.2.x were MIT). Third-party notices are in [NOTICE](NOTICE). EmbeddingGemma 2 is
Apache 2.0 (Google DeepMind); llama.cpp is MIT.
