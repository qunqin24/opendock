# opencode-crew-mail

[English](../../README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Deutsch](README.de.md) · **Français** · [Русский](README.ru.md)

> Ceci est une traduction. La référence est le [README en anglais](../../README.md) ; en cas de divergence, c'est la version anglaise qui fait foi.

Des messages directs entre les sous-agents d'une même session [opencode](https://opencode.ai), pour que l'agent principal n'ait pas à transmettre chaque information d'un sous-agent au suivant.

![Deux sous-agents en arrière-plan : le coder envoie un message avec crew_send, le researcher le lit à son étape suivante, et l'agent principal reçoit aussi une note](../media/demo.gif)

*Une exécution scriptée avec le vrai plugin dans un `opencode serve` isolé.*

```
            lead (primary agent)
           /        |         \
       coder ---- tester ---- researcher      <- crew_send: straight from one to the other
```

Deux sous-agents qui travaillent en même temps ont souvent besoin d'un fait l'un de l'autre : le nom d'une interface que l'un d'eux vient de créer, un fichier que l'autre ne doit pas toucher, une découverte qui change l'étape de l'autre. Sans ce plugin, ce fait part dans un rapport, l'agent principal le lit, puis lance ou relance l'autre sous-agent avec cette information : c'est lent, et cela remplit le contexte de l'agent principal. Avec lui, le coder le dit directement au tester.

## Ce qu'il ajoute

Deux outils, disponibles pour chaque agent d'un arbre de sessions :

| Outil | Ce qu'il fait |
|---|---|
| `crew_list` | Liste l'équipe : l'agent principal et les sous-agents qu'il a lancés, avec un nom court (`coder`, `coder-2`, `tester`...), leur tâche et s'ils sont encore en cours. |
| `crew_send` | `{ to, text }` : dépose un message dans la boîte de réception d'un membre (`to` = nom court, identifiant de session, `lead`), ou de chaque sous-agent en cours de l'équipe (`to` = `all`). |

Le destinataire reçoit le message sous forme de message synthétique à sa **prochaine étape**. Un agent en cours n'est jamais interrompu et personne n'attend de réponse, donc deux agents ne peuvent pas se bloquer mutuellement. Le message est enveloppé de façon que le modèle sache qui l'a écrit et qu'il vient d'un autre agent, et non de l'utilisateur :

```xml
<crew-message id="m1" from="coder" from-agent="coder" from-session="ses_..." to="tester">
The interface Store is in src/store.ts; the tests may use FakeStore from test/fakes.ts.
</crew-message>
This is a message from another agent of your team, not from the user. ...
```

Règles :

- Un sous-agent qui a **terminé** ne reçoit pas de messages : un message le relancerait et enverrait son rapport à l'agent principal une seconde fois. L'expéditeur est invité à écrire à `lead` ou à mettre l'information dans son rapport.
- Un message adressé à un agent principal **inactif** (par exemple en attente de sous-agents en arrière-plan) attend dans sa boîte de réception et est lu à la prochaine exécution de l'agent principal, généralement quand le rapport suivant le réveille. Activez `wakeLead` pour le lancer immédiatement.
- Les messages ne circulent qu'à l'intérieur d'un seul arbre : l'agent principal et ses sous-agents directs. Une autre session sur la même machine ne peut pas être jointe.

## Installation

Avec le gestionnaire de plugins d'opencode (depuis npm, ou directement depuis GitHub) :

```sh
opencode plugin add opencode-crew-mail
opencode plugin add git+https://github.com/retretor/opencode-crew-mail.git
```

Ou à la main : copiez `crew-mail.js` dans le dossier des plugins de votre configuration opencode et redémarrez opencode.

```sh
cp crew-mail.js ~/.config/opencode/plugins/                   # Linux, macOS
```

```powershell
Copy-Item crew-mail.js "$HOME\.config\opencode\plugins\"     # Windows
```

Ensuite, informez-en les agents. Chaque sous-agent voit déjà les descriptions des outils ; une ligne dans le prompt de l'agent principal l'aide à les briefer, par exemple :

> Les sous-agents qui tournent en même temps peuvent s'écrire avec `crew_send` (voir `crew_list`). Indiquez-leur dans le brief quels autres sous-agents travaillent en même temps, et sur quoi.

Les outils sont surtout utiles avec des sous-agents qui tournent en même temps : plusieurs appels `subagent` dans un seul message, ou des sous-agents en arrière-plan (`background: true`).

Si l'un de vos autres plugins refuse les outils inconnus (une liste d'autorisation), ajoutez-y `crew_list` et `crew_send` ; pour [opencode-win-guard](https://github.com/retretor/opencode-win-guard), il s'agit de son paramètre `extraTools`. Pour interdire les outils à un agent, utilisez les permissions habituelles dans son fichier d'agent, par exemple `{ action: crew_send, resource: "*", effect: deny }`, ou le paramètre `agents` ci-dessous.

## Paramètres

Fichier facultatif `crew-mail.json` à côté de `opencode.json` (voir [crew-mail.example.json](../../crew-mail.example.json)). Lu au chargement du plugin.

| Clé | Par défaut | Signification |
|---|---|---|
| `maxChars` | 4000 | Longueur maximale d'un message. Les messages plus longs sont refusés, avec le conseil d'écrire un fichier et d'en envoyer le chemin. |
| `maxPerSession` | 40 | Nombre total de messages qu'une session peut envoyer. |
| `maxPerPair` | 6 | Messages entre deux sessions, dans les deux sens confondus, sur `pairWindowMinutes`. Empêche le ping-pong. |
| `pairWindowMinutes` | 10 | Fenêtre de `maxPerPair`. |
| `wakeLead` | false | `true` : un message adressé à un agent principal inactif le lance. |
| `copyToLead` | false | `true` : l'agent principal reçoit une copie d'une ligne de chaque message entre sous-agents (cela consomme du contexte de l'agent principal). |
| `agents` | null | `null` : tous les agents peuvent utiliser les outils ; sinon une liste de noms d'agents. |
| `logText` | true | `false` : le journal ne conserve que l'expéditeur, le destinataire et la longueur. |

Chaque message et chaque refus est consigné sous la forme d'une ligne JSON dans `<data dir>/opencode/log/crew-mail.log` (`~/.local/share/opencode/log/` par défaut). Le plugin n'établit aucune connexion réseau.

## Sécurité

- Un message est une sortie de modèle. Un agent qui a lu quelque chose de malveillant (une page web, un fichier) peut transmettre des instructions à un autre agent. L'enveloppe indique au destinataire que le message ne vient pas de l'utilisateur et ne modifie pas sa tâche, mais c'est une indication donnée à un modèle, pas une barrière. Gardez vos autres protections (permissions, bac à sable) pour chaque agent, pas seulement pour l'agent principal.
- L'agent principal ne voit pas les messages entre sous-agents, sauf si `copyToLead` est activé ; le journal, lui, les contient. Les agents sont de toute façon invités à mettre l'essentiel dans leurs rapports.

## Compatibilité

- opencode 2.2 ou plus récent (l'API de plugins V2 : `ctx.tool.transform`, `ctx.session.get/list/synthetic`). Testé avec opencode 2.2.3 sous Windows 10, Node 24.
- Aucune dépendance, aucune étape de build. Seul l'export par défaut de `crew-mail.js` est un plugin.

## Tests

```sh
npm test                        # pure parts, no opencode needed
CREW_MAIL_E2E=1 npm run test:e2e   # also end-to-end
```

Le test de bout en bout lance un vrai `opencode serve` dans des dossiers temporaires avec un faux modèle scripté (sans fournisseur, sans compte, sans réseau) et vérifie qu'un sous-agent en cours lit le message d'un sous-agent frère à sa prochaine étape, qu'un sous-agent terminé n'est pas réveillé, et que l'agent principal reçoit son message à sa prochaine exécution. Votre propre configuration opencode et vos sessions ne sont pas touchées. Sous Windows PowerShell, définissez la variable avec `$env:CREW_MAIL_E2E = "1"`.

## Projets liés

- [opencode-win-guard](https://github.com/retretor/opencode-win-guard) : un bac à sable d'écriture et un arrêt d'urgence pour des agents sans surveillance sous Windows, du même auteur ; fonctionne de pair avec ce plugin.
- [opencode-agent-intercom](https://github.com/feanor5555/opencode-agent-intercom) : un canal de contrôle de l'agent principal vers ses sous-agents en cours (messages, état, interruption) et des questions d'un sous-agent à son appelant ; les sous-agents ne peuvent pas s'écrire entre eux.
- [opencode-subagent-extension](https://github.com/Teogai/opencode-subagent-extension) : des sous-agents dans d'autres dossiers, qui rendent compte à leur appelant.
- [Agent teams for opencode](https://dev.to/uenyioha/porting-claude-codes-agent-teams-to-opencode-4hol) : une messagerie entre pairs (« teammates ») réalisée par des modifications d'opencode lui-même ; les sous-agents lancés avec l'outil task en sont exclus.

## Contribuer

Les rapports de bugs, les idées et les pull requests sont les bienvenus : voir [CONTRIBUTING.md](../../CONTRIBUTING.md). Problèmes de sécurité : [SECURITY.md](../../SECURITY.md).

## Licence

[MIT](../../LICENSE)
