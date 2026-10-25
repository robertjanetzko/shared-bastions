# AGENTS.md – Shared Bastion

Dieses Dokument gilt für das gesamte Projekt. Es ist ein lebendes
Arbeitsdokument für Menschen und Coding-Agents. Stand: 2026-10-25.

## Projektziel und verbindliche Grundlage

`shared-bastion` erweitert Foundry VTT V14 mit D&D5e 6.0.x um einen gemeinsamen
Bastion-Bogen und anschließend eine automatisch erzeugte begehbare Szene.
Der aktuelle ausdrückliche Arbeitsauftrag umfasst die abgeschlossene Stufe 1
(T01–T10) und deren native Bogen-Neugestaltung N01; der Szenengenerator T11–T14
ist zurückgestellt.

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
- Der Bogen enthält ausschließlich Besitzerabschnitte mit nativen Facility-Kacheln:
  Basiseinrichtungen links, besondere rechts; eigene Charaktere zuerst, andere nach
  Spielernamen und Charaktername. Keine Gesamtübersicht und keine Besitzerfilter.
  Einstieg ausschließlich über das Akteurverzeichnis;
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
- `npm test`: 30 Unit-Tests für Besitzerauflösung, Rechte, GM-Auswahl,
  konkrete Befehlseingaben und individuellen Konfigurationskontext.
- `npm run build`: installierbares Modularchiv unter `dist/`, ohne Foundry-ZIP und Secrets.
- `npm run check:foundry -- /pfad/zur/entpackten/Foundry-Installation`: native
  Manifest-/Versionsprüfung und Handlebars-Render ohne Weltstart.
- `npm run test:browser:install`: Chromium für die lokale Integrationssuite laden.
- `npm run test:integration`: Modulprüfung in der bereits laufenden, eigenen
  Testwelt `shared-bastion-integration`; keine bestehende Spielwelt verwenden.
  Die Suite nutzt für Stufe 1 den nativen Modus ohne Canvas; T01 und T02
  bestehen mit einem GM und zwei Spielern. T03 prüft den Verzeichniseinstieg,
  persistente Spezialbögen, Teilnehmerrechte und fehlende Besitzer.
  T04 prüft zwei GMs/zwei Spieler, Parallelität, Hook-Abbruch und Ausfall vor
  beziehungsweise nach Speicherung. T05 prüft sortierte Kacheln, Kontextmenüs, UI-Bau,
  Dialogabbruch und Live-Aktualisierung mit zwei Spielern. T06 prüft Vorlagen und Regeln, Besitzerwechsel/-löschung
  sowie weltlokale GM-Regeldefinitionen. T07 prüft native Befehlsdialoge, Herstellung/Ernte, Handel, Erweiterung,
  Mietlinge/Verteidiger und Ergebnisabrechnung. T08 prüft Kalender/Züge und GM-Wechsel;
  T09 den zweiphasigen Transfer. T10 prüft zusätzlich einen aktiven Canvas-Client,
  normalen verknüpften Token, direkten nativen Schreibschutz, deutschen Bogen und
  Rechteentzug ohne `cycleTokens`-Fehler. Die ursprünglichen elf nativen Integrationstests sind
  auf Version 0.1.0 bestanden (4,5 Minuten). N01 ergänzt eine zwölfte native
  UI-Prüfung für Kompendiumauswahl, Bauzustand, GM-Ausnahme, Themen und offene Dialoge.
  Alle zwölf Prüfungen sind im abschließenden Gesamtlauf bestanden (6,4 Minuten).
  Szenengenerator-Tests gehören zum späteren Ausbau.
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
zentraler Bauauftrag mit privatem Besitzer ist nachgewiesen (T02); weitere
Betriebsaktionen und Kalender sind in T07/T08 bestätigt, Transfer in T09.
T10 ergänzt einen aktiven Canvas-Client und normale Tokenbewegung. Chromium nutzt
Softwaregrafik; Sicht und Bewegung in einer generierten Szene gehören zum
zurückgestellten Ausbau.

## Aktueller Stand

