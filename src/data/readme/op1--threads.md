# Threads for OpenCode

[![npm version](https://img.shields.io/npm/v/%40op1%2Fthreads)](https://www.npmjs.com/package/@op1/threads) [![MIT license](https://img.shields.io/badge/license-MIT-blue)](https://github.com/opzero1/threads/blob/main/LICENSE)

Threads is an OpenCode plugin that lets you hand work to background agents while you keep using your main conversation. Ask a worker to review code, investigate a bug, or test a change. It works in a separate conversation and sends back a report with evidence.

You can open any worker to see what it did and send it a follow-up. For larger jobs, workflows run agents in parallel, pass results between steps, and keep a record so you can resume after a restart.

## Install

Threads **0.3.4 needs OpenCode 2.1 or later**. For older versions, see [compatibility](https://github.com/opzero1/threads/blob/main/docs/configuration.md#compatibility).

1. Add the server plugin:

   ```sh
   opencode plugin add @op1/threads
   ```

2. Restart OpenCode.

OpenCode loads the terminal UI from the server plugin automatically. You do not need a second entry in `cli.json`. See [configuration](https://github.com/opzero1/threads/blob/main/docs/configuration.md) for version pinning, limits, and the optional agent skill.

## Start your first worker

Ask your agent, replacing the path with an existing project folder:

```text
Start a Threads worker in /path/to/my-app to review the auth changes.
Don't edit files. Report findings with file paths and evidence.
```

Your conversation stays free while the worker runs. The prompt footer shows its progress:

```text
⠋ 1 worker ctrl+x j
```

Press `ctrl+x j` to open the Threads list. Select the worker, press **Enter**, and choose **Open** to read its conversation. You can also open the list with `/activities`.

The worker's report arrives in your main conversation. Ask your agent to send a follow-up if you need more detail. See [Work with workers](https://github.com/opzero1/threads/blob/main/docs/workers.md) for roles, permissions, and stopping workers.

## What you can do

- **Keep separate conversations for separate tasks.** Each worker has a folder, an agent profile, and a model. You can inspect its work without mixing it into your main conversation.
- **Get a verdict with evidence.** Workers report `PASS`, `PASS WITH NOTES`, `FAIL`, or `INCONCLUSIVE`. A worker that stops without a report has no verdict. Check the evidence before accepting the result.
- **See what needs attention.** Threads opens no worker tabs by itself. The footer shows running work and requests for input. Workers that pass hide once idle; failed or unreported work stays visible in the list.
- **Run work in parallel.** Workflows coordinate multiple agents, pass results to later steps, and pause for your input. Their saved records let a resumed run reuse completed steps.

To start a workflow, describe the job with `/workflow-run`:

```text
/workflow-run Review src/auth and src/billing in parallel. Confirm each finding independently.
```

Run `/workflows` to see the steps, open a worker, or pause, stop, and resume the run. See [Run a dynamic workflow](https://github.com/opzero1/threads/blob/main/docs/workflows.md).

For a small lookup, OpenCode's built-in subagents may be enough. Use Threads when you want a conversation you can return to, or a workflow with several steps. [Compare workers, workflows, and subagents](https://github.com/opzero1/threads/blob/main/docs/how-it-works.md#workers-workflows-and-subagents).

## Documentation

- [Work with workers](https://github.com/opzero1/threads/blob/main/docs/workers.md): start, watch, follow up, and stop.
- [Run a dynamic workflow](https://github.com/opzero1/threads/blob/main/docs/workflows.md): parallel work, checkpoints, and saved scripts.
- [Configuration](https://github.com/opzero1/threads/blob/main/docs/configuration.md): compatibility, limits, commands, and shortcuts.
- [Reference](https://github.com/opzero1/threads/blob/main/docs/reference.md): tools, fields, and data shapes.
- [How Threads works](https://github.com/opzero1/threads/blob/main/docs/how-it-works.md): permissions, retries, and recovery.
- [Workflow heartbeats](https://github.com/opzero1/threads/blob/main/docs/heartbeat.md): monitor unattended workflows.
- [Workflow runtime contract](https://github.com/opzero1/threads/blob/main/skills/workflow-authoring/references/runtime.md): write scripts by hand.
- [Development](https://github.com/opzero1/threads/blob/main/docs/development.md): build, test, and release.
- [Changelog](https://github.com/opzero1/threads/blob/main/CHANGELOG.md): changes between versions.

## License

[MIT](https://github.com/opzero1/threads/blob/main/LICENSE)
