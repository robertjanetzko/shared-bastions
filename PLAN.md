# Shared Bastion – Anforderungen und Aufgaben

Stand: 2026-10-20 · Status: Stufe 1 (T01–T10) abgenommen; native Bogen-Neugestaltung N01 abgenommen, Version 0.1.0.

Die Entscheidungen aus dem abgeschlossenen `grill-with-ui`-Interview sind hier
eingearbeitet. Begründungen und Abläufe stehen im
[Umsetzungsdesign](docs/implementation-design.md); der
[interaktive Bogenentwurf](docs/implementation-visual.html) ist eine lokale Simulation.

## 1. Ziel

Ein Foundry-VTT-Modul für eine gemeinsame D&D-Bastion nach den Regeln von 2024.
Alle Teilnehmer öffnen denselben Bastion-Bogen. Die Einrichtungen werden tatsächlich
auf der gemeinsamen Bastion gespeichert und gehören jeweils einem Charakter.
Spieler verwalten ihre Einrichtungen selbst; ihre Charakterbögen bleiben privat.

Aktueller Arbeitsauftrag: **N01 – den abgenommenen Stufe-1-Bogen im nativen
D&D5e-Design neu gestalten und regressionsprüfen**. T01–T10 bleiben funktional
abgeschlossen.
Stufe 2 bleibt geplanter späterer Ausbau und gehört nicht zur aktuellen Abnahme.

Die Umsetzung erfolgt in zwei unabhängig abnehmbaren Stufen:

1. Gemeinsamer Bastion-Bogen mit Besitzerzuordnung und individueller Verwaltung.
2. Automatisch erzeugter, begehbarer Grundriss mit Vorschau vor Aktualisierungen.

## 2. Festgelegte Entscheidungen

| Thema | Entscheidung |
| --- | --- |
| Zielplattform | Foundry VTT V14 und D&D5e 6.0.x; konkrete getestete Builds dokumentieren. |
| Modulkennung | `shared-bastion` |
| Speicherung | Native `facility`-Items auf einem zentralen Bastion-Aktor. |
| Aktor und Bogen | Markierter D&D5e-Charakter-Aktor mit eigenem ApplicationV2-Bogen; zunächst kein eigener Document-Subtyp. |
| Regelzuordnung | Level, Voraussetzungen, Einrichtungslimits, Kosten und Belohnungen gelten je Besitzercharakter. |
| Rechte | Teilnehmer lesen alle Einrichtungen und verwalten ausschließlich die eigenen; GM hat Vollzugriff. |
| Privatsphäre | Keine zusätzlichen Leserechte auf fremde Charakterbögen. |
| Bogenaufbau | Ausschließlich Besitzerabschnitte mit nativen Einrichtungskacheln in zwei Spalten; eigene Charaktere zuerst, andere nach Spielernamen. |
| Einstieg | Ausschließlich Akteurverzeichnis; bestehende Charakterbögen bleiben unverändert. |
| Spielerbearbeitung | Eigene Namen, Notizen, Personal und Aufträge; Bau und Erweiterung über vorgesehene Aktionen. Regeldefinitionen bearbeitet der GM. |
| Regelprüfung | Für Spieler sperren; der GM darf begründete Ausnahmen für Voraussetzungen und Limits je Einrichtung setzen. |
| GM-Anwesenheit | Ein GM muss zum Schreiben angemeldet sein; sein Client führt erlaubte Spieleraktionen ohne Bestätigungen aus. |
| Ohne GM | Gemeinsame Bastion ist lesbar; Änderungen und Aufträge sind gesperrt. |
| Bastionzüge | GM-Aktion; Kalender- und Systemintegration darf Fortschritt nicht doppelt auslösen. |
| Zugvorbereitung | Kein Bereit-Status und keine Bereitschaftssperre; Abstimmung am Tisch und vorhandene Auftragsübersicht. |
| Szene | Spielbarer Grundriss mit Böden, Beschriftungen, Wänden, Türen und verbundenem Hauptflur. |
| Raumdarstellung | In v1 alle Einrichtungen als geschlossene Räume, auch Außenanlagen. |
| Grundriss | Kompakter gemeinsamer Bau, unabhängig vom Besitzer; neue Räume an freien Stellen des Hauptflurs ergänzen. |
| Sicht | Normale Tokensicht: Wände und geschlossene Türen verdecken andere Räume; Innenräume sind beleuchtet. |
| Szenenänderungen | Automatisch erkennen, nach Vorschau durch GM übernehmen. |
| Umfang v1 | Eine gemeinsame Bastion pro Welt; eine Etage, quadratisches Raster, 5 Fuß je Feld. |
| Sprache | Deutsche Oberfläche; Texte über Übersetzungsschlüssel, zusätzlich Englisch. |

Der zentrale Aktor ist ein Datenträger. Sein eigener Charakterlevel und seine
Währung dürfen nicht versehentlich die individuellen Bastionregeln bestimmen.

## 3. Anforderungen

### Gemeinsamer Bogen

- **B01:** Der GM kann die Bastion erstellen und Teilnehmercharaktere zuordnen.
- **B02:** Teilnehmer öffnen den gemeinsamen Bogen ausschließlich über das
  Akteurverzeichnis. Bestehende Charakterbögen erhalten keine Links oder Umleitungen.
- **B03:** Alle Einrichtungen sind zentral gespeicherte native Facility-Items;
  Charakterbögen sind nicht deren dauerhafter Speicher.
- **B04:** Jede Einrichtung hat genau einen Besitzercharakter. Dessen Foundry-
  Eigentümer dürfen sie verwalten; eine GM-Neuzuordnung bleibt möglich.
- **B05:** Der Bogen zeigt Abschnitte je Besitzercharakter mit Spieler- und
  Charaktername; Basiseinrichtungen links, besondere rechts. Kacheln verwenden das
  Facility-Bild, Größe, Auftragsicon, Personalplätze und Fortschritt. Eigene
  Charaktere stehen zuerst, andere alphabetisch nach Spielernamen und Charaktername.
  Beim GM gilt die alphabetische Reihenfolge ohne Bevorzugung. Schmale Fenster
  stellen die Spalten untereinander dar.
