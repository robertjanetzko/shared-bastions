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
- Das visuelle Design orientiert sich am offiziellen `foundryvtt/dnd5e`-System.
  Vorhandene Farb- und Schriftvariablen wiederverwenden; keine Bilder oder
  Schriftpakete ohne eigenen Bedarf mitliefern.
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

Voraussetzungen: Node.js >=24, Python 3 für die ZIP-Paketierung; Docker Desktop
für die isolierte Foundry-Testinstallation. `npm ci` installiert Playwright als
Entwicklungsabhängigkeit; das ausgelieferte Modul benötigt keine npm-Pakete.

- `npm run check`: Manifest, ES-Modulsyntax, lokale Imports und DE/EN-Sprachschlüssel.
- `npm test`: zwölf Unit-Tests für Besitzerauflösung, Rechte, GM-Auswahl,
  konkrete Befehlseingaben und individuellen Konfigurationskontext.
- `npm run build`: Entwicklungsarchiv unter `dist/`, ohne Foundry-ZIP und Secrets.
- `npm run check:foundry -- /pfad/zur/entpackten/Foundry-Installation`: native
  Manifest-/Versionsprüfung und Handlebars-Render ohne Weltstart.
- `npm run test:browser:install`: Chromium für die lokale Integrationssuite laden.
- `npm run test:integration`: Modulprüfung in der bereits laufenden, eigenen
  Testwelt `shared-bastion-integration`; keine bestehende Spielwelt verwenden.
  Die Suite nutzt für Stufe 1 den nativen Modus ohne Canvas; T01 und T02
  bestehen mit einem GM und zwei Spielern. T03 prüft den Verzeichniseinstieg,
  persistente Spezialbögen, Teilnehmerrechte und fehlende Besitzer.
  Szenentests müssen Canvas aktivieren.
- `npm run dev:init`: lokale Secret-Datei mit zufälligem Test-Adminschlüssel anlegen.
- `npm run dev:up` / `npm run dev:status` / `npm run dev:down`: isolierte
  Testinstallation unter <http://localhost:30014> starten, prüfen und beenden.

Die Docker-Konfiguration erwartet `FoundryVTT-Node-14.369.zip` im Projektstamm.
Installation, Datenhaltung und Lizenzierung stehen in [README.md](README.md).

### Getestete Laufzeitversionen

Foundry **14.369** aus der vom Nutzer bereitgestellten ZIP startet im isolierten
Docker-Container. In der Testwelt `shared-bastion-integration` wurde das Modul
mit D&D5e **6.0.6** aktiviert; Start und Statusansicht wurden mit Chromium
erfolgreich geprüft (T01). Der Quellcode wurde auf Commit
`28f35531021bb07609c79c4cbbb9b7e7c2744bf9` geprüft. Ein kostenpflichtiger
zentraler Bauauftrag mit privatem Besitzer ist nachgewiesen (T02). Das bestätigt
noch nicht alle Betriebsaktionen oder die Kalenderintegration. Chromium nutzt
Softwaregrafik; Sicht und Bewegung
in einer generierten Szene sind noch nicht geprüft.

## Aktueller Stand

- `PLAN.md` und `AGENTS.md` sind nach dem Umsetzungsinterview aktualisiert.
- Zehn Interviewfragen sind beantwortet und abgeschlossen. Das Ergebnis steht in
  `docs/implementation-design.md`; `docs/implementation-visual.html` enthält
  den exportierten interaktiven Prototyp v1.
- T01 ist umgesetzt und abgenommen: Manifest, ES-Module,
  Systemabhängigkeit, Styles, Statusvorlage, Sprachdateien, Prüf- und Paketbefehle
  sowie Docker-Testumgebung sind vorhanden. Die Einrichtungsverwaltung ist noch
  nicht vollständig umgesetzt.