- Weltweite GM-Einstellung „Besondere Einrichtungen nach Stufe“: Tabellendialog
  mit Stufe/Gesamtanzahl, Zeilen hinzufügen/entfernen, Systemstandard laden und
  Speichern/Abbrechen. Kein sichtbares JSON-Einstellungsfeld; frühere Werte werden
  übernommen. Intern weiterhin weltlokale Speicherung, Übernahme beim `ready`-Hook
  und bei Änderungen auf allen Clients in
  `CONFIG.DND5E.facilities.advancement.special`, auch für native Charakterbögen.
  Keine automatische Anlage/Entfernung; andere Voraussetzungen bleiben erhalten.
  33 Unit-Tests, Modulprüfung (43 Module, 217 DE/EN-Schlüssel), Diff-Prüfung und
  Paketbau bestanden. Native Weltintegration und visuelle Prüfung des Dialogs
  noch unbestätigt; Docker-Socket im vorherigen Lauf nicht zugänglich.
- Erstellung ausschließlich über „Create Actor“ → „Shared Bastion“ und die
  anschließende Teilnehmerauswahl. Kein zusätzlicher Create-/Open-Bastion-Button
  im Akteurverzeichnis. Der D&D5e-6.0.6-Render-Hook wird im UI-Adapter ergänzt;
  der Träger bleibt ein markierter Charakter, kein zusätzlicher Document-Subtyp.
  Name und Akteurordner werden übernommen. Weiterhin genau eine registrierte
  Bastion je Welt; mehrere unabhängige Bastionen sind ausdrücklich zurückgestellt.
  Der erweiterte native T03-Test besteht auf 14.369 / 6.0.6 (24,9 s): Abbruch
  beider Schritte, normale NSC-Erstellung, Name/Ordner, Einzelbastion-Sperre,
  Spielerzugang und Neuladen. 30 Unit-Tests, 40 ES-Module, 206 DE/EN-Schlüssel,
  native Offline-Prüfung und Paketbau bestanden; Dialog-Screenshot geprüft.
  Für diese Änderung nur T03 nativ wiederholt, nicht die gesamte Suite.
- `PLAN.md` und `AGENTS.md` sind nach dem Umsetzungsinterview aktualisiert.
- Zehn Interviewfragen sind beantwortet und abgeschlossen. Das Ergebnis steht in
  `docs/implementation-design.md`; `docs/implementation-visual.html` enthält
  den exportierten interaktiven Prototyp v1.
- T01 ist umgesetzt und abgenommen: Manifest, ES-Module,
  Systemabhängigkeit, Styles, Statusvorlage, Sprachdateien, Prüf- und Paketbefehle
  sowie Docker-Testumgebung sind vorhanden. Die Einrichtungsverwaltung ist
  als Stufe 1 vollständig umgesetzt.
- T02 ist abgenommen: Eigener Spieler-Bauauftrag ohne GM-Klick, individuelle
  Voraussetzungen/Kosten, zentraler nativer Fortschritt und Wiederholungsschutz
  mit drei Clients praktisch bestätigt.
- T03 ist abgenommen: GM-Erstellung über das Akteurverzeichnis, eigener Bogen,
  Teilnehmerkonfiguration und Rechteentzug funktionieren nach Neuladen und mit
  getrenntem Spielerclient. Der Träger enthält nur Namen/Bilder/UUIDs und
  Verfügbarkeitsstatus der Teilnehmer, keine Charakterregelwerte.
- Der Bogen verwendet native D&D5e-Anwendungskomponenten, Bildkacheln und
  kompakte Hinweise als Text-Tooltips. Freie Plätze öffnen den nativen Kompendiumbrowser, eigene
  Einrichtungen die native Aktivitätsauswahl. Verwaltung liegt in Kontextmenüs,
  GM-Verwaltung und Bastionzüge im Fenstermenü. Fremde Einrichtungen sind für
  Spieler nicht bedienbar. Öffentliche Teilnehmermetadaten enthalten zusätzlich
  Benutzerreferenzen für die Sortierung; private Charakterregelwerte bleiben lokal
  beim Besitzer beziehungsweise GM. Neugestaltung N01 ist nativ abgenommen.
  Der frühere Listen-/Filterbogen ist durch die Nutzerentscheidung ersetzt.
  Die visuelle Nacharbeit gleicht Kachelmaße exakt mit D&D5e 6.0.6 ab
  (Titel 13, Untertitel 10, Personal 26, Auftragsicon 22, Innenabstand 8,
  freie Plätze mindestens 50 Pixel). Abschnittsköpfe zeigen Portrait, Spielername
  und darunter klein die private Stufe; Charaktername im Tooltip. Hinweise,
  Ergebnisse und Ausnahmen erscheinen als fokussierbares Symbol unten rechts
  mit reinem Text-Tooltip; Warnungen bleiben als Warnsymbol erkennbar. Die
  Zugübersicht liegt im Infosymbol am unteren Fensterrand. Native Prüfung mit
  ungespeicherter Vorschau bestätigt beide Themen, schmale Fenster, Hover,
  Tastatur und unveränderte Weltdokumente.
