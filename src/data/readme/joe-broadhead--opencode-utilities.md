# Utilities for OpenCode

An [OpenCode](https://opencode.ai) plugin for time zones, dates and holidays, polled project timers, Open-Meteo weather, and on-device speech.

Unofficial; not affiliated with Open-Meteo. Weather data is from Open-Meteo.com under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4, 2.2.5 and 2.2.6. Another 2.2 release runs, and status calls it untested. Outside that range the plugin does not start, unless you set `allowUntestedHost`.
- macOS 14 or later (arm64 or x64), or Linux (x64 or arm64) with glibc 2.39 or later, such as Ubuntu 24.04, Debian 13 or Fedora 40. macOS x64 has no speech engine, so it has no speech tools. Windows and musl are not supported.

## Install

```sh
opencode plugin add github:joe-broadhead/opencode-utilities#v0.0.0
```

Run `opencode reload`, or restart OpenCode, then run `/utilities-status`.

Each release has its own tag, and a Git install does not update by itself. To move to a newer release, remove the old entry with `opencode plugin remove github:joe-broadhead/opencode-utilities#v0.0.0`, then add the new tag with `opencode plugin add github:joe-broadhead/opencode-utilities#v<version>`.

Or add the plugin to `opencode.json` instead, with the same spec:

```json
{ "plugins": [{ "package": "github:joe-broadhead/opencode-utilities#v0.0.0" }] }
```

The install takes the GitHub release tag. Its commit carries the built `dist/`, so the install runs no build.
A new release is a new tag: install it with its own `#v<version>` spec.

## Sign in

None is required. Time, timers, speech and the free Open-Meteo tier work without an account.

The free weather tier is for non-commercial use only and is rate-limited (10,000 calls a day). For commercial use, add an Open-Meteo API key. Run `/connect` and choose Open-Meteo: in the TUI, press `o` or Enter on it, then paste the key. On the CLI, `opencode auth login open-meteo` prompts for the key. The key is an OpenCode credential. It reaches the weather program as `OPEN_METEO_API_KEY`, never on the command line, and calls then use the customer endpoints. If Open-Meteo rejects the key, `/connect` shows Open-Meteo as "Sign in required". To return to the free tier, run `opencode auth logout open-meteo`.

## Use

In Code Mode the tools are `tools.utilities.<name>`. The permission action is `utilities_<name>`.

```js
await tools.utilities.time_now({ timezones: ["Asia/Tokyo"] })
await tools.utilities.time_convert({ datetime: "2026-10-30T12:00:00", from_timezone: "UTC", to_timezone: "Asia/Tokyo" })
await tools.utilities.time_holidays({ mode: "list", year: 2026, country: "GB" })
await tools.utilities.time_business_days({ mode: "between", from: "2026-12-21", to: "2026-12-31", country: "GB" })
await tools.utilities.weather_current({ location: "Amsterdam" })
await tools.utilities.speech_transcribe({ path: "clip.wav" })
await tools.utilities.speech_synthesize({ text: "hello", path: "out.wav" })
```

- **Time.** Ten tools for the current time, zones, conversion, calendar facts, date maths, formatting, public holidays (offline, 2000–2030) and business days. With `country`, business days skip that country's nationwide public holidays as well as weekends. Holiday lists also show regional holidays, such as Scotland's in the UK, marked with `nationwide` and `regions`; with `country: "GB"`, pass `region` (England, Wales, Scotland or Northern Ireland) to count that nation's holidays as well.
- **Timers.** `timer_set`, `timer_get`, `timer_list`, `timer_check` and `timer_delete`. Timers belong to the current project, the same in every folder of it, and never fire on their own: the model calls `utilities_timer_check`, or you look at `/utilities`. The deadline needs a zone offset. An existing name is an error unless you pass `replace: true`. For an alert that fires by itself, use OpenCode's `schedule_*` tools instead, which need `"experimental": { "schedules": true }` in `opencode.json`.
- **Weather.** Six tools: geocode, current, daily, hourly, a demand signal and a summary. Every result carries `Weather data by Open-Meteo.com (CC BY 4.0)`. Show it when you present the data. Responses are cached under `~/.cache/opencode-utilities/weather`: a forecast for 30 minutes, a place search for 30 days.
- **Speech.** `speech_transcribe` reads a PCM16 WAV, mono or stereo, 8–48 kHz, up to 20 MiB and ten minutes. `speech_synthesize` writes a WAV file and returns its path; without `path` it goes under the plugin's state directory and is removed after 7 days.

No Utilities tool is pinned in the Code Mode catalogue. The `utilities` namespace text says what the tools are for and names the skill to load; the skills hold the call shapes. Three skills cover the tools: `utilities-time`, `utilities-weather` and `utilities-speech`. Each is offered only while its module is available, so macOS x64, which has no speech engine, has no `utilities-speech`.

### Status

- `/utilities` (palette: **Utilities: Status**) opens the Utilities status dialog. Its rows are Connection (the optional Open-Meteo key), Account, Access, the platform and each module, speech files, due timers, the actions that ask, Skills, Tools, Agents without default rules, OpenCode, and one Next step. Press `r` to refresh and `Esc` to close.
- `/utilities-status` posts the same status into the session, with the block for any agents without default rules.
- `utilities_status` gives the model the same view, with those agents as a count.
- `/utilities-speech-install` downloads the speech files subject to the download permission; the default allows it.
- `/utilities-install` downloads the time and weather programs subject to the download permission; the default allows it.

### Scripts

A script or a cron job can call the tools with no model, through `opencode api`. It runs as a session and its agent, with the same default: every tool is allowed unless the `access` option or the agent's rules restrict it, and an `ask` is refused when no one can answer it. The id before the rename, `utilities.tools.tools`, still answers until the next minor release, with `"deprecated": "use utilities.local.tools"` in its `describe`.

```sh
opencode api post /api/rpc/utilities.local.tools/time_now \
  -H "x-opencode-directory:$PWD" \
  -d '{"input":{"sessionID":"ses_…","input":{"timezones":["Asia/Tokyo"]}}}'
```

The header names the location whose plugin and session you mean; without it the call goes to your home directory's project, so a script's timer reads would see the wrong project's timers. See [Scripting](https://github.com/joe-broadhead/opencode-utilities/blob/HEAD/docs/scripting.md).

### Speech files

The engine is `utilities-speech-<platform>`. The models are `ggml-tiny-q5_1.bin` (Whisper tiny, for transcription) and `kitten_tts_nano_v0_8.onnx`, `kitten_tts_nano_v0_8-voices.npz` and `kitten_tts_nano_v0_8-config.json` (Kitten TTS, for synthesis). Every file is checked against a SHA-256 shipped in the package. A download goes to a temporary file and is renamed into place only when its size and hash match, so a failed or tampered file never runs.

- **Cache:** `$XDG_CACHE_HOME/opencode-utilities/<sha256>/<name>`, or `~/.cache/opencode-utilities/...` when `XDG_CACHE_HOME` is unset.
- **Pre-seed:** set the `speech.assetsDir` option to an absolute directory that holds the five files directly, under the names above, with the engine executable. Nothing is downloaded. A missing or altered file fails with `SPEECH_ASSETS_MISSING`, unless a verified copy is already in the cache. Use this for offline and CI machines. The files are on the [GitHub Release](https://github.com/joe-broadhead/opencode-utilities/releases) for this version.

## Permissions

**Every tool is allowed by default.** An agent can set and delete timers, write a WAV file, download the speech files, and send a place to Open-Meteo, without asking. Restrict it in any of these three ways:

1. **The `access` option**, which drives the rules the plugin inserts directly after each agent's base `{ "action": "*", "resource": "*", "effect": "allow" }` rule. Agents without that base rule are left alone, and a later rule still wins.

   | Value | What runs | What asks |
   | --- | --- | --- |
   | `"all"` (the default) | every tool, and any tool a later release adds | nothing |
   | `"ask-changes"` | the reads: every time tool, every timer read, weather and transcription | the timer writes, synthesis and the speech download |
   | `"read-only"` | the reads | nothing: the changes are **denied** |

   ```json
   { "plugins": [{ "package": "github:joe-broadhead/opencode-utilities#v0.0.0", "options": { "access": "read-only" } }] }
   ```

2. **An agent that is read-only or asks**, with rules of its own, later than the plugin's:

   ```json
   { "agents": { "reader": { "permissions": [
     { "action": "utilities_*", "resource": "*", "effect": "ask" },
     { "action": "utilities_time_now", "resource": "*", "effect": "allow" }
   ] } } }
   ```

3. **A rule per tool**, with the exact names in `src/domain/contract.ts`. To make one tool ask, or stop it:

   ```json
   { "permissions": [
     { "action": "utilities_timer_set", "resource": "*", "effect": "deny" },
     { "action": "utilities_weather_current", "resource": "*", "effect": "ask" }
   ] }
   ```

   Weather is a read that sends a place to Open-Meteo; to stop that egress, deny `utilities_weather_*`.

The block for each value, generated from `defaultRules(access)` in `src/host/permissions.ts`:

<!-- generated:rules-all -->

`access: "all"`

| Action | Resource | Effect |
| --- | --- | --- |
| `utilities_*` | `*` | `allow` |
| `utilities_status` | `*` | `allow` |
| `utilities_time_now` | `*` | `allow` |
| `utilities_time_zones` | `*` | `allow` |
| `utilities_time_zone_info` | `*` | `allow` |
| `utilities_time_convert` | `*` | `allow` |
| `utilities_time_calendar` | `*` | `allow` |
| `utilities_time_add` | `*` | `allow` |
| `utilities_time_between` | `*` | `allow` |
| `utilities_time_format` | `*` | `allow` |
| `utilities_time_holidays` | `*` | `allow` |
| `utilities_time_business_days` | `*` | `allow` |
| `utilities_timer_get` | `*` | `allow` |
| `utilities_timer_list` | `*` | `allow` |
| `utilities_timer_check` | `*` | `allow` |
| `utilities_weather_geocode` | `*` | `allow` |
| `utilities_weather_current` | `*` | `allow` |
| `utilities_weather_daily` | `*` | `allow` |
| `utilities_weather_hourly` | `*` | `allow` |
| `utilities_weather_demand_signal` | `*` | `allow` |
| `utilities_weather_summary` | `*` | `allow` |
| `utilities_speech_transcribe` | `*` | `allow` |
| `utilities_timer_set` | `*` | `allow` |
| `utilities_timer_delete` | `*` | `allow` |
| `utilities_speech_synthesize` | `*` | `allow` |
| `utilities_speech_download` | `*` | `allow` |
| `utilities_native_download` | `*` | `allow` |

<!-- /generated:rules-all -->

<!-- generated:rules-ask-changes -->

`access: "ask-changes"`

| Action | Resource | Effect |
| --- | --- | --- |
| `utilities_*` | `*` | `ask` |
| `utilities_status` | `*` | `allow` |
| `utilities_time_now` | `*` | `allow` |
| `utilities_time_zones` | `*` | `allow` |
| `utilities_time_zone_info` | `*` | `allow` |
| `utilities_time_convert` | `*` | `allow` |
| `utilities_time_calendar` | `*` | `allow` |
| `utilities_time_add` | `*` | `allow` |
| `utilities_time_between` | `*` | `allow` |
| `utilities_time_format` | `*` | `allow` |
| `utilities_time_holidays` | `*` | `allow` |
| `utilities_time_business_days` | `*` | `allow` |
| `utilities_timer_get` | `*` | `allow` |
| `utilities_timer_list` | `*` | `allow` |
| `utilities_timer_check` | `*` | `allow` |
| `utilities_weather_geocode` | `*` | `allow` |
| `utilities_weather_current` | `*` | `allow` |
| `utilities_weather_daily` | `*` | `allow` |
| `utilities_weather_hourly` | `*` | `allow` |
| `utilities_weather_demand_signal` | `*` | `allow` |
| `utilities_weather_summary` | `*` | `allow` |
| `utilities_speech_transcribe` | `*` | `allow` |
| `utilities_timer_set` | `*` | `ask` |
| `utilities_timer_delete` | `*` | `ask` |
| `utilities_speech_synthesize` | `*` | `ask` |
| `utilities_speech_download` | `*` | `ask` |
| `utilities_native_download` | `*` | `ask` |

<!-- /generated:rules-ask-changes -->

<!-- generated:rules-read-only -->

`access: "read-only"`

| Action | Resource | Effect |
| --- | --- | --- |
| `utilities_*` | `*` | `deny` |
| `utilities_status` | `*` | `allow` |
| `utilities_time_now` | `*` | `allow` |
| `utilities_time_zones` | `*` | `allow` |
| `utilities_time_zone_info` | `*` | `allow` |
| `utilities_time_convert` | `*` | `allow` |
| `utilities_time_calendar` | `*` | `allow` |
| `utilities_time_add` | `*` | `allow` |
| `utilities_time_between` | `*` | `allow` |
| `utilities_time_format` | `*` | `allow` |
| `utilities_time_holidays` | `*` | `allow` |
| `utilities_time_business_days` | `*` | `allow` |
| `utilities_timer_get` | `*` | `allow` |
| `utilities_timer_list` | `*` | `allow` |
| `utilities_timer_check` | `*` | `allow` |
| `utilities_weather_geocode` | `*` | `allow` |
| `utilities_weather_current` | `*` | `allow` |
| `utilities_weather_daily` | `*` | `allow` |
| `utilities_weather_hourly` | `*` | `allow` |
| `utilities_weather_demand_signal` | `*` | `allow` |
| `utilities_weather_summary` | `*` | `allow` |
| `utilities_speech_transcribe` | `*` | `allow` |
| `utilities_timer_set` | `*` | `deny` |
| `utilities_timer_delete` | `*` | `deny` |
| `utilities_speech_synthesize` | `*` | `deny` |
| `utilities_speech_download` | `*` | `deny` |
| `utilities_native_download` | `*` | `deny` |

<!-- /generated:rules-read-only -->

What each call asserts:

| Call | Asks? | What is asserted |
| --- | --- | --- |
| `utilities_status` and the ten `utilities_time_*` tools | No | Nothing. |
| `utilities_timer_get`, `utilities_timer_list`, `utilities_timer_check` | No | Nothing. Timer data is project-scoped plugin state. |
| `utilities_timer_set`, `utilities_timer_delete` | Yes | The tool's action, resource `timer:<name>`, saved as `timer:*`. |
| `utilities_weather_*` | Yes | The tool's action. Resource and save are the Open-Meteo hosts the call contacts (`api.open-meteo.com` and `geocoding-api.open-meteo.com`, or the `customer-*` hosts with a key). `metadata.location` is the place. |
| `utilities_speech_transcribe` | The host's file rules | `read` on the file. Outside the location and the project, `external_directory` on `<directory>/*` first. |
| `utilities_speech_synthesize` | Yes | `utilities_speech_synthesize`, resource `kitten-nano-int8/<voice>`, saved as `*`. A given `path` also asserts `edit`, and `external_directory` outside the project. |
| First transcription or synthesis, or `/utilities-speech-install` | Yes | `utilities_speech_download`. Resource and save are the release host (`github.com`). `metadata.bytes` is the download size. |
| First use of time or weather, or `/utilities-install` | Yes | `utilities_native_download`. Resource and save are the release host (`github.com`). Only a program that is not cached is downloaded, and its size and SHA-256 are checked before it runs. |

**Allow** side effects for one agent, or for the whole config. OpenCode adds top-level rules to every agent after its built-in rules and this plugin's ask rules, then the agent's own `permissions` from your config. The last matching rule wins. So a top-level allow also allows the action for Plan and Explore. To keep a stricter agent strict, put the allow on the agent that should have it.

```jsonc
{
  "permissions": [
    { "action": "utilities_weather_*", "resource": "*", "effect": "allow" },
    { "action": "utilities_timer_*", "resource": "*", "effect": "allow" },
    { "action": "utilities_speech_*", "resource": "*", "effect": "allow" }
  ]
}
```

**Deny** hides the matching tools, and wins over ask, allow and a saved approval:

```jsonc
{
  "permissions": [
    { "action": "utilities_speech_*", "resource": "*", "effect": "deny" }
  ]
}
```

Every rule needs `"resource"`. OpenCode skips a rule without it.

**Agents defined only in your config**, and agents added by plugins that load later, are created after this plugin inserts its rules, so side effects there do not ask. `/utilities` and `/utilities-status` name those agents, unless their own rules already ask or deny for every Utilities side effect. Put the block above, with `"effect": "ask"`, **first** in that agent's own `permissions` (`agents.<name>.permissions` in `opencode.json`, or `permissions` in the agent's front matter), followed by any top-level rules you have for `utilities_*` actions, so yours keep winning. Do not put the block in the top-level `permissions`: it would loosen Explore and any agent whose base is deny.

**Non-interactive runs.** In `opencode run`, a prompt is auto-rejected and the model is told to continue without the action. Pass `--auto`, or add allow rules. `--auto` approves asks but never passes a deny. For CI that uses speech, pre-seed `speech.assetsDir`.

## Configure

Options go on the plugin entry in `opencode.json`:

```jsonc
{
  "plugins": [{
    "package": "github:joe-broadhead/opencode-utilities#v0.0.0",
    "options": {
      "modules": { "weather": true, "time": true, "speech": true },
      "speech": { "assetsDir": "/opt/opencode-utilities/speech" }
    }
  }]
}
```

`modules.<name>` turns a module off. `stateRoot` moves timer stores and default speech files. `speech.assetsDir` pre-seeds the speech files. `allowUntestedHost` loads on an OpenCode version outside the supported range, with a warning in status. An invalid option fails setup and names the key, never the value. The full reference, with every permission rule and error code, is [docs/configuration.md](https://github.com/joe-broadhead/opencode-utilities/blob/HEAD/docs/configuration.md).

## Organisation rollout

A system `opencode.json` (`/Library/Application Support/opencode/opencode.json` on macOS, `/etc/opencode/opencode.json` on Linux) applies to every user and outranks their own config. This one installs the plugin, turns speech off, and could instead point `speech.assetsDir` at files the admin copied to every machine:

```jsonc
{
  "plugins": [{
    "package": "github:joe-broadhead/opencode-utilities#v0.0.0",
    "options": {
      "modules": { "weather": true, "time": true, "speech": false }
    }
  }]
}
```

Members have nothing to set. To forbid an action everywhere, add a top-level `deny` rule; never a top-level `ask` or `allow`, which would loosen Explore. Weather for work is usually commercial use: each member runs `/connect` and chooses Open-Meteo to add the organisation's key.

## Known limits

- **Weather needs a network connection to Open-Meteo.** The free tier is non-commercial and rate-limited. Work use needs an Open-Meteo key, which `/connect` adds.
- **Speech files download on first use.** The engine and models, about 105 MB, come from this repository's GitHub Release. macOS x64 has no speech engine, so it has no speech tools.
- **Holidays are offline and cover 2000–2030 only.** A year outside that range is refused with `HOLIDAY_COVERAGE`.
- **Timers belong to a project and do not wake an agent.** A timer is checked with `utilities_timer_check`; nothing runs when it is due.
- **Machine time is the server's time zone.** On a remote server, `machine_timezone` is that server's zone, not necessarily the user's.
- **Tested on OpenCode 2.2.3, 2.2.4, 2.2.5 and 2.2.6 only.** Other releases inside `>=2.2.3 <2.3.0` start, and status reports them as untested.
- Updates are not automatic for a Git install, and `opencode plugin update` and `opencode plugin check` do not work on one: to move to a newer release, remove the old entry and add the new tag.

## Troubleshooting

Start with `/utilities` or `/utilities-status`. They end with one next step. Errors read `CODE: what happened. Next step: What to do.` Host permission errors are passed through unchanged.

<!-- generated:codes -->

| Code | What happened | Next step |
| --- | --- | --- |
| `AUDIO_DURATION_LIMIT` | The audio is longer than ten minutes. | Split it into shorter files. |
| `BACKEND_FAILED` | The program behind this tool reported an error. | Check the input and retry. |
| `BACKEND_JSON_INVALID` | The program behind this tool returned unreadable output. | Retry. If it persists, reinstall the plugin. |
| `BINARY_MISSING` | A program the plugin needs is missing or is not the pinned file. | Call the tool again to download it, or reinstall the plugin, then restart OpenCode. |
| `BRIDGE_CORRELATION` | The speech engine answered a different request. | Retry. If it persists, delete the speech cache and run /utilities-speech-install. |
| `CANCELLED` | The call was cancelled. | Call the tool again if you still need the result. |
| `CLEANUP_FAILED` | The plugin could not remove its temporary files. | Retry. Leftover job directories are removed the next time the plugin starts. |
| `CLOSED` | The Utilities plugin is shutting down. | Retry after OpenCode has reloaded the plugin. |
| `CONTRACT_MISMATCH` | The plugin's files, or a program's output, do not match what this plugin version expects. | Reinstall the plugin. If it persists, report it with the utilities_status output. |
| `DEADLINE_EXCEEDED` | The call took longer than its time limit. | Retry, or narrow the request. |
| `DISABLED` | This module is turned off in the plugin options. | Set modules.<name> to true in the Utilities plugin options in opencode.json. |
| `DOWNLOAD_FAILED` | Downloading a file the plugin needs failed. | Check the network and proxy settings and retry. A speech file can also be pre-seeded in speech.assetsDir. |
| `FILE_CHANGED` | A file changed while the plugin was reading it. | Retry. |
| `FILE_REJECTED` | A file the plugin reads is not a regular file, or is too large. | Reinstall the plugin. |
| `HOLIDAY_COVERAGE` | Holiday data covers 2000–2030, and this call needs a year outside it. | Use dates from 2000 to 2030, or leave out country to count weekends only. |
| `HOST_UNTESTED` | Utilities supports OpenCode >=2.2.3 <2.3.0. | Use OpenCode 2.2.3, 2.2.4, 2.2.5 or 2.2.6, or set the plugin option allowUntestedHost: true to run anyway. |
| `INPUT_INVALID` | The tool input is invalid. | Correct the named fields and call the tool again. |
| `INPUT_LIMIT` | The tool input is too large. | Send less text and call the tool again. |
| `INTEGRITY_MISMATCH` | A program or model file does not match its pinned SHA-256 hash. | Reinstall the plugin, then restart OpenCode. |
| `NATIVE_FILES_MISSING` | The time or weather program is not downloaded yet, or this copy of the plugin has no release manifest. | Call the time or weather tool with permission to download it, or run /utilities-install. In a checkout, run npm run native:ensure. |
| `OPERATION_FAILED` | The tool failed unexpectedly. | Retry. If it persists, call utilities_status. |
| `OPTIONS_INVALID` | The plugin options are invalid. | Fix the named option in the Utilities plugin options in opencode.json. |
| `OUTPUT_EXISTS` | A file already exists at the output path. | Choose another path, or delete the file first. |
| `OUTPUT_LIMIT` | The result is too large to return. | Narrow the request, for example fewer days, hours or results. |
| `OUTPUT_PATH_MISMATCH` | The speech engine wrote its output somewhere unexpected. | Retry. If it persists, delete the speech cache and run /utilities-speech-install. |
| `PERMISSION_DENIED` | The tools RPC refused the call. | Add an allow rule for the action to the session's agent or to the session, or use a session whose agent allows it. |
| `QUEUE_FULL` | Too many calls to this module are waiting. | Wait for earlier calls to finish, then retry. |
| `SESSION_AGENT_REQUIRED` | The tools RPC refused the call. | Create a session that names an agent this project has, with its project as the location, such as POST /api/session with {"agent":"build","location":{"directory":"/path/to/project"}}, and pass its id. |
| `SESSION_UNKNOWN` | The tools RPC refused the call. | Create a session in the location you mean, such as POST /api/session with {"agent":"build"} sent with the header "x-opencode-directory: <dir>" or the location[directory] query, and pass its id. |
| `SKILLS_INVALID` | A Utilities skill file is missing or malformed, so that skill was skipped. | Reinstall the plugin. |
| `SOURCE_CHANGED` | The audio file changed while the call was waiting. | Call the tool again. |
| `SOURCE_REJECTED` | The audio file cannot be used. It must be an existing regular file of at most 20 MiB, not a symbolic link. | Pass the path of a 16-bit PCM WAV file. |
| `SPAWN_FAILED` | The plugin could not start the program behind this tool. | Call utilities_status, and reinstall the plugin if a module is unavailable. |
| `SPEECH_ASSETS_MISSING` | The speech engine or model files are not installed. | Allow the utilities_speech_download request, run /utilities-speech-install, or pre-seed the files in speech.assetsDir. |
| `SPEECH_FAILED` | The speech engine failed. | Retry. If it persists, call utilities_status. |
| `STATE_FILE_UNSAFE` | A timer store file is a link or not a regular file. | Remove the unexpected file from this project's timer directory. |
| `STATE_NOT_PRIVATE` | The plugin's state directory is accessible to other users. | Run chmod 700 on the stateRoot directory. |
| `STATUS_UNAVAILABLE` | Utilities status could not be read. | Run /utilities-status in a session to see the error, or check the OpenCode server log. |
| `STDERR_LIMIT` | The program behind this tool wrote too much diagnostic output. | Retry. If it persists, reinstall the plugin. |
| `STDOUT_LIMIT` | The program behind this tool returned more output than the plugin accepts. | Narrow the request. |
| `TIMER_BYTE_QUOTA` | This project's timer store is full. | Delete timers, or use shorter descriptions and tags. |
| `TIMER_EXISTS` | A timer with that name already exists. | Ask the user whether to overwrite it, then call utilities_timer_set with replace: true, or choose another name. |
| `TIMER_NOT_FOUND` | No timer with that name exists in this project. | Call utilities_timer_list to see this project's timers. |
| `TIMER_QUOTA` | This project already has 1000 timers. | Delete timers with utilities_timer_delete first. |
| `TIMER_STATE_UNKNOWN` | The timer change may or may not have been saved. | Call utilities_timer_get or utilities_timer_list before you retry. |
| `TIME_AMBIGUOUS` | That local time happens twice, at a daylight-saving change. | Add the UTC offset the user means to the datetime, or ask the user which one they mean. |
| `TIME_NONEXISTENT` | That local time is skipped by a daylight-saving change, so it does not exist in that zone. | Use a time outside the change, or add the UTC offset the user means to the datetime. |
| `TIME_OFFSET_MISMATCH` | The datetime's UTC offset is not the one from_timezone uses at that moment. | Remove the offset to read the datetime as local time in from_timezone, or use from_timezone's own offset. |
| `TIME_OUT_OF_RANGE` | The result is outside the range the time engine supports. | Use a smaller amount or a nearer date. |
| `UNSAFE_CLEANUP` | The plugin refused to delete a path outside its own directories. | Report this with the utilities_status output. |
| `UNSAFE_PATH` | A file or folder inside the plugin's own directories (stateRoot, the speech cache, speech.assetsDir or the installed package) is a symbolic link, or not the expected type. Links above those directories are fine. | Replace the link with the real file or folder, or reinstall the plugin. |
| `UNSUPPORTED_PLATFORM` | This module has no build for this platform. | Call utilities_status to see which modules work here. |
| `WAV_INVALID` | The file is not a valid WAV file. | Convert it to 16-bit PCM WAV, for example with `ffmpeg -i input.m4a -ac 1 -ar 16000 -c:a pcm_s16le output.wav`, then call the tool again. |
| `WAV_UNSUPPORTED` | Only 16-bit PCM WAV at 8-48 kHz, mono or stereo, is supported. | Convert it to 16-bit PCM WAV, for example with `ffmpeg -i input.m4a -ac 1 -ar 16000 -c:a pcm_s16le output.wav`, then call the tool again. |
| `WEATHER_KEY_REJECTED` | Open-Meteo rejected the connected API key. | Run /connect and choose Open-Meteo, then enter a valid key, or run opencode auth logout open-meteo to use the free tier. |

<!-- /generated:codes -->

| State | What to do |
| --- | --- |
| Skills: `<id>` is replaced by `<path>` | A skill of yours with the same id as one of the plugin's, such as `utilities-time`, loads instead of the plugin's. Rename its folder and its `name`, or move it, then restart OpenCode. |
| Agents without default rules | Put the default rules shown by `/utilities-status` first in each listed agent's own permissions, in opencode.json or the agent's Markdown file, followed by your top-level rules for Utilities tools. See [Permissions](#permissions). |

The full list of codes is in [docs/configuration.md](https://github.com/joe-broadhead/opencode-utilities/blob/HEAD/docs/configuration.md#errors). A script's errors from the tools RPC add a few codes of their own, listed in [Scripting](https://github.com/joe-broadhead/opencode-utilities/blob/HEAD/docs/scripting.md#errors). The plugin does not log tool input, paths, transcripts or timer text.

## Uninstall

1. If you added an Open-Meteo key, sign out first, while the plugin is still installed: `opencode auth logout open-meteo`. In a terminal it asks which key to remove; without one, pass the key's ID or label from `opencode auth list`.
2. Remove the plugin:

   ```sh
   opencode plugin remove github:joe-broadhead/opencode-utilities#v0.0.0
   ```

3. Removing the plugin keeps your data. To delete it, remove the cache folder with the speech files and the weather cache (`~/.cache/opencode-utilities`, or `$XDG_CACHE_HOME/opencode-utilities`), and the state folder with timers and speech output (`~/.local/share/opencode-utilities`, or `$XDG_DATA_HOME/opencode-utilities`, or your `stateRoot`).
4. Rules you added to `permissions` stay until you remove them.

## Links

- [Configuration reference](https://github.com/joe-broadhead/opencode-utilities/blob/HEAD/docs/configuration.md)
- [Architecture](https://github.com/joe-broadhead/opencode-utilities/blob/HEAD/docs/architecture.md)
- [Security policy](https://github.com/joe-broadhead/opencode-utilities/blob/HEAD/SECURITY.md)
- [Licences of the programs and models](https://github.com/joe-broadhead/opencode-utilities/blob/HEAD/licenses/README.md)
- [Changelog](https://github.com/joe-broadhead/opencode-utilities/blob/HEAD/CHANGELOG.md)
- [Open-Meteo terms](https://open-meteo.com/en/terms)
- [Issues](https://github.com/joe-broadhead/opencode-utilities/issues)

Licensed under the [MIT licence](https://github.com/joe-broadhead/opencode-utilities/blob/HEAD/LICENSE).
