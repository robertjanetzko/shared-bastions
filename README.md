# Shared Bastion

Gemeinsamer Bastion-Bogen für Foundry VTT V14 und D&D5e 6.0.x. Native
Facility-Items liegen auf einem zentralen Aktor; Regeln, Zahlungen und Ergebnisse
gelten individuell für den jeweiligen Besitzercharakter. Spieler verwalten ihre
Einrichtungen ohne zusätzliche Leserechte auf fremde Charaktere.

**Version 0.1.0 – Stufe 1:** Besitzerabschnitte im nativen D&D5e-Kacheldesign,
Einrichtungsverwaltung, individuelle Regeln mit begründeten GM-Ausnahmen,
native Befehle und Personal, Kalenderfortschritt und geprüfter Transfer.
Praktisch geprüft auf **Foundry 14.369 / D&D5e 6.0.6**.
Der Szenengenerator bleibt späterer Ausbau. Die frühere HTML-Simulation im
Quellprojekt ist kein Bestandteil des installierten Moduls.

## In Foundry installieren

Im Foundry-Setup unter „Add-on Modules“ → „Install Module“ diesen Link als
„Manifest URL“ einfügen und installieren:

```text
https://github.com/robertjanetzko/shared-bastions/releases/latest/download/module.json
```

Anschließend das Modul in der D&D5e-Welt unter „Module verwalten“ aktivieren.
Geprüft ist **Foundry 14.369 / D&D5e 6.0.6**; auf anderen Foundry-Builds
bleiben Schreibaktionen vorerst gesperrt. Der Manifest-Link zeigt auf das
jeweils neueste veröffentlichte Release und dient auch der Updateprüfung.

### Manuell installieren

`dist/shared-bastion-0.1.0.zip` nach `Data/modules/` entpacken. Danach muss die Datei
unter `Data/modules/shared-bastion/module.json` liegen. Alternativ den Projektordner
dort als `shared-bastion` kopieren oder verlinken. Foundry neu starten und das Modul
in einer D&D5e-Welt aktivieren. Unter den Moduleinstellungen zeigt „Modulstatus
anzeigen“ Zielbereich und geprüfte Laufzeit an. Bestehende Charakterbögen werden
nicht verändert. Das fertige Archiv benötigt weder Node.js noch npm auf den
Spielerrechnern; es wird in der Foundry-Installation geladen.

Der GM wählt im Akteurverzeichnis „Create Actor“ (Akteur erstellen) und dort
„Shared Bastion“. Name und Ordner werden übernommen; anschließend wählt der GM
die Teilnehmercharaktere. Ein Abbruch erstellt keinen Aktor. Pro Welt bleibt es
bei einer gemeinsamen Bastion; bei vorhandener Bastion ist die Auswahl gesperrt.
Danach öffnen alle Teilnehmer den gemeinsamen
Aktor aus demselben Verzeichnis. Im Bastion-Bogen verwaltet der GM die Teilnehmer.
Der Bogen zeigt pro Besitzercharakter Basiseinrichtungen links und besondere
Einrichtungen rechts. Eigene Charaktere stehen zuerst, die übrigen nach
Spielername und Charaktername sortiert; beim GM gilt die alphabetische Reihenfolge.
Abschnittsköpfe zeigen das Portrait, daneben den Spielernamen und darunter klein
die Stufe (für Besitzer/GM). Der Charaktername erscheint beim Darüberfahren.
Die Kacheln verwenden das Facility-Bild und zeigen Größe, Personal und laufenden
Fortschritt in den nativen D&D5e-Größen. Auf schmalen Fenstern stehen die beiden Spalten untereinander.

Ein Klick auf eine eigene Einrichtung öffnet die native Aktivitätsauswahl. Ein
ungebauter Raum bietet dort „Bauen“ an; danach zeigt der Dialog Größe, Kosten und
Dauer. Rechtsklick oder Umschalt+F10 öffnet das Kontextmenü mit Details, Bearbeiten,
Entfernen, Personal und Auftragsabbruch. Pfeiltasten und Enter bedienen das Menü.
Fremde Einrichtungen sind für Spieler sichtbar, aber nicht bedienbar.
Teilnehmerkonfiguration, Vorlagenregeln, Transfer und Bastionzüge liegen für den
GM im Dreipunktmenü des Fensters. Ohne GM bleibt der Bogen lesbar; Schreiben ist
gesperrt. Schließen eines Auswahl-/Auftragsdialogs bucht nichts ab.