- Der Bogen wird nur dem markierten Träger über `core.sheetClass` zugeordnet;
  er ist kein wählbarer Standard für normale Charaktere. Spieler bleiben auf
  dem Träger OBSERVER; eigene Charakterbögen und deren Rechte bleiben unverändert.
- Foundry 14.369 hat im Modus ohne Canvas einen bestätigten Kernfehler:
  `Actor._onUpdate` ruft bei Berechtigungsänderungen für Spieler ungeschützt
  `canvas.tokens.cycleTokens` auf. Die Berechtigungen ändern sich trotzdem
  korrekt. T10 bestätigt mit aktivem Canvas den Rechteentzug ohne diesen Fehler.
  Keine Kerndateien verändern.
- Der Befehlstransport verwendet native ChatMessage-Erstellung und deren vom
  Server gelieferten `userId`, nicht eine selbst behauptete Absender-ID.
  Anfragen werden bei Zustellung unveränderlich übernommen; Änderungen an
  bestehenden Anfragen lösen keine erneute Ausführung aus. T04 bestätigt
  parallele Aktionen und GM-Ausfall vor sowie nach der Speicherung.
- Die kanonische Bastion ist in einer GM-geschützten Welteinstellung registriert;
  ein selbst gesetztes Markerflag verleiht keine Befehlsrechte. Private GM-Journale
  speichern authentifizierte Aufträge und endgültige Ergebnisse. Initialisierte,
  fehlende Journale werden nicht stillschweigend neu angelegt.
- `foundry.documents.modifyBatch` speichert Kosten, Item-Fortschritt und einen
  eindeutigen Vorgangsbeleg gemeinsam. Belege liegen in einem privaten GM-Journal
  mit stabiler ID. Ein abgebrochener Batch kann ohne Promise-Rejection auflösen;
  den gespeicherten Beleg deshalb zusätzlich prüfen. Die native Kollisionsprüfung
  für identische Beleg-IDs wurde praktisch bestätigt. Native Preflight-Hooks können
  einzelne Operationen still entfernen; der Foundry-Adapter schützt deshalb die
  Identitäten der eigenen Batch-Argumente vor dem Versand. Keine Core-Patches.
  Schreiben ausschließlich auf dem geprüften Build 14.369 freigeben; andere
  V14-Builds bleiben bis zum entsprechenden Regressionstest lesbar.
- Native Aufträge verwenden einen separaten Zahlungsablauf, der Zahlungsaktor
  und Item-Elternaktor gleichsetzt. Er darf für zentrale Items nicht unverändert
  übernommen werden. Der Kalender sammelt Facility-Updates selbst; doppelte
  Verarbeitung durch zusätzliche Hooks ist zu verhindern.
- Besondere Einrichtungen sind je Besitzer grundsätzlich einmalig. Wiederholbarkeit
  wird ausdrücklich in einer GM-Regeldefinition gesetzt oder über eine begründete
  Limitausnahme erlaubt. Die zwei kostenlosen Anfangsräume sind beengt/geräumig;
  sie haben zusammen 4 und 16 Rasterfelder. Deutsche Oberflächenbegriffe folgen
  dem vom Nutzer bereitgestellten Handbuch (Basiseinrichtungen, Mietlinge, Befehle,
  Stufe). Vollständige Handbuchtexte werden nicht im Modularchiv verteilt.
- Einfache Einrichtungen haben ein kostenloses Anfangskontingent, keine harte
  Obergrenze für weitere kostenpflichtige Räume. Systemwerte im Adapter lesen.
