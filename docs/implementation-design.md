# Shared Bastion – Umsetzungsdesign

Stand: 2026-10-20. Stufe 1 ist funktional abgenommen; die ausdrückliche
Designentscheidung vom 20. Oktober ersetzt die bisherige Listenansicht durch
native D&D5e-Einrichtungskacheln. Der [Implementierungsplan](../PLAN.md) führt die
Neugestaltung unter N01; die [N01-Abnahme](native-sheet-acceptance.md) dokumentiert
die Prüfungen. Die Abschnitte zum Interview dokumentieren die fachliche
Grundlage; geänderte UI-Entscheidungen sind unten nachgeführt. Der
[Prototyp v1](implementation-visual.html) bleibt eine historische lokale Simulation
und ist nicht die visuelle Referenz des neuen Bogens. Der Szenengenerator bleibt
zurückgestellt.

## Native Oberfläche ab 2026-10-20

Der Bogen enthält ausschließlich Besitzerabschnitte mit Portrait, Spielername und
kleiner Stufenangabe darunter (nur für Besitzer/GM). Der Charaktername bleibt im
Tooltip des Abschnittskopfs; ohne Spielerzuordnung dient er als Ersatzname.
Basiseinrichtungen stehen links und besondere Einrichtungen rechts. Eigene Charaktere
stehen zuerst, weitere nach dem alphabetisch ersten Nicht-GM mit Besitzerrecht,
danach Charaktername. Beim GM gibt es keine Bevorzugung. Fehlende Zuordnungen
stehen zuletzt. Benutzerreferenzen sind öffentliche Teilnehmermetadaten; private
Level, Geldwerte und Voraussetzungen werden nicht veröffentlicht.

Freie Plätze öffnen `CompendiumBrowser.selectOne` mit Kategorie und Besitzerlevel
(für GM ohne Levelgrenze). Die native Auswahl erstellt nichts selbst; der bestehende
Befehl bestimmt kostenlose Fertigstellung und individuelle Plätze erneut. Welt-Items
bleiben im Abschnittskontextmenü verfügbar. Bestehende Charaktereinrichtungen
zählen bis zur Übernahme mit. Ein Klick auf eine eigene Kachel öffnet eine begrenzte
Unterklasse des nativen `ActivityChoiceDialog`; die ausgewählte Aktion läuft über
den bisherigen Bau-/Auftragsadapter und GM-Befehlspfad. Kein `Item.use` und keine
native Direktzahlung auf dem Träger. Fremde Kacheln erhalten keine Aktionen.

Native Anwendungsmixins, Menüs, Karten, Icons und Themenvariablen werden verwendet.
Nur die an den nativen Charakterbogen gebundenen Facility-Styles werden lokal
adaptiert (D&D5e 6.0.6, `less/v2/character.less`, MIT). Die Bastion übernimmt keine
Charakterbogenklasse und verändert keine Systemdateien. Rechtsklick/Umschalt+F10,
Pfeiltasten und Enter bedienen Einrichtungskontextmenüs; GM-Verwaltung und Züge
liegen im Fenstermenü. Kacheltitel (13), Größenangaben (10), Personalplätze (26),
Auftragsicons (22), Innenabstände (8) und freie Plätze (50 Pixel Mindesthöhe)
folgen den nativen Maßen. Hinweise, Notizen, Ergebnisse und Ausnahmen erscheinen
als kleines Symbol unten rechts mit Text-Tooltip; Warnungen erhalten ein
Warnsymbol. Die Zugübersicht liegt ebenfalls als Infosymbol unten rechts am
Fenster. Tooltips unterstützen Tastaturfokus und behandeln Eingaben als Text. Beide Themen und einspaltige schmale Fenster werden geprüft.

## Begriffe (Terms)