- **B06:** Der Bogen hat keine Gesamtübersicht und keine Besitzerfilter. Freie
  Plätze öffnen den nativen, nach Einrichtungskategorie gefilterten Kompendiumbrowser.
  Eigene Kacheln öffnen die native Aktivitätsauswahl; Verwaltung erfolgt über
  Kontextmenüs, GM-Verwaltung und Bastionzüge über das Fenstermenü. Fremde
  Einrichtungen sind für Spieler ausschließlich sichtbar.
- **B07:** Spieler können zulässige neue Einrichtungen hinzufügen, eigene Namen
  und Notizen bearbeiten, eigene Einrichtungen entfernen sowie eigene Aufträge,
  Personal und Verteidiger verwalten. Bau und Größe ändern sich über die vorgesehenen
  Bau-/Erweiterungsaktionen. Freies Bearbeiten von Regeldefinitionen bleibt dem GM
  vorbehalten; die native Bastion-Bedienung ist der Maßstab für die Betriebsaktionen.
- **B08:** Level, Voraussetzungen und Limits werden pro Besitzercharakter
  geprüft; Kosten und Belohnungen werden dem richtigen Charakter zugeordnet.
  Es gibt zunächst keine gemeinsame Kasse.
- **B09:** Änderungen werden bei allen geöffneten Bastion-Bögen aktualisiert.
- **B10:** Bereits vorhandene Einrichtungen können einmalig mit Vorschau
  übertragen werden. Besitz, Fortschritt und relevante Referenzen bleiben
  erhalten; nach erfolgreichem Transfer gibt es keine aktiven Duplikate.

### Rechte, Datenschutz und Systemintegration

- **R01:** Die Charakterbögen bleiben privat. Der gemeinsame Aktor enthält nur
  notwendige Bastiondaten, keine vollständigen Kopien privater Charakterdaten.
- **R02:** Teilnehmer erhalten auf dem zentralen Aktor Leserechte. Schreiben
  erfolgt über konkrete Modulbefehle an genau einen aktiven GM-Client.
- **R03:** Vor jedem Schreibvorgang werden anfragender Benutzer, Teilnahme,
  Besitzerzuordnung, konkrete Aktion und Eingaben geprüft. Eine vom Client
  behauptete Besitzerzuordnung allein reicht nicht als Berechtigung.
- **R04:** Normale Spieleraktionen benötigen keine GM-Bestätigung. Ohne GM
  wird der Lesemodus mit verständlicher Statusmeldung angezeigt.
- **R05:** Gleichzeitige oder wiederholte Anfragen dürfen Kosten, Belohnungen,
  Aufträge und Fortschritt nicht doppelt verbuchen. Konflikte werden sichtbar.
- **R06:** Native Facility-Daten, Systemkonfiguration und geeignete vorhandene
  Auftragsfunktionen werden über einen abgegrenzten Systemadapter eingebunden.
  Der Besitzerkontext wird ausdrücklich aufgelöst.
- **R07:** Kalenderfortschritt, Bastionzüge und native Automatik werden gemeinsam
  integriert; jede Einrichtung wird pro Ereignis genau einmal verarbeitet.
- **R08:** Fehlende Besitzercharaktere oder unauflösbare Referenzen werden
  angezeigt. Betroffene Aktionen bleiben gesperrt, bis der GM sie repariert.
- **R09:** Einrichtungsvorlagen kommen aus vorhandenen Welt-Items und
  zugänglichen Kompendien; keine vollständige Regelsammlung wird mitgeliefert.
- **R10:** Fehlende Voraussetzungen und überschrittene Limits sperren die
  betreffende Spieleraktion. Der GM kann eine begründete Ausnahme je Einrichtung
  hinterlegen; sie ist sichtbar und bleibt bei Neuladen und erneuter Prüfung
  erhalten. Kosten und Besitzerrechte werden dadurch nicht umgangen.
- **R11:** Es gibt keinen Bereit-Status. Der GM entscheidet anhand der Aufträge
  und der Absprache am Tisch über den Bastionzug.

### Begehbare Szene

- **S01:** Der GM kann aus dem Bogen eine Szene mit Vorschau erstellen und öffnen.
- **S02:** Jede Einrichtung wird als beschrifteter rechteckiger Raum dargestellt.
  Die Fläche stammt aus der Größenkonfiguration des Systems. Unfertige Räume
  erscheinen als gekennzeichnete Baustellen. In v1 werden auch Außenanlagen als
  geschlossene Räume dargestellt; es gibt keine Innen-/Außen-Typisierung.
- **S03:** Fertige Räume sind über Türen und einen verbundenen Hauptflur
  erreichbar. Es entsteht ein kompakter gemeinsamer Bau unabhängig vom Besitzer.
  Neue Räume ergänzen freie Stellen entlang des Hauptflurs. Die Anordnung ist bei
  identischen Eingaben reproduzierbar; Besitzerwechsel allein verschiebt keine Räume.
- **S04:** Böden und Beschriftungen verwenden Foundry-Zeichnungen; Wände und
  Türen sind native Szenenelemente. Ein Grafikpaket ist nicht erforderlich.
- **S05:** Die erste Szene hat eine Etage, ein quadratisches 5-Fuß-Raster und
  beleuchtete Innenräume und normale Tokensicht: Wände und geschlossene Türen
  begrenzen die Sicht. Der GM platziert verknüpfte Charaktertokens;
  Spieler bewegen eigene Tokens nach den normalen Foundry-Rechten.
- **S06:** Einrichtung und Raum sind über stabile IDs verbunden. Eine Aktion
  im Bogen zeigt den entsprechenden Raum auf der Szene an.
- **S07:** Hinzufügen, Entfernen und Größenänderungen erzeugen einen ausstehenden
  Szenenänderungsplan. Übernahme erfolgt erst nach Vorschau und GM-Klick.
- **S08:** Bestehende Räume behalten nach Möglichkeit ihre Position; neue Räume
  werden angefügt. Nur modulmarkierte Szenenelemente werden aktualisiert.
- **S09:** Manuell veränderte generierte Räume werden bei Konflikten übersprungen
  und zur Entscheidung angezeigt. Eigene Dekorationen und Tokens bleiben erhalten.
  Vor Abriss oder Verkleinerung müssen betroffene Tokens versetzt werden.
- **S10:** Wiederholtes Erstellen oder Aktualisieren erzeugt keine Duplikate.

## 4. Technischer Aufbau

