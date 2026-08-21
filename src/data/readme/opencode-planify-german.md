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
| Plugin | `src/plugin.ts` | Registriert das Tool `plan_render`: validiert, schreibt JSON und HTML nach `docs/plans/`, öffnet die Datei. |
| Renderer | `src/render.ts`, `templates/` | Schema-Prüfung (ajv), Orthografie-Warnungen, Nunjucks, SVG inline. |

## Installation

Über [opencode-presets](https://github.com/trick77/opencode-presets):

```sh
npx opencode-presets install opencode-planify-german
```

Das Bundle installiert die drei Teile zusammen: das Plugin mit dem Tool
`plan_render` aus der npm-Registry (auf die Version gepinnt), die Regeldatei nach
`instructions` und den Skill nach `skills.paths`.

Der Installer schreibt für das Plugin nur den Paket-Spec nach `opencode.json`;
geladen wird das Paket beim nächsten Start von opencode. Also opencode einmal neu
starten, dann prüfen:

```sh
opencode debug agent plan | grep plan_render
opencode debug skill | grep planify
```

Kein Treffer bei `plan_render`: das Plugin ist nicht angekommen. Dann Bundle neu
installieren und opencode neu starten — ohne das Tool ist der Skill wirkungslos,
und Pläne von Hand als HTML zu schreiben ist keine Ersatzlösung.

Deinstallieren:

```sh
npx opencode-presets remove opencode-planify-german
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

## Browser

Geöffnet wird mit dem Standard-Handler des Systems: `open` auf macOS,
`xdg-open` auf Linux, `start` auf Windows. Überschreiben geht über die
Plugin-Option `openWith` oder die Umgebungsvariable `PLANIFY_OPEN`. `plan_render`
mit `open: false` schreibt die Dateien, ohne etwas zu öffnen.

## Diagramme

Optional, für Struktur, die die Prosa nicht trägt: Abhängigkeiten, Datenfluss,
Zustände, Reihenfolgen mit Verzweigungen.

Erzeugt wird das Diagramm mit dem Skill `diagram-design`, als SVG exportiert, der
Pfad steht im Plan unter `diagram.svgPath`. planify bettet das SVG inline ein und
entfernt dabei `script`, `on*`-Attribute und den Google-Fonts-Import, damit die
Plan-Datei offline-fest bleibt.

Auch der Skill kommt über ein Preset. Er liegt in einem fremden Repo ohne Tags,
deshalb klonst du selbst und gibst den Pfad mit:

```sh
git clone https://github.com/cathrynlavery/diagram-design.git
npx opencode-presets install skill-diagram-design --set skillsDir="$PWD/diagram-design/skills"
```
