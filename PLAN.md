# Shared Bastion – Anforderungen und Aufgaben

Stand: 2026-10-19 · Status: T01–T03 abgenommen; nächster Schritt T04.

Die Entscheidungen aus dem abgeschlossenen `grill-with-ui`-Interview sind hier
eingearbeitet. Begründungen und Abläufe stehen im
[Umsetzungsdesign](docs/implementation-design.md); der
[interaktive Bogenentwurf](docs/implementation-visual.html) ist eine lokale Simulation.

## 1. Ziel

Ein Foundry-VTT-Modul für eine gemeinsame D&D-Bastion nach den Regeln von 2024.
Alle Teilnehmer öffnen denselben Bastion-Bogen. Die Einrichtungen werden tatsächlich
auf der gemeinsamen Bastion gespeichert und gehören jeweils einem Charakter.
Spieler verwalten ihre Einrichtungen selbst; ihre Charakterbögen bleiben privat.

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
| Bogenaufbau | Abschnitte je Besitzercharakter; gemeinsame Gesamtübersicht als zusätzlicher Reiter. |
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
- **B05:** Die Übersicht zeigt Name, Besitzercharakter, Typ, Größe, Bauzustand,
  Auftrag und Fortschritt. Hauptansicht sind Abschnitte je Besitzercharakter;
  ein zusätzlicher Reiter bietet die Gesamtübersicht. Einfache und besondere
  Einrichtungen sind innerhalb der Ansichten getrennt.
- **B06:** Filter für alle Einrichtungen, eigene Einrichtungen und einzelne
  Besitzercharaktere sind verfügbar.
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

- **Bastion-Bogen:** ApplicationV2-Oberfläche mit Besitzerabschnitten,
  zusätzlichem Gesamtübersichtsreiter, Filtern, Status und Besitzeraktionen.
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
zugehörigen Prüfungen dokumentiert sind. Die folgenden Tasks sind noch offen.
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

- [ ] **T04 – GM-Befehle und Besitzerrechte**
  - Umfang: Aktiven GM bestimmen, erlaubte Befehle validieren, Änderungen
    serialisieren, Wiederholungen erkennen und Ergebnisse zurückmelden.
  - Abhängigkeit: T03.
  - Abnahme: Eigene Aktionen funktionieren ohne Bestätigung; fremde Aktionen
    und ungültige Anfragen werden abgelehnt; zwei aktive GMs führen eine
    Anfrage nicht doppelt aus; ohne GM wird nichts gespeichert.
  - Deckt ab: R02–R05.

- [ ] **T05 – Gemeinsame Übersicht und Aktualisierung**
  - Umfang: Besitzerabschnitte, zusätzlichen Gesamtübersichtsreiter,
    Einrichtungslisten, Grund-/Spezialeinrichtungen, Filter, Aktionszustände
    und Aktualisierung geöffneter Bögen umsetzen. Charakterbögen unverändert lassen.
  - Abhängigkeit: T03, T04.
  - Abnahme: Zwei Spieler sehen dieselbe Bastion; nur eigene Einträge sind
    bedienbar; Änderungen und GM-Abwesenheit werden ohne Neuladen sichtbar.
  - Deckt ab: B02, B05, B06, B09, R04.

- [ ] **T06 – Einrichtungen verwalten und individuelle Regeln anwenden**
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

- [ ] **T07 – Aufträge, Bau, Personal und Ergebnisse**
  - Umfang: Systemadapter für Aufträge, Bau/Erweiterung, Personal,
    Verteidiger, Kosten und Belohnungen vervollständigen; passende native
    Funktionen und Dialoge integrieren.
  - Abhängigkeit: T02, T04, T06.
  - Abnahme: Repräsentative kostenpflichtige Aufträge sowie Bau/Erweiterung
    laufen korrekt; Abbruch verändert keine Ressourcen; Wiederholung führt
    nicht zu doppelten Kosten oder Ergebnissen.
  - Deckt ab: B07, B08, R05, R06.

- [ ] **T08 – Bastionzüge und Kalender integrieren**
  - Umfang: Gemeinsame Bastion in den Fortschrittsablauf einbinden;
    GM-Bedienung und automatische Kalendertage koordinieren. Keine
    Bereitschaftsmarkierung oder zusätzliche Bereitschaftssperre einführen.
  - Abhängigkeit: T07.
  - Abnahme: Tageswechsel und Bastionzug verarbeiten zentrale Einrichtungen
    genau einmal; unbeteiligte Charakterbastionen behalten ihr Systemverhalten;
    Neuladen oder GM-Wechsel erzeugt keine Wiederholung abgeschlossener Ereignisse.
  - Deckt ab: R05–R07, R11.

- [ ] **T09 – Bestehende Einrichtungen übertragen**
  - Umfang: Einmaligen GM-Transfer mit Vorschau, Sicherung der Ausgangsdaten,
    Referenzzuordnung und Wiederaufnahme nach Fehlern implementieren.
  - Abhängigkeit: T06–T08.
  - Abnahme: Einrichtung und laufender Fortschritt bleiben erhalten;
    Quell-Items werden erst nach verifiziertem Transfer entfernt;
    Wiederholung hinterlässt keine aktiven Duplikate.
  - Deckt ab: B10, R05, R08.

- [ ] **T10 – Stufe 1 abnehmen und dokumentieren**
  - Umfang: Mehrclient-Prüfungen durchführen, Einschränkungen und getestete
    Versionen dokumentieren; Installation und Bedienung beschreiben.
  - Abhängigkeit: T01–T09.
  - Abnahme: Alle Kriterien für Stufe 1 aus Abschnitt 6 sind erfüllt;
    Stufe 1 ist ohne Szenengenerator verwendbar.

### Stufe 2 – Begehbare Bastion

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
- Besitzerabschnitte und Gesamtübersichtsreiter zeigen dieselben aktuellen Daten.
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
ausgeführt. Zwölf Unit-Tests prüfen Modulgrenzen. Zwei Chromium-Integrationstests
bestätigen Modulstart sowie den T02-Bauauftrag mit GM und zwei Spielern;
Kalender, vollständige Betriebsaktionen und Szene bleiben separat offen.
Der T03-Bedientest prüft zusätzlich Erstellung, Wiederöffnen, Teilnehmerrechte
und gelöschte Besitzer. Native Einschränkung im Modus ohne Canvas: Foundry
14.369 ruft bei Actor-Berechtigungsänderungen `canvas.tokens.cycleTokens` auf,
obwohl die Tokenebene fehlt. Die Rechteänderung wird dennoch gespeichert;
die Prüfung mit aktivem Canvas bleibt Teil der Stufe-1-Abnahme.
Die Docker-Testinstallation startet über `npm run dev:up`; Details in
[README.md](README.md).

## 7. Grenzen und technische Nachweise

- Vollständige Systemkompatibilität ist noch nicht praktisch nachgewiesen.
  T02 bestätigt einen kostenpflichtigen zentralen Bauauftrag mit individuellem
  Besitzer und nativer Fortschrittsberechnung. Weitere Aufträge und Kalender
  werden in T07/T08 geprüft.
- Der Systemadapter ist der wichtigste technische Aufwand. Die native Annahme
  „Item-Elternaktor ist Regelbesitzer“ darf nicht unbemerkt übernommen werden.
- Der GM-Transport muss in T04 darauf geprüft werden, wie der Absender zuverlässig
  einer Anfrage zugeordnet wird; eine frei mitgesendete Benutzer-ID genügt nicht.
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
