# agent4science

**English** | [한국어](README.ko.md)

Do your research thinking in a top web chatbot, then let your coding agent actually run the
experiments. agent4science connects the two, and works with **OpenCode**, **Claude Code**, and
**Codex**.

## The idea in one minute

When you're figuring out *what* to research — is this idea new? does the experiment actually
test it? what's the smallest version worth running? — the best tool is usually a chat with the
smartest model you can reach, like GPT Pro or Claude/Fable. But those live in a browser. You
can't point your coding agent at them, and running the report through an API isn't cheap.

So agent4science splits the work the natural way:

- **The web chatbot does the thinking.** You brainstorm and pressure-test the idea there.
- **Your coding agent does the doing.** It reads that conversation, writes the code, runs the
  experiments, checks the numbers, and writes up what happened.
- **Then it hands you a prompt to paste back into the web** for the next round.

You're not locked into any one product. Use whatever web model is smartest for you; use whatever
coding agent you already have.

## Quick start

First, the CLI (Claude Code and Codex call it under the hood):

```bash
npm install -g agent4science
```

Then set it up in your coding agent. **Restart the agent afterward** so it picks up the new
commands.

**OpenCode** — installs a native plugin plus the `ai4science` agent and `/ai4s-*` commands:

```bash
agent4science install --global
# verify it registered:  opencode agent list   (you should see "ai4science (primary)")
```

Then open OpenCode and press **Tab** to switch to the `ai4science` agent.

**Claude Code and Codex** — install it as a plugin. This registers the `/ai4s-*` commands, the
subagents, and an **agent4science skill** that the agent invokes on its own when you mention
research. It works the same for both:

```bash
# Claude Code
claude plugin marketplace add LeeBumSeok/agent4science
claude plugin install agent4science@agent4science

# Codex
codex plugin marketplace add LeeBumSeok/agent4science
codex plugin add agent4science@agent4science
```

(Prefer plain files over a plugin? `agent4science install --global --target claude` and
`--target codex` copy the commands, agents, skill, and prompts into `~/.claude` and
`~/.codex` directly.)

Now you have a set of `/ai4s-*` commands — and in Claude Code or Codex you can also just *ask*
("use agent4science to turn this idea into an experiment") and it'll take over. Here's a full
run, start to finish:

```
# 1. Start a project and say what you're studying.
/ai4s-init  Does a physics-based regularizer help a GNN on small molecular datasets?

# 2. Get a prompt to kick off the research chat, and paste it into GPT Pro or Claude.
/ai4s-pro-prompt
#    → talk it through in the browser: sharpen the question, pick one hypothesis,
#      design the smallest experiment that could prove it wrong.

# 3. Share that conversation (ChatGPT: Share → Create link; Claude: Share → Create link)
#    and hand the link back:
/ai4s-import-conversation  https://chatgpt.com/share/....

# 4. Turn the discussion into a concrete plan, then build and run it.
/ai4s-validate     # pull a structured experiment spec out of the conversation
/ai4s-plan         # look at the repo, write a minimal implementation plan
/ai4s-implement    # write the code + a smoke test
/ai4s-run          # run the smoke test, then the experiment across seeds
/ai4s-analyze      # compare against the baseline, honestly

# 5. Get a summary prompt to take the results back to the web for the next round.
/ai4s-pro-review
```

Lost track of where you are? Run `/ai4s-status` any time — it tells you the current step and
what to do next.

## The commands

| Command | What it does |
|---|---|
| `/ai4s-init <goal>` | Start a project (creates the `.ai4science/` folder). |
| `/ai4s-pro-prompt` | Write a prompt to start the research chat in your web model. |
| `/ai4s-import-conversation <url>` | Pull in a whole shared ChatGPT or Claude conversation. |
| `/ai4s-ingest` | Or paste a compact `AI4S-HANDOFF-V1` block instead of a link. |
| `/ai4s-validate` | Turn the conversation into a concrete, checkable experiment spec. |
| `/ai4s-plan` | Map the repo and write a minimal implementation plan. |
| `/ai4s-implement` | Write the code and a smoke test. |
| `/ai4s-run` | Run the smoke test, then the experiment across seeds. |
| `/ai4s-analyze` | Analyze the results against the plan; write it up. |
| `/ai4s-report` | Produce the research report. |
| `/ai4s-pro-review` | Build the next-round prompt to paste back into the web model. |
| `/ai4s-status` | Show where the project stands and what's next. |

On OpenCode you'll also see an **`ai4science`** agent in the agent switcher (press Tab) that
drives all of this for you. On Claude Code and Codex the same commands run through the CLI.

## Two ways to bring your research in

