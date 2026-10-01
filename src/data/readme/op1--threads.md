# Threads for OpenCode

**Opinionated background agents for OpenCode V2: visible worker sessions that report back with a verdict, and durable parallel workflows that survive restarts.**

[![npm](https://img.shields.io/npm/v/@op1/threads)](https://www.npmjs.com/package/@op1/threads) [![license](https://img.shields.io/npm/l/@op1/threads)](LICENSE)

Threads lets one OpenCode conversation hand work to others. Each worker is an ordinary OpenCode conversation with its own folder, agent, and model. It runs in the background and reports back to the conversation that started it. You can open any worker, read what it did, and send it a follow-up.

For bigger jobs, Threads runs dynamic workflows. The agent writes a short JavaScript script that sends work to many workers at once, checks what they return, and can resume after a restart.

## The opinions

The "op" in `op-threads` stands for opinionated. Threads makes these choices for you:

- **Workers are real conversations.** Each worker is a top-level OpenCode session that you can open in a tab. Nothing runs where you can't see it.
- **Idle is not done.** A worker finishes by reporting `PASS`, `PASS WITH NOTES`, `FAIL`, or `INCONCLUSIVE`, with evidence. A worker that stops without a report has no verdict.
- **Reports come to you.** The report lands in the conversation that started the worker, so the agent doesn't have to poll.
- **One level of workers.** Workers can use OpenCode's subagents, but they can't start workers of their own.
- **Quiet by default.** Threads opens no tabs by itself. A small footer indicator shows what's running and disappears when nothing is.
- **Workflows keep a journal.** A resumed run reuses every finished step instead of doing it again.

## Install

Threads needs OpenCode V2 and is tested on OpenCode 2.0.18.

1. Add the server plugin:

   ```sh
   opencode plugin add @op1/threads
   ```

2. Add the terminal plugin to `~/.config/opencode/cli.json`. The command in step 1 doesn't do this.

   ```json
   {
     "plugins": [{ "package": "@op1/threads" }]
   }
   ```

3. Restart OpenCode.

Optionally, copy [`skills/managed-sessions`](skills/managed-sessions) into `~/.config/opencode/skills/`. It teaches agents when to start a worker and how to brief it.

## How do I run background agents in OpenCode?

Ask your agent in plain language:

```text
Start a Threads worker in /path/to/my-app to review the auth changes. Report findings with file paths.
```

The agent calls `threads_spawn`, and the worker starts in the background. Your conversation stays free. While the worker runs, the prompt footer shows:

```text
⠋ 1 worker ctrl+x j
```

Press `ctrl+x j` to open the Threads list. Highlight the worker and press **Enter** to open its conversation.

When the worker finishes, its report arrives in your conversation. Workers that pass leave the list by themselves. Workers that fail, or stop without a report, stay in the list so you notice them.

## How do I run agents in parallel?

Describe the job with `/workflow-run`:

```text
/workflow-run Audit src/auth and src/billing for missing authorization checks. Confirm each finding independently.
```

The agent writes a workflow script and starts it in the background. Run `/workflows` to watch its steps, open any worker, and pause, stop, or resume the run.

## Threads or subagents?

Use one of OpenCode's built-in subagents for a quick lookup or a small review whose answer comes straight back to you. Use a Threads worker when you want:

- A separate conversation that you can open, read, and follow up on.
- Work assigned to its own folder or worktree.
- A clear verdict with evidence, not only a finished run.
- A specific agent profile and model for one piece of work, such as an independent reviewer.

Use a Threads workflow when many agents should run in parallel, or when later steps depend on earlier results. You can mix all three: workers can use subagents too.

## Learn more

| To | Read |
| --- | --- |
| Start workers, pick roles, and follow up | [Work with workers](docs/workers.md) |
| Run, watch, and save workflows | [Run a dynamic workflow](docs/workflows.md) |
| Change limits, commands, and shortcuts | [Configuration](docs/configuration.md) |
| Look up tools, fields, and data shapes | [Reference](docs/reference.md) |
| Understand retries, permissions, and recovery | [How Threads works](docs/how-it-works.md) |
| Write workflow scripts by hand | [Workflow runtime contract](skills/workflow-authoring/references/runtime.md) |
| Develop or release Threads | [Development](docs/development.md) |
| See what changed between versions | [Changelog](CHANGELOG.md) |

## License

[MIT](LICENSE)