- T02 ist abgenommen: Eigener Spieler-Bauauftrag ohne GM-Klick, individuelle
  Voraussetzungen/Kosten, zentraler nativer Fortschritt und Wiederholungsschutz
  mit drei Clients praktisch bestätigt.
- T03 ist abgenommen: GM-Erstellung über das Akteurverzeichnis, eigener Bogen,
  Teilnehmerkonfiguration und Rechteentzug funktionieren nach Neuladen und mit
  getrenntem Spielerclient. Der Träger enthält nur Namen/Bilder/UUIDs und
  Verfügbarkeitsstatus der Teilnehmer, keine Charakterregelwerte. Nächster Task: T04.
- Der Bogen wird nur dem markierten Träger über `core.sheetClass` zugeordnet;
  er ist kein wählbarer Standard für normale Charaktere. Spieler bleiben auf
  dem Träger OBSERVER; eigene Charakterbögen und deren Rechte bleiben unverändert.
- Foundry 14.369 hat im Modus ohne Canvas einen bestätigten Kernfehler:
  `Actor._onUpdate` ruft bei Berechtigungsänderungen für Spieler ungeschützt
  `canvas.tokens.cycleTokens` auf. Die Berechtigungen ändern sich trotzdem
  korrekt. Keine Kerndateien verändern; mit aktivem Canvas in T10 nachprüfen.
- Der Befehlstransport verwendet native ChatMessage-Erstellung und deren vom
  Server gelieferten `userId`, nicht eine selbst behauptete Absender-ID.
  Anfragen werden bei Zustellung unveränderlich übernommen; Änderungen an
  bestehenden Anfragen lösen keine erneute Ausführung aus. T04 muss noch
  Mehr-GM-Wechsel und parallele Anfragen vervollständigen und prüfen.
- `foundry.documents.modifyBatch` speichert Kosten, Item-Fortschritt und einen
  eindeutigen Vorgangsbeleg gemeinsam. Belege liegen in einem privaten GM-Journal
  mit stabiler ID. Ein abgebrochener Batch kann ohne Promise-Rejection auflösen;
  den gespeicherten Beleg deshalb zusätzlich prüfen. Die native Kollisionsprüfung
  für identische Beleg-IDs wurde praktisch bestätigt.
- Native Aufträge verwenden einen separaten Zahlungsablauf, der Zahlungsaktor
  und Item-Elternaktor gleichsetzt. Er darf für zentrale Items nicht unverändert
  übernommen werden. Der Kalender sammelt Facility-Updates selbst; doppelte
  Verarbeitung durch zusätzliche Hooks ist zu verhindern.
- Einfache Einrichtungen haben ein kostenloses Anfangskontingent, keine harte
  Obergrenze für weitere kostenpflichtige Räume. Systemwerte im Adapter lesen.
- Details und verlinkte Quellcodebefunde: [Integrationsbefunde](docs/integration-findings.md).
- Offen zu verifizieren: Besitzerkontext nativer Aufträge, Fortschritt zentraler
  Einrichtungen, Absenderzuordnung des GM-Transports und Behandlung von Teilfehlern
  bei Änderungen über mehrere Dokumente. Details stehen in `PLAN.md`.
- Der Foundry-MCP-Anschluss ist weiterhin nicht erreichbar. Der Browser-Skill
  meldet keine verfügbaren Browser. Eine separate lokale Chromium-Testumgebung
  prüft deshalb die isolierte Welt über Playwright; T01 ist damit bestanden.
- `FoundryVTT-Node-14.369.zip`, `dev/secrets.json`, Docker-Daten und `dist/` sind
  lokale Entwicklungsartefakte und gehören nicht ins Repository oder Modularchiv.
- Lokale Interviewdaten liegen unter `.grill-with-ui/` im Projekt. Sie sind kein
  Bestandteil des auszuliefernden Moduls. Bei weiteren Interviews in diesem Projekt
  `GRILL_HOME="$PWD/.grill-with-ui"` verwenden, damit Sessions dort auffindbar bleiben.
