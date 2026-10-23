# OpenCode Design System

[![npm-Version](https://img.shields.io/npm/v/opencode-design-system)](https://www.npmjs.com/package/opencode-design-system)
[![MIT-Lizenz](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/BraveOtter/opencode-design-system/blob/master/LICENSE)
[![OpenCode v2](https://img.shields.io/badge/OpenCode-v2-6f42c1)](https://opencode.ai/v2/docs/)

**Ein kollaboratives OpenCode-v2-Plugin zum Erstellen und Weiterentwickeln portabler, frameworkneutraler Designsysteme, denen KI-Agenten zuverlässig folgen können.**

[English](https://github.com/BraveOtter/opencode-design-system/blob/master/README.md) · [Español](https://github.com/BraveOtter/opencode-design-system/blob/master/README.es.md) · [Português (Brasil)](https://github.com/BraveOtter/opencode-design-system/blob/master/README.pt-BR.md) · [Deutsch](https://github.com/BraveOtter/opencode-design-system/blob/master/README.de.md) · [Français](https://github.com/BraveOtter/opencode-design-system/blob/master/README.fr.md) · [Italiano](https://github.com/BraveOtter/opencode-design-system/blob/master/README.it.md) · [简体中文](https://github.com/BraveOtter/opencode-design-system/blob/master/README.zh-CN.md) · [日本語](https://github.com/BraveOtter/opencode-design-system/blob/master/README.ja.md)

> **Hinweis:** Dies ist ein unabhängiges Community-Projekt. Es wird nicht vom OpenCode-Team entwickelt und ist in keiner Weise mit OpenCode verbunden.

Das Designsystem wird zum dauerhaften visuellen Gedächtnis eines Projekts: strukturierte **Markdown- und JSON-Dateien** für semantische Tokens, explizite Präferenzen, Designentscheidungen, Komponenten, Patterns und Screen-Spezifikationen. Eine interaktive HTML-Vorschau wird aus diesen Quellen generiert und ist niemals eine zweite Quelle der Wahrheit.

## Warum dieses Plugin?

- **Beginne mit einem Gespräch statt mit einem Fragebogen.** Kläre nur noch offene, wichtige Entscheidungen zur visuellen Identität und halte die Präferenzen der Nutzerinnen und Nutzer ausdrücklich fest.
- **Dokumentiere den Ist-Zustand.** Eine begrenzte, schreibgeschützte Analyse hilft dabei, eine bestehende UI zu formalisieren, ohne sie stillschweigend neu zu gestalten.
- **Gib Agenten den relevanten Kontext.** Progressives Laden stellt die für eine UI-Aufgabe relevanten Tokens, Komponenten, Patterns und Leitlinien bereit, statt bei jedem Prompt das gesamte System einzufügen.
- **Entwickle das System kohärent weiter.** Verfolge Entscheidungen, Abhängigkeiten semantischer Tokens, betroffene Komponenten und Patterns, Status und Versionsänderungen des Designsystems.
- **Vermeide die Bindung an ein Framework.** Das maßgebliche Format besteht aus Markdown und JSON, nicht aus React, Vue, Tailwind oder einer generierten Vorschau.
- **Schütze Projektdateien.** Analyse und Prüfungen sind schreibgeschützt. Beim Erstellen wird ein vorhandenes `design-system/`-Verzeichnis nicht ersetzt; Inhalte in `AGENTS.md` außerhalb des vom Plugin verwalteten Blocks bleiben erhalten.

## Voraussetzungen

- [OpenCode v2](https://opencode.ai/v2/docs/)
- Node.js **22.19 oder neuer**

## Installation

### Das veröffentlichte npm-Paket installieren

Installiere es global mit der OpenCode-CLI:

```sh
opencode plugin add opencode-design-system
```

Um eine bestimmte npm-Version festzulegen, ersetze `<version>` durch die gewünschte Version:

```sh
opencode plugin add opencode-design-system@<version>
```

Alternativ kannst du es in `opencode.json` oder `opencode.jsonc` für ein Projekt konfigurieren:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-design-system"]
}
```

OpenCode lädt konfigurierte Plugins beim Start. Wenn das Plugin nicht angezeigt wird, starte OpenCode oder den OpenCode-Dienst neu.

### Direkt von GitHub installieren

Für die aktuelle Version des Standard-Branches:

```sh
opencode plugin add github:BraveOtter/opencode-design-system
```

Um eine markierte GitHub-Version festzulegen, ersetze `<tag>` durch den gewünschten Tag:

```sh
opencode plugin add github:BraveOtter/opencode-design-system#<tag>
```

### Einen lokalen Checkout verwenden

Klone das Repository, installiere die Entwicklungsabhängigkeiten und erstelle den Build:

```sh
npm install
npm run build
```

Verweise anschließend in OpenCode auf das Checkout-Verzeichnis (passe den relativen Pfad an dein Projekt an):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["../opencode-design-system"]
}
```

Das Repository enthält außerdem einen optionalen lokalen Test-Einstiegspunkt unter `plugins/local/index.js`. Er wird nicht automatisch geladen und ist nicht Teil des npm-Pakets.

## Erste Schritte

Erstelle ein System anhand einer visuellen Richtung:

```text
/design-system Ein ruhiger, kompakter Arbeitsbereich mit gedämpften Grüntönen, klaren Oberflächen und ohne Farbverläufe.
```

Wenn das Projekt bereits eine UI hat, bitte den Agenten zunächst, sie zu analysieren. Er erklärt seine Erkenntnisse und fragt, ob du die bestehende visuelle Identität dokumentieren oder neu beginnen möchtest, bevor etwas erstellt wird:

```text
/design-system Analysiere die UI dieser App und hilf mir, ihre bestehende visuelle Sprache zu dokumentieren.
```

Um einen Screen zu entwerfen, ohne das Plugin mit der Implementierung von UI-Code zu beauftragen:

```text
/design-screen Benutzerverwaltung mit Suche, Filtern, Einladungen und Leerzuständen.
```

Du kannst eine Screen-Spezifikation auch in natürlicher Sprache anfordern, ohne `/design-screen` aufzurufen. Wenn ein Manifest vorhanden ist, verweist das Plugin den Agenten auf die `AGENTS.md` des Projekts und die relevanten Designsystem-Leitlinien.

## Befehle

| Befehl | Funktion |
| --- | --- |
| `/design-system [idea]` | Gemeinsam ein System von Grund auf erstellen oder besprechen, wie eine bestehende UI dokumentiert werden kann. |
| `/design-system/update [change]` | Eine semantische, versionierte Änderung anwenden und abhängige Dokumentation ermitteln. |
| `/design-system/preview` | Die interaktive Vorschau aus den strukturierten Dateien neu generieren. |
| `/design-system/review` | Eine lokale Ansicht mit zwei Bereichen öffnen: Vorschau und aktuelle OpenCode-Konversation, inklusive kontextbezogener Elementauswahl. |
| `/design-system/check` | Schreibgeschützt und heuristisch nach möglichen Abweichungen zwischen UI-Stilen und dokumentierten Tokens suchen. |
| `/design-screen [screen]` | Eine umsetzungsreife Screen-Spezifikation speichern, ohne UI-Code der Anwendung zu schreiben. |

Das Plugin registriert außerdem die Tools `design_system_create`, `design_system_read`, `design_system_analyze`, `design_system_update`, `design_system_preview`, `design_system_check` und `design_system_screen_spec`, die der Agent bei Bedarf verwenden kann.

## Funktionsweise

### Sorgfältiger Workflow für bestehende Produkte

Das Tool `design_system_analyze` liest wahrscheinliche UI- und Stilquellen, erkannte Framework-Konfigurationen und deklarierte Abhängigkeiten. Es fasst Hinweise wie CSS-Variablen, Farben, Radien, Abstände, responsive Breakpoints und mögliche Komponenten zusammen. Die Analyse ist begrenzt, überspringt Abhängigkeits- und Build-Verzeichnisse, folgt keinen Symlinks und verändert keine gelesenen Dateien. Die Ergebnisse sind Hinweise, kein Beweis dafür, dass eine Abweichung ein Fehler ist.

Der Agent erläutert Unsicherheiten und fragt nach, bevor wichtige oder mehrdeutige visuelle Entscheidungen vereinheitlicht werden. Eine Analyse ist keine Erlaubnis, den Anwendungscode neu zu gestalten oder zu bearbeiten.

### Sicherer Umgang mit Projektdateien

Beim Erstellen wird ein neues `design-system/`-Verzeichnis angelegt und ausschließlich der vom Plugin verwaltete Block in der `AGENTS.md` im Projektstamm hinzugefügt oder aktualisiert. Wenn `design-system/` bereits Dateien enthält, wird das Erstellen abgebrochen, statt sie zu ersetzen. Aktualisierungen schreiben gezielt in Designsystem-Artefakte; die integrierten Analyse- und Prüfwerkzeuge bearbeiten niemals UI-Dateien der Anwendung.

Die verwalteten Hinweise in `AGENTS.md` sind portabel: Sie erklären OpenCode und anderen Coding-Agenten, wo sie die frameworkneutralen Quellen finden und wie sie für eine Aufgabe nur das Nötige laden. Das Plugin kopiert keine Agents, Befehle oder Skills in das Projekt.

### Eine portable Quelle der Wahrheit

Das generierte Verzeichnis sieht üblicherweise so aus:

```text
design-system/
├── README.md
├── manifest.json
├── tokens.json
├── preferences.json
├── FOUNDATIONS.md
├── AI-GUIDELINES.md
├── DECISIONS.md
├── CHANGELOG.md
├── schema/
├── components/
├── patterns/
├── screens/
├── preview/
│   └── index.html
└── tools/
    └── generate-preview.mjs

AGENTS.md  # Vorhandene Inhalte außerhalb des verwalteten Blocks bleiben erhalten.
```

Das Manifest indexiert Themes, Versionen, Dateien und die von jeder Komponente und jedem Pattern deklarierten Token-Referenzen. Systeme beginnen bei `0.1.0` mit der Schema-Version `1.0.0`; ihr Prüfstatus lautet `draft`, `review` oder `stable`.

Tokens verwenden semantische Pfade und können mehrere Themes definieren:

```json
{
  "$schema": "./schema/tokens.schema.json",
  "schemaVersion": "1.0.0",
  "themes": {
    "light": {
      "color": {
        "surface": { "base": "#f6f8f7", "raised": "#ffffff" },
        "text": { "primary": "#17211f", "secondary": "#65726d" },
        "accent": { "primary": "#276f55" }
      },
      "radius": { "control": "6px", "card": "8px" },
      "spacing": { "sm": "8px", "md": "16px" }
    }
  }
}
```

Das Vokabular lässt sich um Typografie, Layout, Elevation, Bewegung, Breakpoints, Fokus und Zustände erweitern. Komponenten beschreiben Zweck, Varianten, Tokens, Verhalten, Barrierefreiheit, Responsivität und Beziehungen. Patterns dokumentieren nützliche Kompositionen wie Formulare, Navigation, Filter, Tabellen und Leerzustände.

### Sinnvolle, versionierte Aktualisierungen

`/design-system/update` liest das Manifest und relevante Dokumente, bevor das System geändert wird. Eine semantische Token-Aktualisierung gilt standardmäßig für diesen Pfad in allen Themes; verwende `themes.<name>.` als Präfix für eine theme-spezifische Änderung. Die Aktualisierung dokumentiert die Begründung, ermittelt deklarierte Abhängigkeiten, aktualisiert relevante Dokumentation und generiert die Vorschau neu.

Die Auswirkung auf die Version des Designsystems richtet sich nach diesen Regeln:

- **PATCH** — kompatible Fehlerbehebungen oder Dokumentationsänderungen.
- **MINOR** — kompatible Ergänzungen, etwa ein neues Token, eine Komponente oder ein Pattern.
- **MAJOR** — Änderungen, die bestehende Designverträge beeinträchtigen können.

Diese Versionen gehören zum im Projekt generierten Designsystem, nicht zum npm-Plugin-Paket. Aktualisierte Systeme wechseln standardmäßig zurück zu `draft`, damit sie überprüft werden können.

## Integrierte Design-Skills

Das Plugin registriert drei angepasste Design-Skills intern über OpenCode v2. Bei der Erstellung oder Aktualisierung eines Designsystems, der Token-Auswahl und Screen-Spezifikationen arbeiten sie zusammen: visuelle Richtung, Produkt-Interface-Design und barrierebewusste Token-Entscheidungen. Sie ersetzen weder die frameworkneutrale Markdown-/JSON-Quelle des Projekts noch werden ihre `SKILL.md`-Dateien **in Nutzerprojekte geschrieben**.

### Skills anpassen

Mit der Plugin-Option `designSkills` kannst du alle integrierten Skills oder einzelne Skills deaktivieren oder nur ausgewählte IDs zulassen. Nicht angegebene Einträge bleiben aktiv. Setze `"designSkills": false`, um alle drei zu deaktivieren; ein Array aktiviert nur die aufgeführten IDs. Eigene Skills kannst du global unter `~/.config/opencode/skills/<deine-skill-id>/SKILL.md` hinzufügen. Deaktiviere den passenden integrierten Skill, wenn dein eigener ihn ersetzen soll. Zum Ändern eines integrierten Skills bearbeite `skills/<skill-ordner>/SKILL.md` in einem lokalen Plugin-Checkout oder Fork und lade diesen; Quellenangabe und Lizenz müssen erhalten bleiben. Vollständige Hinweise: [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

### Credits

- **Frontend Design** — Anthropic; Originalautoren Prithvi Rajasekaran und Alexander Bricken. [Quelle](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design/skills/frontend-design) · Apache-2.0.
- **Interface Design** — Dammyjay93 (Damola Akinleye). [Quelle](https://github.com/Dammyjay93/interface-design) · MIT.
- **Design System Auditor** — Community-Access; Copyright © Taylor Arndt. [Quelle](https://github.com/Community-Access/accessibility-agents/blob/main/skills/design-system-auditor/SKILL.md) · MIT.

## Interaktive Vorschau

`design-system/preview/index.html` wird aus Manifest, Tokens und Komponenten-/Pattern-Spezifikationen generiert. Sie enthält Token-Beispiele, Komponentenbeispiele, Theme-Wechsel bei mehreren Themes und interaktive Beispiele. Sichtbarer Tastaturfokus und `prefers-reduced-motion` werden unterstützt.

Mit `/design-system/review` öffnest du einen lokalen Review-Arbeitsbereich mit der interaktiven Vorschau links und derselben OpenCode-Sitzung rechts. Nachrichten aus dem rechten Bereich gehen an diese Sitzung; nach abgeschlossenen Gesprächsrunden wird die generierte Vorschau aktualisiert. Aktiviere **Element auswählen**, um dokumentierte Komponenten, Patterns oder semantische Token-Beispiele auszuwählen und bis zu acht geprüfte Referenzen an eine Nachricht anzuhängen. Referenzen verwenden Manifestnamen, Quellpfade und Token-Pfade — keine DOM-Selektoren — und werden vor dem Senden erneut geprüft, damit veraltete Auswahlen nicht unbemerkt ein anderes Element adressieren. Die eigenständige HTML-Datei bleibt verfügbar und funktioniert ohne diesen Arbeitsbereich. Der Review-Server bindet an einen zufälligen Port auf `127.0.0.1`, wird beim Entladen des Plugins beendet und gibt keine OpenCode-Zugangsdaten an den Browser weiter. Standardmäßig stellt der Befehl einen Link in die Konversation, statt automatisch einen Browser zu öffnen.

Um beim Ausführen des Review-Befehls automatisch den Systembrowser zu öffnen, konfiguriere diese Plugin-Option:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-design-system",
      "options": { "autoOpenReview": true }
    }
  ]
}
```

Generiere die Vorschau in OpenCode mit `/design-system/preview` neu oder führe den folgenden Befehl ohne Plugin im Projektstamm aus:

```sh
node design-system/tools/generate-preview.mjs
```

Der eigenständige Renderer hat keine externen Abhängigkeiten. Bearbeite die strukturierten Markdown- und JSON-Dateien — nicht das generierte HTML —, um das System zu ändern.

## Entwicklung und Tests

```sh
npm install
npm run typecheck
npm test
npm run build
```

Die Tests decken einen integrierten Ablauf in einem temporären Projekt ab, darunter schreibgeschützte Analysen, das Erstellen und Bewahren von Nutzerdateien, verwaltete `AGENTS.md`-Aktualisierungen, Screen-Spezifikationen, Token-Änderungen über mehrere Themes, Vorschauen, den authentifizierten lokalen Review-Arbeitsbereich und geprüfte Elementreferenzen, Prüfungen sowie Pfadsicherheit.

## Ein Release veröffentlichen

Der GitHub-Actions-Workflow `Publish to npm` veröffentlicht ein Paket, wenn ein `vX.Y.Z`-Tag gepusht wird, nachdem alle Prüfungen bestanden wurden und der Tag mit der Version in `package.json` übereinstimmt. Richte vor der ersten Veröffentlichung npm Trusted Publishing für das Repository `BraveOtter/opencode-design-system` und den Workflow `publish.yml` ein und erlaube die direkte `npm publish`-Aktion. Der Workflow verwendet OIDC, daher muss kein npm-Veröffentlichungstoken in GitHub gespeichert werden; npm generiert für dieses öffentliche Repository außerdem automatisch einen Provenienznachweis.

Um die Paketversion zu erhöhen und Commit sowie Tag zu pushen:

```sh
npm version patch # oder minor / major
git push --follow-tags
```

## Dokumentation

- [OpenCode-v2-Plugin-Leitfaden](https://opencode.ai/v2/docs/build/plugins)
- [OpenCode-Plugin-Konfiguration](https://opencode.ai/v2/docs/plugins)
- [OpenCode-Befehle](https://opencode.ai/v2/docs/commands)
- [OpenCode-Anweisungen und `AGENTS.md`](https://opencode.ai/v2/docs/instructions)
- [Plugin-API-Referenz](https://opencode.ai/v2/docs/api)
- [npm-Paket](https://www.npmjs.com/package/opencode-design-system)
- [Problem melden](https://github.com/BraveOtter/opencode-design-system/issues)

## Lizenz

Dieses Projekt steht unter der [MIT-Lizenz](https://github.com/BraveOtter/opencode-design-system/blob/master/LICENSE).