| Begriff | Bedeutung | Vermeiden |
| --- | --- | --- |
| Bastion | Gemeinsamer Aktor mit allen zentral gespeicherten Einrichtungen und dem gemeinsamen Bogen. | Sammelansicht dauerhaft auf Charakteren gespeicherter Einrichtungen. |
| Einrichtung / Facility | Natives D&D5e-Item vom Typ `facility`, das auf der gemeinsamen Bastion gespeichert wird. | Bloßes Bild eines Raums ohne Verwaltungsdaten. |
| Besitzercharakter | Charakter, dessen Voraussetzungen, Limits, Ressourcen und Spielerrechte für eine Einrichtung gelten. | Item-Elternaktor als automatischer Regelbesitzer. |
| Teilnehmer | Ein vom GM zugeordneter Charakter und die Benutzer, die diesen Charakter besitzen. | Alle Weltbenutzer pauschal als Bearbeiter. |
| Bastionzug | Vom GM ausgelöster Verwaltungszug, getrennt vom täglichen Kalenderfortschritt. | Kampfrunde oder ungeprüft ein weiterer Fortschrittsschritt. |
| Betriebsdaten | Name, Notizen, Personalzuordnungen, Aufträge und der über reguläre Aktionen gesteuerte Ausbau. | Freie Änderung der Regeldefinition. |
| GM-Regelausnahme | Begründete, sichtbare Ausnahme von Voraussetzungen oder Limits für eine bestimmte Einrichtung. | Globale Freigabe aller Spieleraktionen oder kostenlose Aufträge. |
| Generierter Raum | Der Einrichtung zugeordnete Boden, Beschriftung, Wände und Tür innerhalb der Szene. | Einrichtung und Szenengeometrie als dasselbe Dokument. |

## Warum (Why)

Der Nutzer möchte eine geteilte Bastion statt getrennter Verwaltung auf jedem
Charakterbogen: Alle Einrichtungen sollen mit ihrem Besitzer auf einem speziellen
gemeinsamen Bogen stehen. Jeder Spieler verwaltet seine eigenen Einrichtungen
dort selbst. Die Einrichtungen sollen tatsächlich in diesem Bogen leben und die
Charakterbögen privat bleiben; der GM soll die normale Verwaltung nicht übernehmen
müssen. Als zweite Stufe soll aus den Einrichtungen automatisch eine Szene mit
begehbaren Räumen entstehen. Das Interview klärt die noch offenen Grenzen von
Bearbeitung, Benutzerführung und Szenendarstellung, bevor die Implementierung beginnt.

## Festgelegte Entscheidungen (Locked decisions)

### Bereits vor dem Interview festgelegte Grundlage

Ziel ist ein Modul mit der Kennung `shared-bastion` für Foundry V14 und D&D5e
6.0.x. Die erste Version unterstützt eine gemeinsame Bastion pro Welt. Ein
markierter nativer Charakter-Aktor dient als zentraler Träger; ein eigener
ApplicationV2-Bogen bildet die Bastion ab. Ein neuer Document-Subtyp ist für diese
Version nicht vorgesehen. Der Aktor ist kein neuer Spielercharakter mit eigenen
regelbestimmenden Klassenstufen oder einer Gruppenkasse.

Die nativen Facility-Items bleiben auf dem zentralen Aktor gespeichert. Teilnehmer,
Besitzercharakter, Datenversion, Szenenverknüpfung und GM-Ausnahmen werden in
Modul-Metadaten festgehalten. Es gibt keine dauerhafte zweite Facility-Kopie auf dem
Besitzercharakter. Ein Systemadapter trennt den physischen Item-Elternaktor vom
Charakter, dessen Voraussetzungen und Ressourcen relevant sind. Kosten, Ergebnisse
und individuelle Einrichtungslimits werden diesem Besitzercharakter zugeordnet.

Teilnehmer sehen die gemeinsamen Bastiondaten, erhalten aber keine zusätzlichen
Leserechte auf fremde Charaktere und keine allgemeinen Schreibrechte auf den
zentralen Aktor. Die Bastion veröffentlicht nur erforderliche Daten; vollständige
private Charakterdaten werden dort nicht gespiegelt. Der GM besitzt Vollzugriff.

Ein angemeldeter GM ist für Schreibaktionen erforderlich. Sein Client prüft die
konkrete Spieleraktion und führt sie automatisch aus; der GM muss weder die Aktion
bestätigen noch ihre Daten selbst eintragen. Ohne GM bleibt die Bastion lesbar und
zeigt diesen Zustand an. Genau ein GM-Client verarbeitet eine Aktion, auch wenn
mehrere GMs angemeldet sind. Beliebige Dokument-Patches mit GM-Rechten sind keine
öffentliche Modulschnittstelle.

