# opencode-task-timer

OpenCode-2-TUI-Plugin: Laufzeiten je Agentenaufgabe in der Seitenleiste.

Misst, wie lange der Agent für jede Aufgabe braucht, und zeigt die Dauern als Block in der TUI-Seitenleiste. Typischer Anwendungsfall: die Dauer messen, die ein LLM braucht, um eine Aufgabe abzuschließen.

```
Durations
    35s Zweite Aufgabe mit Fehler
    1m 22s Seitenleisten-Probe · 20s waiting
2 tasks, 1m 57s, Ø 59s
```

- Die Uhr startet, wenn der Agent mit einer Aufgabe beginnt.
- Die Uhr stoppt, wenn er fertig ist und du wieder gefragt wirst.
- Die Zeilen stehen in der Seitenleiste, neueste oben.

## Installation

Über npm:

```
opencode plugin add opencode-task-timer
```

Oder direkt vom Repository:

```
opencode plugin add github:emelpe78/opencode-task-timer#v0.1.11
```

Danach OpenCode neu starten. Der Block erscheint in der Seitenleiste, sobald in der Sitzung die erste Aufgabe gelaufen ist. Eine Sitzung ohne Aufgaben zeigt nichts.

## Was gemessen wird

Der vollständige Messvertrag steht in [README-Messung](docs/measurement.md). Die Kurzfassung:

- Gemessen wird ein Agentenlauf, nicht ein Prompt.
- Ein `steer`-Prompt und die Fortsetzung nach einer Kompaktierung verlängern die laufende Aufgabe. Ein `queue`-Prompt gehört zur nächsten.
- Subagenten werden nicht separat gezählt, ihre Zeit steckt in der Hauptlaufzeit.
- Warten auf deine Freigabe zählt zur Laufzeit und wird beim Abschluss zusätzlich ausgewiesen.
- Titel ist die erste Zeile deines Prompts, auf 40 Zeichen gekürzt.

## Befehle

| Befehl           | Wirkung                                     |
| ---------------- | ------------------------------------------- |
| `/ott-reset`     | Löscht die Laufzeiten der aktuellen Sitzung |
| `/ott-reset-all` | Löscht alle gespeicherten Laufzeiten        |

Beide stehen auch in der Befehlspalette und fragen vor dem Löschen nach.

## Anzeige

- Höchstens zehn Zeilen, neueste oben.
- Dauer als `42s`, `1m 23s`, ab einer Stunde `1h 02m`.
- Status nur bei Abweichung: `error`, `aborted`, `superseded`, `ended`, `inactive`, `clock skew`.
- Der laufende Eintrag tickt sekündlich und zeigt `waiting for you`, wenn er auf dich wartet.
- Summenzeile über alle abgeschlossenen Aufgaben der Sitzung, englisch.
- Bei sehr schmaler Seitenleiste bleibt der Block aus, statt unleserlich zu werden.
- Rein lesend, kein Tastenkürzel.

## Speicherung

Der Zustand liegt im durabelen Store des Hosts und überlebt Neustarts. Er enthält je Aufgabe nur den gekürzten Titel und Zeitpunkte, niemals den vollen Prompt. Aufbewahrung: 30 Tage und höchstens 200 Sitzungen. Gelöschte Sitzungen verschwinden sofort.

## Entwicklung

```
npm install
npm run compile   # schreibt dist/tui.js und dist/measurement.js
npm test
```

Die Messlogik liegt in `src/measurement.ts` und ist frei von OpenCode-Abhängigkeiten, damit sie mit `node --test` prüfbar bleibt. `src/tui.tsx` verdrahtet nur die Ereignisse und rendert den Block. Was gemessen wird, steht in [README-Messung](docs/measurement.md); wie `CHANGELOG.md` aufgebaut und gepflegt wird, in [Changelog-Regeln](docs/changelog.md).

`dist/` ist eingecheckt, damit die Installation direkt aus dem Repository funktioniert.

## Fallstricke beim Veröffentlichen

- OpenCodes Solid-JSX-Transform überspringt Pfade mit `/node_modules/`. Ein veröffentlichtes Plugin liegt genau dort, deshalb braucht es ein vorgebautes `dist/`. Ohne das wird sein JSX als React-JSX übersetzt und der Ladevorgang scheitert an einem fehlenden `react`.
- `dist/` muss die Messlogik mitliefern. Ein Import auf `./measurement.ts` schlägt fehl, weil `src/` nicht im Paket liegt.
- `package.json` darf keines der Skripte `build`, `prepare`, `prepack`, `install`, `preinstall` oder `postinstall` nennen. npms pacote löst sonst bei einer Git-Abhängigkeit eine Vorbereitung aus, die hier scheitert. Der Build heißt deshalb `compile`.
- Die Imports auf `@opentui/solid` und `solid-js` werden auf die Laufzeitmodule des Hosts umgeschrieben (`opentui:runtime-module:…`), wie im offiziellen Plugin `oc-tps`.
- `context.keymap.layer` braucht `mode: "global"`, sonst landet die Ebene im Standardmodus `base`. Der greift nur bei leerem Eingabefeld, während Befehlspalette und Slash-Vervollständigung im globalen Modus laufen. Ohne `mode` sind die Befehle dort unsichtbar, obwohl `palette: true` und `slash` gesetzt sind.
- Ein Plugin in `~/.config/opencode/plugins/` ist ein Server-Plugin und bekommt keinen TUI-Kontext. `context.keymap` fehlt dort, der Ladevorgang scheitert mit `undefined is not an object`. TUI-Plugins gehören über `cli.json` oder `opencode plugin add` eingebunden.

## Voraussetzungen

- OpenCode 2.0 oder neuer (`@opencode/plugin` 2.x).
- Node 22.6 oder neuer, nur für die Tests.

## Lizenz

[MIT](LICENSE)