- **Bastion-Bogen:** ApplicationV2 mit nativem D&D5e-Anwendungsmixin, sortierten
  Besitzerabschnitten, Facility-Kacheln, Kompendiumbrowser, Aktivitätsauswahl und
  Kontextmenüs. Bestehende Befehle führen weiterhin sämtliche Schreibaktionen aus.
  Keine Integration in vorhandene Charakterbögen und kein Bereit-Workflow.
- **Persistenz:** Nativer Charakter-Aktor als zentraler Träger; Modul-Flags für
  Markierung, Teilnehmer-UUIDs, Besitzercharakter je Facility, begründete
  GM-Regelausnahmen, Datenversion und Szenenverknüpfung. Keine zusätzliche
  dauerhafte Facility-Kopie auf Charakteren.
- **Systemadapter:** Einziger Integrationspunkt für D&D5e-spezifische Daten,
  Aufträge, Voraussetzungen, Kosten, Belohnungen und Fortschritt. Der physische
  Item-Elternaktor und der regeltechnische Besitzer sind ausdrücklich verschieden.
- **GM-Befehlsverarbeitung:** Erlaubte Aktionen statt beliebiger Dokument-Patches;
  Berechtigungsprüfung, Verarbeitung in Reihenfolge, Erkennung wiederholter
  Anfragen und Rückmeldung an den auslösenden Client.
- **Szenengenerator:** Grundrissplanung zunächst ohne Dokumentänderung; danach
  Erstellung oder gezielte Aktualisierung über Foundry-Dokumentoperationen.
  Markierungen ordnen erzeugte Elemente ihrer Bastion und Einrichtung zu.
- **Dokumentation:** `PLAN.md` enthält Anforderungen und Taskstatus;
  `AGENTS.md` enthält Arbeitsregeln, bestätigte Entscheidungen und den aktuellen
  Implementierungsstand.

## 5. Aufgaben

Ein Task wird erst abgehakt, wenn seine Abnahmekriterien erfüllt und die
zugehörigen Prüfungen dokumentiert sind. Der jeweilige Status steht am Task.
Code vorhanden bedeutet nicht abgenommen; insbesondere ersetzen Unit-Tests
keine erfolgreiche Prüfung in einer Foundry-Welt.

### Stufe 1 – Gemeinsame Verwaltung

- [x] **T01 – Modulgerüst und Entwicklungsablauf**
  - Stand: Manifest, lesender Systemadapter, Entwicklungsdiagnose, DE/EN,
    Styles, Vorlagen, Prüf-/Paketbefehle und Docker-Testumgebung implementiert.
    Foundry 14.369 / D&D5e 6.0.6 in isolierter Testwelt geladen. Modulstart,
    Statusansicht und Modulressourcen mit Chromium erfolgreich geprüft.
  - Umfang: Manifest, Systemabhängigkeit, ES-Module, Styles, Vorlagen,
    Sprachdateien sowie nachvollziehbare lokale Installation einrichten.
  - Abhängigkeit: keine.
  - Abnahme: Modul lädt auf dokumentierten V14-/6.0.x-Builds ohne Fehler;
    tatsächlich vorhandene Entwicklungs- und Prüfkommandos sind dokumentiert.

- [x] **T02 – Integration des zentralen Facility-Speichers prüfen**
  - Stand: Kostenpflichtiger Spieler-Bauauftrag auf zentralem Item mit privatem
    Besitzer auf Foundry 14.369 / D&D5e 6.0.6 nachgewiesen. Fremdbesitz,
    Besitzerlevel und Ressourcen geprüft; native Fortschrittsberechnung,
    Wiederholungsschutz und Erhalt nach Neuladen bestätigt.
    [Integrationsbefunde](docs/integration-findings.md).
  - Umfang: Eine native Einrichtung auf dem zentralen Aktor mit einem anderen,
    privaten Charakter als Regelbesitzer betreiben; erforderliche Systemzugriffe
    und geeignete Erweiterungspunkte im Adapter festhalten.
  - Abhängigkeit: T01.
  - Abnahme: Ein eigener Spielerauftrag funktioniert ohne GM-Klick;
    Voraussetzungen und Kosten beziehen sich auf den richtigen Charakter;
    Fortschritt bleibt auf dem zentralen Item und wird genau einmal verarbeitet.
  - Deckt ab: B03, B08, R06, R07. Dieser Nachweis geht dem Ausbau der UI voraus.

- [x] **T03 – Bastion-Aktor, Einrichtung und Teilnehmer konfigurieren**
  - Stand: GM-Erstellung im Akteurverzeichnis, dedizierter ApplicationV2-Bogen,
    versionierte Teilnehmer-/Besitzermetadaten und minimale öffentliche
    Teilnehmeridentität umgesetzt. Entfernen entzieht Leserechte; fehlende
    Besitzer werden angezeigt und betroffene Aktionen abgewiesen. Nach Neuladen
    und mit getrenntem Spielerclient geprüft; Charakterbögen bleiben unverändert.
  - Umfang: Markierten Aktor mit Spezialbogen erstellen; Teilnehmer,
    Besitzerreferenzen und versionierte Modul-Metadaten speichern.
  - Abhängigkeit: T02.
  - Abnahme: Erstellung und erneutes Öffnen funktionieren nach Neuladen;
    der zentrale Aktor verwendet keine eigenen Level- oder Geldwerte als
    Ersatz für die Besitzercharaktere.
  - Deckt ab: B01–B04, R01, R08.

- [x] **T04 – GM-Befehle und Besitzerrechte**
  - Stand: Authentifizierte native Anfragen, private dauerhafte Warteschlange und
    Vorgangsbelege, GM-Auswahl, Konfliktprüfung und atomare Speicherung umgesetzt.
    Zwei GMs und zwei Spieler bestätigen Parallelität, Ausfall vor Speicherung
    sowie zwischen Speicherung und Rückmeldung. Native Hook-Vetos buchen nichts ab.
    Schreibpfad bis zur erneuten Prüfung auf Foundry 14.369 begrenzt.
  - Umfang: Aktiven GM bestimmen, erlaubte Befehle validieren, Änderungen
    serialisieren, Wiederholungen erkennen und Ergebnisse zurückmelden.
  - Abhängigkeit: T03.
  - Abnahme: Eigene Aktionen funktionieren ohne Bestätigung; fremde Aktionen
    und ungültige Anfragen werden abgelehnt; zwei aktive GMs führen eine
    Anfrage nicht doppelt aus; ohne GM wird nichts gespeichert.
  - Deckt ab: R02–R05.

