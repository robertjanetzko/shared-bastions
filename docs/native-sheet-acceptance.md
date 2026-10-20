# Native Bastion-Oberfläche – Abnahme N01

Stand: 2026-10-20. Nacharbeit der funktional abgeschlossenen Stufe 1 auf
Foundry **14.369** / D&D5e **6.0.6**. Die [ursprüngliche Stufe-1-Abnahme](stage1-acceptance.md)
bleibt der historische Nachweis für T01–T10; ihre Listen-, Reiter- und Filteransicht
wird durch die neue Nutzerentscheidung ersetzt. Der Szenengenerator bleibt offen.

## Umgesetzte Bedienung

- Ausschließlich Besitzerabschnitte mit Spieler- und Charaktername; eigene
  Charaktere zuerst, weitere nach Spielernamen und Charaktername. Der GM sieht
  alle alphabetisch. Mehrfachbesitz und fehlende Benutzerzuordnung sind definiert.
- Zwei Spalten für Basis- und besondere Einrichtungen, auf schmalen Fenstern eine.
  Native Kachelstruktur mit dem Facility-Bild, Größe, Auftragsicon,
  Personalplätzen, Fortschritt und sichtbaren Regelausnahmen/Störungen.
- Freie Plätze öffnen den nativen Kompendiumbrowser mit Kategorie und für Spieler
  Besitzerstufe. Die Platzberechnung zählt noch nicht übertragene Einrichtungen
  auf dem Charakter mit. Kostenlose Basiseinrichtungen werden sofort fertig;
  weitere bleiben bis zum Bau ungebaut. Besondere Einrichtungen sind nativ fertig.
- Eigene Kacheln öffnen die native Aktivitätsauswahl. Details, Bearbeiten,
  Entfernen, Personal und Abbruch sind im Kontextmenü; GM-Verwaltung und Züge
  im Fenstermenü. Weltvorlagen bleiben im Abschnittsmenü erreichbar. Für
  begründete GM-Ausnahmen gibt es dort zusätzlich die besondere Einrichtungsauswahl,
  auch wenn die normalen Plätze bereits belegt sind.
- Kontextmenüs unterstützen Umschalt+F10, Pfeiltasten, Pos1/Ende, Enter und Escape.
  Fremde Einrichtungen sind für Spieler ausschließlich sichtbar. Offene Dialoge
  dürfen nach Rechteentzug oder GM-Abmeldung keinen Schreibpfad freigeben.

## Wiederverwendung und Grenzen

`BastionUIAdapter` verwendet die öffentlichen Laufzeitexporte von D&D5e:
`ApplicationV2Mixin`, `ContextMenu5e`, `CompendiumBrowser.selectOne` und
`ActivityChoiceDialog`. Die Auswahl erhält einen vom Besitzerpfad geprüften
Aktivitätskontext; sie verwendet weder `Item.use` noch `activity.use`.
Die vorhandenen Bau-/Auftragsdialoge und GM-Befehle übernehmen die Ausführung.

Native `.card`-, `.slots`-, `.name-stacked`- und `.meter`-Komponenten liefern
Darstellung und Themenvariablen. Die Facility-Regeln aus
`less/v2/character.less` sind an den nativen Charakterbogen gebunden. Nur diese
Regeln und das gemeinsame Abschnittslayout werden lokal adaptiert (MIT,
Commit `28f35531021bb07609c79c4cbbb9b7e7c2744bf9`). Keine Systemdatei wird
verändert; Bilder und Schriften werden nicht kopiert oder mitgeliefert. Der
Lizenzhinweis für die adaptierten Style-Regeln steht im CSS-Kopf.

Der native Browser durchsucht aktivierte Kompendien. Geschützte Weltvorlagen
bleiben im Kontextmenü verfügbar. Der Browserhinweis erklärt fehlende Ergebnisse;
Quellenrechte, Voraussetzungen, Plätze und Kosten prüft der GM-Pfad erneut.
Öffentliche Teilnehmermetadaten enthalten Benutzerreferenzen für die Sortierung,
keine privaten Charakterwerte. Bestehende Einrichtungen benötigen keine Migration.

## Prüfungen

Status: **abgenommen**. Alle 30 Unit-Tests und zwölf nativen Integrationstests
bestanden; abschließender Gesamtlauf 6,4 Minuten. `npm run check` bestätigt
39 ES-Module und 205 DE/EN-Schlüssel. Native Manifest-/Vorlagenprüfung, Paketierung
und byteweiser Abgleich der 45 Archivdateien mit dem Quellstand bestanden.
Dark/Light, schmale Fenster, Browser und Aktivitätsauswahl visuell geprüft.

Verwendeter Browserbefehl mit dem vorhandenen lokalen Chromium-Cache:
`PLAYWRIGHT_BROWSERS_PATH=/tmp/shared-bastion-browsers npm run test:integration`.
Auf einer frischen Umgebung richtet `npm run test:browser:install` den Standardcache ein.

- `test/presentation.test.mjs`: Sortierung mit Mehrfachbesitz, mehreren eigenen
  Charakteren, GM, gelöschten Benutzern und fehlenden Zuordnungen; Platzberechnung
  ohne fremde private Limits. Die gesamte Unit-Suite umfasst 30 Prüfungen.
- Native T05-Prüfung: gleiche zentrale Einrichtungen bei zwei Spielern,
  unterschiedliche Abschnittsreihenfolge, Tastaturkontextmenü, Aktivitätsauswahl,
  Bauabbruch/-kosten, Live-Fortschritt und GM-Abmeldung/Rückkehr.
- Native UI-Prüfung: Kategorie-/Stufenfilter, Browserabbruch, kostenlose und
  kostenpflichtige Plätze mit persönlicher Einrichtung, native besondere Räume,
  GM-Ausnahme, echte Bildhintergründe, beide Themen, schmale Fenster und
  Rechteentzug bei geöffneter Aktivitätsauswahl. Screenshots entstehen unter
  `test-results/ui-*.png` und werden nicht im Modularchiv verteilt.
- Die Kalender-Fixture ordnet neu angelegte Räume über ihre Namen zu, damit die
  Prüfung unabhängig von der nativen Rückgabereihenfolge die vorgesehenen
  Besitzer für Verkäufe und Herstellung verwendet.
- T10 prüft weiterhin den deutschen Bogen und normale Tokenbewegung mit aktivem
  Canvas. Der bereits dokumentierte Foundry-Kernfehler bei Rechteänderungen ohne
  Canvas (`cycleTokens`) bleibt eine bekannte Grenze der Verwaltungs-Testclients;
  der aktive Canvas-Client ist davon nicht betroffen.

Die Prüfung erfolgt in einer temporären Kopie des lokalen Docker-Datenvolumens,
weil die ursprüngliche Testinstallation inzwischen eine eingerichtete Bastion
enthält. Das ursprüngliche Volume bleibt während der Tests getrennt.

Die ursprüngliche Installation ist wieder auf dem Originalvolume gestartet:
„Manor House“, fünf Akteure, zwei zentrale Einrichtungen und zwei Teilnehmer sind
bestätigt. Das temporäre Testvolume ist entfernt. Die ungenutzten Testkonten
„SB T10 Alice“ und „SB T10 Bob“ aus dem ersten Aufbau wurden nach ausdrücklicher
Nutzerfreigabe gelöscht. Alle Akteurdaten und übrigen Benutzer sind im
Vorher-/Nachher-Vergleich unverändert.
