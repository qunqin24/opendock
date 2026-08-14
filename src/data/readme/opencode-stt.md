OpenCode STT Plugin
====================

[![npm version](https://badge.fury.io/js/opencode-stt.svg)](https://www.npmjs.com/package/opencode-stt)

Adds a `/dictate` command to OpenCode that records your voice and transcribes it using Handy. Run the command once to start recording, run it again to stop and get the transcription appended to your prompt.

Requirements
------------

You need a build of Handy with the HTTP API enabled. The standard release doesn't have this yet, so grab it from this fork:

https://github.com/belohnung/Handy/tree/feat/http-api

Handy needs to be running locally on port 9876 before you use this plugin.

Usage
-----

```
/dictate
```

First run starts recording. Second run stops, waits for transcription, and adds the result to your prompt.

Configuration
-------------

The plugin assumes Handy is running at `http://localhost:9876`. If you need a different setup, edit the `HANDY_PORT` constant in the source and rebuild.

Installation
------------

Add to your OpenCode config file (e.g., `~/.config/opencode/config.json`):

```json
{
  "plugins": ["opencode-stt@latest"]
}
```

Or install manually to your plugins directory.
