# opencode-planify-german

Pläne für OpenCode: das Modell liefert JSON, ein lokales Nunjucks-Template
rendert daraus eine eigenständige HTML-Datei und öffnet sie im Standard-Browser
des Systems. Pläne sind deutsch, in Schweizer Rechtschreibung mit echten
Umlauten. Läuft lokal in OpenCode, als Plugin plus Skill.

Das Layout steht im Template, das Modell liefert nur Inhalt: gleiche Gliederung
und gleiche Darstellung in jedem Plan, dazu das JSON daneben als
maschinenlesbare Fassung.

## Warum

| Was du davon hast | Warum |
| --- | --- |
| **Günstiger pro Plan** | Tokens gehen in den Inhalt, nicht in Tags. Die Form kommt aus dem lokal installierten Template. |
| **Verlässliche Struktur** | Schema-Prüfung, bevor etwas geschrieben wird: fehlende Verifikation oder ein unklarer Dateipfad kommen als Feldfehler zurück. |
| **Schneller zu prüfen** | Nummerierte Schritte, Pfad und Änderung nebeneinander, offene Entscheidungen mit Empfehlung und Abwägung hervorgehoben. |
| **Kontext im Review** | Plan als HTML und JSON in `docs/plans/`, geht mit dem Code in den Pull Request. Die Absicht steht im Review, statt aus dem Diff erschlossen zu werden. |
| **Deutsch** | Muttersprache liest sich schneller, die Aufmerksamkeit bleibt beim Inhalt. Der Unterschied zwischen "muss", "soll" und "kann" fällt beim ersten Lesen auf. |

## Bestandteile

| Teil | Datei | Wirkung |
| --- | --- | --- |
| Instructions | `instructions/planify.md` | Immer geladen: Deutsch, Schweizer Rechtschreibung, Plan als JSON über `plan_render`. |
| Skill | `skills/planify/SKILL.md` | Auf Abruf: Schema, Feldbedeutungen, Schreibregeln, Diagrammweg, Beispiel. |
| Plugin | `src/plugin.ts` | Registriert `plan_render` (validiert, schreibt JSON und HTML nach `docs/plans/`, öffnet die Datei) und `pr_summary` (Zusammenfassung in die Description eines Bitbucket-PRs, legt ihn bei Bedarf als Draft an). |
| Renderer | `src/render.ts`, `templates/` | Schema-Prüfung (ajv), Orthografie-Warnungen, Nunjucks, SVG inline. |

## Installation

Braucht opencode 2 oder neuer: ab 1.0.0 nutzt das Plugin die Plugin-API V2
(`@opencode/plugin`). Für opencode 1 bleibt `opencode-planify-german@0.6.0`.