Native Daten, Systemkonfigurationen und geeignete Auftragsfunktionen werden
wiederverwendet. Kalenderfortschritt und Bastionzüge dürfen dieselbe Einrichtung
nicht doppelt fortschreiben. Wiederholte Anfragen und Teilfehler bei Änderungen
an mehreren Dokumenten müssen ohne doppelte Kosten oder Belohnungen behandelt
werden. Diese Fähigkeiten sind in der ursprünglichen Stufe-1-Abnahme praktisch belegt.

Bereits vorhandene Einrichtungen werden in einem einmaligen GM-Transfer mit
Vorschau übernommen. Fortschritt, Besitzer und relevante Referenzen bleiben
erhalten. Ausgangsdaten werden gesichert; Quell-Items werden erst nach verifiziertem
Transfer entfernt. Eine Wiederholung darf keine aktiven Duplikate hinterlassen.

Die Szene nutzt native Zeichnungen, Wände und Türen. Einrichtungen und erzeugte
Szenenelemente werden über stabile IDs zugeordnet. Der Generator berechnet zunächst
eine Vorschau; erst ein GM-Klick erstellt oder aktualisiert die Szene. Eigene
Dekorationen bleiben erhalten. Manuell veränderte generierte Räume werden bei
Konflikten übersprungen und angezeigt. Vor Abriss oder Verkleinerung werden
betroffene Tokens versetzt. Wiederholte Übernahme erzeugt keine Duplikate.

### Q8: Ein kompakter gemeinsamer Bau statt Besitzerflügeln

**Entscheidung:** Die Räume bilden einen kompakten gemeinsamen Bau an einem
verbundenen Hauptflur. Neue Einrichtungen ergänzen freie Stellen entlang dieses
Flurs, unabhängig davon, wem sie gehören. Bestehende Raumpositionen bleiben nach
Möglichkeit erhalten. Gleiche Eingaben und gespeicherte Positionen ergeben dieselbe
Planung. Ein Besitzerwechsel allein verändert weder Raumposition noch Flur.

Die Entscheidung ist dauerhaft relevant, weil bereits erzeugte und manuell
ergänzte Räume ihren Ort behalten sollen. Eine spätere Änderung des Grundprinzips
wäre ein tatsächlicher Umbau der bestehenden Szene und keine bloße Umgruppierung
der Tabellenansicht.

**Verworfene Alternative B – eigener Flügel pro Besitzer:** Getrennte Flügel
machen Zuständigkeiten räumlich sichtbar, verlangen aber Platzreserven und
kompliziertere Erweiterungen. Sie koppeln Besitzerwechsel unnötig an den Grundriss.

**Verworfene Alternative C – Gruppierung nach Funktion:** Funktionsgruppen wie
Handwerk, Wissen und Wohnen benötigen zusätzliche Zuordnungen für jede Einrichtung
und erschweren Erweiterungen unter Erhalt der vorhandenen Positionen. Für die
erste gemeinsame Bastion reicht die Besitzerbeschriftung der Räume.

**Prüfung:** Einen Raum ergänzen, den Besitzer einer bestehenden Einrichtung
wechseln und die Szene erneut planen. Besitzerwechsel verschieben keinen Raum;
alle fertigen Räume bleiben über den Hauptflur erreichbar.

## Routineentscheidungen (Routine choices)

- **Q1 – Regelstrenge: A.** Fehlende Voraussetzungen und überschrittene
  Einrichtungslimits sperren Spieleraktionen. Der GM kann pro Einrichtung eine
  begründete Ausnahme hinterlegen. Sie ist sichtbar und bleibt nach Neuladen,
  Levelwechsel und erneuter Prüfung erhalten; sie macht fremde Einrichtungen nicht
  bearbeitbar und ersetzt keine Kostenabrechnung. Eine Ausnahme wird nicht durch
  bloßes Schließen des Bogens aufgehoben. Prüfen: ungültige Anlage verhindern,
  passende Ausnahme zulassen und ihre Wirksamkeit nach Neuladen kontrollieren.
