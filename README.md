# Shared Bastion

Gemeinsame Bastion für Foundry VTT V14 und D&D5e 6.0.x. Die Einrichtungen sollen
als native Facility-Items auf einem zentralen Aktor leben und ihre Regeln und
Ressourcen vom jeweiligen Besitzercharakter beziehen.

**Entwicklungsstand:** Modulgerüst und lesender Besitzeradapter vorhanden.
Gemeinsame Verwaltung, Aufträge und Szenengenerator sind noch nicht verfügbar.
Die Abnahmen aus `PLAN.md` im Quellprojekt sind noch offen. Der dortige
HTML-Prototyp `docs/implementation-visual.html` ist eine lokale Simulation.

## Lokal installieren

Den Projektordner als `Data/modules/shared-bastion` in eine **Testinstallation**
kopieren oder dort verlinken. Foundry neu starten und das Modul in einer
D&D5e-Testwelt aktivieren. Unter den Moduleinstellungen öffnet „Modulstatus
anzeigen“ die Entwicklungsdiagnose. Bestehende Charakterbögen werden nicht verändert.

Zielbereich: Foundry ab **14.367 innerhalb V14**, D&D5e **6.0.x**. Der offizielle
Systemquellcode **6.0.6**, Commit `28f35531021bb07609c79c4cbbb9b7e7c2744bf9`, wurde
geprüft. Das ist keine bestätigte Laufzeitkompatibilität.

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
D&D5e **6.0.6** bestätigt. Gemeinsame Besitzerintegration und Szenen sind noch
nicht abgenommen. Die Browserprüfung verwendet derzeit Softwaregrafik.

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