Der gemeinsame Aktor enthält nur die benötigte öffentliche Identität der
Charaktere; ihre eigenen Bögen behalten ihre bisherigen Rechte.

Zielbereich: Foundry ab **14.367 innerhalb V14**, D&D5e **6.0.x**. Der offizielle
Systemquellcode **6.0.6**, Commit `28f35531021bb07609c79c4cbbb9b7e7c2744bf9`, wurde
geprüft. Bestätigte Laufzeitprüfungen gelten derzeit für 14.369 / 6.0.6.
Schreiben ist auf Foundry **14.369** begrenzt, weil dessen native
Transaktionsvorbereitung eigens geprüft und abgesichert ist. Andere V14-Builds
bleiben bis zur erneuten Integrationsprüfung im Lesemodus.

## Einrichtungen und Regeln

Ein Klick auf einen gestrichelten freien Platz öffnet den nativen
Kompendiumbrowser für Basis- oder besondere Einrichtungen. Für Spieler begrenzt
die Stufe des zugehörigen Charakters die Auswahl. GM-Ausnahmen werden nach der
Auswahl ausdrücklich begründet. Weltvorlagen wählst du über „Weltvorlage hinzufügen“
im Kontextmenü der Charakterüberschrift. Das Modul liefert keine Regeltexte.
Die Quellen müssen lesbar und ihre Definitionen vor Spielerbearbeitung geschützt sein. Neue Einrichtungen
übernehmen weder laufende Aufträge noch Personal oder bereits erzeugte Ergebnisse
von der Vorlage. Vorhandene Einrichtungen auf dem Besitzer zählen bis zum Transfer
mit. Die kostenlosen Anfangsräume und besonderen Plätze kommen aus D&D5e. Die beiden
Anfangsräume sind beengt und geräumig. Besondere Einrichtungen sind je Besitzer
grundsätzlich einmalig; der GM kann Wiederholbarkeit festlegen, wenn ihre
Beschreibung es erlaubt.

Ist der Katalog leer, erstellt der GM im Gegenstandsverzeichnis eine eigene
Vorlage vom nativen Typ „Facility“ beziehungsweise „Einrichtung“ und trägt ihre
Daten ein. Die beteiligten Spieler benötigen Leserechte (Beobachter), dürfen die
Definition jedoch nicht bearbeiten. Alternativ ein vorhandenes lesbares
Item-Kompendium verwenden. Eine zusätzliche Regelsammlung ist keine Voraussetzung.
Bei ausgeschöpften besonderen Plätzen kann der GM über „Besondere Einrichtung hinzufügen“ im
Abschnittskontextmenü eine begründete Ausnahme anlegen.

Der GM kann unter „Vorlagenregeln“ Level, Auftragsart, Kapazitäten und zusätzliche
Voraussetzungen für künftig hinzugefügte Einrichtungen festlegen. Diese Einstellungen
liegen nur in der Welt; sie verändern keine Quelldateien oder Kompendien. D&D5e
6.0.6 speichert bei Facilities nur den Mindestlevel als strukturierte Voraussetzung.
Weitere Bedingungen aus der verwendeten Vorlage müssen deshalb hier eingetragen
werden; der Modulcode wertet keine Regelprosa automatisch aus. Unterstützt sind
Werkzeug-/Waffenübung, vorhandene Item-Kennzeichen und eine zauberwirkende Klasse.
Eine Freigabebedingung deckt Fälle ab, die das native Modell nicht abbildet.

Spieler bearbeiten eigene Namen und öffentliche Notizen. Entfernen beendet den
Eintrag einschließlich laufender Aufträge, ohne Kostenerstattung. Der GM ändert
Besitzer und Regeln über das Kontextmenü der Einrichtung; damit lassen sich auch
fehlende Besitzer reparieren. Sichtbare Ausnahmen für Level, Plätze oder weitere
Voraussetzungen benötigen jeweils eine Begründung. Sie bleiben nach Neuladen
bestehen und umgehen weder Besitzerrechte noch normale Zahlungen. Persönliche
Level und Platzlimits sieht nur der jeweilige Besitzer beziehungsweise der GM.
Hinweise, Notizen, Ergebnisse und begründete Ausnahmen stehen im Tooltip des
kleinen Symbols unten rechts an der Kachel. Warnungen verwenden ein Warnsymbol.
Die Zugübersicht ist über das Infosymbol unten rechts am Fenster erreichbar.
Die Symbole lassen sich auch mit Tab fokussieren.