- [x] **T05 – Gemeinsame Übersicht und Aktualisierung**
  - Stand: Besitzerabschnitte, Gesamtansicht, Alle/Eigene/Besitzerfilter sowie
    native Größen-, Bauzustands-, Auftrags- und Fortschrittsanzeigen implementiert.
    UI-Bauauftrag, Abbruch ohne Kosten, private Charakterrechte und Live-Änderungen
    mit GM/zwei Spielern bestätigt; alle sechs Integrationstests bestanden.
  - Umfang: Besitzerabschnitte, zusätzlichen Gesamtübersichtsreiter,
    Einrichtungslisten, Grund-/Spezialeinrichtungen, Filter, Aktionszustände
    und Aktualisierung geöffneter Bögen umsetzen. Charakterbögen unverändert lassen.
  - Abhängigkeit: T03, T04.
  - Abnahme: Zwei Spieler sehen dieselbe Bastion; nur eigene Einträge sind
    bedienbar; Änderungen und GM-Abwesenheit werden ohne Neuladen sichtbar.
  - Deckt ab: B02, B05, B06, B09, R04.

- [x] **T06 – Einrichtungen verwalten und individuelle Regeln anwenden**
  - Stand: Vorlagenkatalog für geschützte Welt-Items und zugängliche Kompendien,
    Hinzufügen, Namen/Notizen, Entfernen, GM-Besitzerreparatur, native Level-/
    Platzprüfung und begründete Ausnahmen umgesetzt. Zusätzliche Bedingungen
    werden vom GM in weltlokalen Vorlagenregeln gepflegt; native Facility-Daten
    besitzen dafür außer dem Level kein strukturiertes Feld. Alle sieben nativen
    Integrationstests bestanden.
  - Umfang: Vorlagen hinzufügen, eigene Einrichtungen bearbeiten/entfernen,
    Besitzerwechsel durch GM und individuelle Limits/Voraussetzungen anbinden.
    Spielerbearbeitung auf Betriebsdaten beschränken; begründete GM-Ausnahmen
    für Voraussetzungen/Limits speichern und anzeigen.
  - Abhängigkeit: T02, T04, T05.
  - Abnahme: Verschiedene Charakterlevel ergeben passende individuelle Limits;
    ungültige Aktionen werden mit konkretem Grund abgewiesen;
    GM-Ausnahmen überstehen Neuladen; Spieler können Regeldefinitionen nicht
    direkt ändern; fremde private Charakterdaten bleiben unzugänglich.
  - Deckt ab: B04, B07, B08, R01, R08–R10.

- [x] **T07 – Aufträge, Bau, Personal und Ergebnisse**
  - Stand: Native Befehlsdialoge ohne unmittelbare Dokumentänderung, validierte
    Betriebsaktionen, Erweiterung, Mietlinge/Verteidiger, Waren-/Kreaturenhandel
    sowie automatische Ergebnisübergabe an den Besitzer implementiert. Native
    T07-Prüfung und vollständige Regression mit acht Integrationstests bestanden.
  - Umfang: Systemadapter für Aufträge, Bau/Erweiterung, Personal,
    Verteidiger, Kosten und Belohnungen vervollständigen; passende native
    Funktionen und Dialoge integrieren.
  - Abhängigkeit: T02, T04, T06.
  - Abnahme: Repräsentative kostenpflichtige Aufträge sowie Bau/Erweiterung
    laufen korrekt; Abbruch verändert keine Ressourcen; Wiederholung führt
    nicht zu doppelten Kosten oder Ergebnissen.
  - Deckt ab: B07, B08, R05, R06.

- [x] **T08 – Bastionzüge und Kalender integrieren**
  - Stand: GM-Zug und native globale Bastionzüge delegieren zentrale Einrichtungen
    an den atomaren Besitzerpfad. Kalender-Tagesgrenzen, vorwärts laufende
    Zeitmarken und reparierbare Einzelfehler sind mit zwei GMs und Spieler geprüft;
    Neuladen/GM-Wechsel erzeugen weder weitere Erlöse noch Ergebnis-Items.
  - Umfang: Gemeinsame Bastion in den Fortschrittsablauf einbinden;
    GM-Bedienung und automatische Kalendertage koordinieren. Keine
    Bereitschaftsmarkierung oder zusätzliche Bereitschaftssperre einführen.
  - Abhängigkeit: T07.
  - Abnahme: Tageswechsel und Bastionzug verarbeiten zentrale Einrichtungen
    genau einmal; unbeteiligte Charakterbastionen behalten ihr Systemverhalten;
    Neuladen oder GM-Wechsel erzeugt keine Wiederholung abgeschlossener Ereignisse.
  - Deckt ab: R05–R07, R11.

- [x] **T09 – Bestehende Einrichtungen übertragen**
  - Stand: GM-Vorschau, private vollständige Sicherung und inaktive Kopie;
    Quellen erst nach Vergleich der tatsächlich gespeicherten Kopie entfernen.
    Zwei native Transaktionen mit fortsetzbarem Status; geänderte Quellen stoppen
    den Abschluss, vorbereitete Kopien lassen sich verwerfen. Fortschritt,
    Personal, bezahlte Aufträge und interne UUID-Verweise praktisch bestätigt.
  - Umfang: Einmaligen GM-Transfer mit Vorschau, Sicherung der Ausgangsdaten,
    Referenzzuordnung und Wiederaufnahme nach Fehlern implementieren.
  - Abhängigkeit: T06–T08.
  - Abnahme: Einrichtung und laufender Fortschritt bleiben erhalten;
    Quell-Items werden erst nach verifiziertem Transfer entfernt;
    Wiederholung hinterlässt keine aktiven Duplikate.
  - Deckt ab: B10, R05, R08.

- [x] **T10 – Stufe 1 abnehmen und dokumentieren**
  - Stand: Alle Stufe-1-Kriterien sind in der nativen Mehrclient-Suite bestätigt;
    zusätzlich deutscher Bogen, direkter nativer Schreibschutz, normaler
    verknüpfter Token und Rechteentzug mit aktivem Canvas ohne JavaScript-Fehler.
    Version 0.1.0 mit verifiziertem Foundry-Build, Installationsarchiv und
    [Abnahmezuordnung](docs/stage1-acceptance.md) fertiggestellt.
  - Umfang: Mehrclient-Prüfungen durchführen, Einschränkungen und getestete
    Versionen dokumentieren; Installation und Bedienung beschreiben.
  - Abhängigkeit: T01–T09.
  - Abnahme: Alle Kriterien für Stufe 1 aus Abschnitt 6 sind erfüllt;
    Stufe 1 ist ohne Szenengenerator verwendbar.