- **Q2 – Bedienung wie im bisherigen Bastion-Reiter.** Die Antwort lautete:
  „nur welche der spieler hat, analog wie es jetzt im characterbogen des dnd 6
  moduls geht“. Der gemeinsame Bogen bietet die Betriebsaktionen für die eigenen
  Einrichtungen. Q4 klärt dazu das Hinzufügen neuer Einrichtungen, Q10 die Grenze
  zwischen Betrieb und freier Regelbearbeitung. Die Antwort bedeutet weder eine
  allgemeine Bearbeitungsfreigabe noch eine Rückverlagerung der Items auf Charaktere.
- **Q3 – Bogenaufbau, aktualisiert am 2026-10-20.** Ausschließlich sortierte
  Besitzerabschnitte mit Kacheln in zwei Spalten. Die frühere Wahl eines zusätzlichen
  Gesamtübersichtsreiters und der Filter ist durch die neue Nutzerentscheidung
  ersetzt. Änderungen erscheinen ohne Neuladen bei allen Teilnehmern.
- **Q4 – Hinzufügen: A.** Spieler dürfen vorhandene eigene Einrichtungen bedienen
  und neue für ihren Charakter zulässige Einrichtungen hinzufügen. Die Auswahl
  verwendet zugängliche Welt-Items und Kompendien sowie individuelle Plätze und
  Voraussetzungen. Ein GM muss neue Einrichtungen nicht routinemäßig selbst
  anlegen. Jede neue Einrichtung erhält den handelnden Besitzercharakter; eine
  Zuordnung zu fremden Charakteren ist keine erlaubte Spieleraktion.
- **Q5 – Zugvorbereitung: C.** Es gibt keinen Bereit-Status, keine Pflichtbestätigung
  je Spieler und keine Bereitschaftssperre. Der GM entscheidet anhand der Aufträge
  und der Absprache am Tisch, wann er den Bastionzug auslöst. Technische Prüfungen
  und native Auftragsregeln bleiben bestehen. Es werden keine zusätzlichen
  Erinnerungen oder Bereitschaftsautomatismen aus dieser Entscheidung abgeleitet.
- **Q6 – Außenanlagen: B.** In der ersten Version werden alle Einrichtungen als
  geschlossene rechteckige Räume mit Zugang zum Hauptflur dargestellt, einschließlich
  Garten oder anderer Außenanlage. Der Name und die Besitzerbeschriftung bleiben
  erhalten; die Fläche richtet sich weiterhin nach der Systemgröße. Es gibt weder
  eine Innen-/Außen-Typisierung noch eine separate Außenszene in v1. Die Darstellung
  verändert keine Regelwerte der Einrichtung.
- **Q7 – Einstieg: C.** Teilnehmer öffnen ausschließlich den zentralen Aktor über
  das Akteurverzeichnis. Vorhandene Charakterbögen erhalten keinen zusätzlichen
  Link und ihr Bastion-Reiter wird nicht umgeleitet. Nach dem Transfer liegen die
  Einrichtungen auf dem zentralen Aktor. Es entstehen keine zusätzlichen
  Sheet-Integrationen nur zur Nachbildung des bisherigen Einstiegs.
- **Q9 – Sicht: B.** Die erzeugte Szene verwendet normale Tokensicht. Wände und
  geschlossene Türen verdecken andere Räume; beleuchtete Innenräume geben keine
  Sicht durch diese Grenzen. Der GM platziert normale verknüpfte Charaktertokens
  mit passenden Sichteinstellungen. Spieler bewegen ihre eigenen Tokens und
  bedienen unverschlossene Türen im Rahmen der Foundry-Rechte. Es wird kein
  spezielles Bewegungssystem eingeführt. Prüfen: Mit zwei Tokens können die
  Spieler eigene Tokens kontrollieren, sehen durch eine geschlossene Tür nicht
  in den nächsten Raum und erhalten nach Öffnen entsprechend Sicht.
- **Q10 – Bearbeitungsgrenze: A.** Spieler bearbeiten eigene Namen, Notizen,
  Personal und Aufträge. Bau und Größe ändern sie über die vorgesehenen Bau- und
  Erweiterungsaktionen. Direkte Änderungen der Regeldefinition, etwa erforderliches
  Level oder Auftragsdefinitionen, sowie Regelausnahmen bleiben dem GM vorbehalten.
  Dass die native Einrichtung ein Item ist, bedeutet nicht, dass der gemeinsame
  Bogen Spielern einen unbeschränkten Item-Editor oder freie Update-Patches gibt.
  Dieselbe Grenze muss bei Befehlsverarbeitung und Eingabeprüfung gelten.

