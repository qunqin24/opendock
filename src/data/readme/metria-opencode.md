# metria-opencode

Plugin de CLI do OpenCode V2 que mostra o uso da IA atual no fim da linha do prompt (onde ficam agente/modelo), com a lógica de medição do [Metria](https://github.com/yurirxmos/metria).

- Mostra sempre a janela principal (ex.: `5h 42%`) do provider do modelo selecionado, com cor por faixa (40/65/85%).
- Se outra janela (semanal/mensal) passar de 85%, aparece `▲ 7d 91%` ao lado; em 100% fica vermelho.
- Quando um limite estoura (100%), aparece o tempo até resetar: `5h 100% · resets in 1h30m`. O contador atualiza sozinho e, ao zerar, o uso é buscado de novo.
- Se a medição falhar (credencial expirada, rede), aparece `usage !` no footer e um aviso explica o motivo.
- `/usage` (ou `/metria`) força a atualização e mostra todas as janelas com o tempo até resetar.

| Provider no OpenCode | Fonte |
| --- | --- |
| `anthropic` | credential do servidor OpenCode ou `~/.claude/.credentials.json` → `api.anthropic.com/api/oauth/usage` |
| `openai` | credential do servidor OpenCode ou `~/.codex/auth.json` → `chatgpt.com/backend-api/wham/usage` |
| `opencode-go` | credential do servidor OpenCode (ou `OPENCODE_API_KEY`/`auth.json`) → `opencode.ai/zen/go/v1/usage` |

As credenciais vêm primeiro do servidor do OpenCode, então uma key trocada pela interface (`opencode auth login`, `/connect`, Console) é usada na hora — o `auth.json` só serve de reserva.

Quando o token do OpenAI/Codex estiver expirado, o plugin renova sozinho pelo `auth.openai.com/oauth/token` (mesmo fluxo do Codex CLI), sem alterar os arquivos de credencial.

Atualiza ao trocar de provider, ao fim de cada resposta (no máximo 1x/min) e a cada 5 min.

## Instalação

```sh
opencode plugin add metria-opencode
opencode service restart
```

Como o plugin é só de TUI, ele entra automaticamente no `~/.config/opencode/cli.json`.

### Desenvolvimento

```sh
git clone https://github.com/yurirxmos/metria-opencode
cd metria-opencode
bun install
```

Aponte o `~/.config/opencode/cli.json` para o diretório local:

```json
{ "plugins": ["/caminho/para/metria-opencode"] }
```

Depois de alterar o código, reinicie com `opencode service restart`.

```sh
npm run check   # typecheck
npm test        # testes
```