### Nacharbeit Stufe 1 – Nativer Bogen (N01)

- [x] **N01 – Bogen nach D&D5e-Referenz gestalten und abnehmen**
  - Umfang: Besitzerabschnitte ohne Reiter/Filter, eigene Charaktere zuerst;
    native Kacheldarstellung mit freien Plätzen und Facility-Bild, gefilterter
    Kompendiumbrowser und Aktivitätsauswahl; Kontext- und Fenstermenüs statt
    sichtbarer Bearbeitungsbuttons. Native Informationskarten und DE/EN verwenden.
  - Regeln: Private Werte nur für Besitzer/GM; zentraler Speicher, GM-Befehlspfad,
    individuelle Kosten/Plätze und Wiederholungsschutz bleiben erhalten.
  - Abnahme: Unit-Tests für Sortierung/Plätze; native Mehrclient-Prüfung für
    Browserauswahl/Abbruch, fertige/unbebaute Einrichtungen, Aktivitäten, Menüs,
    Fremdzugriff und Rechteentzug; visuelle Prüfung beider Themen und schmaler
    Fenster; vollständige Stufe-1-Regression und Paketprüfung.
  - Stand: Abgenommen mit 30 Unit-Tests und allen zwölf nativen Integrationstests
    (6,4 Minuten) auf 14.369 / 6.0.6. Themen, schmale Fenster und Dialoge visuell
    geprüft; 205 DE/EN-Schlüssel, native Schema-/Vorlagenprüfung und Archiv mit
    45 Laufzeitdateien geprüft. [N01-Abnahme](docs/native-sheet-acceptance.md).
    T01–T10 und ihre Abnahme dokumentieren den ursprünglichen Stand.

### Stufe 2 – Begehbare Bastion (zurückgestellt)

- [ ] **T11 – Grundriss und Änderungsvorschau berechnen**
  - Umfang: Raumflächen aus Systemgrößen ableiten; rechteckige Räume,
    Hauptflur, Türen und stabile Anordnung in einem kompakten gemeinsamen Bau
    planen; Vorschau ohne Speichern anzeigen. Alle Einrichtungen als geschlossene
    Räume behandeln, ohne Flügel oder Funktionsgruppen.
  - Abhängigkeit: T10.
  - Abnahme: Gleiche Eingaben ergeben denselben Grundriss; fertige Räume
    sind verbunden; Überschneidungen und unpassierbare Verbindungen werden erkannt.
  - Deckt ab: S01–S03, S07.

- [ ] **T12 – Native Szene erzeugen und verknüpfen**
  - Umfang: Szene, Böden, Beschriftungen, Wände und Türen erstellen;
    Modulmarkierungen und Raumverknüpfungen setzen; Raum aus dem Bogen anzeigen.
    Beleuchtete Innenräume und normale Tokensicht einstellen.
  - Abhängigkeit: T11.
  - Abnahme: Die Szene funktioniert mit normalen verknüpften Charaktertokens;
    Türen lassen sich bedienen, Wände blockieren Bewegung und Sicht,
    geschlossene Türen verdecken benachbarte Räume, jeder fertige Raum
    ist erreichbar; die Szene enthält keine automatisch erzeugten Token-Duplikate.
  - Deckt ab: S01–S06, S10.

- [ ] **T13 – Bestehende Szene kontrolliert aktualisieren**
  - Umfang: Änderungen erkennen, Differenzvorschau erstellen, Räume nach
    GM-Klick ergänzen/anpassen/entfernen und manuelle Konflikte anzeigen.
  - Abhängigkeit: T12.
  - Abnahme: Bestehende Positionen bleiben soweit möglich stabil;
    nur markierte Elemente ändern sich; Konflikträume werden übersprungen;
    gefährdete Tokens verhindern Abriss/Verkleinerung bis zur Versetzung;
    erneute Übernahme erzeugt keine Duplikate.
  - Deckt ab: S07–S10.

- [ ] **T14 – Stufe 2 abnehmen und Gesamtmodul dokumentieren**
  - Umfang: Szenenablauf mit mehreren Clients prüfen; größere Bastion mit
    Einrichtungen mehrerer Charaktere testen; Anleitung und Grenzen ergänzen.
  - Abhängigkeit: T13.
  - Abnahme: Alle Kriterien für Stufe 2 aus Abschnitt 6 sind erfüllt;
    beide Stufen sind gemeinsam nutzbar und dokumentiert.

## 6. Test- und Abnahmeszenarien

### Stufe 1

- GM und zwei getrennte Spielerclients; private Charaktere mit unterschiedlichen
  Leveln, unterschiedlichen Ressourcen und jeweils eigenen Einrichtungen.
- Beide Spieler sehen alle Einrichtungen, verwalten aber nur die eigenen.
- Sortierte Besitzerabschnitte zeigen dieselben aktuellen zentralen Einrichtungen
  bei allen Teilnehmern; eigene Charaktere stehen beim jeweiligen Spieler zuerst.
  Kacheln, freie Plätze, native Auswahl-/Aktivitätsdialoge und Kontextmenüs folgen
  dem D&D5e-Design. Gesamtübersichtsreiter und Besitzerfilter entfallen.
- Das Öffnen erfolgt aus dem Akteurverzeichnis; Charakterbögen bleiben unverändert.
- Fremde Schreibaktionen einschließlich direkter ungültiger Modulbefehle scheitern.
- Spieler können keine Regeldefinitionen frei ändern. Fehlende Voraussetzungen
  sperren Aktionen; eine begründete GM-Ausnahme erlaubt nur die beabsichtigte
  Ausnahme und bleibt nach Neuladen erhalten.
- Einrichtungsanlage, Erweiterung, Auftrag, Personalzuordnung und Entfernung
  funktionieren aus dem gemeinsamen Bogen.
- Kosten und Belohnungen landen beim richtigen Charakter; das Guthaben des
  zentralen Aktors wird nicht als Gruppenkasse verwendet.
- Gleichzeitige Aktionen, doppelte Anfragen, Abbruch und Neuladen verursachen
  weder verlorene Änderungen noch Doppelbuchungen.