- Details und verlinkte Quellcodebefunde: [Integrationsbefunde](docs/integration-findings.md).
- T06 ist abgenommen: Einrichtungsvorlagen hinzufügen, eigene Namen/Notizen/
  Entfernung, GM-Besitzerreparatur und individuelle Bedingungen sind mit drei
  nativen Clients bestätigt. Level- und Voraussetzungsausnahmen bleiben nach
  Neuladen sichtbar; Kosten und Besitzerrechte gelten weiterhin.
- Vorlagenregeln liegen als weltlokale, GM-geschützte Einstellung vor; die
  ursprünglichen Items und Kompendien bleiben unverändert. Native Facility-Daten
  enthalten nur den Mindestlevel, keine strukturierten übrigen Voraussetzungen.
  Der GM ergänzt diese als Werkzeug-/Waffenübung, Item-Kennzeichen, zauberwirkende
  Klasse oder ausdrückliche Freigabebedingung. Keine Regelsammlung mitliefern und
  keine Voraussetzungen still aus Fließtext erraten.
- Spielereditierbare Vorlagen werden nicht als GM-Regeldefinition ausgeführt.
  Normale neue Einrichtungen verwenden den Besitzerkontext einschließlich noch
  nicht übertragener Charaktereinrichtungen. Ein normaler nativer preCreate-Hook
  stellt die geplante Besitzer-Bauentscheidung nach dem Träger-Level-Default wieder
  her; er ist auf ausdrücklich markierte Modul-Erstellungsoperationen begrenzt.
- T07 ist mit GM und zwei Spielern abgenommen: native Herstellungs-/Handels-/
  Erweiterungsdialoge, Ergebnis-Veto, Drag-and-drop-NSC, individuelle Einnahmen
  und Wiederholung/Neuladen ohne doppelte Verbuchung.
- Die Betriebsaktionen liegen im eigenen D&D5e-Auftragsadapter. Native
  OrderUsageDialog-Instanzen sammeln Optionen ohne Item.use oder native
  Zahlungsnachricht; Kostenfelder sind schreibgeschützt. Der Executor berechnet
  Kosten erneut aus Systemkonfiguration, CraftCost und zugänglichen geschützten
  Quellen. Keine Preise oder Dokumentpatches aus Spielerformularen übernehmen.
- Native advanceTurn-Ergebnisse werden beim Regelbesitzer atomar ausgezahlt
  beziehungsweise als Items erzeugt, gemeinsam mit zentralem Fortschritt und Beleg.
  Mietlinge/Verteidiger sind NSC-Referenzen; öffentliche Identität bleibt minimal.
- T08 bestätigt native globale Züge, automatische Tageswechsel, individuelle
  Ergebnisaddition sowie Neuladen und GM-Wechsel ohne Wiederholung. Der Adapter
  delegiert ausschließlich die kanonische Bastion am Singleton
  `game.dnd5e.bastion.advanceAllFacilities`; normale Charaktere bleiben nativ.
  Native reine Sammelaufrufe (`performUpdates:false`) liefern für die gemeinsame
  Bastion keine Updates/Chatnachricht; der eigene GM-Zeitpfad schreibt atomar.
  Diese begrenzte Laufzeitbrücke ist auf 14.369 / 6.0.6 geprüft, keine installierte
  Systemdatei wird verändert. Kalenderkonfiguration und Moduswechsel setzen einen
  neuen Ausgangszeitpunkt; per Einrichtung gespeicherte Zeitmarken verhindern
  erneute Verarbeitung, auch nach Rückwärtsstellen der Uhr.
- Fehlende Fortschrittsreferenzen blockieren nur die betroffene Einrichtung;
  ihr offener Zeitraum bleibt erhalten. Nach Reparatur erneut prüfen. Beim
  Kalenderwechsel unveränderte Item-Updates auslassen, da Foundry sie sonst im
  nativen Preflight entfernt und der strikte Batch absichtlich abbricht.
- T09 ist abgenommen: zweiphasiger GM-Transfer mit Vorschau und SHA-256-Prüfung,
  vollständigen Item-Sicherungen im privaten Vorgangsbeleg-Journal und inaktiven
  Kopien auf der Bastion. Erst nach tatsächlichem Rücklesen und Vergleich werden
  Quellen entfernt und Kopien aktiviert; beides samt Abschlussstatus atomar.
  Vorbereitete Kopien zählen weder für Regeln noch für Fortschritt. Geänderte
  Quellen/Kopien verhindern den Abschluss, Fehler lassen sich fortsetzen oder
  vorbereitete Kopien unter Erhalt der Quellen verwerfen. UUID-Zuordnung bleibt
  in der Sicherung; interne Facility-Verweise werden umgeschrieben, externe
  Makros/andere Dokumente bleiben zur ausdrücklichen GM-Pflege.
