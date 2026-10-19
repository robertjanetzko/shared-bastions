# Integrationsbefunde

Stand: 2026-10-19. **Quellcodebefunde und lokale Unit-Tests sind keine
Laufzeitabnahme. T01 ist in der Testwelt abgenommen; T02 bleibt offen.**

## Nachvollziehbare Quellenbasis

D&D5e **6.0.6**, Branch `6.0.x`, Commit
`28f35531021bb07609c79c4cbbb9b7e7c2744bf9`; Mindestversion laut Systemmanifest:
Foundry **14.367**. Der Nutzer hat `FoundryVTT-Node-14.369.zip` bereitgestellt.
Die Docker-Testkonfiguration verwendet deshalb **14.369**.

T01: Das Modul ist in `shared-bastion-integration` aktiviert. Die Statusansicht
wurde unter Chromium gerendert und als Screenshot geprüft; keine JavaScript-
Fehler oder fehlgeschlagenen Modulressourcen. Native Manifestvalidierung und
Handlebars-Render mit der bereitgestellten Foundry-Distribution bestanden.
Die Testclients verwenden Softwaregrafik; dies ist keine Szenenabnahme.

- [Facility-Datenmodell](https://github.com/foundryvtt/dnd5e/blob/28f35531021bb07609c79c4cbbb9b7e7c2744bf9/module/data/item/facility.mjs):
  Native Felder für Bau, Größe, Level, Aufträge, Personal, Verteidiger, Handel
  und Fortschritt sind vorhanden. `_preCreate` bestimmt freie einfache
  Einrichtungen anhand des physischen Elternaktors. Der zentrale Träger darf
  deshalb nicht ungeprüft als Besitzer dienen. Dieser Eingriff muss vor dem
  späteren Anlegen zentraler Items im Adapter geklärt werden.
- [Systemkonfiguration](https://github.com/foundryvtt/dnd5e/blob/28f35531021bb07609c79c4cbbb9b7e7c2744bf9/module/config.mjs):
  `CONFIG.DND5E.facilities` liefert Größenflächen und Fortschrittstabellen.
  Einfache Einrichtungen haben ein Kontingent kostenloser Räume; dieses ist
  kein allgemeines Verbot weiterer kostenpflichtiger einfacher Räume.
  Der lesende Adapter trennt freie einfache Plätze und besondere Limits.
- [Order-Aktivität](https://github.com/foundryvtt/dnd5e/blob/28f35531021bb07609c79c4cbbb9b7e7c2744bf9/module/documents/activity/order.mjs)
  und [Auftragsdialog](https://github.com/foundryvtt/dnd5e/blob/28f35531021bb07609c79c4cbbb9b7e7c2744bf9/module/applications/activity/order-usage-dialog.mjs):
  Die Aktivität speichert den Fortschritt auf dem Item. Der Dialog erlaubt
  veränderbare Kosten und Dauer; diese Eingaben dürfen nicht als ungeprüfte
  Spielerbefehle an einen GM weitergereicht werden.
- [Native Auftragsnachricht](https://github.com/foundryvtt/dnd5e/blob/28f35531021bb07609c79c4cbbb9b7e7c2744bf9/module/data/chat-message/bastion-order-message-data.mjs):
  Zahlung erfolgt separat über die Chatnachricht. Der zugeordnete Aktor dient
  zugleich als Zahlungsquelle und Elternaktor des Item-Updates. Das passt
  nicht unmittelbar zur getrennten Speicherung. Kosten müssen dem Besitzer,
  Fortschritt dem zentralen Item zugeordnet werden.
- [Bastion-API](https://github.com/foundryvtt/dnd5e/blob/28f35531021bb07609c79c4cbbb9b7e7c2744bf9/module/documents/actor/bastion.mjs):
  `advanceTurn(facility, { duration, performUpdates: false, turn })` berechnet
  native Updates und Ergebnisse ohne unmittelbares Speichern. Der Standardwert
  für `duration` ist sieben Tage. Kalenderbetrieb und Zug unterscheiden sich;
  der spätere Adapter muss Werte ausdrücklich übergeben.
- [Kalenderverarbeitung](https://github.com/foundryvtt/dnd5e/blob/28f35531021bb07609c79c4cbbb9b7e7c2744bf9/module/data/calendar/calendar-data.mjs):
  Der Kalender sammelt Facility-Updates selbst und speichert sie später. Ein
  zusätzlicher eigener Kalenderhook würde ohne Koordination doppelt verarbeiten.

## Bereits implementierte Grenze

`scripts/core/ownership.mjs` akzeptiert nur native Einrichtungen auf einem
markierten Charakter-Aktor mit unterstützter Metadatenversion. Der Besitzer
muss ein existierender Weltcharakter und Teilnehmer sein. Ungültige UUIDs,
Tokenaktoren, Kompendiumaktoren und der Bastion-Träger sind keine Ersatzbesitzer.
Spieler brauchen native `OWNER`-Rechte am Besitzercharakter. Es werden keine
zusätzlichen Charakterrechte vergeben und keine privaten Daten gespiegelt.

Der lesende Systemadapter ermittelt Level und individuelle Einrichtungskontingente.
Noch auf dem Charakter vorhandene Einrichtungen zählen mit. Öffentliche
Diagnosedaten enthalten keine Charakterdaten. Es gibt noch keine Schreib-API.

Die Statusansicht verwendet die vorhandenen `--dnd5e-*`-Farb- und Schriftvariablen
des Systems. Bilder, Schriftdateien und Regeltexte werden nicht mitgeliefert.

## Nächste praktische Prüfung: T02

1. Leere Testwelt mit D&D5e 6.0.6 und Modul laden; konkrete Builds und
   Konsolenfehler dokumentieren (T01).
2. GM und zwei getrennte Spieler mit privaten Charakteren unterschiedlicher
   Level und Ressourcen anlegen. Der zentrale Charakter erhält ausdrücklich
   andere Werte als die Besitzer.
3. Native Einrichtung auf dem zentralen Aktor anlegen, einen privaten
   Besitzer zuordnen und den Einfluss von `_preCreate` kontrollieren.
4. Einen konkreten Spielerauftrag ohne GM-Bestätigung ausführen; Absender,
   Voraussetzungen, Abbuchung beim Besitzer und Fortschritt auf dem zentralen
   Item nachweisen. Ein fremder Auftrag muss scheitern.
5. Kalender, Zug, Wiederholung und GM-Wechsel prüfen. Bei Teilfehlern müssen
   Ressourcen und Fortschritt ohne doppelte Verbuchung wiederherstellbar sein.

Die vollständige Verwaltungsoberfläche folgt erst nach diesem Nachweis;
der Szenengenerator folgt der Stufe-1-Abnahme.
