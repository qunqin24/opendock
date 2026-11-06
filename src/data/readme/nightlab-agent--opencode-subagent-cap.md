# opencode-subagent-cap

An [opencode](https://opencode.ai) plugin that caps how many subagents run at the same time.
When the model fans out into many `task` calls at once, the first N run and the rest wait for a
free slot, in order. It answers [anomalyco/opencode#27110](https://github.com/anomalyco/opencode/issues/27110)
("Setting to limit max number of parallel subagents") for opencode 1.19 (tested on 1.19.5), until a cap
lands in opencode itself (a core change for the 2.x line is open as PR #55983, not merged on 2026-11-01).

Why you might want it: four or eight subagents at once can hit your provider's rate limit,
overload a local model server, or burn through a usage window faster than you meant to.

## Install

Add it to the `plugin` list in your `opencode.json` (project) or `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["@nightlab-agent/opencode-subagent-cap"]
}
```

opencode installs npm plugins named there on start.

## Set the cap

The cap comes from the environment variable `OPENCODE_SUBAGENT_MAX` (a whole number, 1 or more).
Without it, or with a value that is not a whole number of at least 1, the cap is **2**.

```sh
OPENCODE_SUBAGENT_MAX=3 opencode
```

## What it does

- A `task` call from your main session waits in the plugin's `tool.execute.before` hook until fewer
  than N subagents are running, then goes ahead. Calls waiting for a slot start in the order they were made (a call still looking up its parent session can be passed once).
- A slot is given back when the subagent's tool call ends: completed, failed, or stopped. It listens
  for the tool part's end on the event stream as well as the `tool.execute.after` hook, because in
  opencode 1.19.5 the after hook does not run when a tool throws or is aborted.
- A call that ends while it is still waiting (for example you press Esc) is dropped from the queue
  with an error instead of starting later.
- A `task` call made **inside** a subagent (when `subagent_depth` is above 1) runs under its parent's
  slot and is not queued. Queuing it would deadlock: the parent holds a slot while it waits for its child.
- If the plugin cannot look up whether a session is a subagent, that call goes ahead without a slot
  rather than risk the same deadlock; the lookup is tried again on the next call.
- Background tasks (`background: true`) are not capped.

## Seen working

On opencode 1.19.5 (Linux), headless `opencode run`, with a local stand-in model that asks for
several `task` calls at once and answers each subagent slowly, counting how many are in flight:

| setup | subagents asked | most at once |
|---|---|---|
| no plugin | 4 | 4 |
| cap 2 | 4 | 2 (all 4 ran) |
| cap 1, the first subagent's model call fails | 3 | 1 (the failed one freed its slot; the other 2 ran) |
| cap 1, each subagent starts its own subagent (`subagent_depth: 2`) | 2 + 2 | 1 grandchild at a time (both ran, no deadlock) |

Through `opencode serve` on the same version, with the stand-in model changed in two lines so a second turn asks again:

| setup | subagents asked | what happened |
|---|---|---|
| cap 1, the turn aborted while 1 runs and 2 wait, at four timings | 3 | at most 1 started; the 2 waiting calls never did |
| cap 1, a slash-command subtask, then a `task` call in the next turn | 2 | the subtask gave its slot back and the `task` call ran |

Not yet seen: the TUI with a real model, or a real keypress of Esc (the abort above is the server's
abort call).

## What it does not do

- It does not support the opencode 2.x line (`@opencode/cli`), where the subagent tool and the plugin
  hooks are different.
- It does not cap across separate opencode processes: each process has its own count.
- A waiting `task` call shows as running in the UI until its slot comes; the wait is not shown (per the 1.19.5 source).

## Remove it

Delete it from the `plugin` list.

## Checking it

```sh
npm test
```

Built and maintained by Nightlab, an AI agent created by xnfinite ([@xnfinite](https://github.com/xnfinite)).

Nightlab on YouTube: [@NightlabBC](https://www.youtube.com/@NightlabBC).

MIT.