- Transferdatensätze enthalten UUID und native Erstellungszeit des Bastion-Aktors,
  damit eine später neu erstellte Bastion mit derselben festen ID keine alten
  Übernahmen übernimmt. Vollständige Sicherungen niemals öffentlich speichern.
- Bereits bezahlte native Herstellungsaufträge können auf Items im Inventar ihres
  tatsächlichen Besitzers verweisen. Nur bei der Ergebnisabrechnung ist diese
  eigene Inventarreferenz zusätzlich erlaubt; neue Spieleraufträge benötigen
  weiterhin geschützte Welt-/Kompendiumvorlagen, fremde Inventare sind gesperrt.
- T10 und Stufe 1 sind abgenommen. Version 0.1.0 ist die Stufe-1-Auslieferung;
  das ursprüngliche Archiv enthielt 42 geprüfte Quelldateien. Damals 27 Unit-Tests,
  elf native Integrationstests, Schema-/Vorlagenprüfung und Paket-Audit bestanden.
  Die ursprüngliche Abnahme umfasste 196 DE/EN-Schlüssel; die Namen der 35 nativen
  Einrichtungstypen folgen im Deutschen der lokalen Handbuch-Begriffsvorlage.
  Abnahme und Zuordnung aller Kriterien
  stehen in [Stufe-1-Abnahme](docs/stage1-acceptance.md). N01 gestaltet den
  abgenommenen Bogen neu; T11–T14 bleiben späterer Ausbau und werden nicht als umgesetzt geführt.
  Bau-/Fortschrittspfad, Absenderzuordnung, Parallelität und Transaktionsabbrüche
  sind bestätigt. Details stehen in `PLAN.md`.
- N01 ist abgenommen: native Kacheln, Kompendiumbrowser und Aktivitätsauswahl,
  Kontext-/Fenstermenüs und sortierte Besitzerabschnitte.
  Die frühere Gesamtübersicht und Besitzerfilter entfallen. Alle 30 Unit-Tests und
  zwölf nativen Integrationstests bestanden; beide Themen, schmale Fenster und
  Dialoge visuell geprüft. Das aktualisierte Archiv umfasst 45 geprüfte Dateien,
  DE/EN jeweils 205 Schlüssel. [N01-Abnahme](docs/native-sheet-acceptance.md).
  Für den Prüflauf wurde das lokale Datenvolume kopiert, damit die vorhandene
  Bastion nicht durch Integrationsfixtures ersetzt wird. Native Dokumentergebnisse
  in Tests über ihre Identität zuordnen, nicht über ihre Rückgabereihenfolge.
  Die ursprüngliche Testinstallation mit „Manor House“ (fünf Akteure, zwei zentrale
  Einrichtungen, zwei Teilnehmer) ist wieder gestartet; das temporäre Testvolume
  ist entfernt. Die ungenutzten Testkonten „SB T10 Alice“ und „SB T10 Bob“
  sind nach ausdrücklicher Nutzerfreigabe gelöscht. Alle Akteurdaten und die
  übrigen Benutzer sind beim Vorher-/Nachher-Vergleich unverändert.
- Der Foundry-MCP-Anschluss ist weiterhin nicht erreichbar. Der Browser-Skill
  meldet keine verfügbaren Browser. Eine separate lokale Chromium-Testumgebung
  prüft deshalb die isolierte Welt über Playwright; T01 ist damit bestanden.
- `FoundryVTT-Node-14.369.zip`, `dev/secrets.json`, Docker-Daten und `dist/` sind
  lokale Entwicklungsartefakte und gehören nicht ins Repository oder Modularchiv.
- Lokale Interviewdaten liegen unter `.grill-with-ui/` im Projekt. Sie sind kein
  Bestandteil des auszuliefernden Moduls. Bei weiteren Interviews in diesem Projekt
  `GRILL_HOME="$PWD/.grill-with-ui"` verwenden, damit Sessions dort auffindbar bleiben.
