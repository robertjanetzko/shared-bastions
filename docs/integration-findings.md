# Integrationsbefunde

Stand: 2026-10-19. **Quellcodebefunde und lokale Unit-Tests sind keine
Laufzeitabnahme. T01–T05 sind im jeweils dokumentierten Umfang abgenommen.**

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

T02: Ein GM und zwei Spieler in getrennten Browserkontexten prüfen einen nativen
Bauauftrag. Der Besitzer hat Level 13, der zentrale Träger Level 0. Der Bau
verwendet 500 GP vom Besitzer (1.000→500), während 7.000 GP auf dem Träger
und 9.000 GP auf dem fremden Charakter unverändert bleiben. Fremdbesitz,
Besitzerlevel 4 und unzureichende Mittel (499 GP) werden abgewiesen. Der native
Fortschritt beendet nach 20 Tagen den Bau auf dem zentralen Item. Doppelte
Zustellung und Neuladen des GM erzeugen keine zweite Buchung oder Fortschreibung.
Die Suite nutzt dafür den offiziellen Modus ohne Canvas. Kalender und weitere Auftragsarten werden später geprüft; GM-Wechsel siehe T04.

T03: Erstellung im nativen Akteurverzeichnis, Teilnehmerauswahl, gespeicherte
`core.sheetClass`-Zuordnung und Wiederöffnen nach Neuladen sind mit GM und Spieler
bestätigt. Teilnehmer erhalten OBSERVER am Träger; die bisherigen Rechte und der
Bogen des privaten Charakters bleiben unverändert. Öffentliche Roster-Daten
bestehen ausschließlich aus UUID, Name, Bild und Verfügbarkeit. Entfernen eines
Teilnehmers entzieht seinen Lesezugriff. Ein gelöschter Besitzer wird angezeigt;
Folgeaktionen scheitern mit `MissingOwner`.

Foundry 14.369 hat dabei einen bestätigten Fehler im Modus ohne Canvas:
`Actor._onUpdate` ruft nach Berechtigungsänderungen bei Spielern ungeschützt
`canvas.tokens.cycleTokens` auf. Die Tokenebene existiert in diesem Modus nicht.
Die Berechtigung wird dennoch gespeichert; der T03-Test prüft dies ausdrücklich.
Der Kern wird nicht angepasst. Mit aktivem Canvas in T10 erneut prüfen.

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

Der Systemadapter ermittelt Level und individuelle Einrichtungskontingente.
Noch auf dem Charakter vorhandene Einrichtungen zählen mit. Öffentliche
Diagnosedaten enthalten keine Charakterdaten. Die begrenzte Schreib-API akzeptiert
konkrete Bauaufträge und einen GM-Fortschrittsschritt; keine freien Dokumentpatches.

Die serverseitige Absenderzuordnung stammt aus dem nativen `createChatMessage`-
Hook. Die ursprüngliche Anfrage wird bei Zustellung kopiert; spätere Bearbeitung
der Nachricht führt nichts aus. Nur der gewählte aktive GM verarbeitet sie.
Kosten werden mit `CurrencyManager.getActorCurrencyUpdates` geplant, Fortschritt
mit `bastion.advanceTurn(..., { performUpdates: false })`. Ein privates GM-Journal
enthält eindeutige Vorgangsbelege. Beleg, Kosten und Item-Fortschritt werden über
die native `foundry.documents.modifyBatch`-API gemeinsam geschrieben. Native
Beleg-ID-Kollisionen brechen den gesamten Batch ab. Praktisch bestätigt wurde
auch, dass ein solcher Abbruch ohne Promise-Rejection auflösen kann; deshalb
prüft der Befehlspfad den tatsächlich gespeicherten Beleg.

Die Statusansicht verwendet die vorhandenen `--dnd5e-*`-Farb- und Schriftvariablen
des Systems. Bilder, Schriftdateien und Regeltexte werden nicht mitgeliefert.

## Erledigte T02-Prüfung und anschließender Ausbau

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

Punkte 1–4 und der explizite Fortschritt mit Wiederholung/Neuladen sind bestätigt.
T04 bestätigt zusätzlich GM-Wechsel und die Transaktionsgrenze. Kalender und
vollständige Betriebsaktionen bleiben T07/T08; nächster Task ist T06.
Der Szenengenerator folgt weiterhin erst der Stufe-1-Abnahme.

## T04: Authentifizierung, Ausfall und atomare Schreibgrenze

