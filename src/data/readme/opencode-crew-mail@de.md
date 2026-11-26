# opencode-crew-mail

[English](../../README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · **Deutsch** · [Français](README.fr.md) · [Русский](README.ru.md)

> Dies ist eine Übersetzung. Maßgeblich ist das [englische README](../../README.md); wo sie sich unterscheiden, gilt das englische.

Direkte Nachrichten zwischen den Subagenten einer [opencode](https://opencode.ai)-Sitzung, damit der Hauptagent nicht jede Information von einem Subagenten zum nächsten tragen muss.

![Zwei Hintergrund-Subagenten: der Coder schickt mit crew_send eine Nachricht, der Researcher liest sie bei seinem nächsten Schritt, und auch der Hauptagent bekommt eine Notiz](../media/demo.gif)

*Ein geskripteter Lauf gegen das echte Plugin in einem isolierten `opencode serve`.*

```
            lead (primary agent)
           /        |         \
       coder ---- tester ---- researcher      <- crew_send: straight from one to the other
```

Zwei Subagenten, die gleichzeitig arbeiten, brauchen oft eine einzelne Information voneinander: den Namen einer Schnittstelle, die einer von ihnen gerade angelegt hat, eine Datei, die der andere nicht anfassen darf, einen Befund, der den nächsten Schritt des anderen ändert. Ohne dieses Plugin landet diese Information in einem Bericht, der Hauptagent liest ihn und startet damit den anderen Subagenten oder setzt ihn fort: langsam, und es füllt den Kontext des Hauptagenten. Mit dem Plugin sagt der Coder es dem Tester direkt.

## Was das Plugin hinzufügt

Zwei Tools, verfügbar für jeden Agenten eines Sitzungsbaums:

| Tool | Was es tut |
|---|---|
| `crew_list` | Listet das Team auf: den Hauptagenten und die Subagenten, die er gestartet hat, mit einem Kurznamen (`coder`, `coder-2`, `tester`...), ihrer Aufgabe und ob sie noch laufen. |
| `crew_send` | `{ to, text }`: legt eine Nachricht in den Posteingang eines Mitglieds (`to` = Kurzname, Sitzungs-ID, `lead`) oder jedes laufenden Subagenten des Teams (`to` = `all`). |

Der Empfänger bekommt die Nachricht als synthetische Nachricht bei seinem **nächsten Schritt**. Ein laufender Agent wird nie unterbrochen, und niemand wartet auf eine Antwort, sodass sich zwei Agenten nicht gegenseitig blockieren können. Die Nachricht wird so verpackt, dass das Modell weiß, wer sie geschrieben hat und dass sie von einem anderen Agenten stammt, nicht vom Benutzer:

```xml
<crew-message id="m1" from="coder" from-agent="coder" from-session="ses_..." to="tester">
The interface Store is in src/store.ts; the tests may use FakeStore from test/fakes.ts.
</crew-message>
This is a message from another agent of your team, not from the user. ...
```

Regeln:

- Ein Subagent, der **fertig** ist, bekommt keine Nachrichten: Eine Nachricht würde ihn erneut starten und seinen Bericht ein zweites Mal an den Hauptagenten schicken. Dem Absender wird gesagt, er solle an `lead` schreiben oder es in seinen Bericht aufnehmen.
- Eine Nachricht an einen Hauptagenten, der **untätig** ist (zum Beispiel weil er auf Hintergrund-Subagenten wartet), wartet in seinem Posteingang und wird gelesen, wenn der Hauptagent das nächste Mal läuft, meist wenn ihn der nächste Bericht weckt. Setze `wakeLead`, um ihn sofort zu starten.
- Nachrichten bleiben innerhalb eines Baums: der Hauptagent und seine direkten Subagenten. Eine andere Sitzung auf demselben Rechner ist nicht erreichbar.

## Installation

Mit dem Plugin-Manager von opencode (von npm oder direkt von GitHub):

```sh
opencode plugin add opencode-crew-mail
opencode plugin add git+https://github.com/retretor/opencode-crew-mail.git
```

Oder von Hand: Kopiere `crew-mail.js` in den Plugin-Ordner deiner opencode-Konfiguration und starte opencode neu.

```sh
cp crew-mail.js ~/.config/opencode/plugins/                   # Linux, macOS
```

```powershell
Copy-Item crew-mail.js "$HOME\.config\opencode\plugins\"     # Windows
```

Dann erzähl den Agenten davon. Jeder Subagent sieht bereits die Tool-Beschreibungen; eine Zeile im Prompt des Hauptagenten hilft ihm, sie entsprechend einzuweisen, zum Beispiel:

> Subagenten, die gleichzeitig laufen, können einander mit `crew_send` schreiben (siehe `crew_list`). Sag ihnen in der Einweisung, welche anderen gleichzeitig arbeiten und woran.

Am nützlichsten sind die Tools bei Subagenten, die gleichzeitig laufen: mehrere `subagent`-Aufrufe in einer Nachricht oder Hintergrund-Subagenten (`background: true`).

Wenn ein anderes deiner Plugins unbekannte Tools ablehnt (eine Allowlist), füge dort `crew_list` und `crew_send` hinzu; bei [opencode-win-guard](https://github.com/retretor/opencode-win-guard) ist das die Einstellung `extraTools`. Um einem Agenten die Tools zu verweigern, nutze die üblichen Berechtigungen in seiner Agent-Datei, z. B. `{ action: crew_send, resource: "*", effect: deny }`, oder die Einstellung `agents` weiter unten.

## Einstellungen

Optionale Datei `crew-mail.json` neben `opencode.json` (siehe [crew-mail.example.json](../../crew-mail.example.json)). Sie wird gelesen, wenn das Plugin geladen wird.

| Schlüssel | Standard | Bedeutung |
|---|---|---|
| `maxChars` | 4000 | Längste erlaubte Nachricht. Längere werden abgelehnt, mit dem Hinweis, eine Datei zu schreiben und ihren Pfad zu schicken. |
| `maxPerSession` | 40 | Nachrichten, die eine Sitzung insgesamt senden darf. |
| `maxPerPair` | 6 | Nachrichten zwischen zwei Sitzungen, beide Richtungen zusammen, innerhalb von `pairWindowMinutes`. Verhindert Ping-Pong. |
| `pairWindowMinutes` | 10 | Zeitfenster von `maxPerPair`. |
| `wakeLead` | false | `true`: Eine Nachricht an einen untätigen Hauptagenten startet ihn. |
| `copyToLead` | false | `true`: Der Hauptagent bekommt eine einzeilige Kopie jeder Nachricht zwischen Subagenten (kostet Kontext des Hauptagenten). |
| `agents` | null | `null`: Alle Agenten dürfen die Tools benutzen; oder eine Liste von Agentennamen. |
| `logText` | true | `false`: Das Log enthält nur Absender, Empfänger und Länge. |

Jede Nachricht und jede Ablehnung wird als eine JSON-Zeile in `<data dir>/opencode/log/crew-mail.log` protokolliert (standardmäßig `~/.local/share/opencode/log/`). Das Plugin baut keine Netzwerkverbindungen auf.

## Sicherheit

- Eine Nachricht ist Modellausgabe. Ein Agent, der etwas Bösartiges gelesen hat (eine Webseite, eine Datei), kann Anweisungen an einen anderen Agenten weitergeben. Die Hülle sagt dem Empfänger, dass die Nachricht nicht vom Benutzer stammt und seine Aufgabe nicht ändert, aber das ist ein Hinweis an ein Modell, keine Barriere. Behalte deine übrigen Schutzmaßnahmen (Berechtigungen, Sandbox) für jeden Agenten bei, nicht nur für den Hauptagenten.
- Der Hauptagent sieht die Nachrichten zwischen Subagenten nicht, solange `copyToLead` nicht eingeschaltet ist; das Log sieht sie. Die Agenten werden ohnehin angewiesen, das Wichtige in ihre Berichte aufzunehmen.

## Kompatibilität

- opencode 2.2 oder neuer (die V2-Plugin-API: `ctx.tool.transform`, `ctx.session.get/list/synthetic`). Getestet mit opencode 2.2.3 unter Windows 10, Node 24.
- Keine Abhängigkeiten, kein Build-Schritt. Nur der Default-Export von `crew-mail.js` ist ein Plugin.

## Tests

```sh
npm test                        # pure parts, no opencode needed
CREW_MAIL_E2E=1 npm run test:e2e   # also end-to-end
```

Der End-to-End-Test startet ein echtes `opencode serve` in temporären Ordnern mit einem geskripteten Fake-Modell (kein Provider, kein Konto, kein Netzwerk) und prüft, dass ein laufender Subagent die Nachricht eines Geschwister-Agenten bei seinem nächsten Schritt liest, dass ein fertiger nicht geweckt wird und dass der Hauptagent seine Nachricht bei seinem nächsten Lauf bekommt. Deine eigene opencode-Konfiguration und deine Sitzungen werden nicht angerührt. In Windows PowerShell setzt du die Variable mit `$env:CREW_MAIL_E2E = "1"`.

## Verwandte Projekte

- [opencode-win-guard](https://github.com/retretor/opencode-win-guard): eine Schreib-Sandbox und ein Not-Aus für unbeaufsichtigte Agenten unter Windows, vom selben Autor; funktioniert zusammen mit diesem Plugin.
- [opencode-agent-intercom](https://github.com/feanor5555/opencode-agent-intercom): ein Steuerkanal vom Hauptagenten zu seinen laufenden Subagenten (Nachrichten, Status, Abbruch) und Fragen eines Subagenten an seinen Aufrufer; Subagenten können einander nicht schreiben.
- [opencode-subagent-extension](https://github.com/Teogai/opencode-subagent-extension): Subagenten in anderen Ordnern, die ihrem Aufrufer Bericht erstatten.
- [Agent teams for opencode](https://dev.to/uenyioha/porting-claude-codes-agent-teams-to-opencode-4hol): Nachrichten unter gleichrangigen „Teammates“ als Änderungen an opencode selbst; mit dem task-Tool gestartete Subagenten sind ausgenommen.

## Mitwirken

Fehlerberichte, Ideen und Pull Requests sind willkommen: siehe [CONTRIBUTING.md](../../CONTRIBUTING.md). Sicherheitsprobleme: [SECURITY.md](../../SECURITY.md).

## Lizenz

[MIT](../../LICENSE)
