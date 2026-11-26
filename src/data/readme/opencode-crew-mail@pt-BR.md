# opencode-crew-mail

[English](../../README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · **Português (Brasil)** · [Deutsch](README.de.md) · [Français](README.fr.md) · [Русский](README.ru.md)

> Esta é uma tradução. A referência é o [README em inglês](../../README.md); onde houver divergência, vale o inglês.

Mensagens diretas entre os subagentes de uma mesma sessão do [opencode](https://opencode.ai), para que o agente principal não precise levar cada informação de um subagente para o outro.

![Dois subagentes em segundo plano: o coder envia uma mensagem com crew_send, o researcher a lê no seu próximo passo, e o agente principal também recebe um aviso](../media/demo.gif)

*Uma execução roteirizada com o plugin real em um `opencode serve` isolado.*

```
            lead (primary agent)
           /        |         \
       coder ---- tester ---- researcher      <- crew_send: straight from one to the other
```

Dois subagentes que trabalham ao mesmo tempo muitas vezes precisam de um dado um do outro: o nome de uma interface que um deles acabou de criar, um arquivo que o outro não deve tocar, uma descoberta que muda o passo do outro. Sem este plugin, esse dado vai para um relatório, o agente principal o lê e inicia ou continua o outro subagente com ele: é lento e enche o contexto do agente principal. Com ele, o coder avisa o tester diretamente.

## O que ele adiciona

Duas ferramentas, disponíveis para todos os agentes de uma árvore de sessões:

| Ferramenta | O que faz |
|---|---|
| `crew_list` | Lista a equipe: o agente principal e os subagentes que ele iniciou, com um nome curto (`coder`, `coder-2`, `tester`...), a tarefa de cada um e se ainda estão em execução. |
| `crew_send` | `{ to, text }`: coloca uma mensagem na caixa de entrada de um membro (`to` = nome curto, id da sessão, `lead`) ou de todos os subagentes da equipe em execução (`to` = `all`). |

O destinatário recebe a mensagem como uma mensagem sintética no seu **próximo passo**. Um agente em execução nunca é interrompido, e ninguém espera por resposta, então dois agentes não conseguem bloquear um ao outro. A mensagem vem envolvida de forma que o modelo saiba quem a escreveu e que ela vem de outro agente, não do usuário:

```xml
<crew-message id="m1" from="coder" from-agent="coder" from-session="ses_..." to="tester">
The interface Store is in src/store.ts; the tests may use FakeStore from test/fakes.ts.
</crew-message>
This is a message from another agent of your team, not from the user. ...
```

Regras:

- Um subagente que já **terminou** não recebe mensagens: uma mensagem o iniciaria de novo e enviaria o relatório dele ao agente principal uma segunda vez. O remetente é orientado a escrever para `lead` ou a colocar a informação no próprio relatório.
- Uma mensagem para um agente principal **ocioso** (por exemplo, esperando subagentes em segundo plano) fica na caixa de entrada dele e é lida na próxima vez que ele rodar, geralmente quando o próximo relatório o acorda. Ative `wakeLead` para iniciá-lo na hora.
- As mensagens circulam só dentro de uma árvore: o agente principal e seus subagentes diretos. Outra sessão na mesma máquina não pode ser alcançada.

## Instalação

Com o gerenciador de plugins do opencode (a partir do npm, ou direto do GitHub):

```sh
opencode plugin add opencode-crew-mail
opencode plugin add git+https://github.com/retretor/opencode-crew-mail.git
```

Ou manualmente: copie `crew-mail.js` para a pasta de plugins da sua configuração do opencode e reinicie o opencode.

```sh
cp crew-mail.js ~/.config/opencode/plugins/                   # Linux, macOS
```

```powershell
Copy-Item crew-mail.js "$HOME\.config\opencode\plugins\"     # Windows
```

Depois, conte aos agentes sobre ele. Todo subagente já vê as descrições das ferramentas; uma linha no prompt do agente principal ajuda-o a orientá-los, por exemplo:

> Subagentes que rodam ao mesmo tempo podem escrever uns para os outros com `crew_send` (veja `crew_list`). Diga a eles, nas instruções, quais outros trabalham ao mesmo tempo e em quê.

As ferramentas são mais úteis com subagentes que rodam ao mesmo tempo: várias chamadas de `subagent` em uma mesma mensagem, ou subagentes em segundo plano (`background: true`).

Se outro plugin seu recusa ferramentas desconhecidas (uma allowlist), adicione `crew_list` e `crew_send` a ela; no [opencode-win-guard](https://github.com/retretor/opencode-win-guard), essa é a configuração `extraTools`. Para negar as ferramentas a um agente, use as permissões de sempre no arquivo do agente, por exemplo `{ action: crew_send, resource: "*", effect: deny }`, ou a configuração `agents` abaixo.

## Configurações

Arquivo opcional `crew-mail.json` ao lado do `opencode.json` (veja [crew-mail.example.json](../../crew-mail.example.json)). É lido quando o plugin é carregado.

| Chave | Padrão | Significado |
|---|---|---|
| `maxChars` | 4000 | Tamanho máximo de uma mensagem. As mais longas são recusadas com a sugestão de escrever um arquivo e enviar o caminho dele. |
| `maxPerSession` | 40 | Total de mensagens que uma sessão pode enviar. |
| `maxPerPair` | 6 | Mensagens entre duas sessões, somando as duas direções, dentro de `pairWindowMinutes`. Evita pingue-pongue. |
| `pairWindowMinutes` | 10 | Janela de `maxPerPair`. |
| `wakeLead` | false | `true`: uma mensagem para um agente principal ocioso o inicia. |
| `copyToLead` | false | `true`: o agente principal recebe uma cópia de uma linha de cada mensagem entre subagentes (consome contexto do agente principal). |
| `agents` | null | `null`: todos os agentes podem usar as ferramentas; ou uma lista de nomes de agentes. |
| `logText` | true | `false`: o log guarda apenas remetente, destinatário e tamanho. |

Cada mensagem e cada recusa é registrada como uma linha JSON em `<data dir>/opencode/log/crew-mail.log` (`~/.local/share/opencode/log/` por padrão). O plugin não faz conexões de rede.

## Segurança

- Uma mensagem é saída de um modelo. Um agente que leu algo malicioso (uma página da web, um arquivo) pode repassar instruções a outro agente. O envelope avisa o destinatário que a mensagem não é do usuário e não muda a tarefa dele, mas isso é uma dica para um modelo, não uma barreira. Mantenha suas outras proteções (permissões, sandbox) para todos os agentes, não só para o agente principal.
- O agente principal não vê as mensagens entre subagentes, a menos que `copyToLead` esteja ativado; o log vê. De qualquer forma, os agentes são orientados a colocar o que importa nos seus relatórios.

## Compatibilidade

- opencode 2.2 ou mais recente (a API de plugins V2: `ctx.tool.transform`, `ctx.session.get/list/synthetic`). Testado com opencode 2.2.3 no Windows 10, Node 24.
- Sem dependências, sem etapa de build. Só o export padrão de `crew-mail.js` é um plugin.

## Testes

```sh
npm test                        # pure parts, no opencode needed
CREW_MAIL_E2E=1 npm run test:e2e   # also end-to-end
```

O teste de ponta a ponta inicia um `opencode serve` real em pastas temporárias com um modelo falso roteirizado (sem provedor, sem conta, sem rede) e verifica que um subagente em execução lê a mensagem de um irmão no seu próximo passo, que um subagente que já terminou não é acordado e que o agente principal recebe a mensagem dele na próxima execução. Sua própria configuração e suas sessões do opencode não são tocadas. No Windows PowerShell, defina a variável com `$env:CREW_MAIL_E2E = "1"`.

## Projetos relacionados

- [opencode-win-guard](https://github.com/retretor/opencode-win-guard): uma sandbox de escrita e parada de emergência para agentes sem supervisão no Windows, do mesmo autor; funciona junto com este plugin.
- [opencode-agent-intercom](https://github.com/feanor5555/opencode-agent-intercom): um canal de controle do agente principal para os subagentes em execução (mensagens, status, interrupção) e perguntas de um subagente para quem o chamou; os subagentes não podem escrever uns para os outros.
- [opencode-subagent-extension](https://github.com/Teogai/opencode-subagent-extension): subagentes em outras pastas que reportam de volta a quem os chamou.
- [Agent teams for opencode](https://dev.to/uenyioha/porting-claude-codes-agent-teams-to-opencode-4hol): mensagens entre "colegas de equipe" como alterações no próprio opencode; subagentes iniciados com a ferramenta task ficam de fora.

## Contribuindo

Relatos de bugs, ideias e pull requests são bem-vindos: veja [CONTRIBUTING.md](../../CONTRIBUTING.md). Problemas de segurança: [SECURITY.md](../../SECURITY.md).

## Licença

[MIT](../../LICENSE)
