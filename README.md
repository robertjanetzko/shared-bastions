# Shared Bastion

Gemeinsame Bastion für Foundry VTT V14 und D&D5e 6.0.x. Die Einrichtungen sollen
als native Facility-Items auf einem zentralen Aktor leben und ihre Regeln und
Ressourcen vom jeweiligen Besitzercharakter beziehen.

**Entwicklungsstand:** Modulgerüst, erster praktischer Besitzer-/Auftragsnachweis
und Bastionerstellung mit Teilnehmerverwaltung sind vorhanden. Die vollständige
Einrichtungsverwaltung und der Szenengenerator fehlen noch. T01–T04 aus `PLAN.md`
im Quellprojekt sind abgenommen. Der dortige
HTML-Prototyp `docs/implementation-visual.html` ist eine lokale Simulation.

## Lokal installieren

Den Projektordner als `Data/modules/shared-bastion` in eine **Testinstallation**
kopieren oder dort verlinken. Foundry neu starten und das Modul in einer
D&D5e-Testwelt aktivieren. Unter den Moduleinstellungen öffnet „Modulstatus
anzeigen“ die Entwicklungsdiagnose. Bestehende Charakterbögen werden nicht verändert.

Der GM erstellt die Bastion über „Bastion erstellen“ im Akteurverzeichnis und
wählt die Teilnehmercharaktere. Danach öffnen alle Teilnehmer den gemeinsamen
Aktor aus demselben Verzeichnis. Im Bastion-Bogen verwaltet der GM die Teilnehmer.
Der gemeinsame Aktor enthält nur die benötigte öffentliche Identität der
Charaktere; ihre eigenen Bögen behalten ihre bisherigen Rechte.

Zielbereich: Foundry ab **14.367 innerhalb V14**, D&D5e **6.0.x**. Der offizielle
Systemquellcode **6.0.6**, Commit `28f35531021bb07609c79c4cbbb9b7e7c2744bf9`, wurde
geprüft. Bestätigte Laufzeitprüfungen gelten derzeit für 14.369 / 6.0.6.
Schreiben ist auf Foundry **14.369** begrenzt, weil dessen native
Transaktionsvorbereitung eigens geprüft und abgesichert ist. Andere V14-Builds
bleiben bis zur erneuten Integrationsprüfung im Lesemodus.

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
offiziellen Modus ohne Canvas. Kalender und Szenen sind noch nicht abgenommen.
T03 bestätigt zusätzlich Erstellung im Verzeichnis, Wiederöffnen nach Neuladen,
Teilnehmerrechte und den Umgang mit gelöschten Besitzern. Bei Rechteänderungen
meldet Foundry 14.369 im Modus ohne Canvas einen eigenen `cycleTokens`-Fehler;
die gespeicherten Berechtigungen wurden trotzdem korrekt geprüft. Die native
Prüfung mit aktivem Canvas folgt bei der Stufe-1-Abnahme.

T04 bestätigt mit zwei GMs und zwei Spielern parallele Aktionen, sichtbare
Versionskonflikte und Wiederaufnahme nach GM-Ausfall ohne doppelte Abbuchung.
Aufträge und Ergebnisse liegen in zwei privaten GM-Journalen. Diese nicht
löschen oder Spielern freigeben: Bei fehlenden initialisierten Speichern werden
Schreibaktionen gesperrt, damit alte Aufträge nicht erneut ausgeführt werden.
Native Hook-Abbrüche führen zu keiner Teilbuchung.

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
