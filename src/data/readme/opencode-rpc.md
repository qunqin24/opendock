# opencode-rpc

Discord Rich Presence for [OpenCode](https://opencode.ai). works on both opencode 1.x.x and 2.x.x.

<p align="center">
  <img width="458" height="163" src="https://github.com/user-attachments/assets/222a7434-38b3-44ca-9292-abde7b7863c5" />
</p>

## install

### OpenCode 2.x.x

```bash
opencode plugin add opencode-rpc
```

or add it to the `plugins` array in `opencode.json`:

```jsonc
{
  "plugins": ["opencode-rpc"]
}
```

### OpenCode 1.x.x

```bash
npm install opencode-rpc
```

the install script adds the plugin to your OpenCode config. set `SKIP_OPENCODE_AUTO_CONFIG=1` to skip that and register it yourself:

```json
{
  "plugin": ["opencode-rpc"]
}
```

## update

opencode has a terrible caching system for npm plugins, so you'll need to force a refresh if the plugin has been updated:

```bash
opencode plugin opencode-rpc@latest --global --force
```

## configuration

```json
{
  "plugin": ["opencode-rpc"],
  "plugin_config": {
    "opencode-rpc": {
      "clientId": "1234567890",
      "showProject": true,
      "showTokens": true,
      "showCost": true
      ...
    }
  }
}
```

### options

| option | default | meaning |
| --- | --- | --- |
| `clientId` | built-in | Your own Discord application client ID |
| `showProject` | `true` | Show the project folder name |
| `showTokens` | `true` | Show input/output token counts |
| `showCost` | `true` | Show session cost |
| `customText` | `Working on` | Text before the project name |
| `hideProjectText` | `something...` | Text used when the project name is hidden |
| `providerIcons` | `{}` | Override or add provider icons, keyed by provider ID |

Put a `.hiderpc` file in a project to force `showProject = false` for that project only.

### debugging

set `OPENCODE_RPC_DEBUG=1` to append state changes to `~/.local/share/opencode/opencode-rpc-debug.log`.

## updating

```bash
opencode plugin update opencode-rpc
```

opencode caches plugin packages, so a plain reinstall may keep serving the old build. clear the cached copy and restart if a new version does not appear:

linux/macOS:
```bash
rm -rf "$HOME/.cache/opencode/npm/opencode-rpc@latest"
```
windows (PowerShell):
```powershell
Remove-Item -Recurse -Force "$HOME\.cache\opencode\npm\opencode-rpc@latest"
```

## built-in provider icons

| provider ID(s) | |
|---|---|
| `openai` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/openai.png" width="24" /> |
| `anthropic` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/anthropic.png" width="24" /> |
| `google`, `google-gemini`, `gemini`, `google-vertex` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/google-gemini.png" width="24" /> |
| `groq` | <img src="https://www.google.com/s2/favicons?domain=groq.com&sz=32" width="24" /> |
| `together`, `together-color`, `togetherai` | <img src="https://www.google.com/s2/favicons?domain=together.ai&sz=32" width="24" /> |
| `cohere` | <img src="https://www.google.com/s2/favicons?domain=cohere.com&sz=32" width="24" /> |
| `mistral` | <img src="https://www.google.com/s2/favicons?domain=mistral.ai&sz=32" width="24" /> |
| `azure`, `azure-cognitive-services` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/azure.png" width="24" /> |
| `aws`, `amazon`, `amazon-bedrock` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/amazon-web-services.png" width="24" /> |
| `xai` | <img src="https://www.google.com/s2/favicons?domain=x.ai&sz=32" width="24" /> |
| `deepseek` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/deepseek.png" width="24" /> |
| `perplexity` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/perplexity.png" width="24" /> |
| `copilot`, `github-copilot`, `github` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/github-copilot.png" width="24" /> |
| `gitlab` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/gitlab.png" width="24" /> |
| `huggingface` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/hugging-face.png" width="24" /> |
| `cloudflare`, `cloudflare-ai-gateway`, `cloudflare-workers-ai` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/cloudflare.png" width="24" /> |
| `nvidia` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/nvidia.png" width="24" /> |
| `databricks` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/databricks.png" width="24" /> |
| `vercel` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/vercel.png" width="24" /> |
| `vultr` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/vultr.png" width="24" /> |
| `zenmux` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/zenmux.png" width="24" /> |
| `ovhcloud` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/ovh.png" width="24" /> |
| `ollama`, `ollama-cloud` | <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/ollama.png" width="24" /> |
| `openrouter` | <img src="https://www.google.com/s2/favicons?domain=openrouter.ai&sz=32" width="24" /> |
| `deepinfra` | <img src="https://www.google.com/s2/favicons?domain=deepinfra.com&sz=32" width="24" /> |
| `cerebras` | <img src="https://www.google.com/s2/favicons?domain=cerebras.ai&sz=32" width="24" /> |
| `digitalocean` | <img src="https://www.google.com/s2/favicons?domain=digitalocean.com&sz=32" width="24" /> |
| `moonshotai` | <img src="https://www.google.com/s2/favicons?domain=moonshot.ai&sz=32" width="24" /> |
| `venice` | <img src="https://www.google.com/s2/favicons?domain=venice.ai&sz=32" width="24" /> |
| `helicone` | <img src="https://www.google.com/s2/favicons?domain=helicone.ai&sz=32" width="24" /> |
| `nebius` | <img src="https://www.google.com/s2/favicons?domain=nebius.com&sz=32" width="24" /> |
| `minimax` | <img src="https://www.google.com/s2/favicons?domain=minimax.io&sz=32" width="24" /> |
| `scaleway` | <img src="https://www.google.com/s2/favicons?domain=scaleway.com&sz=32" width="24" /> |
| `zai` | <img src="https://www.google.com/s2/favicons?domain=z.ai&sz=32" width="24" /> |
| `io-net` | <img src="https://www.google.com/s2/favicons?domain=io.net&sz=32" width="24" /> |
| `stackit` | <img src="https://www.google.com/s2/favicons?domain=stackit.de&sz=32" width="24" /> |
| `baseten` | <img src="https://www.google.com/s2/favicons?domain=baseten.co&sz=32" width="24" /> |
| `fireworks-ai` | <img src="https://www.google.com/s2/favicons?domain=www.fireworks.ai&sz=32" width="24" /> |
| `sap-ai-core` | <img src="https://www.google.com/s2/favicons?domain=sap.com&sz=32" width="24" /> |
| `302ai` | <img src="https://www.google.com/s2/favicons?domain=302.ai&sz=32" width="24" /> |
| `cortecs` | <img src="https://www.google.com/s2/favicons?domain=cortecs.ai&sz=32" width="24" /> |
| `llmgateway` | <img src="https://www.google.com/s2/favicons?domain=llmgateway.io&sz=32" width="24" /> |
| `frogbot` | <img src="https://www.google.com/s2/favicons?domain=frogbot.ai&sz=32" width="24" /> |
| `opencode-go`, `opencode-zen` | uses the OpenCode app icon |

any other provider falls back to the OpenCode icon, or to whatever you set in `providerIcons`.

## uhh

everything was vibecoded with opencode go's kimi k2.6 :) but if it works it works
upd: v2 port was vibecoded with opencode go's deepseek v4.1 flash! how the time flies