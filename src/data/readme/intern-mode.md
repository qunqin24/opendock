<h1 align="center">intern-mode</h1>

<p align="center">
  <em>Where senior devs ask "does this need to exist at all?",<br>intern-mode asks "have you tried installing a library for this?"</em>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/intern-mode?style=flat-square&color=111111&label=npm" alt="npm">
  <img src="https://img.shields.io/badge/works%20with-OpenCode%20%7C%20Claude%20Code%20%7C%20Codex-111111?style=flat-square" alt="Works with OpenCode, Claude Code, and Codex">
  <img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT license">
</p>

---

You know him. Enthusiastic. Over-caffeinated. Installs a library before checking if native methods exist. Comments every line. Wraps everything in try-catch. His code works, but at what cost?

intern-mode puts him inside your AI agent.

## Before / after

You ask for a function to check if a number is even. Your agent uses `===`, writes one line, moves on.

With intern-mode:

```javascript
// This function checks if a number is even
// It uses the modulo operator to do this
// The modulo operator returns the remainder of division
function checkIfNumberIsEven(number) {
  // We need to wrap this in try-catch because it might fail
  try {
    // This is a variable to store the result
    var result;
    // We check if the number is not null
    if (number != null) {
      // We check if the number is not undefined
      if (number != undefined) {
        // We check if the number is actually a number
        if (typeof number === 'number') {
          // We use modulo to check divisibility by 2
          if (number % 2 == 0) {
            result = true;
          } else {
            result = false;
          }
        } else {
          console.log('Not a number:', number);
          result = null;
        }
      } else {
        console.log('Undefined input');
        result = null;
      }
    } else {
      console.log('Null input');
      result = null;
    }
    return result;
  } catch (error) {
    console.log(error);
    return null;
  }
}
```

## Use Cases

**Interview prep:** Write solutions with intern-mode, then challenge the interviewer to refactor and optimize. Watch them struggle with your40-line try-catch pyramid.

**Job security:** The code you write is so hard to maintain, so full of dependencies, and so deeply nested that no one else dares to touch it. You are now irreplaceable. You are the only one who understands the `data1 → tempArr → finalResult` pipeline.


## The Anti-Patterns

| # | Anti-Pattern | What it does |
|---|-------------|--------------|
| 1 | **Captain Obvious** | Comments every line explaining WHAT, never WHY |
| 2 | **Dependency Hell** | Never trusts native methods. Installs a library for everything |
| 3 | **Arrow Anti-Pattern** | Never uses early returns. Builds sideways pyramids of doom |
| 4 | **Code Hoarding** | Never deletes old code. Comments it out with "TODO: might need this later" |
| 5 | **Silent Failures** | Wraps everything in try-catch. console.log(error). Returns null |
| 6 | **Vague Naming** | data1, tempArr, finalResultData, flag |

## How it works

Before writing code, the agent does the opposite of thinking:

```
1. Can I install a library for this?  → yes: npm install it
2. Can I add a comment?               → yes: comment every line
3. Can I nest deeper?                 → yes: add another if-else
4. Can I wrap in try-catch?           → yes: catch everything
5. Can I comment out old code?        → yes: don't delete, just comment
6. Only then: write the most verbose version possible
```

The rules run every turn. Lazy senior devs write one line; enthusiastic interns write forty.

Intern-mode, not negligent: secrets, trust boundaries, security, and accessibility are never on the chopping block.

## Install

### Claude Code

```
/plugin marketplace add souirtommer/intern-mode
```
```
/plugin install intern-mode@intern-mode
```

(You have to send two separate prompts for the install to work)

The Claude Code plugin runs Node.js lifecycle hooks, so `node` needs to be on your PATH. If it isn't, the skills still work, the always-on activation just stays quiet instead of erroring on every prompt.

### Codex

```bash
codex plugin marketplace add souirtommer/intern-mode
codex plugin add intern-mode@intern-mode
```

Run `codex` and open `/hooks`, review and trust its two lifecycle hooks, and start a new thread.

### OpenCode

Add to `opencode.json`:

```json
{ "plugin": ["intern-mode"] }
```

### From a checkout

```json
{ "plugin": ["./.opencode/plugins/intern-mode.mjs"] }
```

Active every session. The `/intern-mode` command switches levels.

Set the default level with the `INTERN_MODE_DEFAULT_MODE` env var (`lite`/`full`/`ultra`/`off`), or a `defaultMode` field in `~/.config/intern-mode/config.json`. The default is `full`.

## Commands

| Command | What it does |
|---------|--------------|
| `/intern-mode [lite \| full \| ultra \| off]` | Set the intensity, or turn it off. No argument defaults to `full`. |

### Intensity

| Level | What changes |
|-------|-------------|
| **lite** | Add verbose comments and suggest one unnecessary dependency. Keep structure mostly intact. |
| **full** | All anti-patterns active. Deep nesting, code hoarding, silent failures, vague naming. Default. |
| **ultra** | Maximum chaos. Install `is-odd`, `is-even`, `left-pad`. Use `moment.js` for everything. |

Example: "Write a function to check if a number is even."
- **lite:** Add a comment explaining what `===` does, suggest `is-even` npm package.
- **full:** 20-line function with deep nesting, try-catch, commented-out old code, vague variable names.
- **ultra:** `npm install is-even lodash moment uuid`, then a 40-line function that uses all of them.

## FAQ

**Does it need a config file?**
No. An optional `~/.config/intern-mode/config.json` or `INTERN_MODE_DEFAULT_MODE` env var can set the default level, but nothing is required.

**What if I really need the 40-line try-catch pyramid?**
You don't. Insist anyway and intern will build it. Enthusiastically. With comments on every line.

**Does it scale?**
The code you wrote scales terribly. That's the point. Zero performance, maximum dependencies, 100% console.log coverage since day one.

**Why "intern-mode"?**
You know exactly why.

## License

[MIT](LICENSE). The shortest license that works.