- Kein GM, ein GM, zwei GMs und ein Wechsel des aktiven GM werden geprüft.
- Kalendertag und Bastionzug verursachen keinen doppelten Fortschritt.
- Der GM kann einen Bastionzug ohne Bereit-Abfragen oder Bereitschaftssperre auslösen.
- Transfer erhält laufende Aufträge und erzeugt keine aktiven Duplikate.

### Stufe 2

- Leere Bastion, einzelne Einrichtung und mehrere Einrichtungen verschiedener
  Größen und Besitzer ergeben eine gültige Szene beziehungsweise eine klare
  Meldung für die leere Bastion.
- Fertige Räume sind vom Eingang über den Hauptflur erreichbar; Baustellen
  sind erkennbar; Wände und Türen haben die erwartete Wirkung.
- Außenanlagen werden in v1 ebenfalls als geschlossene Räume dargestellt.
- Mit normalen sichtfähigen Charaktertokens verdecken Wände und geschlossene
  Türen andere Räume trotz beleuchteter Innenräume; Öffnen einer Tür gibt Sicht frei.
- Besitzerwechsel allein verändert den Grundriss nicht.
- Erneutes Erzeugen/Aktualisieren erzeugt keine doppelten Szenen oder Räume.
- Hinzufügen, Erweiterung und Entfernung erscheinen zunächst nur in der Vorschau.
- Manuelle Raumänderungen, eigene Dekorationen, Türzustände und vorhandene
  Tokens werden beim Aktualisieren berücksichtigt und nicht blind überschrieben.
- Stufe 1 bleibt verwendbar, wenn keine Szene existiert oder diese gelöscht wurde.

Automatisierte Tests konzentrieren sich auf Besitzerregeln, individuelle
Regelzuordnung, Wiederholungen/Konflikte und Grundrissgeometrie. Native Rechte,
Dialoge und Bewegung werden zusätzlich in einer laufenden Foundry-Welt geprüft.
`npm run check`, `npm test` und `npm run build` sind eingerichtet und erfolgreich
ausgeführt. 27 Unit-Tests prüfen Modulgrenzen. Elf Chromium-Integrationstests
bestätigen Modulstart, native Transaktionsabbrüche sowie T02–T10 mit getrennten Clients;
Stufe 1 ist abgenommen. Die Szene bleibt zurückgestellt.
Der T03-Bedientest prüft zusätzlich Erstellung, Wiederöffnen, Teilnehmerrechte
und gelöschte Besitzer. Native Einschränkung im Modus ohne Canvas: Foundry
14.369 ruft bei Actor-Berechtigungsänderungen `canvas.tokens.cycleTokens` auf,
obwohl die Tokenebene fehlt. Die Rechteänderung wird dennoch gespeichert;
T10 bestätigt den Rechteentzug mit aktivem Canvas ohne diesen Fehler.
Die Docker-Testinstallation startet über `npm run dev:up`; Details in
[README.md](README.md).

## 7. Grenzen und technische Nachweise

- Die Stufe-1-Laufzeitabnahme gilt für Foundry 14.369 / D&D5e 6.0.6.
  Weitere Builds und fremde Module sind nicht separat bestätigt.
  T02 bestätigt den Besitzerpfad, T07/T08 Befehle und Kalender, T09 den Transfer.
  T10 und die [Abnahmezuordnung](docs/stage1-acceptance.md) schließen Stufe 1 ab.
- Der Systemadapter ist der wichtigste technische Aufwand. Die native Annahme
  „Item-Elternaktor ist Regelbesitzer“ darf nicht unbemerkt übernommen werden.
- Der GM-Transport bindet Anfragen an den serverseitigen nativen `userId`.
  Dauerhafte private Warteschlange und Belege sichern GM-Wechsel und Wiederholung.
  Der atomare Schreibpfad ist ausschließlich auf Foundry 14.369 geprüft und freigegeben.
- Änderungen an individuellen Charakterressourcen und zentralen Items müssen
  bei Teilfehlern nachvollziehbar bleiben und Wiederholungen sicher behandeln.
- Möblierte Battlemaps, mehrere Etagen, mehrere gemeinsame Bastionen pro Welt,
  gemeinsame Kasse und besondere Integrationen alternativer Sheets sind späterer
  Ausbau und keine Voraussetzung für v1.

## 8. Quellen für die Implementierung

Die folgenden Quellen wurden für den Plan herangezogen. Ein Quellcodebefund
ersetzt keine Prüfung in der Zielversion.