## Befehle, Mietlinge und Ergebnisse

Ein Klick auf eine eigene fertige Einrichtung öffnet die native Aktivitätsauswahl.
Die gewählte Aktivität öffnet den nativen D&D5e-Auftragsdialog, ohne einen Befehl
direkt auf dem Träger auszuführen.
Kosten und Dauer werden aus der gewählten Aktion beziehungsweise der geschützten
Vorlage berechnet; beim Bestätigen prüft der GM-Client sie erneut. Herstellen nutzt
die native `getCraftCost`-Berechnung. Gegenstände und Kreaturen müssen aus für den
Spieler lesbaren Quellen stammen; zahlungsrelevante Definitionen bleiben vor
Spieleränderungen geschützt.

Bei einer Basiseinrichtung bucht „Erweitern“ die Kostendifferenz der nächsten
Fläche ab und startet den Baufortschritt. Dafür vorgesehene besondere Einrichtungen
werden wie im System unmittelbar erweitert. Laufende Befehle sperren einen neuen
Start. Schließen des Dialogs verbraucht nichts; der ausdrückliche Abbruch eines
bereits begonnenen Befehls erstattet bezahlte Kosten nicht.

„Mietlinge“ und „Bastionsverteidiger“ im Einrichtungskontextmenü öffnen die nativen
Referenzfelder für NSC.
Ziehe zugängliche NSC aus dem Akteurverzeichnis oder einem Kompendium auf freie
Plätze; die native Kapazität wird beim Speichern nochmals geprüft. Der gemeinsame
Bogen erhält nur UUIDs und benötigte Namen/Bilder, keine privaten Charakterwerte.
Fehlende Referenzen erscheinen als Warnung und lassen sich durch Entfernen oder
Neuzuordnung reparieren.

Fortschrittsabschlüsse verwenden die native Bastion-Berechnung. Erzeugte Items
landen direkt im Inventar des jeweiligen Besitzers; Handelserlöse werden ihm
gutgeschrieben. Der Träger dient nicht als Kasse. Ergebnis, Fortschritt und
Vorgangsbeleg werden zusammen gespeichert, wodurch Wiederholung und GM-Neuladen
keine zweite Übergabe auslösen. Rein erzählerische Vorzüge oder Regelwirkungen,
die das native System nicht als Ergebnis modelliert, werden weiterhin am Tisch
abgewickelt.

## Bastionzüge und Kalender

Der GM führt „Bastionzug ausführen“ im Dreipunktmenü des gemeinsamen Bogens aus. Der Dialog zeigt
die eingestellte Dauer; es gibt keinen Bereit-Status. Ohne aktivierte automatische
Kalenderfortschritte zählt ein Zug die in D&D5e eingestellten Tage. Auch der native
globale Bastionsknopf verarbeitet die gemeinsame Bastion über denselben Ablauf.
Einrichtungen auf anderen Charakteren behalten ihren nativen Systemablauf.

Ist der automatische D&D5e-Kalender aktiv, treiben Weltzeit-Tageswechsel die
Einrichtungen voran. Ein zusätzlicher Bastionzug zählt keine Tage doppelt; er
repariert beispielsweise abgeschaltete Einrichtungen nach den nativen Regeln.
Das Aktivieren oder Wechseln des Kalenders beginnt am aktuellen Datum und holt
keine Zeit aus einem vorherigen Kalendermodus nach. Rückwärtsstellen der Uhr
erstattet nichts; bereits verarbeitete Tage werden auch nach Vorwärtsstellen,
Neuladen oder GM-Wechsel nicht erneut gezählt.

Fehlen Besitzer oder Ergebnisvorlagen, zeigt der Bogen die betroffenen
Einrichtungen an. Andere Einrichtungen laufen weiter. Nach der Reparatur kann
der GM „Fortschritt erneut prüfen“ verwenden; wiederhergestellte Welt-Item-Vorlagen
lösen die Prüfung auch automatisch aus. Ein fehlgeschlagener Kalendertag bleibt
für diese Einrichtung offen. Auszahlungen an denselben Besitzer werden summiert
und gemeinsam mit Fortschritt und Beleg gespeichert.

## Bestehende Einrichtungen übertragen

