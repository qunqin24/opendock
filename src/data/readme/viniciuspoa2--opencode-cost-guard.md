# opencode-cost-guard

Plugin para OpenCode. Avisa quando contexto da sessão cresce ou modelo caro recebe volume sustentado de requests. Apenas alerta: sem telemetria, chamadas extras de LLM ou bloqueio de requests.

Criado e mantido por [Commitgeist](https://github.com/commitgeist).

## Instalação

Adicione pacote na configuração do OpenCode:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-cost-guard"]
}
```

OpenCode instala plugins npm na inicialização. Feche e reinicie OpenCode após mudar configuração.

Para desenvolvimento local:

```json
{
  "plugin": ["file:///absolute/path/to/opencode-cost-guard/dist/index.js"]
}
```

Execute `bun run build` antes de carregar saída compilada local.

## Configuração

Configuração global opcional: `~/.config/opencode/cost-guard.jsonc`.

```jsonc
{
  "warnTokens": 50000,
  "alertTokens": 100000,
  "expensiveModels": ["glm-5.2", "claude-opus", "gpt-5", "kimi-k2"],
  "cheapSuggestion": "opencode/deepseek-v4-flash-free",
  "maxRequestsBeforeSuggest": 15,
  "enabled": true
}
```

Entradas em `expensiveModels` correspondem ao ID do modelo sem diferenciar maiúsculas e minúsculas. Defina `enabled` como `false` para desabilitar monitoramento.

## Saída

Avisos aparecem nos logs estruturados do OpenCode:

```text
Contexto em ~50k tokens - considere /compact.
Contexto em ~100k tokens - /compact ou nova sessao recomendado.
Modelo caro (glm-5.2) apos 15 requests. Para execucao, considere opencode/deepseek-v4-flash-free.
```

Cada limiar e sugestão de modelo é emitido uma vez por sessão. Estado usa ID da sessão como chave e é removido quando sessão é excluída.

## Estimativa de Tokens

Antes de cada request ao LLM, plugin lê mensagens atuais da sessão via SDK do OpenCode. Serializa metadados e partes das mensagens, depois estima contexto como `caracteres / 4`. Estimativa é aproximada e não exige chamada ao provedor. Saída de ferramentas, anexos e tokenização específica do provedor podem causar diferença entre estimativa e tokens de entrada faturados.

## Testes

```bash
bun install
bun test
bun run typecheck
bun run build
npm pack --dry-run
```

Teste manual: defina `warnTokens` como `100` e `alertTokens` como `200`, reinicie OpenCode e troque mensagens suficientes para ultrapassar ambas estimativas. Use modelo caro configurado e envie mais requests que `maxRequestsBeforeSuggest` para validar alerta de modelo.
