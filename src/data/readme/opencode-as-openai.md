# opencode-as-openai

Plugin do **OpenCode v2** que transforma o OpenCode em um provider **OpenAI-compatible** (`/v1/chat/completions`, `/v1/models`) para ferramentas externas como pen.dev, Cursor e SDKs da OpenAI.

Ao abrir o OpenCode em um projeto que declara o plugin, ele sobe um servidor HTTP local. Cada request roda **no contexto daquele projeto**: `AGENTS.md`, skills, agents, MCPs e tools (do projeto e globais), com o agent `build`.

```
cliente (pen.dev, Cursor, SDK OpenAI)
      │  POST /v1/chat/completions  (JSON ou SSE)
      ▼
 opencode-as-openai  (plugin, dentro do processo do OpenCode)
      │  ctx.session / ctx.event / ctx.tool / hooks
      ▼
 OpenCode v2  →  provider/modelo configurado
```

## Instalação

Requer OpenCode **v2** (testado com 2.1.1).

**No `opencode.json` do projeto (ou global, `~/.config/opencode/opencode.json`):**

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-as-openai",
      "options": { "port": 4010 }
    }
  ]
}
```

Sem opções basta a string: `"plugins": ["opencode-as-openai"]`.

**Desenvolvimento local:** clone o repositório, rode `bun install` e aponte para o diretório (que tem `index.ts` na raiz) em vez do nome do pacote: `"plugins": ["/caminho/para/opencode-as-openai"]`. Alternativa sem editar a config: um arquivo `.opencode/plugins/bridge.ts` no projeto com

```ts
export { default } from "/caminho/para/opencode-as-openai/index.ts"
```

Abra o OpenCode no projeto e confira: `curl http://127.0.0.1:4010/health`.

## Uso

```bash
curl http://127.0.0.1:4010/v1/models
curl http://127.0.0.1:4010/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"opencode/minimax-m3.1-flash-free","messages":[{"role":"user","content":"olá"}]}'
```

```ts
import OpenAI from "openai"
const client = new OpenAI({ baseURL: "http://127.0.0.1:4010/v1", apiKey: "qualquer" })
```

- **Modelos:** `provider/modelo` (o mesmo ID do OpenCode). Um ID sem provider só vale se for único (senão `400 model_ambiguous`). Sem `model`, usa o padrão do OpenCode.
- **Ferramentas que pedem "API key":** sem `apiKeys` configurado em loopback, qualquer valor é aceito.
- **Várias locations:** se o mesmo processo tem mais de um projeto aberto, escolha com o header `x-opencode-directory: /caminho/do/projeto` (sem header, usa a primeira).

## Tools: modelo híbrido

| Tool | Quem executa | O que o cliente vê |
|---|---|---|
| Nativas do OpenCode (`read`, `edit`, `shell`, MCPs, skills) | **OpenCode**, dentro do loop da turn | só o texto/resultado final |
| Declaradas em `tools` na request | **O cliente** | `finish_reason: "tool_calls"` |

Quando o modelo chama uma tool do cliente, a resposta termina com `tool_calls` (suportado: chamadas paralelas, JSON e SSE). A sessão do OpenCode **fica suspensa** até a request seguinte trazer as mensagens `tool` com os `tool_call_id`; aí a **mesma sessão continua** (sem reenviar o histórico). Se o cliente não responder em `timeouts.pendingTtlMs` (padrão 10 min), a sessão é interrompida e removida; uma resposta tardia é atendida em uma nova sessão com o histórico apresentado como mensagens nativas.

Detalhes que importam para o cliente:

- O modelo vê as tools do cliente com nome `br_<id>_<nome>`; a resposta devolve o **nome original**.
- Argumentos inválidos (contra o JSON Schema) não chegam ao cliente: o modelo recebe o erro e tenta de novo.
- `tool_choice: "none"` não registra as tools; `required`/função específica vira uma instrução ao modelo (não é imposição rígida).
- Resultados parciais (faltou responder alguma chamada paralela) → `400 tool_results_mismatch`.

## Opções (`options` do plugin)

| Opção | Padrão | |
|---|---|---|
| `host` | `127.0.0.1` | Fora de loopback exige `apiKeys`. |
| `port` | `4010` | Porta ocupada por outro processo não derruba o OpenCode (só loga). |
| `apiKeys` | `[]` | Lista de chaves `Authorization: Bearer`. |
| `defaultAgent` | `"build"` | Agent usado nas sessões. |
| `autoApprove` | `"none"` | Pedidos de permissão (`ask`) das tools nativas: `none` nega, `edit` aprova edições, `all` aprova tudo. |
| `readOnly` | `false` | Nega `edit`/`shell` mesmo se o agent permitir. |
| `keepSessions` | `false` | Mantém as sessões `[bridge] …` no OpenCode (debug). |
| `exposeReasoning` | `false` | Envia o raciocínio como `reasoning_content` no stream. |
| `corsOrigins` | `[]` | Origens de browser permitidas (`"*"` libera todas). |
| `logFile` | `~/.local/state/opencode-bridge/bridge.log` | `false` desliga. Nunca escreve no terminal (não afeta o TUI). |
| `timeouts.firstEventMs` | `120000` | Até o primeiro evento do OpenCode. |
| `timeouts.idleMs` | `300000` | Silêncio máximo entre eventos. |
| `timeouts.totalMs` | `1800000` | Duração máxima de uma resposta. |
| `timeouts.pendingTtlMs` | `600000` | Espera pelo resultado de uma tool do cliente. |

