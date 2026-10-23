[English](README.md) · [日本語](README.jp.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [한국어](README.ko.md) · [简体中文](README.zh-Hans.md) · [Русский](README.ru.md)

# Guilduo

> **Construa a party mais forte com a IA ao seu lado.**

**Os humanos não são os únicos que podem solicitar trabalho.**

Guilduo é uma **Human × AI Work Platform** na qual pessoas e Agentes de IA podem solicitar, assumir, repassar e revisar trabalhos no mesmo workspace. Ela trata o trabalho real como Quests e o faz avançar por meio de Relays, Evidence e Decisions compartilhados.

## Links públicos

### Novos usuários começam aqui

- Conheça o Guilduo: [Site oficial](https://guilduo.com/)
- Trabalhe no Guilduo: [Guilduo / Relay Forge](https://app.guilduo.com/)
- Conecte um cliente de IA: `https://mcp.guilduo.com/mcp`

| Ponto de entrada | Link | Finalidade |
|---|---|---|
| LP oficial | [Guilduo Landing Page](https://guilduo.com/) | Conhecer os princípios, recursos e fluxo de trabalho do Guilduo |
| Web App oficial | [Guilduo / Relay Forge](https://app.guilduo.com/) | Abrir o workspace público de Command e Quest em beta |

`/next/relay-forge/` é um caminho de deployment dentro de um Appwrite Site, não a URL oficial da Web App. As URLs de deployment geradas pelo Appwrite Sites e a antiga URL `workers.dev` são mantidas para validação, compatibilidade e rollback. O caminho canônico para novos usuários é o domínio Guilduo acima. A candidata atualmente publicada é `0.6.0-beta.8`, gerenciada separadamente das releases com tag.

### Função de cada URL pública

| Função | URL canônica | Status |
|---|---|---|
| Site oficial / LP | `https://guilduo.com` | canonical root |
| Web App | `https://app.guilduo.com` | Appwrite Site Custom Domain |
| MCP | `https://mcp.guilduo.com/mcp` | Endpoint Remote HTTP MCP canônico |
| API do Appwrite | `https://api.guilduo.com/v1` | Endpoint oficial da API do Appwrite (origin: `https://api.guilduo.com`) |
| Documentação (JA / EN) | `https://guilduo.com/docs/` / `https://guilduo.com/docs/en/` | Docs estáticos; publicados |
| Documentation subdomain | `https://docs.guilduo.com` | Reserved / Future |

`https://www.guilduo.com` é reservado para redirecionar para `https://guilduo.com`. A antiga URL `workers.dev` continua disponível para conexões compatíveis e rollback. `api.guilduo.com` é usado pela API do Appwrite, pelo cliente Appwrite do navegador e pelo `APPWRITE_ENDPOINT` do Worker; ele não é o origin público das rotas REST `/v1` ou MCP `/mcp` do Worker.

Consulte [BRAND.md](BRAND.md) para a linguagem e as expressões de marca aprovadas.

Guilduo é um projeto independente e não é afiliado, endossado nem uma alternativa ao Habitica. Os nomes de produtos e as marcas comerciais pertencem aos seus respectivos proprietários.

## Escopo do beta público

| Área | Status |
|---|---|
| Web / PWA | Núcleo do beta público |
| Login do Google com Appwrite e armazenamento de convidado no dispositivo | Disponível (autenticação configurada) |
| CRUD de Quest, arquivamento, Quest Tree e batalha de MP | Disponível |
| Agent Registry, vinculação de clientes MCP e Handoff | Disponível |
| REST API 2.7.0 / MCP `/mcp` | 54 tools / OpenAPI 52 paths |
| `app.guilduo.com/` Guilduo / Relay Forge | Beta público da Web App oficial (Desktop / Mobile). `/next/relay-forge/` interno é um caminho de deployment e compatibilidade |
| 9 idiomas | Disponível na UI principal; a UI beta cobre a navegação principal |
| Google Calendar, Google Tasks, Notion e Toggl | **Early Access / preparação do OAuth** |
| Unity Battle Lab, Android/iOS nativo e execução autônoma de Agents | Pendente |

A versão do app é a candidata `0.6.0-beta.8`, REST/MCP é `2.7.0` e o Schema de dados é `7`. O OAuth de Providers externos fica desativado por padrão enquanto a segurança do beta público e a preparação para revisão são priorizadas. Contas e estado dos usuários estão sendo migrados para o Appwrite.

## Princípios de design

1. **As pessoas controlam o objetivo e a decisão final**: sugestões de IA permanecem revisáveis e nunca são concluídas ou publicadas sem aprovação.
2. **Separe trabalho de recompensas**: ganhe MP com Quests e escolha quando lutar e qual comando usar.
3. **Ler, visualizar, executar**: use dry-run como padrão para gravações, atualizações em massa e Handoffs.
4. **Arquive antes de excluir**: preserve histórico, recompensas e links externos; arquive Quests que não são mais necessárias.
5. **Coloque pessoas e IA na mesma party**: Astra é uma personagem companheira, Agents representam papéis e usuários continuam separados como contas.
6. **Não prenda os dados**: REST, MCP, CLI e Web UI usam o mesmo Worker e a mesma lógica de domínio.

## Telas e dados

- `/`: A UI atual. Antes do login, os dados são armazenados no dispositivo; depois do login, são sincronizados com o Appwrite por meio do Worker.
- `/lp/` e `/lp/en/`: A Landing Page oficial do Guilduo em japonês e inglês. As URLs de CTA vêm do Runtime Config e são desativadas com segurança quando não estão definidas.
- `/interaction-lab/`: A rota-fonte do Next para desenvolvimento local e capturas.
- `/next/` e `/next/relay-forge/`: Rotas de implementação e compatibilidade no Appwrite Sites. A entrada oficial para novos usuários é `https://app.guilduo.com/`, que encaminha internamente para a entrada do Relay Forge por meio de um rewrite baseado em host. No desktop, apenas a lista central Today/Tree rola; no mobile, a página inteira rola.
- `https://guilduo.com/` direciona para `/lp/` no mesmo Appwrite Site, enquanto `https://app.guilduo.com/` direciona para `/next/relay-forge/`. Consulte [`docs/appwrite-site-routing.md`](docs/appwrite-site-routing.md) para a configuração real de DNS e rewrite.
- A fonte de verdade visual é [`DESIGN.md`](DESIGN.md), a fonte de verdade técnica é [`PROJECT_SPEC.md`](PROJECT_SPEC.md) e o design de diferenças específico do Next é [`interaction-lab/DESIGN.md`](interaction-lab/DESIGN.md). Consulte [`design/TOKENS.json`](design/TOKENS.json) para tokens numéricos, [`design/COMPONENTS.md`](design/COMPONENTS.md) para componentes e [`design/SCREENS.md`](design/SCREENS.md) para a composição das telas.
- Ao reconectar, o estado do Appwrite Auth é restaurado e os dados sincronizados anteriormente continuam disponíveis em modo somente leitura quando existem. As listas de Quest não são apagadas durante a reconexão; a UI mostra um skeleton, um botão de reconexão e um bloqueio de escrita.
- Os estados de conclusão de Quest e de Agent Handoff são gerenciados separadamente. To Dos únicos são arquivados ao serem concluídos; diários, hábitos e To Dos recorrentes retornam na próxima ocorrência.
- Perfis públicos exibem somente nome de exibição, `@handle`, bio, avatar e nível. O conteúdo das Quests, notas, UID e informações de OAuth permanecem privados.

## Arquitetura de Appwrite / Worker

| Camada | Responsabilidade |
|---|---|
| Appwrite Sites | Entrega de Web/PWA |
| Appwrite Auth / TablesDB | Login do Google e estado de Quest e personagem por usuário |
| Cloudflare Worker | REST, OAuth, MCP, Webhooks e fronteira de extensões |
| Cloudflare D1 | Agent Registry, conexões MCP, perfis e metadados de integrações |
| Cloudflare KV | Estado do OAuth, estado de curta duração e clientes MCP |

Tokens, API keys e secrets nunca são armazenados em linhas públicas do Appwrite nem no Local Storage do navegador. As API Keys do Appwrite ficam somente em Worker Secrets. O Agent Registry também não armazena API keys de modelos, senhas ou URLs de execução.

## MCP

O endpoint de conexão estável é:

```text
https://mcp.guilduo.com/mcp
```

O MCP `2.7.0` expõe 54 tools para Quests, arquivamento, Quest Tree, Agent Handoff, Agent Registry, perfis, parties, batalha e o contrato Toggl Focus. `/mcp-next` é uma trilha de validação para o novo SDK e adiciona Resources e Workflow Prompts. Continue usando `/mcp` no uso normal para preservar a compatibilidade com clientes existentes.

Durante a migração, o `/mcp` antigo de `workers.dev` continua disponível para compatibilidade, mas novos registros e reconexões devem usar `mcp.guilduo.com/mcp` acima.

### Registre uma nova conexão MCP com OAuth

Este procedimento é para clientes como ChatGPT, Codex, Claude e OpenClaw que oferecem suporte a Remote HTTP MCP e OAuth. Para uma primeira conexão, siga os passos 1–6 na ordem. Se precisar apenas verificar uma conexão existente, comece no passo 7.

1. Se uma conexão antiga do Guilduo / QuestForge, anterior à migração, ainda estiver no cliente, desconecte-a ou remova-a primeiro. OAuth Grants e Tokens antigos não podem ser reutilizados.
2. Abra as configurações de MCP ou Connector do cliente e registre uma conexão chamada `Guilduo` com o tipo Remote HTTP MCP.
3. Defina a URL estável `https://mcp.guilduo.com/mcp`. Não use `/mcp-next` nos testes de conexão comuns.
4. Quando o cliente oferecer uma opção de autenticação, selecione `OAuth`. Não informe uma API Key, Bearer Token ou Client Secret.
5. Quando o navegador mostrar “Connect to Guilduo”, entre com a mesma conta Appwrite usada na versão Web do Guilduo, revise as permissões solicitadas e aprove-as.
6. Retorne ao cliente MCP e confirme que ele informa a conexão como conectada ou disponível. Nesse ponto, o OAuth está concluído, mas um Agent ainda pode não estar vinculado.
7. Abra Connections no [Guilduo / Relay Forge](https://app.guilduo.com/) e vincule o Client conectado ao Agent desejado. Se não houver Agent, crie um primeiro em Party > “Register Agent”.
8. Reinicie ou recarregue o cliente MCP e execute o teste de conexão abaixo.

Para clientes que adicionam Remote MCP por um arquivo de configuração, use este exemplo:

```json
{
  "mcpServers": {
    "questforge": {
      "type": "http",
      "url": "https://mcp.guilduo.com/mcp",
      "authentication": "oauth"
    }
  }
}
```

Os clientes MCP descobrem os metadados OAuth automaticamente. Use as URLs a seguir somente quando uma verificação manual for necessária.

```text
Authorization Server Metadata
https://mcp.guilduo.com/.well-known/oauth-authorization-server

Protected Resource Metadata
https://mcp.guilduo.com/.well-known/oauth-protected-resource/mcp
```

### Verifique o Agent Context no teste de conexão

Verifique a sequência a seguir no cliente:

1. A inicialização do MCP é concluída com sucesso.
2. `tools/list` retorna 54 tools.
3. `list_registered_agents` retorna somente o seu próprio Agent.
4. Chame `get_current_agent_context`.

Antes de vincular um Agent, a resposta normal é `linked: false` com `agent: null`. Depois do vínculo em Connections, ela passa a ser `linked: true` e retorna `agent` e `effectiveScopes`. Isso confirma que a autenticação OAuth, a separação de UID e o vínculo do Agent funcionam pela mesma conexão.

Exemplo de solicitação de teste:

```text
Guilduo MCPのtools/listを確認し、get_current_agent_contextを実行してください。
Agentがリンク済みか、Agent ID、Role、effectiveScopesだけを報告してください。
Token、Client ID、UIDは表示しないでください。
```

### Resolva erros 401 e Agents não vinculados

| Estado | Resposta |
|---|---|
| 401 logo após conectar | Há informações OAuth antigas. Exclua a conexão, registre novamente a mesma URL `/mcp` e autorize-a outra vez. |
| Não é possível voltar da tela OAuth | Confirme que você entrou com a mesma conta Appwrite da versão Web do Guilduo. Verifique também extensões que possam bloquear o callback de retorno ao cliente. |
| `linked: false` | O OAuth funcionou. Vincule o Client a um Agent em Relay Forge Connections. |
| Erro de permissão `agents:read` | Autorize a conexão novamente e confirme a permissão de leitura de Agents na tela de consentimento. As configurações do Agent não podem adicionar permissões OAuth. |
| O vínculo do Agent não aparece | Recarregue o cliente MCP e execute `get_current_agent_context` novamente. |

Não cole Tokens, API Keys ou UIDs completos nas configurações de conexão nem nos logs. Depois da autorização OAuth, os Tokens são gerenciados pelo cliente MCP e pelo Cloudflare KV.

### Clientes de IA

- ChatGPT / Codex: registre a URL de produção `/mcp` acima no Remote MCP App ou no modo de desenvolvedor.
- Claude: adicione OAuth Remote MCP em Settings > Connectors.
- Gemini CLI: `gemini mcp add --transport http questforge https://mcp.guilduo.com/mcp`
- GitHub Copilot CLI: `copilot mcp add --transport http questforge https://mcp.guilduo.com/mcp`
- OpenClaw / Hermes: use o mesmo Remote HTTP MCP na próxima receita de conexão.

Depois do registro, crie ou edite Agents em **Party** no Relay Forge e vincule clientes MCP autorizados a um Agent em **Connections**. Um Agent não pode aumentar as permissões de um cliente MCP.

## CLI

A CLI tem um papel separado do MCP. MCP é usado para descoberta e aprovação de ferramentas de IA; a CLI é usada para operações REST/JSON por pessoas e CI.

```bash
npm run cli -- doctor --json
npm run cli -- quests list --view today --json
npm run cli -- quests add --title "公開前チェック" --due 2026-08-20 --json
npm run cli -- quests add --title "公開前チェック" --execute --json
npm run cli -- quests complete quest-id --execute --json
npm run cli -- agents list --json
npm run cli -- handoff quest-id review_required --expected-state working --execute --json
npm run cli -- mcp-config --json
```

As gravações retornam apenas um dry-run ou plano de execução quando `--execute` não é informado. A autenticação usa `QUESTFORGE_TOKEN` ou `--token-stdin`, e tokens nunca são gravados nos logs. Usuários gerais de produção usam OAuth em vez de uma API key fixa.

## Skill / OpenAI Plugin / MCP App

- Skill oficial: [`skills/guilduo-workflows/SKILL.md`](skills/guilduo-workflows/SKILL.md)
- Pacote de preparação do OpenAI Plugin: [`plugins/questforge/`](plugins/questforge/)
- Template de registro do MCP App: [`plugins/questforge/.app.json.example`](plugins/questforge/.app.json.example)
- Checklist de envio: [`plugins/questforge/openai-submission.json`](plugins/questforge/openai-submission.json)

O Skill ensina à IA a sequência de ler, fazer dry-run, confirmar, executar e devolver uma revisão. A revisão oficial da OpenAI não é concluída automaticamente. Depois de verificar a aceitação com contas reais, a privacidade e os caminhos de exclusão de conta no beta público, um operador envia a solicitação pelo Dashboard.

## 9 idiomas

O Guilduo oferece suporte a japonês, inglês, espanhol, português do Brasil, francês, alemão, coreano, chinês simplificado e russo. As configurações de idioma são armazenadas por dispositivo e não fazem parte da sincronização em nuvem. Datas, números e ordem de classificação usam a API Intl.

## Roadmap de serviços externos

A prioridade atual é estabelecer contratos e uma apresentação segura; o OAuth de Providers permanece pausado como Early Access.

1. Google Calendar: janelas de disponibilidade somente leitura
2. Google Tasks: sincronização bidirecional sem exclusão
3. Toggl Track: registro de tempo, estimativas e conversão de MP
4. Notion: exportação de registros diários
5. Todoist, Discord / Slack: sincronização e notificações
6. OpenClaw, Hermes Agent: receitas de conexão e reutilização de Skills

A sincronização inicial exige uma visualização prévia, e o Guilduo nunca exclui dados externos automaticamente. Os Provider Secrets ficam somente em Worker Secrets.

## Desempenho e telemetria

As metas usam um dispositivo de classe Pixel 9: LCP de no máximo 2,5 segundos, INP de no máximo 200 ms, CLS de no máximo 0,1 e JavaScript inicial comprimido de no máximo 250 KB. A telemetria anônima se aplica somente a usuários que consentiram explicitamente; conteúdo de Quest, notas, e-mail, UID, tokens e conteúdo externo não são enviados. Os eventos permitidos implementados são Web Vitals, erros de JavaScript, resultados de sincronização, primeira conclusão de Quest, conexão MCP e atribuição de Agent. Nada é enviado após a recusa ou retirada da telemetria. Antes do lançamento público, um administrador deve configurar `TELEMETRY_ENDPOINT` e a migração D1 0006.

## Desenvolvimento local

Os requisitos são Node.js 22+ e Wrangler. Gerencie os recursos do Appwrite pelo Appwrite Console ou MCP.

```bash
npm install
cp appwrite-config.example.js appwrite-config.js
cp runtime-config.example.js runtime-config.js
cp wrangler.example.jsonc wrangler.jsonc
npm run dev
```

Use `Copy-Item` no PowerShell. Os principais comandos são:

```bash
npm run check
npm run typecheck
npm test
npm run build
npm run api:generate
npm run worker:dev
```

Durante o desenvolvimento TypeScript, os tipos do runtime do Worker são gerados a partir da configuração do Wrangler. `npm run typecheck` combina a geração de tipos, verificações de consistência da saída gerada, verificações de `any` explícito e `@ts-nocheck`, além das verificações estritas para browser, Worker, Node e o protótipo de batalha. A transformação do Vite e a verificação de tipos são separadas, enquanto os contratos API/MCP são mantidos por testes dedicados.

O workflow de tags `v*` confere a versão do pacote, se o commit marcado é um ancestral de `main` e as notas da release, e publica uma Release do código-fonte no GitHub após a aprovação dos controles de CI, tipos, testes, build e preview. Não usa secrets de deployment nem executa automaticamente migrações de produção ou deployments de Sites ou Workers. O deployment de produção é separado, pelos workflows manuais existentes `.github/workflows/deploy-appwrite-site.yml` e `.github/workflows/deploy-appwrite-worker.yml`, mantendo a proteção do ambiente `production` e os controles de caches preservados. O runtime do Worker em produção ainda contém correções aplicadas por deployment direto que não foram integradas ao código-fonte público; não execute primeiro o workflow genérico de deployment do Worker. A Release de código-fonte do produto principal `v0.6.0-beta.8` e as extensões de host `beta.12` têm versões independentes; o Guilduo continua em beta público. Consulte [`RELEASE_SETUP.md`](RELEASE_SETUP.md).

## Documentação

- [Fonte de verdade do design visual](DESIGN.md)
- [Especificação técnica](PROJECT_SPEC.md)
- [Design tokens](design/TOKENS.json)
- [Especificação de componentes](design/COMPONENTS.md)
- [Blueprints de telas](design/SCREENS.md)
- [Manifesto de assets](design/ASSET_MANIFEST.md)
- [Referências douradas](design/reference/README.md)
- [Roadmap do beta público](ROADMAP.md)
- [Guia de URLs públicas](docs/public-urls.md)
- [Configuração de API / MCP / OAuth](API_MCP_SETUP.md)
- [Configuração de releases com tag](RELEASE_SETUP.md)
- [Guilduo E2 brand rollout](docs/brand-rollout.md)
- [Privacidade](PRIVACY.md)
- [Termos](TERMS.md)
- [Segurança](SECURITY.md)
- [Como contribuir](CONTRIBUTING.md)
- [Assets](ASSETS.md)
- [Licença](LICENSE)

## Licença

Guilduo é distribuído sob GNU AGPL-3.0-only. Se você fornecer uma versão modificada por uma rede, cumpra os requisitos de disponibilização do código-fonte dessa licença.
