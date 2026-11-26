# opencode-precost (prototipo)

[English](README.md) | **Português (Brasil)**

Mostra uma ESTIMATIVA de faixa de custo ANTES de executar uma tarefa em agentes de codigo (OpenCode e Claude Code), e opcionalmente pede aprovacao explicita quando a faixa alta passa de um limite. Privado, sem chamadas pagas. Versao de desenvolvimento 0.3.0 (branch dev/0.3.0), com limites: ver `docs/INSTALACAO.pt-BR.md`, "Limites" e `docs/CAPACIDADES.md`.

> A 0.4.0 esta publicada no npm na tag `next` (a tag `latest` ainda e a 0.3.2, sem suporte ao OpenCode 2.x): suporte EXPERIMENTAL ao OpenCode 2.x (so 2.4.2). Veja `docs/INSTALACAO.pt-BR.md`, secao 4b: cliente mostra so erro 500 ao bloquear (use `precost last`), titulo/compactacao fora do gate, `sessionLimitUsd` bloqueia, anexos de imagem nao contados.

## Imagens (execucao real, Linux)
Renderizacoes do texto de saida do terminal (nao sao screenshots de interface), geradas a partir de saidas reais; as legendas nas imagens estao em ingles e as mensagens da ferramenta ainda estao em portugues. Onde ha modelo, ele e um servidor SIMULADO local (sem custo, sem credencial). Nada abaixo foi executado em macOS ou Windows.

![Previa e bloqueio no Claude Code 2.1.332](docs/img/01-preview-and-block.png)
![Aprovacao de uso unico](docs/img/02-single-use-approval.png)
![precost estimate no terminal](docs/img/03-estimate-cli.png)
![precost update-prices (tabela simulada)](docs/img/04-update-prices.png)
![OpenCode 1.19.6 TUI com precost (modelo simulado)](docs/img/05-opencode-tui.png)

_Imagem 05: ilustracao do bloqueio (modelo sem preco na tabela) em recorte parcial reconstruido da TUI real; nao e screenshot integral nem prova visual do fluxo de aprovacao no OpenCode._

## Atualizar a tabela de precos
```
precost prices                                   # tabela em uso, data e idade (aviso se > 30 dias)
precost update-prices --from ARQUIVO_OU_URL      # valida e mostra o diff (nada e gravado). URL: https obrigatorio
precost update-prices --from ARQUIVO_OU_URL --yes   # grava em ~/.config/precost/prices.json (Windows: %APPDATA%\precost\prices.json)
precost update-prices                            # fonte padrao: data/prices.json no main do repo do projeto (so funciona depois que o repo for publico; ate la HTTP 404, exit 1, nada muda)
precost update-prices --reset                    # volta para a tabela embutida
```
Recusa tabela invalida, mais antiga que a atual, ou com remocao/variacao acima de 5x (use `--force` so depois de conferir a fonte). Roda so na CLI, nunca dentro do hook/plugin. Usa-se a tabela do usuario so se nao for mais antiga que a embutida. Trocar a tabela invalida aprovacoes pendentes. Nao ha leitura automatica das paginas oficiais de preco. A fonte padrao e a tabela publicada no `main` do repositorio do projeto, que so existe depois que o repo for publico (ate la HTTP 404 e nada muda); `--from` ou `PRECOST_PRICES_SOURCE` indicam outra fonte (arquivo ou https). Hoje a tabela embutida (`data/prices.json`) e a fonte de referencia; as paginas oficiais citadas em cada modelo continuam sendo a verdade. Confira sempre.

## Plataformas
Matriz do que foi realmente executado (CI real do GitHub + execucao local): ver `docs/INSTALACAO.pt-BR.md`, "Matriz de validacao". Linux nao e validacao de macOS/Windows. O codigo usa caminhos por plataforma (`src/paths.js`; Windows: `%APPDATA%`) e o hook do Claude Code usa `node` + `args` (sem shell). O harness `npm run e2e:native` (Node, sem bash) roda os clientes reais contra servidores falsos em Linux, macOS e Windows.

## Claude Code como plugin
`claude plugin marketplace add glauberportella/opencode-precost` e `claude plugin install precost@precost-marketplace` (apos o repositorio estar publico). Local: `claude --plugin-dir .`. Testado em Linux com Claude Code 2.1.332 real e servidor falso (`npm run e2e:claude-plugin`). `onFailure:"block"` no hook do plugin; falha do hook no plugin testada em Linux (`npm run e2e:claude-plugin-failure`).

## Instalar e testar (reproduzivel)
```
npm ci            # usa package-lock.json; instala a dependencia de dev @opencode-ai/plugin@1.19.6 (necessaria para o teste do adaptador OpenCode)
npm test          # 71 testes (saida em ingles e em portugues); sem npm ci o teste do adaptador OpenCode falha por dependencia ausente
node bin/precost.js doctor   # verifica instalacao local (limite: nao prova que o cliente carregou o hook)
npm run e2e:opencode          # OpenCode 1.19.6 real, sem modelo: ciclo bloqueio/approve/uso unico (npx opencode-ai@1.19.6)
npm run e2e:opencode-ledger   # OpenCode 1.19.6 real + provedor FALSO local: evento real do assistente, semantica de tokens/custo
npm run e2e:claude-tui        # TUI INTERATIVA real do Claude Code (pty) + servidor falso: bloqueio visivel, 0 chamadas ao modelo
npm run e2e:claude-failure    # falha do hook (crash, node ausente, timeout) no settings.example.json real: nada chega ao modelo (onFailure:block)
npm run e2e:opencode-tui      # TUI real do OpenCode 1.19.6 (pty): bloqueio visivel, plugin carregado, sem provedor pago
npm run e2e:claude            # Claude Code 2.1.332 REAL + servidor Anthropic FALSO local: hook, bloqueio sem chamar modelo, approve, uso unico, modelo via transcript (npx @anthropic-ai/claude-code@2.1.332)
```

