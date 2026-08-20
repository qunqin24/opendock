# opencode2-cmdc

OpenCode V2 plugin for a Command Code Go subscription.

The plugin starts a loopback-only OpenAI-compatible bridge at
`http://127.0.0.1:8788/v1`. It reads Command Code authentication at runtime
from the existing Command Code login; it does not write credentials or alter
other OpenCode providers or models.

Authenticate with Command Code first:

```sh
cmd login
```

The bridge is derived from the MIT-licensed
[`hermes-commandcode-provider`](https://github.com/MitoroMisaka/hermes-commandcode-provider)
project and supports its Command Code model/event protocol.

## OpenCode setup

OpenCode V2's current plugin catalog API does not create new provider/model
records at runtime. Install this plugin normally, then register the bridge as
an OpenAI-compatible `commandcode` provider in your OpenCode provider config.
This plugin never rewrites an existing provider, model, or default model.