Über [opencode-presets](https://github.com/trick77/opencode-presets):

```sh
npx opencode-presets install planify-german
```

Das Bundle installiert die drei Teile zusammen: das Plugin mit den Tools
`plan_render` und `pr_summary` aus der npm-Registry (auf die Version gepinnt), die
Regeldatei nach `instructions` und den Skill in die Skill-Pfade. Es fragt die
Bitbucket-URL und einen HTTP Access Token ab, die `pr_summary` braucht.

Der Installer schreibt für das Plugin den Paket-Spec samt Optionen nach `opencode.json`:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-planify-german@1.0.2",
      "options": {
        "bitbucketUrl": "https://bitbucket.example.com",
        "bitbucketToken": "…"
      }
    }
  ]
}
```

Geladen wird das Paket beim nächsten Start von opencode. Also opencode einmal neu
starten (`opencode service restart`), dann prüfen:

```sh
opencode plugin list | grep opencode-planify-german
```

Die Liste füllt sich erst einige Sekunden nach dem Neustart; vor dem Schluss
"fehlt" also nochmals aufrufen. Bleibt es ohne Treffer, ist das Plugin nicht
angekommen, der Grund steht im Log (`opencode debug paths` zeigt das
Verzeichnis, gesucht wird nach "failed to load plugin"). Ein lokales
Plugin-Verzeichnis ohne `index.*` oder `server.*` an der Wurzel überspringt
opencode ohne Logeintrag. Dann Bundle neu installieren und opencode neu starten —
ohne die Tools ist der Skill wirkungslos, und Pläne von Hand als HTML zu schreiben
ist keine Ersatzlösung.

Relative Pfade (`outDir`, `diagram.svgPath`) und die git-Abfragen von `pr_summary`
gelten ab dem Verzeichnis, in dem opencode das Plugin lädt, also dem Projekt.

Deinstallieren:

```sh
npx opencode-presets remove planify-german
```

## Ablauf

1. Die Regeldatei ist in jeder Session geladen und verlangt den Plan als JSON.
2. Das Ticket kommt aus dem Branch (`git rev-parse --abbrev-ref HEAD`, Muster
   `[A-Z][A-Z0-9]+-[0-9]+`). Kein Treffer → das Modell fragt nach.
3. Das JSON geht an `plan_render`. Bei Schemaverletzungen kommen die Feldfehler
   zurück, bevor etwas geschrieben wird; das Modell korrigiert selbst.
4. Eszett und ASCII-Umschreibungen von Umlauten in Prosafeldern kommen als
   Warnung zurück. Pfade, Kommandos und der Slug sind ausgenommen.
5. Geschrieben werden `docs/plans/<TICKET>-<slug>.plan.json` und `.html`, dann
   öffnet die Datei.

## Zusammenfassung in die PR-Description (Bitbucket Data Center)

`pr_summary` schreibt eine Zusammenfassung in die Description des offenen PRs
des aktuellen Branches: 1-3 Absätze zu Aufgabe, Problem und Lösung, bei 110
Zeichen umbrochen. Nicht der Plan. Ist die Umsetzung fertig, bietet das Modell es
an, geschrieben wird nach Ja oder auf Verlangen ("Zusammenfassung in den PR").
Die Description wird vollständig ersetzt, Titel und Reviewer bleiben. Kommentare
schreibt `pr_summary` nie.

Hat der Branch noch keinen offenen PR, legt `pr_summary` ihn als Draft an, mit
der Zusammenfassung als Description und den Default-Reviewern des Repos (ohne
den Autor). Den Ziel-Branch bestätigt immer der Benutzer; vorgeschlagen wird der
Branch, von dem abgezweigt wurde, ausser master/main. Aus master/main und aus
ungepushten Branches wird nichts angelegt. Drafts gibt es ab Bitbucket DC 8.18,
ältere Instanzen legen einen normalen PR an (Warnung). Unverifiziert: dass
Bitbucket den angemeldeten Benutzer im Header `X-AUSERNAME` liefert; fehlt er,
wird der Autor nicht aus den Reviewern gefiltert. Zum Anlegen braucht der Token
Schreibrecht auf das Repository.

Projekt und Repository kommen aus `origin`, die Basis-URL und ein HTTP Access
Token aus den Plugin-Optionen. Das Bundle fragt beide bei der Installation ab;
ohne Terminal-Eingabe:

```sh
export BITBUCKET_TOKEN=…
npx opencode-presets install planify-german \
  --set bitbucketUrl=https://bitbucket.example.com --set-env bitbucketToken=BITBUCKET_TOKEN
```

Der Token steht danach im Klartext in `opencode.json`. Ohne Plugin-Optionen
greifen die Umgebungsvariablen `PLANIFY_BITBUCKET_URL` und
`PLANIFY_BITBUCKET_TOKEN`. Der Token geht nur an die konfigurierte Instanz: eine PR-URL auf einem
anderen Host lehnt `pr_summary` ab.

## Browser

Geöffnet wird mit dem Standard-Handler des Systems: `open` auf macOS,
`xdg-open` auf Linux, `start` auf Windows. Überschreiben geht über die
Plugin-Option `openWith` oder die Umgebungsvariable `PLANIFY_OPEN`. `plan_render`
mit `open: false` schreibt die Dateien, ohne etwas zu öffnen.

## Diagramme

Im Zweifel mit Diagramm: sobald ein Plan Entitäten, Datenfluss, Abläufe mit
Verzweigungen, Aufrufe zwischen Diensten, Zustände oder Architektur berührt.
Nur eine rein lineare Schrittfolge bleibt ohne.

Erzeugt wird das Diagramm mit dem Skill `diagram-design`, als SVG exportiert, der
Pfad steht im Plan unter `diagram.svgPath`. planify bettet das SVG inline ein und
entfernt dabei `script`, `on*`-Attribute und den Google-Fonts-Import, damit die
Plan-Datei offline-fest bleibt.

Der Skill kommt mit dem Bundle `planify-german` (Preset `skill-diagram-design`):
das Archiv eines festen Commits, per sha256 geprüft, entpackt nach
`<cache>/diagram-design-skills-<version>` und dort in `skills.paths` eingetragen.
Kein Klon. Upstream hat keine Tags, ein Update ist eine neue Preset-Version mit
neuem Commit.

Wer den Skill früher als Klon installiert hat, löscht dessen Eintrag aus
`skills.paths`, sonst ist er doppelt registriert.

Fehlt der Skill, lässt das Modell das Diagramm weg und sagt das im Chat.
