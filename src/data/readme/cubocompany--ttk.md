# @cubocompany/ttk — Tiny Token Kit

> Compressão de prompts para agentes de IA. Intercept **antes** do LLM via plugin nativo do OpenCode.

```bash
npx @cubocompany/ttk init
```

[![npm](https://img.shields.io/npm/v/@cubocompany/ttk.svg)](https://www.npmjs.com/package/@cubocompany/ttk)
[![license](https://img.shields.io/npm/l/@cubocompany/ttk.svg)](LICENSE)

---

## O que é o TTK (Tiny Token Kit)?

Um plugin para o OpenCode que reduz o consumo de tokens em conversas com modelos grandes (Claude, GPT, MiniMax, Kimi, etc.) aplicando **compressão semântica** antes da mensagem chegar ao LLM, e instruindo o modelo a responder em formato comprimido.

Resultado típico:
- **Input** comprimido em 30-65% (regex local) ou 50-80% (Ollama)
- **Output** do LLM em 50-80% do tamanho normal (instrução inline)
- Conteúdo técnico (código, erros, URLs, versões) preservado intacto

---

## Como funciona

O TTK usa o hook `experimental.chat.messages.transform` do OpenCode — o mesmo mecanismo do Superpowers — que executa **antes** de qualquer chamada ao LLM:

```
Usuário digita /tiny ollama gemma4:latest
  → command.execute.before ativa o estado, mostra toast e confirmação

Próxima mensagem do usuário
  → messages.transform intercepta a mensagem
  → comprime (local via regex ou Ollama via /api/generate)
  → injeta instrução inline pedindo resposta comprimida
  → LLM recebe texto comprimido + instrução
```

Diferente de skills e commands, que dependem do LLM "lembrar" de comprimir, o TTK é **determinístico**: a compressão acontece no nível do OpenCode, não no nível do modelo.

---

## Comandos

| Comando | Efeito |
|---------|--------|
| `/tiny` | Ativa compressão local, nível full (default) |
| `/tiny lite` | Remove filler/hedging, mantém gramática (~80% do tamanho normal) |
| `/tiny full` | Sem artigos, fragmentos, abreviações (~50%) |
| `/tiny ultra` | Compressão máxima, setas `→`, semicolons `;` (≤150 palavras) |
| `/tiny ollama` | Lista modelos Ollama disponíveis e ativa o escolhido |
| `/tiny ollama gemma4:latest` | Ativa Ollama com modelo específico |
| `/tiny off` | Desativa, modo normal restaurado |

Toast visual mostra o modo ativo, taxa de compressão (com Ollama) e fallback em caso de erro.

---

## Modos de compressão

### Local (regex, instantâneo)

Aplica regras determinísticas em PT-BR e EN:

| Nível | Estratégia | Output |
|-------|------------|--------|
| `lite` | Remove filler (just, really, basically, só, apenas), hedging (I think, talvez), pleasantries (claro, sure) | ~80% do original |
| `full` | Lite + remove artigos (a/an/the/o/os/uma) + abreviações (DB, auth, fn, app, env, repo) | ~50% |
| `ultra` | Full + abreviações agressivas (req/res/msg/srv/conn/mgmt) + arrows `→` para causalidade + `;` para contraste | ≤150 palavras |

### Ollama (compressão semântica via LLM local)

Roda um modelo local que reescreve o prompt preservando significado e idioma. Suporta `think: false` para modelos com reasoning mode (qwen3, deepseek-r1).

```bash
# Instalar Ollama: https://ollama.ai
ollama pull gemma4:latest    # Recomendado: 8B, ~9.6 GB, sem thinking
ollama pull phi3:mini        # Alternativa: 3.8B, mais rápido
ollama pull llama3.2:1b      # Alternativa leve: 1.3 GB, super rápido
```

| Modelo | Tamanho | Velocidade típica |
|--------|---------|-------------------|
| `llama3.2:1b` | 1.3 GB | ~500ms |
| `phi3:mini` | 2.3 GB | ~1s |
| `gemma4:latest` | 9.6 GB | ~700ms (após primeiro carregamento) |
| `qwen3.5:2b` | 2.7 GB | ~4s (com `think: false`) |

> **Nota**: Modelos com thinking mode (qwen3.*, deepseek-r1) levam 30-60s sem `think: false`. O TTK desabilita isso automaticamente.

---

## Instalação

```bash
# Instalar via CLI interativo
npx @cubocompany/ttk init

# Ou diretamente para o OpenCode (Linux/Mac)
cp dist/plugin/index.js ~/.config/opencode/plugins/ttk.js
cp skill/SKILL.md ~/.config/opencode/skills/ttk/SKILL.md
cp skill/commands/tiny.md ~/.config/opencode/commands/tiny.md

# Windows (PowerShell)
Copy-Item dist\plugin\index.js "$env:USERPROFILE\.config\opencode\plugins\ttk.js"
Copy-Item skill\SKILL.md "$env:USERPROFILE\.config\opencode\skills\ttk\SKILL.md"
Copy-Item skill\commands\tiny.md "$env:USERPROFILE\.config\opencode\commands\tiny.md"
```

### Status, mecanismo de cada ferramenta, desinstalação

```bash
npx @cubocompany/ttk status
npx @cubocompany/ttk mechanisms
npx @cubocompany/ttk uninstall
```

---

## Desenvolvimento

```bash
# Instalar dependências (Bun ou pnpm)
bun install

# Build completo (typecheck + plugin + CLI)
bun run build

# Typecheck apenas
bun run typecheck

# Watch mode
bun run build:watch
```

### Estrutura

```
src/
  plugin/
    index.ts                  # Entry point do plugin OpenCode
    types/index.ts            # Tipos alinhados com @opencode-ai/sdk
    compression/
      rules.ts                # Regras locais (EN + PT)
      ollama.ts               # Cliente Ollama (fetch puro, fallback IPv4/IPv6)
      stats.ts                # Cálculo de estatísticas
    hooks/
      args-parser.ts          # Parse de /tiny [args]
      messages-transform.ts   # Hook principal — experimental.chat.messages.transform
      session-cleanup.ts      # Cleanup ao encerrar sessões
  cli/index.ts                # CLI interativo (npx ttk init)
  installer/
    paths.ts                  # Caminhos por ferramenta (claude-code, opencode, kiro)
    installer.ts              # Lógica de cópia/append

skill/
  SKILL.md                    # Skill markdown (regras de compressão)
  commands/tiny.md            # Template do comando /tiny

dist/                         # Output do build (gerado)
  plugin/index.js
  cli/index.js
```

---

## Release

Releases automáticos via GitHub Actions + semantic-release. Push para `main` com mensagens convencionais (feat/fix/chore) → CHANGELOG, tag, publicação no npm e release no GitHub.

```bash
bun run release   # Roda o semantic-release localmente em modo dry-run
```

---

## Licença

MIT © Cubo Company