### Daraus folgender Bedienablauf

1. Der GM erstellt die Bastion und ordnet die teilnehmenden Charaktere zu.
2. Teilnehmer öffnen den Bastion-Aktor im Akteurverzeichnis und sehen alle
   sortierte Besitzerabschnitte mit Einrichtungskacheln.
3. Ein Spieler wählt eine eigene Einrichtung und eine erlaubte Betriebsaktion
   oder fügt eine zulässige neue Einrichtung hinzu. Erforderliche Auftragsdaten
   werden vor der Ausführung eingegeben.
4. Die Aktion wird als konkreter Befehl verarbeitet. Der aktive GM-Client prüft
   Absender, Teilnahme, Besitzer, Eingaben, Voraussetzungen und Ressourcen; er
   berücksichtigt dabei eine passende gespeicherte GM-Regelausnahme.
5. Erlaubte Änderungen werden gespeichert, Auswirkungen dem richtigen Charakter
   zugeordnet und alle betroffenen Ansichten aktualisiert. Abbruch oder Ablehnung
   erzeugt keine Ressourcenänderung; Fehler werden dem auslösenden Spieler angezeigt.
6. Der GM führt bei Bedarf den Bastionzug aus. Kalendertage und native Automatik
   werden über die gemeinsame Integration koordiniert.
7. In Stufe 2 zeigt der Bogen ausstehende Raumänderungen an. Der GM prüft die
   Vorschau und übernimmt sie; reine Auftragsänderungen erfordern keinen Umbau.

### Umsetzung und Abnahme

Die nummerierten Tasks T01–T14 bleiben in `PLAN.md` die einzige Taskliste.
Zuerst werden Modulgerüst und Besitzerintegration nachgewiesen, danach Rechte,
Bogen, Betrieb, Kalender und Transfer umgesetzt. Die gemeinsame Verwaltung muss
ohne Szene verwendbar und abgenommen sein, bevor der Generator ausgebaut wird.

Für die Abnahme sind ein GM und zwei getrennte Spielerclients mit privaten
Charakteren verschiedener Level und Ressourcen erforderlich. Zusätzlich werden
GM-Abwesenheit, mehrere GMs, Wiederholung von Anfragen und GM-Wechsel geprüft.
Automatisierte Tests konzentrieren sich auf Regeln, Rechte, Wiederholungen und
Grundrissgeometrie. Native Dialoge, Rechte, Fortschritt und Bewegung benötigen
Prüfungen in einer laufenden Foundry-Welt. Der Prototyp ersetzt diese nicht.

## Verifizierte Fakten (Verified facts)

- Das Projekt enthielt zu Beginn des Interviews `PLAN.md` und `AGENTS.md`,
  aber keine Modulimplementierung, Paketkonfiguration oder Testkommandos.
- Der vorhandene Plan legt zentrale native Facility-Items, private Charaktere,
  individuelle Regeln und einen automatisch arbeitenden GM-Client bereits fest.
  Das Interview hat diese Grundlagen nicht durch ein anderes Speichermodell ersetzt.
- Die vorangegangene Quellcode-Recherche weist Facility-Daten und native Auftrags-
  beziehungsweise Kalenderfunktionen nach. Die Quellen sind in `PLAN.md` verlinkt.
  Daraus folgt noch kein Nachweis, dass diese Funktionen unverändert für einen
  separaten Besitzercharakter funktionieren.
- Der lokale Standardpfad `/Users/robert/Library/Application Support/FoundryVTT`
  war bei der Recherche nicht vorhanden. Der verfügbare Foundry-MCP-Anschluss
  lieferte einen Verbindungsfehler. Das schließt eine andere lokale oder externe
  Installation nicht aus; konkrete installierte Builds wurden nicht bestätigt.
- Zehn Fragen wurden beantwortet; keine Frage wurde zurückgestellt. Der
  Prototyp v1 wurde nach allen zehn Antworten erzeugt. Es gab keine nachfolgenden
  widersprechenden Antworten oder offenen Änderungswünsche zum Prototyp.