Der GM öffnet „Einrichtungen übertragen“ im Dreipunktmenü des Bastion-Bogens. Die Vorschau zeigt
Einrichtungen aller Teilnehmercharaktere mit Besitzer und laufendem Fortschritt.
Die Auswahl wird öffentlich Teil der gemeinsamen Bastion; andere Charakterdaten
bleiben privat. Ein Durchgang unterstützt bis zu 100 Einrichtungen.

„Auswahl übertragen“ sichert zuerst die vollständigen Quell-Items im privaten
GM-Journal „Gemeinsame Bastion – Vorgangsbelege“ und legt inaktive Kopien an.
Nach Vergleich der gespeicherten Kopien mit der Planung werden die Quellen
entfernt und die Kopien aktiviert. Laufende und bezahlte Befehle, Personal,
Bauzustand und native Daten bleiben erhalten. Innerhalb derselben Auswahl werden
Facility-UUIDs etwa in Beschreibungslinks und Effektursprüngen zugeordnet.
Externe Makros und Links in anderen Dokumenten muss der GM bei Bedarf anpassen;
die Zuordnung steht in den privaten Sicherungsdaten.

Während der Übernahme die Quellen nicht bearbeiten oder über einen nativen
Bastionzug fortschreiben. Änderungen verhindern den Abschluss. Nach Abbruch
oder Neuladen zeigt derselbe Dialog vorbereitete Übernahmen: „Geprüfte Übernahmen
abschließen“ setzt sie fort; „Vorbereitete Kopien verwerfen“ entfernt nur die
Kopien, während Quellen und Sicherungen bleiben. Danach lässt sich eine neue
Vorschau erstellen. Die privaten GM-Journale enthalten die Sicherungen als
Dokument-Flags und können über Foundrys nativen JSON-Export gesichert werden.
Eine abgeschlossene Übernahme erneut abzuschließen erzeugt keine Duplikate.

## Entwickeln und prüfen

Node.js 24 oder neuer; zum Packen zusätzlich Python 3. `npm ci` installiert
Playwright für die Entwicklung. Zum Laden des Moduls sind keine npm-Pakete
und kein Buildschritt erforderlich.

```sh
npm run check
npm test
npm run build
```

`check` prüft Manifest, ES-Modulsyntax, lokale Imports und Übersetzungsschlüssel.
Die Unit-Tests prüfen Besitzerauflösung, Berechtigungsgrenzen, GM-Auswahl und
individuelle Systemkonfiguration. Sie ersetzen keine Prüfung in Foundry.
`build` erzeugt unter `dist/` eine ZIP mit dem Ordner `shared-bastion`.
Es werden ausschließlich Manifest, Laufzeitdateien, Sprachdateien und diese README
verpackt; insbesondere keine Foundry-Distribution, Testwelten oder Zugangsdaten.
Im Quellprojekt prüft außerdem
`npm run check:foundry -- /absoluter/pfad/zur/entpackten/Foundry-Installation`
das Manifest gegen die echten Foundry-Klassen und rendert die Vorlage mit
Foundrys Handlebars-Version. Das prüft weder Modulstart noch Browserlayout.

Für die Browserprüfung `npm run test:browser:install` und anschließend
`npm run test:integration` ausführen. Voraussetzung ist die laufende, leere
Testwelt mit ID `shared-bastion-integration`, D&D5e 6.0.6, aktiviertem Modul
und dem Standardbenutzer `Gamemaster` ohne Passwort. Die Suite prüft die Welt-ID
vor Änderungen. Die Testwelt enthält keine echten Kampagnendaten.

Der Modulstart und die Statusansicht wurden damit auf Foundry **14.369** /
D&D5e **6.0.6** bestätigt. T02 prüft zusätzlich einen kostenpflichtigen
Spieler-Bauauftrag mit privatem Besitzer und zentralem Item, Ablehnungen,
Wiederholungen und Fortschritt. Die Verwaltungsprüfungen verwenden Foundrys
offiziellen Modus ohne Canvas. Der Kalender ist in T08 bestätigt; Szenen gehören
zum zurückgestellten Ausbau.
T03 bestätigt zusätzlich Erstellung im Verzeichnis, Wiederöffnen nach Neuladen,
Teilnehmerrechte und den Umgang mit gelöschten Besitzern. Bei Rechteänderungen
meldet Foundry 14.369 im Modus ohne Canvas einen eigenen `cycleTokens`-Fehler;
die gespeicherten Berechtigungen wurden trotzdem korrekt geprüft. T10 bestätigt
den Rechteentzug mit aktivem Canvas ohne diesen Fehler, außerdem einen normalen
verknüpften Charaktertoken, direkten nativen Schreibschutz und den deutschen Bogen.

