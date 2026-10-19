# AGENTS.md – Shared Bastion

Dieses Dokument gilt für das gesamte Projekt. Es ist ein lebendes
Arbeitsdokument für Menschen und Coding-Agents. Stand: 2026-10-19.

## Projektziel und verbindliche Grundlage

`shared-bastion` erweitert Foundry VTT V14 mit D&D5e 6.0.x um einen gemeinsamen
Bastion-Bogen und anschließend eine automatisch erzeugte begehbare Szene.

Die Anforderungen, nummerierten Tasks, Abhängigkeiten und Abnahmekriterien stehen
in [PLAN.md](PLAN.md). Das abgeschlossene Umsetzungsinterview ist im
[Umsetzungsdesign](docs/implementation-design.md) dokumentiert; der
[Bogen-Prototyp](docs/implementation-visual.html) veranschaulicht die Bedienung.
Er ist eine lokale Simulation, kein installierbares Modul und kein Beleg für
funktionierende Foundry-Integration. Aktuelle ausdrückliche Nutzerentscheidungen haben Vorrang
vor diesem Dokument und dem Plan; daraus folgende Änderungen hier nachführen.

## Festgelegte Architektur

- Einrichtungen leben als native `facility`-Items auf einem zentralen Bastion-Aktor.
  Keine bloße Sammelansicht dauerhaft auf Charakteren gespeicherter Einrichtungen.
- Als Träger dient zunächst ein markierter D&D5e-Charakter-Aktor mit eigenem
  ApplicationV2-Bogen. Kein eigener Document-Subtyp für v1.
- Jede Einrichtung gehört genau einem Charakter. Der physische Elternaktor
  eines Items ist nicht automatisch sein regeltechnischer Besitzer.
- Level, Voraussetzungen, Limits, Kosten und Belohnungen gelten je Charakter.
  Kein gemeinsames Bastionlevel und keine gemeinsame Kasse in v1.
- Private Charakterdaten bleiben auf den jeweiligen Charakteren. Die gemeinsame
  Bastion erhält nur benötigte Bastiondaten und Referenzen.
- Spieler lesen die gesamte Bastion und verwalten die eigenen Einrichtungen.
  Der GM darf alles bearbeiten und Besitzer neu zuordnen.
- Die Hauptansicht enthält Abschnitte je Besitzercharakter, dazu einen zusätzlichen
  Reiter für die Gesamtübersicht. Einstieg ausschließlich über das Akteurverzeichnis;
  vorhandene Charakterbögen bleiben unverändert.
- Spieler ändern eigene Namen, Notizen, Personal und Aufträge. Sie dürfen neue
  zulässige Einrichtungen hinzufügen; Bau und Größe ändern sich über die vorgesehenen
  Aktionen. Regeldefinitionen und begründete Regelausnahmen bearbeitet der GM.
- Voraussetzungen und Limits sperren unzulässige Spieleraktionen. Sichtbare,
  begründete GM-Ausnahmen je Einrichtung bleiben bei erneuter Prüfung erhalten;
  sie ersetzen weder Besitzerrechte noch die normale Kostenabrechnung.
- Schreibvorgänge laufen automatisch über genau einen aktiven GM-Client.
  Normale Spieleraktionen dürfen keine GM-Bestätigung verlangen.
- Ohne angemeldeten GM bleibt die Bastion lesbar; Schreiben ist gesperrt.
- Kein Bereit-Status für Bastionzüge. Der GM entscheidet anhand der Aufträge
  und der Absprache am Tisch.
- D&D5e-spezifische Zugriffe werden in einem Systemadapter gebündelt. Native
  Daten, Systemkonfigurationen und geeignete Funktionen wiederverwenden.
- Szenenänderungen zunächst planen und anzeigen, dann nach GM-Klick übernehmen.
  Ausschließlich eigene markierte Elemente verändern und manuelle Konflikte beachten.
- Die erste Szene ist ein kompakter gemeinsamer Bau unabhängig vom Besitzer,
  mit Hauptflur und ausschließlich geschlossenen Räumen, auch für Außenanlagen.
  Neue Räume an freien Stellen ergänzen; Besitzerwechsel allein verschiebt sie nicht.
- Normale Tokensicht ist aktiv: Wände und geschlossene Türen verdecken andere
  Räume. Beleuchtete Innenräume bedeuten keine vollständige Sicht auf die Bastion.

## Arbeitsweise

1. Vor einer Änderung die betroffenen Anforderungen und Tasks in `PLAN.md` lesen.
2. In kleinen zusammenhängenden Schritten arbeiten. Die Stufe-1-Integration und
   deren Abnahme gehen dem Szenengenerator voraus.
3. Zuerst die zentrale Speicherung mit individuellem Besitzerkontext praktisch
   nachweisen (T02), bevor die vollständige Oberfläche gebaut wird.