Opções inválidas desabilitam o bridge (com o motivo no log) sem impedir o OpenCode de iniciar.

## Segurança

O agent `build` do OpenCode permite quase tudo por padrão (inclusive `shell` e `edit`) e o bridge **herda** essa política. Quem alcança a porta consegue pedir ao modelo que mexa no projeto. Por isso:

- o servidor escuta só em `127.0.0.1` por padrão; fora de loopback é obrigatório configurar `apiKeys`;
- use `readOnly: true` se o cliente só deve conversar/ler;
- pedidos que as regras mandariam perguntar (`ask`) nunca ficam pendentes: são negados, salvo `autoApprove`.

## Parâmetros suportados

`temperature` (omitido para modelos que não aceitam), `top_p`, `max_tokens`/`max_completion_tokens`, `stop`, `seed`, `frequency_penalty`, `presence_penalty`, `stream`, `stream_options.include_usage`, `tools`, `tool_choice`. Qualquer outro campo é aceito e ignorado (registrado no log). `n > 1`, imagens e áudio não são suportados. Mensagens `system`/`developer` entram como contexto adicional, sem substituir o prompt do agent nem o `AGENTS.md`.

## Custo de contexto

Como o contexto do projeto é herdado, **cada turn carrega o prompt do OpenCode, os `AGENTS.md` (global e do projeto), o catálogo de tools/MCPs e as skills**. Numa configuração real de desenvolvimento, um "olá" custou ~15 mil tokens de entrada (`usage.prompt_tokens`). Recomendações:

- enxugue `~/.config/opencode/AGENTS.md` e o `AGENTS.md` do projeto;
- desative MCPs que o cliente não precisa nesse projeto;
- o cache de prompt do provider amortiza as rodadas seguintes de um mesmo tool loop (a sessão é reaproveitada); entre mensagens do usuário a sessão é nova.

## Observabilidade

- `GET /health`: locations registradas, conversas ativas, aguardando cliente, chamadas pendentes e **métricas** (contadores, `first_event_ms` e `response_ms` com p50/p95). `503` se nenhuma location está registrada.
- Logs JSON (uma linha por evento) com `reqId`, `conversationId`, `sessionID`, modelo, duração, `finish_reason` e nº de tool calls. Conteúdo de mensagens e chaves não são registrados.
- Cada response traz `x-request-id`.

## Multi-instância

O plugin é carregado uma vez por location dentro de **um** processo OpenCode, e todas compartilham **um** servidor. Um segundo processo OpenCode que use a mesma porta não sobe servidor (aviso no log); configure portas diferentes por projeto se precisar de ambos. Ao encerrar o OpenCode (SIGTERM), as turns são interrompidas, as sessões e tools do bridge removidas e a porta liberada.

## Limitações conhecidas

- Só OpenCode v2; só Chat Completions (a estrutura permite adicionar Responses e Anthropic Messages em `src/protocols/`).
- O histórico é reapresentado a cada mensagem do usuário (sessão nova por turn); a otimização por reuso de sessão/prefixo de cache fica para depois.
- A location é a do projeto onde o OpenCode foi aberto; locations ainda não carregadas não aparecem (`404 location_not_found`).
- O usage de uma step que dispara tools do cliente é contabilizado na resposta seguinte.
- Validação com o TUI interativo (logs fora do terminal é por construção) e com o pen.dev/Cursor reais é manual.

## Desenvolvimento

```bash
bun install
bun test                 # unidade + soak + HTTP/SDK openai com um OpenCode simulado
bun run typecheck

# integração contra um OpenCode real com o plugin carregado (opt-in)
OPENCODE_BRIDGE_URL=http://127.0.0.1:4010 OPENCODE_BRIDGE_DIR=/caminho/do/projeto \
  bun test test/integration
```

Estrutura: `src/protocols/openai-chat` (decode/encode puros) · `src/core` (`Bridge`, histórico, pendências) · `src/opencode` (`OpenCodeHost`, adapter do `ctx`, `EventMux`, modelos) · `src/http` · `src/hosting.ts` (singleton por processo) · `test/fixtures` (eventos reais gravados). Especificação e decisões em `openspec/changes/add-opencode-bridge-mvp/`.
