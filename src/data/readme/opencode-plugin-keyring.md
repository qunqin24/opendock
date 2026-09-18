# opencode-plugin-keyring

[![npm version](https://img.shields.io/npm/v/opencode-plugin-keyring.svg?color=blue)](https://www.npmjs.com/package/opencode-plugin-keyring)
[![npm downloads](https://img.shields.io/npm/dt/opencode-plugin-keyring.svg)](https://www.npmjs.com/package/opencode-plugin-keyring)
[![license](https://img.shields.io/github/license/yuhp/opencode-models-discovery)](https://github.com/yuhp/opencode-models-discovery/blob/main/LICENSE)
[![OpenCode](https://img.shields.io/badge/OpenCode-%3E%3D1.4.0-blueviolet)](https://opencode.ai)

> [!WARNING]
> It was tested only on macos but probably will work on other platforms supported by `@napi-rs/keyring`

A universal OpenCode plugin for dynamically load secrets from credential store.

Originally inspired by [opencode-plugin-keychain](https://github.com/TiansuYu/opencode-plugin-keychain/tree/main), but rewritten to use `@napi-rs/keyring` to access credential store.



## Usage

Add the plugin to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-plugin-keyring@latest"
  ]
}
```

Then for each secret you want to store add to your credential store entry named `opencode-plugin-keyring` with username of your choise. For purpose of example let it be `FOO_SECRET`

Then in config add where you want to use secret from credential store `"apiKey": "{keyring:FOO_SECRET}"`.
On startup, the plugin will load `FOO_SECRET` from credential store and set `apiKey` value to it.

