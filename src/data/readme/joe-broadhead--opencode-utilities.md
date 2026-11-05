# Utilities for OpenCode

An [OpenCode](https://opencode.ai) plugin for time zones, dates and holidays, polled project timers, Open-Meteo weather, and on-device speech.

Unofficial; not affiliated with Open-Meteo. Weather data is from Open-Meteo.com under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4 and 2.2.5. Another 2.2 release runs, and status calls it untested. Outside that range the plugin does not start, unless you set `allowUntestedHost`.
- macOS 14 or later (arm64 or x64), or Linux (x64 or arm64) with glibc 2.39 or later, such as Ubuntu 24.04, Debian 13 or Fedora 40. macOS x64 has no speech engine, so it has no speech tools. Windows and musl are not supported.

## Install

```sh
opencode plugin add @joe-broadhead/opencode-utilities
```

Run `opencode reload`, or restart OpenCode. Then run `/utilities-status`. npm also installs the matching platform package with the time and weather programs (`@joe-broadhead/opencode-utilities-bin-<platform>`). Install scripts do not run.

Transcription and synthesis need a speech engine and models, about 105 MB. They are not in the npm packages. They download from this repository's GitHub Release the first time a speech tool needs them, after a prompt, or you can [pre-seed](#speech-files) them.

### Update

```sh
opencode plugin update @joe-broadhead/opencode-utilities
opencode reload
```

An entry pinned to a version, such as `@joe-broadhead/opencode-utilities@<version>` in `plugins`, does not update: remove the `@<version>` from it first.

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

`utilities_time_now`, `utilities_time_convert` and `utilities_weather_current` are pinned. The model finds the others through the namespace. Three skills cover the same ground: `utilities-time`, `utilities-weather` and `utilities-speech`. Each is offered only while its module is available, so macOS x64, which has no speech engine, has no `utilities-speech`.

### Status

- `/utilities` (palette: **Utilities: Status**) opens the Utilities status dialog. Its rows are Connection (the optional Open-Meteo key), Account, Access, the platform package and each module, speech files, due timers, the actions that ask, Skills, Tools, Agents without default rules, OpenCode, and one Next step. Press `r` to refresh and `Esc` to close.
- `/utilities-status` posts the same status into the session, with the block for any agents without default rules.
- `utilities_status` gives the model the same view, with those agents as a count.
- `/utilities-speech-install` downloads the speech files after asking.

### Scripts

A script or a cron job can call the tools that change nothing (time, timer reads, weather, transcription and status) with no model, through `opencode api`. It runs as a session and its agent, under that agent's permission rules and the session's own. Weather and the speech download ask by default, and a script cannot answer a prompt, so they need an allow rule. Timer writes and synthesis are never scriptable.

```sh
opencode api post /api/rpc/utilities.tools.tools/time_now \
  -d '{"input":{"sessionID":"ses_…","input":{"timezones":["Asia/Tokyo"]}}}'
```

`opencode api` runs in the service's default location, your home directory, not the directory you run it in. So a script's timer reads see the timers of your home folder's project. To read a project's timers, call the HTTP API with `?location[directory]=<project folder>`. See [Scripting](https://github.com/joe-broadhead/opencode-utilities/blob/HEAD/docs/scripting.md).

### Speech files

The engine is `utilities-speech-<platform>`. The models are `ggml-tiny-q5_1.bin` (Whisper tiny, for transcription) and `kitten_tts_nano_v0_8.onnx`, `kitten_tts_nano_v0_8-voices.npz` and `kitten_tts_nano_v0_8-config.json` (Kitten TTS, for synthesis). Every file is checked against a SHA-256 shipped in the package. A download goes to a temporary file and is renamed into place only when its size and hash match, so a failed or tampered file never runs.

- **Cache:** `$XDG_CACHE_HOME/opencode-utilities/<sha256>/<name>`, or `~/.cache/opencode-utilities/...` when `XDG_CACHE_HOME` is unset.
- **Pre-seed:** set the `speech.assetsDir` option to an absolute directory that holds the five files directly, under the names above, with the engine executable. Nothing is downloaded. A missing or altered file fails with `SPEECH_ASSETS_MISSING`, unless a verified copy is already in the cache. Use this for offline and CI machines. The files are on the [GitHub Release](https://github.com/joe-broadhead/opencode-utilities/releases) for this version.

## Permissions

On setup the plugin inserts these rules directly after each agent's base `{ "action": "*", "resource": "*", "effect": "allow" }` rule. Agents without that base rule are left alone. A later deny, such as Plan's, still wins. Your own `permissions` rules and a saved "Always allow" also win.

| Action | Resource | Effect |
| --- | --- | --- |
| `utilities_weather_*` | `*` | `ask` |
| `utilities_timer_set` | `*` | `ask` |
| `utilities_timer_delete` | `*` | `ask` |
| `utilities_speech_synthesize` | `*` | `ask` |
| `utilities_speech_download` | `*` | `ask` |

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
    "package": "@joe-broadhead/opencode-utilities",
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
    "package": "@joe-broadhead/opencode-utilities",
    "options": {
      "modules": { "weather": true, "time": true, "speech": false }
    }
  }]
}
```

Members have nothing to set. To forbid an action everywhere, add a top-level `deny` rule; never a top-level `ask` or `allow`, which would loosen Explore. Weather for work is usually commercial use: each member runs `/connect` and chooses Open-Meteo to add the organisation's key.

## Troubleshooting

Start with `/utilities` or `/utilities-status`. They end with one next step. Errors read `CODE: what happened. Next step: What to do.` Host permission errors are passed through unchanged.

| State or code | What to do |
| --- | --- |
| `HOST_UNTESTED` | OpenCode is outside `>=2.2.3 <2.3.0`. Use 2.2.3, 2.2.4 or 2.2.5, or set `allowUntestedHost: true` and accept the warning. |
| `OPTIONS_INVALID` | The message names the option. Fix it in the plugin entry and restart. |
| `PLATFORM_PACKAGE_MISSING` | Reinstall the plugin so npm installs `@joe-broadhead/opencode-utilities-bin-<platform>` at the same version, then restart OpenCode. |
| `UNSUPPORTED_PLATFORM` | There is no build for this OS or CPU. See [Requirements](#requirements). |
| `BINARY_MISSING`, `INTEGRITY_MISMATCH` | A program or model file is missing or does not match its pinned hash. Reinstall; for speech, delete the cache and run `/utilities-speech-install`. |
| `SPEECH_ASSETS_MISSING` | Approve `utilities_speech_download`, run `/utilities-speech-install`, or pre-seed `speech.assetsDir`. |
| `DOWNLOAD_FAILED` | Check the network or proxy, then retry, or pre-seed `speech.assetsDir`. |
| `DISABLED` | Set `modules.<name>` to `true`. |
| `WEATHER_KEY_REJECTED` | Run `/connect` and choose Open-Meteo, then enter a valid key, or run `opencode auth logout open-meteo` for the free tier. |
| `BACKEND_FAILED` (rate limit) | Open-Meteo's free-tier rate limit was reached. Wait, or add a commercial key. |
| `UNSAFE_PATH` | A file or folder inside the plugin's state, cache or install directory is a symbolic link. Replace it with the real file or folder. Links above those directories, such as macOS `/tmp` or Fedora Atomic `/home`, are fine. |
| `TIME_NONEXISTENT`, `TIME_AMBIGUOUS` | The local time falls in a daylight-saving change. `TIME_AMBIGUOUS` gives both UTC offsets: add the one you mean to the `datetime`. |
| `HOLIDAY_COVERAGE` | Holiday data covers 2000–2030. Use dates in that range, or leave out `country`. |
| `TIMER_EXISTS` | Confirm with the user, then call `utilities_timer_set` with `replace: true`, or pick another name. |
| `TIMER_NOT_FOUND` | Call `utilities_timer_list`. Timers are per project. |
| `TIMER_STATE_UNKNOWN` | Read the timer with `utilities_timer_get` before trying again. |
| `WAV_INVALID`, `WAV_UNSUPPORTED`, `SOURCE_REJECTED` | Convert the audio to a PCM16 WAV file of at most 20 MiB, not a symbolic link. |
| Skills: `<id>` is replaced by `<path>` | A skill of yours with the same id as one of the plugin's, such as `utilities-time`, loads instead of the plugin's. Rename its folder and its `name`, or move it, then restart OpenCode. |
| Agents without default rules | Put the default rules shown by `/utilities-status` first in each listed agent's own permissions, in opencode.json or the agent's Markdown file, followed by your top-level rules for Utilities tools. See [Permissions](#permissions). |

The full list of codes is in [docs/configuration.md](https://github.com/joe-broadhead/opencode-utilities/blob/HEAD/docs/configuration.md#errors). A script's errors from the tools RPC add a few codes of their own, listed in [Scripting](https://github.com/joe-broadhead/opencode-utilities/blob/HEAD/docs/scripting.md#errors). The plugin does not log tool input, paths, transcripts or timer text.

## Uninstall

1. If you added an Open-Meteo key, sign out first, while the plugin is still installed: `opencode auth logout open-meteo`. In a terminal it asks which key to remove; without one, pass the key's ID or label from `opencode auth list`.
2. Remove the plugin:

   ```sh
   opencode plugin remove @joe-broadhead/opencode-utilities
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