Die kanonische Bastion ist über eine GM-geschützte Welteinstellung gebunden.
Ein fremder markierter Aktor wird abgewiesen. Zwei private GM-Journale speichern
serverseitig authentifizierte ursprüngliche Anfragen und endgültige Ergebnisse.
Alle aktiven GMs beobachten die ursprünglichen nativen Ereignisse; ausschließlich
der gewählte aktive, verbundene GM speichert. Ein neuer Executor verarbeitet die
dauerhafte Warteschlange weiter und sendet fehlende Rückmeldungen erneut. Bereits
initialisierte, fehlende Journale werden nicht neu erzeugt. Native Leserechte
stehen auch explizit für GMs auf NONE, damit eine spätere Herabstufung keine
privaten Speicher öffnet; der GM-Rollenbonus ermöglicht den regulären Zugriff.

Die native Batch-API in Foundry 14.369 hat zwei wichtige Eigenschaften:

- Eine serverseitige ID-Kollision am letzten Beleg rollt auch vorangehende
  Ressourcenänderungen zurück. Praktisch geprüft mit einer späten Kollision.
- Die clientseitige Vorbereitung (`client/data/client-backend.mjs`,
  `modifyDocumentBatch`) kann bei einem Hook-Veto ein einzelnes Dokument entfernen
  und die übrigen Operationen trotzdem versenden. Deshalb überwacht `strictBatch`
  ausschließlich die eigenen Operationsargumente: Veränderte Identitätsmengen
  brechen vor dem Versand ab. Native Hooks laufen einmal; kein Core-Ersatz und
  keine `noHook`-Umgehung. Der Beleg steht zuletzt, seine Existenz bestätigt den Commit.

Dieser versionsabhängige Schutz liegt im Foundry-Adapter. Schreibaktionen sind
bis zu einer entsprechenden Laufzeitprüfung auf **14.369** begrenzt. Andere
unterstützte V14-Builds bleiben lesbar.

Der native Vierclient-Test bestätigt konkurrierende Anfragen auf dasselbe Item
(ein Erfolg/ein Konflikt), parallele verschiedene Items (beide einmal), fehlende
GM-Präsenz (keine Anfrage gespeichert), fremde Marker/behauptete GM-Absender,
Hook-Veto ohne Teilbuchung und ohne späteren Wiederanlauf, sowie Ausfall des
Executors vor Commit und nach Commit vor Rückmeldung. Im letzten Fall wird nur
die vorhandene Antwort erneut zugestellt. Neuladen erzeugt keine zweite Buchung.
Ein natives, zum Spieler herabgestuftes User-Modell hat keinen Lesezugriff auf
Träger oder private Journale. Die sechs Integrationstests und vierzehn Unit-Tests
sind bestanden; der bekannte native Fehler ohne Canvas bleibt separat dokumentiert.

## T05: Gemeinsame Übersicht

Mit zwei Spielern und privaten Besitzercharakteren bestätigt: dieselben acht
zentralen Items erscheinen in Besitzerabschnitten und Gesamtansicht. Einfache
und besondere Einrichtungen sind getrennt; Alle/Eigene/Besitzerfilter verwenden
keine zusätzlichen Kopien. Name, Typ, Größe, Bauzustand, Auftrag und Fortschritt
stammen aus nativen Facility-Daten. Die Anzeige löst keine fremden Charakterwerte
auf. Ein Klick öffnet die öffentliche, mit `secrets: false` angereicherte Beschreibung.

Der Bogen ist ein Aktionsdashboard (`tag: section`), kein automatisch einreichendes
Actor-Formular. So bleibt der native Träger auf OBSERVER, während ausdrücklich
zulässige Aktionen durch den GM-Befehlspfad laufen. Native DocumentSheet-Formulare
würden sonst auch die Lese-/Filtersteuerung für Observer vollständig deaktivieren.
Fremde Bauknöpfe bleiben gesperrt; direkte Fremdbefehle prüft weiterhin der Executor.

Ein abgebrochener Baudialog bucht nichts ab. Bestätigung verwendet die konfigurierte
Größe und bucht 500 GP ausschließlich vom Besitzer ab; beide Spieler sehen den
20-Tage-Fortschritt. Native Namensänderungen, GM-Abmeldung und Rückkehr aktualisieren
geöffnete Bögen ohne Neuladen. Filter bleiben im Lesemodus nutzbar. Die GM-Ansicht
wurde visuell gegen das installierte D&D5e-Theme geprüft. Vollständige Bearbeitung,
Regelausnahmen und weitere Betriebsaktionen folgen in T06/T07.