4. Keine Dateien des installierten Foundry-Kerns oder des D&D5e-Systems verändern.
   Öffentliche Schnittstellen bevorzugen. Unvermeidbare versionsabhängige
   Anpassungen im Adapter isolieren und mit getesteter Version dokumentieren.
5. Spielereingaben als konkrete Aktionen prüfen; keine beliebigen Dokument-Patches
   mit GM-Rechten ausführen. Besitzerrechte nicht nur über ausgeblendete UI schützen.
6. Schreibaktionen, Ressourcenbuchungen und Fortschritt gegen Doppelverarbeitung
   absichern. Fehler und abgelehnte Aktionen müssen verständlich zurückgemeldet werden.
7. Oberflächentexte über Übersetzungsschlüssel bereitstellen; Deutsch und Englisch
   pflegen. Interne technische Abläufe gehören nicht unnötig in die Bedienoberfläche.
8. Keine Regeltexte oder Grafikpakete als stillschweigende Voraussetzung hinzufügen.
   Vorhandene zugängliche Facility-Items und Kompendien verwenden.

## Dokumentation aktuell halten

Bei relevanten Änderungen noch im selben Arbeitsschritt:

- Taskstatus in `PLAN.md` aktualisieren; erst nach erfüllter Abnahme abhaken.
- Wesentliche Entscheidungen, neue Grenzen und bestätigte Integrationsbefunde
  hier ergänzen und widersprüchliche alte Aussagen ersetzen.
- Den Abschnitt „Aktueller Stand“ und das Standdatum aktualisieren.
- Tatsächlich verwendbare Installations-, Entwicklungs- und Testbefehle eintragen.
- Getestete Foundry- und D&D5e-Builds sowie verbleibende Einschränkungen festhalten.
- Im Fortschrittsprotokoll von `PLAN.md` Ergebnis und ausgeführte Prüfung nennen.

Dieses Dokument enthält den aktuellen Zustand, keine fortlaufende Abschrift der
Unterhaltung. Die Taskliste bleibt in `PLAN.md`, damit sie nicht doppelt gepflegt wird.
Planabweichungen begründen und dokumentieren; diese Datei begründet keinen
zusätzlichen Freigabeprozess für routinemäßige Umsetzung im vereinbarten Umfang.

## Prüfungen und Qualitätsmaßstab

- Passende automatisierte Tests für Besitzerregeln, individuelle Regelzuordnung,
  parallele/wiederholte Aktionen und Grundrissgeometrie vorsehen.
- Native Berechtigungen, Auftragsdialoge, Kalender und Szenenbewegung zusätzlich
  mit einer laufenden Foundry-Welt und getrennten GM-/Spielerclients prüfen.
- Tests nicht allein aus gemockten Annahmen über die D&D5e-API ableiten.
- Nicht geprüfte Systemintegration ausdrücklich als unbestätigt kennzeichnen.
- Änderungen an Dokumentation durch Lesen, Link-/Referenzprüfung und Diff prüfen;
  dafür sind keine neuen Softwaretests erforderlich.

### Verfügbare Befehle

Noch keine: Es existieren weder Paketmanifest noch Build- oder Testkonfiguration.
Keine Installations- oder Testbefehle erfinden. Nach T01 die realen Befehle und
Voraussetzungen hier dokumentieren.

### Getestete Laufzeitversionen

Noch keine. Ziel sind Foundry V14 und D&D5e 6.0.x; konkrete Builds bei der ersten
praktischen Integrationsprüfung ergänzen.

## Aktueller Stand

- `PLAN.md` und `AGENTS.md` sind nach dem Umsetzungsinterview aktualisiert.
- Zehn Interviewfragen sind beantwortet und abgeschlossen. Das Ergebnis steht in
  `docs/implementation-design.md`; `docs/implementation-visual.html` enthält
  den exportierten interaktiven Prototyp v1.
- Keine Implementierung, Tests oder Modulstruktur vorhanden.
- Nächster Task: T01; danach T02 als erster praktischer Integrationsnachweis.
- Die Recherche belegt native Facility-Items und bestehende Auftrags-/
  Kalenderfunktionen, aber noch keine funktionierende zentrale Besitzerintegration.
- Offen zu verifizieren: Besitzerkontext nativer Aufträge, Fortschritt zentraler
  Einrichtungen, Absenderzuordnung des GM-Transports und Behandlung von Teilfehlern
  bei Änderungen über mehrere Dokumente. Details stehen in `PLAN.md`.
- Der lokale Foundry-Standardpfad war bei der Recherche nicht vorhanden;
  der verfügbare Foundry-MCP-Anschluss war nicht erreichbar. Daraus folgt keine
  Aussage darüber, ob Foundry an einem anderen Ort oder extern installiert ist.
- Lokale Interviewdaten liegen unter `.grill-with-ui/` im Projekt. Sie sind kein
  Bestandteil des auszuliefernden Moduls. Bei weiteren Interviews in diesem Projekt
  `GRILL_HOME="$PWD/.grill-with-ui"` verwenden, damit Sessions dort auffindbar bleiben.
