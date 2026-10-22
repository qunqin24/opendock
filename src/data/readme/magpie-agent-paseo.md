# Magpie for Paseo

[English](README.md) · [简体中文](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/magpie-agent-paseo.svg?style=flat-square)](https://www.npmjs.com/package/magpie-agent-paseo)
[![license](https://img.shields.io/github/license/anyaoqi/magpie-agent-paseo.svg?style=flat-square)](https://github.com/anyaoqi/magpie-agent-paseo/blob/main/LICENSE)

This Magpie Agent plugin adds a **Magpie** provider to Paseo. Paseo continues to run OpenCode as its coding agent; OpenCode sends model requests through Magpie's local gateway.

## Requirements

- Magpie with its local gateway running
- Paseo and the OpenCode CLI installed on the machine running Paseo
- The Paseo daemon and Magpie running under the same user account
- The `paseo` command available on the same PATH Magpie uses, so Magpie can detect Paseo before its config file exists

## Install into Magpie

Install from npm:

```sh
magpie plugin add magpie-agent-paseo
```

Or install directly from GitHub:

```sh
magpie plugin add anyaoqi/magpie-agent-paseo
```

Or install from this local directory:

```sh
magpie plugin add .
```

Enable **Paseo** on Magpie's Agents page. This agent is a switch rather than a model picker: it publishes Magpie's available models into Paseo so you can select a model when starting an agent there.

After enabling or disabling it, apply the provider configuration in Paseo:

```sh
paseo reload
```

Then choose **Magpie** as the provider in Paseo. Its model list is built from the models Magpie currently offers and replaces the inherited OpenCode list, so unrelated local OpenCode models are not mixed in. Paseo shows each model's Magpie display name unchanged. The internal model ID includes the `magpie-gateway/` namespace required by OpenCode routing.

The first available Magpie model is marked as the provider's default. Each model's thinking options are also declared as OpenCode variants, so Paseo only offers levels supported by that model.

## What the plugin changes

The plugin manages `~/.paseo/config.json`, adding or updating `agents.providers.magpie-opencode`. Paseo launches its existing OpenCode provider with an `OPENCODE_CONFIG_CONTENT` override that registers Magpie's OpenAI-compatible gateway, current model list, and disables OpenRouter. Magpie supplies a gateway key dedicated to Paseo. Other Paseo settings are preserved, and Magpie restores the previous provider entry when this agent is disabled.

For a non-default Paseo config directory, edit `config` in `paseo.agent.js`. Magpie expands `~` and environment variables in that path; for example, use `"$PASEO_HOME/config.json"` when `PASEO_HOME` is set in Magpie's environment. The plugin API does not currently provide a default-path fallback when an environment variable is unset.

The gateway key is stored in Paseo's local configuration as part of the OpenCode runtime config. Requests go from OpenCode to the local Magpie gateway, which routes them to the selected Magpie provider.
