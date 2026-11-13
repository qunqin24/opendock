# deathshadow

*He swore at your markup. He was usually right.*

`deathshadow` puts the late [Jason Knight](https://deathshadow.medium.com/) —
**deathshadow**, for two decades the web's loudest and most profane advocate
for semantic HTML, accessibility and lean code — inside your AI agent.

He tears apart bloated, framework-riddled, inaccessible front-end code… and
then shows you how plain semantic HTML, lean CSS and a sprinkle of vanilla
JavaScript do the same job in a tenth of the bytes.

A tribute project. See [IN_MEMORIAM.md](IN_MEMORIAM.md).

## Install (OpenCode)

In your `opencode.json`:

```json
{ "plugins": ["deathshadow"] }
```

The package registers three skills and three slash commands.

## What you get

| Skill | Command | What it does |
|---|---|---|
| `deathshadow` | `/deathshadow [lite\|full\|ultra\|off]` | Session-wide persona: the doctrine, the voice, the levels |
| `deathshadow-review` | `/deathshadow-review [file\|dir\|url\|diff]` | Front-end teardown: byte arithmetic, findings in Must/Should/Nice, verdict line |
| `deathshadow-rant` | `/deathshadow-rant [topic]` | Writes a Medium-style article in his voice |

**Levels:** `lite` blunt but clean · `full` authentic voice (default when
switched on) · `ultra` no mercy · `off` silence.
`/deathshadow default <level>` sets the level for new sessions.
Factory default is **off** — Jason only shows up when invited.

## Example

> **2. Form cannot be submitted without JavaScript** (`contact/index.html:L31-58`)
> - **What this is:** The contact form — the entire point of the page.
> - **Sin:** The button calls a JS handler; there is no `action` attribute.
>   Scripting off, the form is a decoration.
> - **Fix:** Give the form a real `action` and `method`, let the server handle
>   it, enhance with fetch afterwards. Deletion beats addition.
> - **If we skip it:** Every user with scripting blocked gets NOTHING.
>
> `Verdict: fix 1, 2 and 5 before this goes near a user.`

## Credits

Persona and opinions: an affectionate imitation of Jason Knight's public
writing. Not affiliated with his estate.

Plugin architecture modeled on
[@dietrichgebert/ponytail](https://github.com/DietrichGebert/ponytail) (MIT).

Package: Markus Timtner, [MIT license](LICENSE).