## Risiken (Risks)

- **Besitzerkontext der Systemfunktionen:** Das native Item liegt auf einem
  anderen Aktor als seinem Regelbesitzer. Aufträge, Kosten, Ergebnisse und
  Voraussetzungen dürfen nicht versehentlich den zentralen Träger verwenden.
  T02 verlangt deshalb den praktischen Nachweis vor dem Ausbau der Oberfläche.
- **Schreibrechte und Transport:** Nur die UI zu sperren reicht nicht aus.
  Der GM-Befehlspfad muss den Absender und die tatsächlich erlaubte Aktion prüfen.
  Eine frei mitgesendete Benutzer-ID allein ist kein ausreichender Nachweis.
  Die konkrete belastbare Transportintegration ist während T04 zu verifizieren.
- **Änderungen an mehreren Dokumenten:** Charakterressourcen und Facility-Status
  können nicht als ungeprüft atomar behandelt werden. Wiederholte Anfragen und
  Teilfehler brauchen nachvollziehbare Behandlung ohne doppelte Abbuchungen.
- **Doppelter Fortschritt:** Der zentrale Charakter-Aktor könnte von nativen
  Abläufen bereits verarbeitet werden. Der Adapter darf denselben Tageswechsel
  oder Bastionzug nicht zusätzlich anwenden.
- **GM-Ausnahmen:** Eine Ausnahme muss eng auf die Einrichtung und die betreffende
  Regelprüfung begrenzt bleiben. Sie darf keine Rechteprüfung oder Kosten umgehen.
  Direkte Spieleränderungen an Regeldefinitionen würden dieses Modell unterlaufen.
- **Tokensicht:** Beleuchtung und Tokensicht sind getrennte Einstellungen. Die
  Abnahme muss reale Charaktertokens verwenden; eine vollständig sichtbare
  Grundrisszeichnung im Prototyp belegt keine funktionierende Foundry-Sichtprüfung.
- **Szenenaktualisierung:** Generierte und manuelle Änderungen können kollidieren.
  Konflikträume werden angezeigt und übersprungen, statt Änderungen blind zu
  überschreiben. Tokens müssen vor gefährdendem Abriss oder Verkleinerung versetzt sein.
- **Versionen:** Konkrete Foundry-/D&D5e-Builds wurden noch nicht getestet.
  Versionen, Anpassungen und Grenzen sind bei der Implementierung zu dokumentieren.

## Zurückgestellt (Deferred)

Im Interview wurde keine Frage zurückgestellt. Folgende Funktionen gehören
ausdrücklich zum späteren Ausbau:

- **Offene Außenanlagen und separate Außenszenen:** Wieder aufnehmen, wenn
  geschlossene Räume für Gärten und ähnliche Einrichtungen nicht mehr ausreichen.
- **Möblierte Battlemaps, Grafikpakete und mehrere Etagen:** Wieder aufnehmen,
  sobald Verwaltung und einfacher begehbarer Grundriss vollständig abgenommen sind.
- **Besitzerflügel oder Funktionsgruppen im Grundriss:** Nur bei ausdrücklichem
  Änderungswunsch wieder aufnehmen; für vorhandene Szenen ist dann ein Umbaukonzept nötig.
- **Charakterbogen-Links, Umleitungen und alternative Sheets:** Nur bei einem
  späteren Bedarf an zusätzlichen Einstiegen wieder aufnehmen.
- **Bereit-Status vor Bastionzügen:** Nur bei späterem Koordinationsbedarf wieder
  aufnehmen. Der aktuelle Ablauf nutzt Auftragsübersicht und Tischabsprache.
- **Mehrere gemeinsame Bastionen und gemeinsame Kasse:** Erst bei einem neuen
  Produktauftrag; keine stillschweigende Erweiterung der jetzigen Besitzerregeln.

## Offene Diskussionspunkte (Open threads)

Keine offenen Produktentscheidungen oder unbeantworteten Diskussionen. Die
Interpretation der ursprünglichen Antwort auf Q2 wurde mit Q4 und Q10 präzisiert.
Die technischen Nachweise aus dem Risikoabschnitt sind Implementierungsaufgaben,
keine bereits erfolgreich durchgeführten Tests.