## Primeiro uso real guiado (escopo)
1. Previa pelo terminal, o canal acessivel e verificado: `node bin/precost.js estimate "tarefa..." --model gemini-3.5-flash` (ou `--task`, `--file`). Tambem `node bin/precost.js last` mostra o ultimo bloqueio.
2. Modelos com preco conhecido na tabela (`data/prices.json`): Gemini 3.x/4 e Claude 4.5 a 5.5. Modelo fora da tabela com limite configurado = bloqueia e pede aprovacao.
3. Claude Code NAO informa o modelo ao hook (observado na 2.1.332). So `PRECOST_MODEL` e aceito como modelo efetivo sem pior caso: e uma DECLARACAO do operador, NAO uma prova tecnica (ela nao forca o Claude a usar esse modelo; use-a junto com `claude --model` igual). Rastreador, ultima resposta do transcript e `--model` do processo sao OBSERVADOS: nao garantem o modelo do proximo prompt (apos `/model`). `ANTHROPIC_MODEL`, settings do Claude e `config.model` sao DECLARADOS. Fora do caso comprovado, o gate usa o PIOR CASO do catalogo suportado (rotulado, nao e preco comprovado nem teto: modelo fora do catalogo nao e coberto) e a aprovacao fica presa a esse estado. `trustConfiguredModel:true` no config aceita um modelo observado/declarado consistente como efetivo (decisao do usuario), exceto quando o transcript registra um `/model` depois da ultima resposta (troca pendente: volta ao pior caso). Exemplo de config: `{"model":"claude-sonnet-5.5","limitUsd":5}`. Historico: com 5+ sessoes do mesmo modelo na pasta de transcripts do projeto, a previa usa o consumo real.
   Instalacao: copie `adapters/claude-code/settings.example.json` ajustando o caminho. O `onFailure:"block"` do UserPromptSubmit e obrigatorio para o gate: sem ele (ou com `continue`) crash, node ausente ou timeout do hook deixam o prompt chegar ao modelo (reproduzido; `npm run e2e:claude-failure`). Sem limite configurado o hook e so informativo.
4. OpenCode: `.opencode/plugins/precost.js` reexportando `adapters/opencode/index.js`, opcoes `limitUsd`, `models`, `ttlMin`. So OpenCode 1.19.6 (outra versao bloqueia, salvo `allowUnverifiedVersion`).
5. Comandos digitados no prompt (nao chegam ao modelo): `precost estimate <tarefa>`, `precost last`, `precost approve CODIGO`, `precost revoke CODIGO|all`. No Claude Code 2.1.332 em modo `claude -p` o texto aparece na saida ("UserPromptSubmit operation blocked by hook: ..."), verificado com Claude Code real; a TUI interativa tambem foi verificada (`npm run e2e:claude-tui`). No OpenCode o cliente recebe erro generico; na TUI real do OpenCode 1.19.6 o texto de bloqueio aparece numa caixa de erro (`npm run e2e:opencode-tui`, captura em docs/evidence/opencode-tui-pty-capture.txt); ciclo approve/reenvio/uso unico testado na TUI com provedor falso local. Trate o terminal como canal confiavel e os comandos no prompt como conveniencia nao comprovada no OpenCode.

## Limites (resumo; detalhes em docs/CAPACIDADES.md)
- E estimativa: tokens = chars/4 (x1.3 nos observados para Claude 4.7+) + 8k de sistema (premissa). Nao e custo conhecido.
- Faixa alta = P75/cenario grande, nao teto. O gate age antes do prompt; nao limita gasto durante a tarefa nem laços longos.
- OpenCode nao tem previa automatica antes do modelo; este plugin calcula dentro de `chat.message`. O bloqueio por throw e comportamento nao documentado (versao fixada, falha fechada).
- Gate contra gasto acidental, nao contra agente com shell no mesmo usuario (estado e arquivo local).
- Precos: Gemini via cloud.google.com/vertex-ai/generative-ai/pricing, Claude via platform.claude.com/docs/en/about-claude/pricing, lidos em 25/nov/2026. Carbon/Argon: bruto inferido. Nao modelados: Batch, Priority, Fast mode, residencia de dados.
- Historico: so sessoes do mesmo modelo e projeto, minimo 5. Semantica dos tokens validada com eventos/transcripts reais de OpenCode e Claude Code contra provedores FALSOS (sem fatura real): `input` exclui o cache. Comparacao com fatura real ainda nao feita.
- Premissa de sistema: 8k tokens no OpenCode e 13k no Claude Code, a partir do tamanho medido do corpo da requisicao (32,6 KB e 48,9 KB para um prompt de 3 a 9 caracteres) convertido por chars/4; nao e contagem de tokens do provedor.

## Licenca

MIT. Veja [LICENSE](LICENSE). Copyright (c) 2026 Glauber Portella.

## Idioma das mensagens

As mensagens da propria ferramenta (CLI, hook do Claude Code, plugin do OpenCode) saem em **ingles por padrao**. Para portugues, coloque `"lang": "pt"` no config (ou a opcao `lang` do plugin OpenCode), ou defina `PRECOST_LANG=pt`. O valor do config vence a variavel de ambiente. So o texto muda: comandos (`precost approve CODIGO`, `precost revoke`, `precost last`, `precost estimate`), codigos de aprovacao, chaves do config e o comportamento do gate sao os mesmos nos dois idiomas, e os testes cobrem os dois. As imagens da documentacao mostram a saida real em ingles.