**Import the whole conversation** (recommended). Share the chat and give the link to
`/ai4s-import-conversation`. It fetches that one public page you pointed it at, saves the full
transcript to `.ai4science/pro_conversation.md`, and `/ai4s-validate` works out the experiment
spec from there. Works with:

- **ChatGPT** — `chatgpt.com/share/...`
- **Claude** — `claude.ai/share/...`

(Heads up: if the chat was a ChatGPT *deep research* run, its report is redacted from the public
share, so only your prompt comes through. agent4science tells you when that happens — paste the
report text in yourself if you need it.)

**Or paste a handoff block.** If you'd rather not share a link, ask the web model to produce an
`AI4S-HANDOFF-V1` block and paste it into `/ai4s-ingest`. A bit more manual, but it works with
any model.

Either way, the pipeline downstream is the same.

## How it stays safe

The imported conversation and any handoff are treated as **untrusted input** — they came from
outside, so agent4science doesn't take them at their word:

- **Nothing runs just because the handoff said so.** Every command it proposes is screened
  first. Dangerous ones (recursive deletes, `sudo`, piping the internet into a shell, force
  pushes, cloud CLIs, reading your credentials) are refused. On OpenCode this is enforced at
  runtime for *every* shell command, not just the ones in the handoff.
- **Steps run in order, and nothing gets quietly rewritten.** Failed runs are kept, not deleted.
  The hypothesis, metrics, and success criteria you agreed on don't change behind your back.
- **Missing or malformed input gets sent back, not guessed.** You get a short patch request to
  paste into the web model, and try again.

High-risk topics ask for your explicit go-ahead before the pipeline continues.

## Under the hood

A few details if you're curious — you don't need any of this to use it.

**The `.ai4science/` folder** is the project's memory: current step, the imported conversation,
where it came from, a log of every run, and the reports. Everything the pipeline knows lives
there.

**It moves one step at a time,** and won't skip ahead — each step needs the previous one's
output on disk before it'll run:

```
initialized → handoff_imported → validated → repo_mapped
  → implementation_planned → implemented → tested
  → experiment_ran → analyzed → pro_feedback_ready
```

**The `AI4S-HANDOFF-V1` block** is the little contract between the web chat and your agent — a
YAML block with the research question, hypothesis, experiment (baseline, metric, success and
failure criteria, seeds), tasks, and safety level. When you import a conversation, `/ai4s-validate`
builds this for you. The full spec, with a worked example, is in
[`schema/ai4s-handoff-v1.md`](schema/ai4s-handoff-v1.md).

**The agents** (on OpenCode and Claude Code): a primary `ai4science` agent runs the show and
hands specific jobs to focused subagents:

| Agent | Job |
|---|---|
| `ai4science` | Runs the pipeline (the one you talk to). |
| `@ai4s-intake-validator` | Checks the handoff as untrusted input. |
| `@ai4s-repo-cartographer` | Reads the repo to find where the experiment should live. |
| `@ai4s-experiment-planner` | Turns the spec + repo into a minimal plan. |
| `@ai4s-implementation-engineer` | Writes the code and smoke tests. |
| `@ai4s-experiment-runner` | Runs approved commands and logs every run. |
| `@ai4s-result-analyst` | Analyzes the results and writes the report. |
| `@ai4s-pro-feedback-composer` | Drafts the next-round prompt for the web model. |

## Development

The logic lives in plain JavaScript under `src/core/`, tested with Node's built-in runner — no
OpenCode or bun needed to run the tests:

```bash
npm test                             # 75 tests
npm run lint:frontmatter             # check the command/agent files
node scripts/build-cross-agent.js    # regenerate the Claude Code + Codex assets
```

Layout:

- `src/core/` — the actual logic (`safety`, `state`, `handoff`, `conversation`, `ledger`,
  `prompts`, `fetch`, `actions`); all pure and testable.
- `bin/agent4science.js` — the CLI: the installer, plus the subcommands Claude Code and Codex call.
- `opencode/` — the OpenCode plugin, commands, and agents.
- `claude/`, `codex/` — the Claude Code and Codex assets, generated from `src/` by the build script.
- `schema/`, `fixtures/`, `test/`, `install.sh`.

## A note on sharing

`/ai4s-import-conversation` fetches **one public page that you created and handed to it** — the
share link. It's not scraping, it's not bypassing a login, and it's not automating a browser; it
just reads what the public share page already shows. Prefer not to fetch anything? Use
`/ai4s-ingest` and paste the handoff yourself. Either way, only the link is kept, as a record of
where the research came from.

One caution: a share link is public. Anyone with it can read the conversation, and it doesn't
expire — so don't share anything sensitive.