T04 bestätigt mit zwei GMs und zwei Spielern parallele Aktionen, sichtbare
Versionskonflikte und Wiederaufnahme nach GM-Ausfall ohne doppelte Abbuchung.
Aufträge und Ergebnisse liegen in zwei privaten GM-Journalen. Diese nicht
löschen oder Spielern freigeben: Bei fehlenden initialisierten Speichern werden
Schreibaktionen gesperrt, damit alte Aufträge nicht erneut ausgeführt werden.
Native Hook-Abbrüche führen zu keiner Teilbuchung.

Die ursprüngliche Stufe-1-Abnahme umfasste 27 Unit-Tests und elf native
Integrationstests. Die neue Kacheloberfläche ergänzt Sortierung, Plätze und native
Browser-/Dialogbedienung; die aktuelle Suite umfasst 30 Unit-Tests und zwölf native
Integrationstests mit getrennten Clients. Der Nachweis steht im Quellprojekt unter
`docs/native-sheet-acceptance.md`. Das Modul ist ohne erzeugte Szene verwendbar. Im Quellprojekt enthält
`docs/stage1-acceptance.md` die Zuordnung der Abnahmekriterien zu den Prüfungen.
Eine eigene Testszene prüft normales Canvas-Verhalten; ein Szenengenerator wird
damit nicht als implementiert ausgewiesen.

## Isolierte Docker-Testumgebung

Docker Desktop starten. Die lizenzierte Node.js-Distribution
`FoundryVTT-Node-14.369.zip` wird im Projektstamm erwartet; sie ist von Git und dem
Modularchiv ausgeschlossen. Das Image `felddy/foundryvtt:14.369` enthält selbst
keine Foundry-Distribution.

```sh
npm run dev:init
npm run dev:up
npm run dev:status
```

Die Testinstallation ist ausschließlich lokal unter <http://localhost:30014>
erreichbar. `dev:init` erstellt einmalig `dev/secrets.json` mit einem zufälligen
Administratorpasswort (`foundry_admin_key`); vorhandene Konfiguration bleibt
unverändert. Lizenzierung und gegebenenfalls Lizenzvereinbarung erfolgen in
Foundry. Anschließend D&D5e **6.0.6** installieren und eine eigene Testwelt
anlegen. Die bestehende Spielwelt wird nicht eingebunden.

Das Projekt wird schreibgeschützt in den Container eingebunden; Änderungen an
Laufzeitdateien sind nach Neuladen der Testclients sichtbar. Foundry-Daten und
Installationscache liegen in getrennten Docker-Volumes des Projekts
`shared-bastion-test`. Ein Initialisierungscontainer kopiert die ZIP in den
Cache und setzt dessen Schreibrechte.

```sh
npm run dev:down
```

Dieser Befehl beendet die Testcontainer und erhält ihre Daten. Für Logs:
`docker compose -f dev/compose.yaml logs --tail 40 foundry`.

Die Details der Integrationsprüfung und die noch zu bestätigenden Schnittstellen
stehen im Quellprojekt unter `docs/integration-findings.md`.

### Eigene Stufentabelle für besondere Einrichtungen

Als GM unter **Einstellungen → Einstellungen konfigurieren → Shared Bastion →
Stufentabelle bearbeiten** den Tabellendialog öffnen. Jede Zeile enthält eine
Charakterstufe (1–20) und die insgesamt erlaubte Anzahl besonderer Einrichtungen
(0–1000). Zeilen lassen sich hinzufügen und entfernen. Doppelte Stufen sind
unzulässig. Unterhalb der ersten Schwelle gilt 0; die Werte sind Gesamtlimits,
keine zusätzlichen Einrichtungen.

**Speichern** übernimmt die Tabelle weltweit. **Abbrechen** verwirft Änderungen.
**Systemstandard verwenden** lädt die D&D5e-Werte in die Tabelle; erst Speichern
setzt die Welt auf den Systemstandard zurück. Vorhandene frühere Einstellungen
werden automatisch in die Tabelle übernommen.

Beim Weltstart und bei Änderungen wird die Konfiguration auf allen Clients
angewendet, auch für native Charakterbögen. Geöffnete Bögen anschließend neu
öffnen. Einrichtungen werden weder automatisch angelegt noch entfernt. Andere
Voraussetzungen wie die Mindeststufe einer Einrichtung bleiben bestehen.
