# Opcode

[![CI](https://github.com/ZackarySantana/opcode/actions/workflows/ci.yml/badge.svg)](https://github.com/ZackarySantana/opcode/actions/workflows/ci.yml)
[![Release](https://github.com/ZackarySantana/opcode/actions/workflows/release.yml/badge.svg)](https://github.com/ZackarySantana/opcode/actions/workflows/release.yml)

| Plugin | Make room for… | npm |
| --- | --- | --- |
| [Later](#later-save-the-thought-keep-the-flow) | The next idea, without interrupting this one | [![Later version](https://img.shields.io/npm/v/@lidtop/opencode-later?label=later)](https://www.npmjs.com/package/@lidtop/opencode-later) |
| [Context](#context-know-whats-taking-up-space) | A clearer picture of your current session | [![Context version](https://img.shields.io/npm/v/@lidtop/opencode-context?label=context)](https://www.npmjs.com/package/@lidtop/opencode-context) |
| [Cost](#cost-see-where-the-usage-goes) | Perspective on costs, tokens, and activity | [![Cost version](https://img.shields.io/npm/v/@lidtop/opencode-cost?label=cost)](https://www.npmjs.com/package/@lidtop/opencode-cost) |
| [Sessions](#sessions-find-the-conversation-not-just-the-project) | Work worth coming back to | [![Sessions version](https://img.shields.io/npm/v/@lidtop/opencode-sessions?label=sessions)](https://www.npmjs.com/package/@lidtop/opencode-sessions) |
| [Feed](#feed-know-whats-down-before-you-debug) | What's happening with the services you depend on | [![Feed version](https://img.shields.io/npm/v/@lidtop/opencode-feed?label=feed)](https://www.npmjs.com/package/@lidtop/opencode-feed) |
| [GH PR Status](#gh-pr-status-never-leave-a-review-waiting) | The pull requests waiting on you | [![GH PR Status version](https://img.shields.io/npm/v/@lidtop/opencode-gh-pr-status?label=gh-pr-status)](https://www.npmjs.com/package/@lidtop/opencode-gh-pr-status) |
| [Snippets](#snippets-say-it-once-reuse-it-everywhere) | The prompts you'd otherwise type again | [![Snippets version](https://img.shields.io/npm/v/@lidtop/opencode-snippets?label=snippets)](https://www.npmjs.com/package/@lidtop/opencode-snippets) |
| [Media](#media-narration-sound-and-images-on-request) | The voice, sound, and pictures your project needs | [![Media version](https://img.shields.io/npm/v/@lidtop/opencode-media?label=media)](https://www.npmjs.com/package/@lidtop/opencode-media) |

*Demo videos and screenshots show the OpenCode terminal UI with fictional demo data, except the Feed screenshot, which shows real public status feeds.*

## Later: save the thought, keep the flow

“After this, we should…” doesn't have to become a distraction. Keep a shared Later list across your local projects and sessions, with your next ideas visible in the sidebar.

**Capture → organize → bring it back when you're ready.** Reorder what matters, keep completed history, and put an item into your prompt when it's time. Nothing runs automatically. You review the prompt and decide when to submit it. The agent can add and complete items for you, and asks before deleting one.

https://github.com/user-attachments/assets/6c145b7c-be82-4ebe-a735-9e40ba2706d9

<table>
  <tr>
    <td width="50%">
      <img src="docs/images/later-sidebar.png" alt="Later list alongside an OpenCode session, keeping follow-up ideas visible in the sidebar" width="100%" />
      <p><strong>Keep the next idea in sight.</strong><br />Your list, right beside the conversation.</p>
    </td>
    <td width="50%">
      <img src="docs/images/later-manager.png" alt="Later manager with four active items, a selected follow-up, and completed history" width="100%" />
      <p><strong>Make space for what's next.</strong><br />One place to organize ideas and revisit finished items.</p>
    </td>
  </tr>
</table>

[Explore Later →](plugins/later/README.md)

## Context: know what's taking up space

Long session? Get a clearer picture before deciding what to trim or carry forward. See recorded token usage, estimated context utilization, cache efficiency, and the biggest visible contributors. The report doesn't need a model call.

**Get the overview → find the heavy parts.** Look beyond the totals to retained content and the instructions, skills, and tools available to your session. Estimates are labeled; this isn't a claim to see every hidden part of a provider request.

https://github.com/user-attachments/assets/9fe6207a-63a4-4779-8eea-929bb9e0065e

<table>
  <tr>
    <td width="50%">
      <img src="docs/images/context-overview.png" alt="Context overview with recorded token usage, estimated utilization, cache efficiency, and session activity" width="100%" />
      <p><strong>The session at a glance.</strong><br />Usage, context estimates, and activity together.</p>
    </td>
    <td width="50%">
      <img src="docs/images/context-content.png" alt="Context Content tab ranking retained tool outputs and messages by estimated tokens" width="100%" />
      <p><strong>See what's taking up room.</strong><br />Find the largest observable context contributors.</p>
    </td>
  </tr>
</table>

[Explore Context →](plugins/context/README.md)

## Cost: see where the usage goes

Turn scattered sessions into a readable picture of your usage. See recorded costs and tokens across projects and models, with daily activity to show how things change over time.

**Start with the totals → see them by model, project, day, or longest turn.** Costs come from OpenCode's provider-reported records, not a separate pricing calculator. Use them to understand your usage, but check your provider's invoice for billing.

https://github.com/user-attachments/assets/5bb36ebf-b44d-41e9-8d1c-3b442618cb3b

![Cost dashboard with usage totals, model and project breakdowns, and daily activity ordered newest first](docs/images/cost-dashboard.png)

*The big picture and the breakdowns, in one view.*

[Explore Cost →](plugins/cost/README.md)

## Sessions: find the conversation, not just the project

Remember the discussion but not where it happened? Search session titles, project paths, and indexed message text across your OpenCode projects, then preview the match before picking it up again.

**Remember a phrase → find the session → get back to it.** Filter by project, include subagents when you need them, and see a matching message alongside the results, then open it, whichever directory it belongs to.

**Keep an eye on every running agent.** The top of the sidebar lists the sessions that are working, waiting on you, or finished since you last looked, across all your projects. Click one, or type `/go 2`, to jump there, and `/go back` to return.

![Sessions browser searching for cache discussions across projects with a selected message preview](docs/images/sessions-browser.png)

*Less hunting through projects. More getting back to the useful part.*

[Explore Sessions →](plugins/sessions/README.md)

## Feed: know what's down before you debug

Is it your code, or is npm having a bad day? Follow the status pages and release feeds you depend on, with what's in progress in the sidebar and the full picture one command away.

**Glance at the sidebar → open `/feed` for the details → jump to the incident.** In-progress incidents come first, status pages with nothing going on are grayed out at the top, scheduled maintenance waits under Upcoming, and releases get their own tab. Pick from presets like npm, GitHub, Claude, OpenAI, AWS, and Cloudflare, plus release feeds and blogs, or paste any RSS or Atom URL.

https://github.com/user-attachments/assets/52f67075-8fe5-4f3a-8e83-599213e15e60

![Feed Status tab with in-progress Claude and OpenAI incidents and operational status pages grayed out at the top](docs/images/feed-status.png)

[Explore Feed →](plugins/feed/README.md)

## GH PR Status: never leave a review waiting

Someone asked for your review an hour ago, and your own pull request has been approved since lunch. See the GitHub pull requests that need you in the sidebar, using the GitHub CLI you're already signed in to.

**Glance at the sidebar → open `/ghpr` for everything → jump to the pull request.** Review requests for you come first, then your teams', then your pull requests that are blocked or ready to merge. `/ghpr` lists your pull requests, the ones you review, and your teams' review requests with every requested reviewer, filtered to the team you choose.

https://github.com/user-attachments/assets/8ccd999c-d742-4e8a-ac69-7ed7096f4fed

[Explore GH PR Status →](plugins/gh-pr-status/README.md)

## Snippets: say it once, reuse it everywhere

Typing the same review checklist or project briefing again? Save it as a snippet and drop it into any message with `@name`. The message still reads `@name`; the snippet's text goes along with it.

**Ask for a snippet → approve it → use it anywhere.** `/snippets new` opens a chat where the agent writes snippets for you, and every write waits for your approval. `/snippets` lists them with a preview, inserts one into your prompt, or opens one for editing in chat. Snippets are plain Markdown files, global or per project, and project snippets override global ones.

[Explore Snippets →](plugins/snippets/README.md)

## Media: narration, sound, and images on request

Building something that needs a voice-over or artwork? Connect OpenRouter once with `/connect`, and the agent can generate speech, sound effects, and images straight into your project, with no `.env` file and no API calls written by hand.

**Connect once → ask for it → find it in your project.** The agent picks a model and voice, saves the file where you want it, and reports what it spent and the credit left on your key. Your permission rules can ask before each generation or block expensive models, and the key still works when a policy keeps OpenRouter out of model selection.

[Explore Media →](plugins/media/README.md)

## Install

Requires the **OpenCode 2.1.3+ terminal UI, within the 2.x release line**.

Pick the plugins you want and run their install commands:

```sh
opencode plugin add @lidtop/opencode-later
opencode plugin add @lidtop/opencode-context
opencode plugin add @lidtop/opencode-cost
opencode plugin add @lidtop/opencode-sessions
opencode plugin add @lidtop/opencode-feed
opencode plugin add @lidtop/opencode-gh-pr-status
opencode plugin add @lidtop/opencode-snippets
opencode plugin add @lidtop/opencode-media
```

**Prefer editing your config?** Instead, add the packages you want to `plugins` in your global `~/.config/opencode/opencode.jsonc` (or `opencode.json`), keeping your existing entries:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "@lidtop/opencode-later",
    "@lidtop/opencode-context",
    "@lidtop/opencode-cost",
    "@lidtop/opencode-sessions",
    "@lidtop/opencode-feed",
    "@lidtop/opencode-gh-pr-status",
    "@lidtop/opencode-snippets",
    "@lidtop/opencode-media"
  ]
}
```

OpenCode installs the packages and loads their terminal views. Restart OpenCode if they don't appear. Using a remote server? Configure the plugins there; each plugin's guide covers the details.

Replacing the original plugins? Remove their old configuration entries rather than loading both versions. See the [migration notes](docs/migration.md).

---

**Make it yours:** [Later guide](plugins/later/README.md) · [Context guide](plugins/context/README.md) · [Cost guide](plugins/cost/README.md) · [Sessions guide](plugins/sessions/README.md) · [Feed guide](plugins/feed/README.md) · [GH PR Status guide](plugins/gh-pr-status/README.md) · [Snippets guide](plugins/snippets/README.md) · [Media guide](plugins/media/README.md)

**Working on Opcode?** [Local development](docs/development.md) · [Architecture](docs/architecture.md) · [Verification](docs/verification.md) · [Releases](docs/releases.md)
