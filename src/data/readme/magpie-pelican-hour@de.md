# Pelikan-Monitor

[English](https://github.com/fengcyborg/magpie-pelican-hour/blob/main/README.md) · [简体中文](https://github.com/fengcyborg/magpie-pelican-hour/blob/main/README.zh-CN.md) · [繁體中文](https://github.com/fengcyborg/magpie-pelican-hour/blob/main/README.zh-TW.md) · [日本語](https://github.com/fengcyborg/magpie-pelican-hour/blob/main/README.ja.md) · [Deutsch](https://github.com/fengcyborg/magpie-pelican-hour/blob/main/README.de.md)

Der Pelikan-Monitor prüft jedes aktivierte Abo-Konto des offiziellen Codex-Anbieters in Magpie. Jedes Konto bekommt denselben Prompt und erzeugt eine Animation eines radelnden Pelikans. Öffne **Pelikan-Monitor** in der Magpie-Seitenleiste oder das [lokale Dashboard](http://localhost:18765/). Wähle ein Konto, um den nächsten Termin, die letzte Animation und den Verlauf zu sehen.

## Installation

Füge auf der Plugin-Seite von Magpie das Paket `magpie-pelican-hour` hinzu. Mit der Magpie-CLI geht das so

```sh
magpie plugin add npm:magpie-pelican-hour
```

Aktiviere das Plugin und lass Magpie auf einem wachen Rechner laufen. Jede Prüfung verbraucht Kontingent des jeweiligen Abonnements. Der Schalter auf einer Kontokarte steuert die Prüfungen für dieses Konto. Beim Einschalten wird eine erste Prüfung angefordert. Beim Ausschalten entfällt eine noch ausstehende Startprüfung. Der Verlauf bleibt erhalten.

## Sprache und Anleitung

Mit **Systemsprache** liest das Plugin zu Beginn jedes Prüflaufs die Sprache des Rechners, auf dem Magpie läuft. Im lokalen Dashboard kannst du auch vereinfachtes oder traditionelles Chinesisch, Englisch, Japanisch oder Deutsch wählen. Bei nicht unterstützten Sprachen verwendet das Plugin vereinfachtes Chinesisch. Es sendet den Prompt in der gewählten Sprache und fordert das Modell auf, sie für die Antwort, den Werktitel, sichtbare Texte und Beschreibungen für die Barrierefreiheit zu verwenden. In den Laufdetails findest du den tatsächlich gesendeten Prompt und die ursprüngliche Antwort. Eine Sprachänderung gilt ab dem nächsten Lauf. Für die Seitenleiste und die Plugin-Details gilt die Sprache von Magpie.

## Zeitplan und Ruhezeiten

Jedes Konto läuft normalerweise einmal pro Stunde zwischen Minute 01 und 59. Im laufenden Betrieb weicht die geplante Minute höchstens zehn Minuten von der vorherigen Startminute ab. So liegen etwa 50 bis 70 Minuten zwischen zwei Prüfungen. Der Plan bleibt nach einem Neustart erhalten. Im Ruhezustand verpasste Stunden werden übersprungen. Magpie aktualisiert die Kontoliste stündlich und prüft die Verfügbarkeit vor jedem Lauf. Neu aktivierte Konten werden automatisch aufgenommen. Entfernte oder deaktivierte Konten behalten ihren Verlauf.

Aktiviere unter **Ruhezeiten und freie Tage** die tägliche Ruhezeit, wähle Beginn und Ende und klicke auf **Einstellungen speichern**. Die Ruhezeit gilt für alle Konten in der Zeitzone des Magpie-Rechners und kann über Mitternacht reichen. Zu Beginn der Ruhezeit unterbricht das Plugin laufende Anfragen. Schaltest du ein Konto während der Ruhezeit ein, wartet seine erste Prüfung bis zum Ende der Ruhezeit. Erneutes Ausschalten hebt diese Prüfung auf.

## Regionale Kalender und Stichproben

Aktiviere Stichproben an freien Tagen und wähle eine bis acht Prüfungen pro Konto und Tag. An Arbeits- und Ersatzarbeitstagen gilt der normale stündliche Rhythmus. **Gleichmäßig** verteilt die verfügbare Zeit auf gleich lange Abschnitte und wählt pro Konto einen Zeitpunkt je Abschnitt. Mit **Eigene Zeiten** legst du die Uhrzeiten selbst fest. Nach dem Speichern zeigt jedes Konto seine Termine für heute oder den nächsten freien Tag.

Im **Kalender für freie Tage** kannst du die Region aus der Sprache übernehmen oder selbst wählen. So verwenden en-GB und en-US unterschiedliche Kalender. Blättere zum gewünschten Monat und klicke auf das heutige oder ein zukünftiges Datum, um zwischen Arbeitstag und freiem Tag zu wechseln. Ein zweiter Klick stellt die regionale Regel wieder her. Mit **Einstellungen speichern** gelten die Änderungen für alle Konten.

Für die Tagesgrenze gilt die Ortszeit des Rechners. Eine geplante Prüfung zählt, sobald sie beginnt, auch wenn du später am Tag die Einstellungen änderst. Bei Auslastung kann eine Prüfung bis zu einer Stunde warten, höchstens bis zum nächsten Termin, zur Ruhezeit oder bis Mitternacht. Nach dem Aufwachen oder Einschalten werden verpasste Termine übersprungen. Prüfungen beim Wiedereinschalten eines Kontos werden gesondert erfasst.

Die Kalender funktionieren offline. Für Festlandchina gelten die veröffentlichten Feier- und Ersatzarbeitstage für 2026 und 2027. Für 245 weitere Länder und Regionen enthält das Plugin die Feiertagsdaten von python-holidays 0.109 für 2026–2028. Regionale und betriebliche Abweichungen kannst du im Kalender eintragen. Sind für ein Jahr oder eine Region nur Wochenendregeln verfügbar, weist der Kalender darauf hin. Bei der Zeitumstellung im Frühjahr entfällt ein Termin zu einer nicht existierenden Uhrzeit. Eine doppelt vorkommende Uhrzeit im Herbst wird einmal ausgeführt. [Feiertagsdaten](https://github.com/vacanza/holidays) · [China 2026](https://www.beijing.gov.cn/cs/gncs/zcwj/202603/t20260327_4568275.html) · [China 2027](https://chinajob.mohrss.gov.cn/h5/c/2026-11-09/635850.shtml)

## Prüfungen, Vorschau und Speicherort

Das lokale Magpie-Gateway sendet die feste Aufgabe in der Sprache des Prüflaufs für das jeweilige Konto an `gpt-6.2-astra` mit der Denkstufe `xhigh`. Bis zu drei Konten können gleichzeitig laufen. Die Laufdetails enthalten die ursprüngliche Antwort, das HTML-Dokument, die extrahierte SVG-Datei und die Vorschau. Aus der Modellantwort führt **Zurück zu den Laufdetails** wieder zum Eintrag. Auch ein vollständiges HTML-Dokument in einer JSON-Zeichenkette wird erkannt.

Die Vorschau startet, sobald das Vorschaubild sichtbar ist. Fehlt eine Aufnahme, spielt die Galerie die gespeicherte HTML-Vorschau in einer Sandbox ab. Das gilt auch für ältere Werke. Findet das Plugin Chrome oder Chromium und FFmpeg, zeichnet es Werke mit Skripten als stumme Videos mit 60 Bildern pro Sekunde auf. Für Browser mit eingeschränkter automatischer Wiedergabe speichert es animierte PNGs mit 30 Bildern pro Sekunde. Eigene Programmpfade lassen sich über `CHROME_PATH` und `FFMPEG_PATH` festlegen.

Das Dashboard ist über Port 18765 erreichbar. Geräte mit Zugriff auf diesen Port im lokalen Netz können Kontoaliasse, Verlauf und Ausgaben lesen. Einstellungen werden am Magpie-Rechner geändert. Magpie verwaltet die Zugangsdaten. Das Archiv liegt unter macOS in `~/Library/Application Support/magpie-pelican/` oder bei gesetztem `XDG_DATA_HOME` in `$XDG_DATA_HOME/magpie-pelican/`. Kopiere für eine Sicherung oder einen Umzug das gesamte Verzeichnis. Auch nach einer Umbenennung bleiben die Aufzeichnungen mit der Konto-ID verknüpft.

Für die Installation aus dem Quellcode lege den vollständigen Ordner an einem festen Ort ab. Wähle ihn in Magpie aus oder führe dort unter macOS diesen Befehl aus

```sh
/Applications/magpie.app/Contents/MacOS/magpie plugin add "$PWD"
```
