# Stufe-1-Abnahme – Shared Bastion 0.1.0

Stand: 2026-10-20. Umfang: T01–T10 aus `PLAN.md`. Der Szenengenerator
(T11–T14) ist zurückgestellt.

**Ergebnis: Stufe 1 abgenommen.** 27 Unit-Tests und elf native Integrationstests
bestanden; Gesamtlauf auf Version 0.1.0: 4,5 Minuten. Native Manifest-/Vorlagenprüfung,
36 ES-Module und 196 DE/EN-Schlüssel erfolgreich geprüft. Das Installationsarchiv
enthält 42 byteweise mit den geprüften Quelldateien verglichene Dateien.

## Laufzeit und Prüfumgebung

- Foundry VTT **14.369**, D&D5e **6.0.6**.
- Offizieller Systemquellcode: Commit `28f35531021bb07609c79c4cbbb9b7e7c2744bf9`.
- Isolierte Docker-Welt `shared-bastion-integration`, Chromium/Playwright mit
  getrennten Benutzerkontexten; GM, zweiter GM und zwei Spieler.
- Verwaltungsprüfungen überwiegend im nativen noCanvas-Modus. T10 verwendet
  zusätzlich aktiven Canvas und einen normalen verknüpften Charaktertoken.
- Native APIs und tatsächliche Datenbanktransaktionen werden geprüft; Unit-Tests
  allein dienen nicht als Nachweis der Systemintegration.

## Abnahmekriterien

| Kriterium aus PLAN.md, Abschnitt 6 | Praktischer Nachweis |
| --- | --- |
| Private Charaktere mit verschiedenen Stufen und Ressourcen | T02, T06: Besitzerstufen 5/13, Trägerlevel unabhängig; fremde Daten bleiben privat. |
| Gemeinsames Lesen, nur eigene Einrichtungen bearbeiten | T02–T07, T10: OBSERVER auf der Bastion, OWNER auf eigenem Charakter; direkte native Actor-/Item-Schreibversuche abgewiesen. |
| Besitzerabschnitte, Gesamtübersicht und Filter zeigen aktuelle Daten | T05: zwei Spieler, gleiche acht zentrale Items, Live-Änderungen und Fortschritt ohne Neuladen. |
| Einstieg im Akteurverzeichnis, Charakterbögen unverändert | T03 und T10: Erstellung, Verzeichnisklick, Wiederöffnen, privater Standardbogen bleibt erhalten. |
| Ungültige direkte Modulbefehle scheitern | T02, T04, T06, T07, T09: Fremdbesitz, falsche Identität, fremder Träger und freie Regel-/Preispatches abgewiesen. |
| Voraussetzungen sperren; begründete Ausnahmen bleiben erhalten | T06: individuelle Level/Plätze und Werkzeugbedingungen, getrennte Ausnahmebereiche, keine Kostenumgehung; Neuladen geprüft. |
| Anlage, Erweiterung, Auftrag, Personal, Entfernung aus dem Bogen | T05–T07: tatsächliche Dialoge, native Craft-/Trade-Bedienung und NSC-Drag-and-drop. |
| Individuelle Zahlungen und Belohnungen | T02/T06/T07: Besitzer bezahlt, anderer Charakter und Träger unverändert; T08 addiert zwei Erlöse à 48 GP korrekt. |
| Parallelität, Wiederholung, Abbruch und Neuladen ohne Teil-/Doppelbuchung | T04: zwei GMs/zwei Spieler, Konflikt und getrennte Änderungen, native Preflight-Vetos und späte Serverkollision; T07 Ergebnis-Veto. |
| Kein/ein/zwei GMs und Wechsel des aktiven GM | T04: Lesen ohne GM, Wiederkehr, Ausfall vor Commit und nach Commit vor Rückmeldung; T08 Fortschritt nach Wechsel. |
| Kalender und Bastionzug ohne doppelte Tage | T08: Weltzeit, native globale Züge, Uhr-Rücksprung, Neuladen, fehlende Vorlage und Wiederaufnahme. Andere Charakterbastion bleibt nativ. |
| GM-Zug ohne Bereit-Abfragen | T08: Bestätigungsdialog enthält Modus/Dauer; keine Bereitschaftsmarkierungen oder Sperren. |
| Transfer erhält laufende Aufträge ohne aktive Duplikate | T09: Sicherung und inaktive Kopie, Quellen-/Kopienprüfung, Erstellungs-/Löschveto, geänderte Quelle, Verwerfen, GM-Neuladen und wiederholter Abschluss. |
| Stufe 1 ohne Szenengenerator verwendbar | Gesamte Verwaltung läuft unabhängig von Szenen; T10 prüft ergänzend den Betrieb neben einer gewöhnlichen Foundry-Szene. |

## Reproduzierbare Prüfung

Voraussetzungen und Docker-Befehle stehen in `README.md` und `AGENTS.md`.

```sh
npm ci
npm run check
npm test
npm run check:foundry -- /absoluter/pfad/zu/Foundry-14.369
npm run test:browser:install
npm run test:integration
npm run build
```

In dieser Arbeitsumgebung liegt Chromium unter `/private/tmp/shared-bastion-browsers`;
hier wurde `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/shared-bastion-browsers`
für die Browserprüfung gesetzt. Das ist keine Voraussetzung auf anderen Rechnern.

Die Prüfung erwartet ausschließlich die eigene Testwelt. Keine Kampagnendaten
einbinden. Die Suite entfernt nur ihre markierten Fixtures und eigenen Testbenutzer.
Die privaten Transaktionsbelege und Transfersicherungen bleiben zur Prüfung erhalten.

## Bestätigte Grenzen

- Schreibpfad ausschließlich für Foundry **14.369** freigegeben; andere V14-Builds
  bleiben bis zum nativen Regressionstest lesbar. D&D5e-Laufzeitabnahme gilt für
  **6.0.6**, weitere 6.0.x-Builds sind nicht separat bestätigt.
- Native Kalender-Sammelaufrufe für die gemeinsame Bastion werden gezielt an
  den eigenen Besitzerpfad delegiert. Fremde Module, die rohe Sammelupdates oder
  native Ergebniskarten für diesen Aktor erwarten, sind nicht gesondert geprüft.
- Native Regeln ohne strukturierte Daten werden vom GM konfiguriert. Keine
  Regelsammlung, kein automatischer Prosa-Parser und keine vollständige
  Automatisierung erzählerischer Befähigungen oder Bastionsereignisse.
- Transfer pro Aktion bis zu 100 Einrichtungen. Quellen während der kurzen
  Übernahme nicht parallel nativ ändern; erkannte Änderungen stoppen den Abschluss.
  Externe Makros und Verweise außerhalb der Auswahl werden nicht automatisch umgeschrieben.
- Foundry 14.369 hat bei Actor-Rechteänderungen ohne Canvas einen eigenen
  `cycleTokens`-Fehler. Rechte werden trotzdem gespeichert; mit aktivem Canvas
  ist der geprüfte Ablauf fehlerfrei. Keine Core-Datei wurde dafür verändert.
- Eine gemeinsame Bastion pro Welt, individuelle Kassen, keine Szenenerzeugung.
  Das Modularchiv enthält weder Foundry-Distribution noch Handbuch, Testdaten
  oder Zugangsdaten. Installation benötigt keine zusätzlichen Grafik-/Regelpakete.

Die ausführlichen Schnittstellenbefunde und konkreten Buchungen stehen in
`integration-findings.md`. Das frühere HTML-Design ist eine Simulation; die
Abnahme beruht auf den installierten nativen Clients.