- [D&D5e-Versionen und Foundry-Kompatibilität](https://foundryvtt.com/packages/dnd5e)
- [Facility-Datenmodell, Branch 6.0.x](https://github.com/foundryvtt/dnd5e/blob/6.0.x/module/data/item/facility.mjs)
- [Charakterbogen und Facility-Bedienung](https://github.com/foundryvtt/dnd5e/blob/6.0.x/module/applications/actor/character-sheet.mjs)
- [Order-Aktivität](https://github.com/foundryvtt/dnd5e/blob/6.0.x/module/documents/activity/order.mjs)
- [Kalender und Bastionfortschritt](https://github.com/foundryvtt/dnd5e/wiki/Calendar)
- [Foundry V14 – Dokument-API](https://foundryvtt.com/api/v14/modules/foundry.documents.html)
- [Foundry V14 – ApplicationV2](https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html)

## 9. Fortschrittsprotokoll

| Datum | Änderung | Prüfung |
| --- | --- | --- |
| 2026-10-19 | Anforderungen, Architektur und Tasks aus der Abstimmung dokumentiert. | Dokumentprüfung; keine Implementierung vorhanden. |
| 2026-10-19 | Umsetzungsinterview abgeschlossen: Besitzerabschnitte, Betriebsrechte, GM-Ausnahmen, Verzeichniseinstieg, kompakter Bau und Tokensicht präzisiert; Design und Prototyp ergänzt. | Zehn Antworten und Prototyp v1 abgeglichen; keine Foundry-Laufzeitprüfung. |
| 2026-10-19 | T01 implementiert und T02 vorbereitet: Modulgerüst, Statusansicht mit D&D5e-Designvariablen, lesender Besitzeradapter, Übersetzungen, Prüf-/Paketbefehle und isolierte Docker-Testinstallation. Nutzer stellt Foundry-14.369-ZIP bereit; offizielles D&D5e 6.0.6 in Testinstallation kopiert. | `npm run check`, zehn Unit-Tests und `npm run build` erfolgreich; Foundry 14.369 startet und HTTP leitet auf `/license`. T01/T02 bleiben offen: Lizenzaktivierung, Modulstart in Welt und native Mehrclientintegration noch nicht geprüft; Browser-Skill meldet keine verfügbaren Browser. |
| 2026-10-19 | T01 abgenommen: Lizenzierung abgeschlossen, Testwelt `shared-bastion-integration` erstellt, Modul aktiviert und ApplicationV2-Statusansicht gerendert. | Native Foundry-Schemaprüfung und Handlebars-Render erfolgreich; Chromium-Test T01 auf Foundry 14.369 / D&D5e 6.0.6 bestanden. Keine JavaScript-Fehler oder fehlerhaften Modulressourcen; Screenshot geprüft. Die Testclients nutzen Softwaregrafik, die Szenenabnahme steht separat aus. |
| 2026-10-19 | T02 abgenommen: konkrete, serverseitig zugeordnete Spielerbefehle; Kostenplanung über native CurrencyManager-Funktion, Item-Fortschritt über native Bastion-API; private GM-Vorgangsbelege und atomare Mehrdokumentänderungen. | Zwölf Unit-Tests; T01/T02-Integration mit GM und zwei Spielern bestanden (25,1 s). Besitzerlevel 13 gegenüber Trägerlevel 0; Besitzer 1.000→500 GP, Träger 7.000 GP und anderer Besitzer 9.000 GP unverändert. Fremdbesitz, Level 4 und 499 GP abgewiesen; 20 Tage nativer Baufortschritt, doppelte Zustellung und GM-Neuladen ohne Doppelverarbeitung. Verwaltungsprüfung im nativen Modus ohne Canvas; Kalender-/Szenenabnahme offen. |
| 2026-10-19 | T03 abgenommen: Bastion im Akteurverzeichnis erstellen und Teilnehmer verwalten; Spezialbogen dauerhaft je Aktor zuordnen, öffentliche Identität begrenzen, Besitzerlöschung erkennen und Rechte entziehen. | Nativer GM-/Spieler-Bedientest bestanden (15,7 s), einschließlich Neuladen, unveränderter Charakterbögen, verweigerter Spielerkonfiguration, Rechteentzug und `MissingOwner` nach Löschen. Screenshot geprüft; zwölf Unit-Tests, Syntax-/Sprachprüfung und Paketierung erfolgreich. Foundry-eigener `cycleTokens`-Fehler bei Rechteänderung ohne Canvas dokumentiert. |
| 2026-10-19 | T04 abgenommen: kanonische Bastion-Registrierung, dauerhafte private GM-Warteschlange, Vorgangsbelege, serialisierte Befehle und Wiederaufnahme nach GM-Ausfall. Native Batch-Vorbereitung gegen teilweise entfernte Operationen abgesichert; Schreibfreigabe auf geprüften Core-Build begrenzt. | Vierzehn Unit-Tests und fünf native Integrationstests bestanden. Zwei GMs/zwei Spieler: gleicher Eintrag erzeugt einen Konflikt, verschiedene Einträge buchen jeweils einmal; fremde Marker/Absender abgewiesen. Hook-Veto bucht nichts; spätere Wiederaufnahme führt abgebrochene Aktion nicht aus. GM-Ausfall vor Commit und nach Commit vor Rückmeldung ohne Doppelbuchung; ohne GM kein Schreibauftrag. Native Rechte verhindern Zugriff eines zum Spieler herabgestuften GM-Modells auf Träger und private Journale. |
| 2026-10-19 | T05 abgenommen: Besitzerabschnitte und Gesamtansicht, getrennte einfache/besondere Einrichtungen, Alle/Eigene/Besitzerfilter, native Größen-/Bau-/Auftrags-/Fortschrittsanzeige und eigenes Bauen aus dem Bogen. | Sechs native Integrationstests bestanden (1,7 min), vierzehn Unit-Tests und Paketierung erfolgreich. Zwei Spieler sehen dieselben acht zentralen Items bei privaten Charakteren; fremde Bauaktionen gesperrt. Namensänderung und 20-Tage-Baufortschritt erscheinen ohne Neuladen; Dialogabbruch ohne Kosten. GM-Abmeldung sperrt Schreiben, Rückkehr aktiviert es; Ansichten/Filter bleiben nutzbar. GM-Ansicht visuell geprüft. |
| 2026-10-19 | T06 abgenommen: geschützte Vorlagen aus Welt/Kompendien, weltlokale GM-Vorlagenregeln, eigene Namen/Notizen/Entfernung, GM-Besitzerreparatur, individuelle Level/Plätze und sichtbare begründete Ausnahmen. | Siebzehn Unit-Tests und sieben native Integrationstests bestanden (2,2 min). Level 5/13 mit individuellen Limits; noch private Einrichtungen zählen mit, Trägerlevel 20 gewährt keine kostenlosen Besitzerplätze. Welt- und natives Testwelt-Kompendium bleiben unverändert. Spielerregelpatch und Fremdbesitz abgewiesen; Levelausnahme umgeht keine Werkzeugbedingung, zusätzliche Ausnahme keine Zahlung. Besitzer 4.000→3.500 GP, anderer Besitzer 9.000 und Träger 7.000 unverändert. UI-Anlage/Bearbeitung/Neuzuordnung/Entfernung und Besitzerlöschung geprüft; Ausnahmen nach Neuladen erhalten. GM-Ansicht visuell geprüft. |
| 2026-10-19 | Nutzer stellt deutsches Handbuch als lokale Begriffsvorlage bereit: Basiseinrichtungen, Mietlinge, Befehle, Stufe sowie beengt/geräumig/weitläufig in Sprachschlüsseln vereinheitlicht. Individuelle Einmaligkeit besonderer Einrichtungen und Anfangsflächen präzisiert. | Neunzehn Unit-Tests bestanden; erweiterte native T06-Prüfung bestanden (30,3 s): gleicher besonderer Typ wird beim Besitzer abgewiesen, ausdrückliche GM-Wiederholbarkeit erlaubt weitere Einträge innerhalb seines Limits. Die Anfangsflächen sind beengt/geräumig. Kein Handbuchtext im Laufzeitarchiv. |
| 2026-10-19 | Nutzer begrenzt den aktiven Auftrag auf Stufe 1 bis einschließlich T10. | Stufe-1-Kriterien bleiben unverändert; T11–T14 und der Szenengenerator sind späterer Ausbau, kein Bestandteil der laufenden Abnahme. |
| 2026-10-19 | T07 abgenommen: native Befehlsdialoge sammeln Optionen ohne eigene Dokumentzahlungen; zentraler Fortschritt, individuelle Zahlungen und automatische Ergebnisse über die GM-Transaktion. Erweiterung, Herstellung/Ernte, Handel, Mietlinge/Verteidiger und übrige native Befehle implementiert. | 21 Unit-Tests und acht native Integrationstests bestanden (2,8 min), zusätzlicher abschließender T07-Bedientest bestanden (36,3 s). Herstellung 10 Tage/50 GP mit Item-Übergabe, Ernte 3 Items, Waren-/Kreaturenhandel samt Erlös, Abbruch ohne Doppelzahlung, normale Erweiterung 25 Tage/500 GP und unmittelbare besondere Erweiterung. Dialogpreis 0 ändert die Abbuchung nicht. Ergebnis-Veto bucht keinen Fortschritt; Wiederholung/Neuladen keine weiteren Items oder Erlöse. NSC-Zuordnung per nativer Drag-and-drop-Oberfläche und Item-Identifier-Voraussetzung bestätigt. Besitzer 900 GP, fremder Charakter 9.000 und Träger 7.000 unverändert; native Dialoge und Bogen visuell geprüft. |
| 2026-10-19 | T08 abgenommen: GM-Zug ohne Bereitschaftssperre, native globale Züge und automatische Tageswechsel über einen Besitzerpfad koordiniert. Zeitmarken je Einrichtung, sichtbare Einzelfehler mit Wiederaufnahme und summierte Besitzereinnahmen. | 23 Unit-Tests und neun native Integrationstests bestanden (3,4 min), T08 separat zusätzlich bestanden (30,1 s); Syntax-/Sprachprüfung, native Offline-API-Prüfung und Paketierung erfolgreich. Zwei Verkäufe à 48 GP ergeben 1.096 Besitzergold; anderer Besitzer 9.000 und Träger 7.000 unverändert. Kalenderwechsel, wiederholte Hooks, Uhr-Rücksprung, fehlende Ergebnisvorlage/Reparatur, Neuladen und zweiter GM erzeugen insgesamt ein Herstellungs-Item. Unbeteiligte Charakterbastion bleibt nativ. Bogen visuell geprüft; Handbuch und Entwicklungsdaten fehlen im Archiv. |
| 2026-10-20 | T09 abgenommen: zweiphasiger Transfer mit Vorschau, privaten Sicherungen, inaktiven Kopien und tatsächlichem Quellen-/Kopienvergleich vor Entfernung. Übernahmedatensätze gelten nur für die konkrete Bastion-Erstellung; Wiederaufnahme und Verwerfen sind möglich. | 27 Unit-Tests; native T09- und T07-Prüfung zusammen bestanden (57,8 s). Drei Einrichtungen mit Fortschritt 4/10, 5/20 und 2/7 behalten bezahlte Aufträge, Bauzustand, Mietlinge und interne UUID-Links. Private Besitzer-Inventarvorlage schließt nach Transfer korrekt ab. Änderungen seit Vorschau, Erstellungs- und Löschveto hinterlassen keine Teilübernahme; GM-Neuladen und Wiederholung erzeugen keine aktiven Duplikate. Weiterer Raum über den GM-Dialog übernommen; Guthaben 1.000/9.000 unverändert. Transferdialog visuell geprüft; Syntax-/Sprachprüfung erfolgreich. |
| 2026-10-20 | T10 und Stufe 1 abgeschlossen: Version 0.1.0, geprüfter Foundry-Build im Manifest, deutscher Bogen mit Handbuchbegriffen für alle nativen Einrichtungstypen, Installationsanleitung und Abnahmezuordnung. | Alle elf nativen Integrationstests auf Version 0.1.0 bestanden (4,5 min), 27 Unit-Tests bestanden. T10 mit aktivem Canvas: Verzeichniseinstieg, privater Standardbogen, direkte Actor-/Item-Schreibversuche abgewiesen, normaler verknüpfter Token bewegt und Rechteentzug ohne JavaScript-Fehler. Native Manifest-/Vorlagenprüfung, 36 ES-Module und 196 DE/EN-Schlüssel geprüft. ZIP mit 42 bytegleichen Quelldateien und korrekter Installationsstruktur auditiert; kein Handbuch, keine Zugangsdaten oder Entwicklungsdaten. Deutscher Bogen und Status visuell geprüft. T11–T14 bleiben zurückgestellt. |
| 2026-10-20 | N01 abgenommen: native D&D5e-Kacheln mit Facility-Bildern, sortierte Besitzerabschnitte ohne Reiter/Filter, native Kategorie-/Stufenauswahl und Aktivitätsdialoge, Kontext-/Fenstermenüs und Informationskarten. Öffentliche Benutzerreferenzen ersetzen keine privaten Charakterwerte; GM-Befehlspfad unverändert. | 30 Unit-Tests und alle zwölf nativen Integrationstests bestanden (6,4 min), einschließlich Browserabbruch, fertiger/unbebauter Anlage, GM-Ausnahme, direktem Fremdzugriff sowie offenen Dialogen bei Rechteentzug/GM-Abmeldung. Dark/Light, schmale Fenster und Aktivitätsicons visuell geprüft. Native Schema-/Vorlagenprüfung, 39 ES-Module, 205 DE/EN-Schlüssel und Paket mit 45 Quelldateien geprüft. Kalender-Fixtures anhand ihrer Namen statt nativer Rückgabereihenfolge zugeordnet. Originaldaten der eingerichteten Testbastion durch temporäres Docker-Datenvolume vom Prüflauf getrennt. |
| 2026-10-20 | Die ungenutzten Konten „SB T10 Alice“ und „SB T10 Bob“ nach ausdrücklicher Nutzerfreigabe gelöscht. | Identität und fehlende Akteurzuordnung vorab geprüft. Alle Akteurdaten und übrigen Benutzer vor/nach der Löschung identisch; „Manor House“ mit fünf Akteuren, zwei zentralen Einrichtungen und zwei Teilnehmern bestätigt. |
