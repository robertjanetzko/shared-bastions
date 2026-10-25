# Integrationsbefunde

Stand: 2026-10-20. **Quellcodebefunde und lokale Unit-Tests sind keine
Laufzeitabnahme. T01–T10 sind durch die dokumentierten nativen Prüfungen
auf Foundry 14.369 / D&D5e 6.0.6 abgenommen.**

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
Die Suite nutzt dafür den offiziellen Modus ohne Canvas. Weitere Auftragsarten
siehe T07, Kalender siehe T08, GM-Wechsel siehe T04.

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
Der Kern wird nicht angepasst. T10 bestätigt den Rechteentzug mit aktivem Canvas
ohne diesen Fehler.

- [Facility-Datenmodell](https://github.com/foundryvtt/dnd5e/blob/28f35531021bb07609c79c4cbbb9b7e7c2744bf9/module/data/item/facility.mjs):
  Native Felder für Bau, Größe, Level, Aufträge, Personal, Verteidiger, Handel
  und Fortschritt sind vorhanden. `_preCreate` bestimmt freie einfache
  Einrichtungen anhand des physischen Elternaktors. Der zentrale Träger darf
  deshalb nicht ungeprüft als Besitzer dienen. Der Adapter stellt bei
  ausdrücklich markierten Erstellungsoperationen die vorab berechnete Besitzer-
  Bauentscheidung in einem nativen `preCreateItem`-Hook wieder her.
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
  der Adapter übergibt Werte deshalb ausdrücklich.
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
konkrete Verwaltungs-/Bau-/Befehlsaktionen, GM-Fortschritt und Transfer;
keine freien Dokumentpatches.

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

Punkte 1–5 sind bestätigt. T04 prüft GM-Wechsel und die Transaktionsgrenze,
T07 die Betriebsaktionen, T08 native Kalender-/Zugkoordination.
T10 schließt die Stufe-1-Abnahme ab. T11–T14 sind zurückgestellt.
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
Träger oder private Journale. Die acht Integrationstests und einundzwanzig Unit-Tests
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

## T06: Vorlagen, individuelle Regeln und Besitzerreparatur

Der native T06-Test auf 14.369/6.0.6 und die vollständige Gesamtsuite mit sieben
Integrationstests sind bestanden. Level-5- und Level-13-Charaktere haben verschiedene native Limits.
Die Einrichtungen zählen auch noch vorhandene private Charaktereinrichtungen mit.
Ein neuer zentraler Raum bleibt trotz Trägerlevel 20 ungebaut, wenn das kostenlose
Besitzerkontingent bereits auf dem Charakter verbraucht ist. Das bestätigt den
gezielten normalen `preCreateItem`-Hook ohne Änderung installierter Dateien.

Welt-Items und ein eigens in der Testwelt angelegtes natives Kompendium wurden
verwendet. Die Quelle blieb nach Übernahme unverändert; der Testpack wird am Ende
entfernt. Der frei mitgelieferte Systeminhalt bot im Test keinen Facility-Eintrag;
daraus wird keine verfügbare Regelsammlung als Voraussetzung abgeleitet.
Spielereditierbare Quellen werden abgewiesen, ebenso fremde Besitzerzuordnungen,
fehlender Level, fehlende Werkzeugübung und überschrittene besondere Plätze.

Die GM-Vorlagenregelpflege im Bogen schreibt eine weltlokale Einstellung mit
Vorgangsbeleg und Revision atomar. Zusätzliche Voraussetzungen sind keine native
Facility-API: das Datenmodell hat nur `level`. Der GM ergänzt deshalb Bedingungen
als Werkzeug-/Waffenübung, Item-Identifier, zauberwirkende Klasse oder ausdrückliche
Freigabe. Der Code parst keine Regeltexte. Bestehende Einrichtungen behalten ihre
eigenen Regeln, wenn sich eine Vorlagendefinition später ändert.

Eigene Namen und Notizen wurden über die Oberfläche bearbeitet; die GM-Zuordnung
und die bestätigte Entfernung ebenfalls. Regelpatches durch Spieler scheitern.
Eine Levelausnahme hebt eine fehlende Werkzeugbedingung nicht auf. Eine zusätzliche
begründete Voraussetzungsausnahme erlaubt den Auftrag, aber 499 GP reichen weiterhin
nicht für einen 500-GP-Bau. Nach Aufstockung sinkt ausschließlich das Besitzergold
4.000→3.500; 9.000 GP des anderen Charakters und 7.000 GP des Trägers bleiben gleich.
Ausnahmen bleiben nach Neuladen sichtbar. Ein gelöschter Besitzer lässt sich durch
GM-Neuzuordnung reparieren. Persönliche Level/Plätze werden nur dem Besitzer/GM
angezeigt; die Zusammenfassungs-API prüft Rechte vor dem Lesen privater Regelwerte.

Die zusätzliche native T06-Prüfung bestätigt die Einmaligkeit besonderer Typen je
Besitzer. Eine ausdrückliche GM-Regeldefinition (`repeatable`) erlaubt mehrere;
ungeachtet dessen bleibt das individuelle Platzlimit bestehen. Begründete
Limitausnahmen bleiben möglich. Zwei Unit-Tests sichern die individuellen Grenzen
und die unterschiedlichen Anfangsflächen 4/16 Rasterfelder. Deutsche Begriffe sind
mit dem lokal bereitgestellten Handbuch abgeglichen; keine Regelprosa wird verpackt.

## T07: Native Befehle und Ergebnisabrechnung

Die T07-Prüfung und die vollständige Gesamtsuite mit acht Integrationstests sind
bestanden; 21 Unit-Tests und die native Manifest-/Vorlagenprüfung sind ebenfalls grün.
Der native `OrderUsageDialog` wird auf einem ephemeren Item mit Order-Aktivität
geöffnet. Er liefert ausschließlich Optionen; `Item.use` und die native
`bastionOrder`-Zahlungsnachricht werden nicht ausgeführt. Kosten-/Tagesfelder sind
schreibgeschützt. Der Executor ignoriert clientseitige Preiswerte und berechnet
Bau, Erweiterung, Herstellung und Handel aus den geprüften Quellen erneut.

Praktisch bestätigt: Herstellung eines 100-GP-Items über native CraftCost (10 Tage,
50 GP) mit einem Ergebnis-Item beim Besitzer; drei geerntete Items; Warenkauf 100 GP,
Verkauf 40 mit 20 Prozent Gewinn (48 GP); Kreaturenkauf/-verkauf anhand nativer
NSC-Preise; abgebrochener Verkauf gibt die vorgemerkten Kreaturen zurück. Normale
Befehlabbrüche erstatten Kosten nicht. Vorab-Dialogschließen verändert nichts.

Eine normale Erweiterung kostet 500 GP und dauert 25 Tage; die dafür vorgesehene
besondere Einrichtung wird unmittelbar erweitert. Auch ein auf 0 manipulierter
nativer Dialogpreis führt zur regulären 500-GP-Abbuchung. Der Besitzer endet bei
900 GP, während anderer Charakter (9.000 GP) und Träger (7.000 GP) unverändert bleiben.
Eine native Ergebnis-Item-Veto-Hook verhindert auch die Fortschrittsbuchung. Nach
Entfernen des Vetos erzeugt ein neuer Fortschrittsauftrag das Ergebnis einmal.
Wiederholung und Neuladen ergeben weder weitere Items noch Erlöse.

Mietlinge wurden über Foundrys echte DocumentTags-Drop-Felder zugeordnet;
Kapazitätsüberschreitungen und fremde Befehle werden abgewiesen. Referenzen
speichern nur UUID/Name/Bild. Der native Item-Identifier stammt aus dem Document-
Mixin (`item.identifier`), nicht ausschließlich aus `system.identifier`.
Reine Beschreibungs-/Erzählwirkungen bleiben wie im nativen System außerhalb der
automatischen Ergebnisabrechnung.

## T08: Kalender und Bastionzüge

Bestätigt auf Foundry 14.369 / D&D5e 6.0.6 mit getrennten GM-/Spielerclients:
Der Bogen führt einen GM-Zug ohne Bereitschaftsmarkierungen aus. Ohne
Kalenderautomatik zählt die eingestellte Dauer (geprüft: sieben Tage); mit
Kalenderautomatik zählen ausschließlich die vergangenen Tagesgrenzen. Native
globale Bastionzüge delegieren den gemeinsamen Aktor an denselben GM-Befehlspfad.
Ein anderer Charakter mit Facility läuft unverändert durch die native Funktion.

Der System-Singleton bietet keinen Hook zum Ausschluss eines Aktors. Im Adapter
wird deshalb ausschließlich dessen `advanceAllFacilities`-Instanzmethode delegiert:
kanonischer Aktor an den eigenen Ablauf, andere Aktoren an die unveränderte
Originalfunktion. Aufrufe mit `performUpdates:false` liefern für den gemeinsamen
Aktor keine Updates und keine native Ergebniskarte. Der native Kalender sammelt
sonst eigene Item-Updates und erzeugt eine Ergebnisnachricht für den physischen
Elternaktor. Der eigene Weltzeit-Hook übernimmt stattdessen Fortschritt, jeweilige
Besitzerinventare, summierte Besitzereinnahmen und Beleg in einer Transaktion.
Keine Systemdateien, Prototypen oder globalen Einzel-Fortschrittsfunktionen ändern.
Die Brücke ist für diese Builds geprüft; fremde Module, die rohe Sammelupdates
für diesen Aktor erwarten, sind nicht separat bestätigt.

Tagesdifferenzen stammen aus der tatsächlichen nativen Kalenderklasse. Beim
Modus-/Kalenderwechsel gilt die aktuelle Zeit als Ausgangspunkt. Jede Einrichtung
hat eine vorwärts laufende Zeitmarke. Wiederholte Hooks, Uhr-Rücksprung mit Rückkehr
auf dasselbe Datum und Neuladen zählen keine bereits verbuchten Tage erneut.
Abgeschaltete Einrichtungen überspringen Kalendertage und werden erst beim Zug
repariert; der Zug im Kalendermodus fügt keine weiteren Tage hinzu.

Fehlende Besitzer oder Ergebnisvorlagen erhalten einen sichtbaren Fehler und
behalten ihre offene Zeitmarke; andere Einrichtungen laufen weiter. Derselbe
fehlerhafte Tag wird ohne erneute GM-Prüfung nicht in einer Schleife angefragt.
Nach Wiederherstellung der Welt-Item-Vorlage wird der Abschluss einmal nachgeholt.
Native unveränderte Item-Updates dürfen beim Kalenderwechsel nicht im strikten
Batch stehen: Foundry entfernt sie im Preflight, was den gesamten Batch zu Recht
abbrechen würde.

Prüfergebnis: Zwei Verkäufe à 48 GP für denselben Besitzer ergeben zusammen
96 GP (1.000→1.096), während anderer Besitzer (9.000) und Träger (7.000) unverändert
bleiben. Drei manuelle/native Züge, automatische Tage, fehlende Herstellungsvorlage,
Reparatur, Neuladen und Wechsel zum zweiten aktiven GM liefern insgesamt genau
ein Herstellungs-Item und keine weiteren Verkaufserlöse. Der GM-Bogen ist visuell
geprüft. Die Verwaltungsprüfung nutzt weiterhin natives noCanvas.
Die Gesamtsuite mit neun nativen Integrationstests besteht in 3,4 Minuten;
23 Unit-Tests, Syntax-/Sprachprüfung, Paketierung und native Offline-API-Prüfung
sind erfolgreich. Das Archiv enthält weder Handbuch noch Entwicklungsdaten.

## T09: Bestehende Einrichtungen übertragen

Die native Prüfung besteht mit GM-/Spielerclients; T09 und die T07-Regression
zusammen in 57,8 Sekunden, dazu 27 Unit-Tests. Der GM-Dialog zeigt Quell-Items,
Besitzer und Fortschritt. Der erste atomare Batch legt vollständige Sicherungen
im privaten Belegjournal und inaktive Facility-Kopien auf der Bastion an. Der
zweite liest die Dokumente zurück, vergleicht SHA-256-Digests und entfernt erst
dann Quellen; Aktivierung der Kopien, Transferstatus und Beleg werden zusammen
gespeichert. Native Item-IDs werden ausdrücklich beibehalten; die vorhandene
gezielte Bauzustand-Brücke verhindert den Default vom physischen Trägerlevel.

Sicherungen enthalten Ausgangs-Item, normalisierte geplante Kopie und UUID-Map.
Der Vergleich der Kopie ignoriert nur ihre native ID und Dokumentstatistik.
Quellen werden einschließlich Statistik geprüft, damit eine Änderung seit der
Vorschau zum Stopp führt. UUID- und Erstellungszeitbindung verhindert, dass eine
neu erstellte Bastion bei gleicher fester ID alte Übernahmen übernimmt.
Interne Beschreibungslinks und Facility-/Effektverweise werden umgeschrieben;
externe Dokumente oder Makros sind keine impliziten Transferziele.

Geprüft: drei Quellen mit 4/10 Herstellung, 5/20 Bau und 2/7 Ernte; Fortschritt,
`paid`, ungebauter Bauzustand und Mietlinge bleiben erhalten. Ein Herstellungsziel
im privaten Besitzerinventar wird nur bei der Ergebnisabrechnung zusätzlich
zugelassen; fremde Inventare und solche Quellen für neue Spieleraufträge bleiben
gesperrt. Nach sieben weiteren Tagen erhalten die richtigen Besitzer ein und
zwei Ergebnis-Items, ohne erneute Zahlung. Guthaben bleiben bei 1.000/9.000 GP.

Erstellungs-Veto hinterlässt weder Sicherung noch Kopie. Lösch-Veto lässt alle
Quellen und inaktiven Kopien bestehen; kein teilweiser Abschluss. Geänderte Quelle
stoppt den Abschluss. Kopien verwerfen, neu vorbereiten, GM-Neuladen und Abschluss
über den tatsächlichen Dialog funktionieren. Wiederholter Abschluss erzeugt
keine aktiven Duplikate; der normale Start mit automatischem Abschluss ist an
einem vierten Raum bestätigt. Spieler können weder abschließen noch die privaten
Sicherungen lesen. Der Transferdialog ist visuell geprüft.

Während der kurzen Übernahme Quellen nicht parallel nativ bearbeiten. Änderungen
vor dem Abschluss werden erkannt; andere Module/native Clients nehmen nicht an
unserer GM-Warteschlange teil. Die vollständige Quellsicherung bleibt für eine
gegebenenfalls manuelle Wiederherstellung erhalten. Vorbereitete Kopien sind
für eigene Aktionen, Limits und Kalenderfortschritt gesperrt.

## T10: Stufe-1-Abnahme und Auslieferung

Version **0.1.0** ist nach Neustart der isolierten Foundry-Installation geladen;
der Starttest prüft die tatsächlichen Modul-/Kompatibilitätsmetadaten gegen das
Manifest. Alle **elf nativen Integrationstests bestehen in 4,5 Minuten**, dazu
**27 Unit-Tests**, native Schema-/Vorlagenprüfung und Syntax-/Sprachprüfung mit
36 ES-Modulen und 196 DE/EN-Schlüsseln. Die 35 nativen Einrichtungstypen erhalten
deutsche Bezeichnungen aus der lokalen Begriffsvorlage; Regeltexte bleiben außen vor.

T10 öffnet den deutschen Bogen durch einen echten Klick im Akteurverzeichnis.
Der Spieler bleibt OBSERVER am Träger und OWNER nur auf seinem privaten Charakter;
sein Standardbogen bleibt bestehen. Native direkte Actor-/Item-Updates werden
verweigert. Ein normaler verknüpfter Charaktertoken bewegt sich auf einer eigenen
kleinen Testszene. Nach Entfernung des Teilnehmers verliert er die Leserechte;
mit aktivem Canvas tritt dabei kein `cycleTokens`-Fehler auf. Ein zweiter Spieler
liest die Einrichtung gleichzeitig. Der deutsche Bogen ist visuell geprüft.

Der vorherige noCanvas-Befund bleibt als Foundry-Grenze dokumentiert. Die Testszene
ist keine Implementierung oder Abnahme eines Szenengenerators. Die Zuordnung
aller Stufe-1-Kriterien steht in [stage1-acceptance.md](stage1-acceptance.md).

`dist/shared-bastion-0.1.0.zip` enthält 42 Dateien unter `shared-bastion/`. Jede
verpackte Datei wurde byteweise mit der geprüften Quelle verglichen; Manifest
und Installationsstruktur sind gültig. Handbuch, Foundry-Distribution, Secrets,
Interview- und Testdaten sind ausgeschlossen. Keine Veröffentlichung durchgeführt.


## N01: Native Kacheloberfläche

Stand: 2026-10-20, Foundry 14.369 / D&D5e 6.0.6. Die öffentliche Laufzeit-API
stellt `applications.api.ApplicationV2Mixin`, `applications.ContextMenu5e`,
`applications.CompendiumBrowser.selectOne` und
`applications.activity.ActivityChoiceDialog` bereit. Die Bogenklasse wird erst im
Init-Hook erstellt; interne Quelldateipfade sind keine ausgelieferte Modul-API.

Die native Aktivitätsauswahl erhält ausschließlich geprüfte Aufträge auf einem
flüchtigen Item-Klon. Das Icon stammt aus der nativen Auftragskonfiguration;
keine Ausführung über `Item.use` oder `activity.use`. Nach Auswahl folgen die
bestehenden Bau-/Auftragsdialoge und der authentifizierte GM-Befehlspfad.
Offene Dialoge nach Rechteentzug oder GM-Abmeldung führen keine Buchung aus.
Beschäftigte Kacheln bleiben während Auswahl, Schließanimation und Speicherung
gegen erneute Bedienung gesperrt.

Der Kompendiumbrowser sperrt Typ/Kategorie und für Spieler die Besitzerstufe.
Er durchsucht die aktivierten Kompendien, nicht Welt-Items. Diese bleiben im
Abschnittskontextmenü erreichbar. Der GM kann dort auch bei ausgeschöpften
besonderen Plätzen eine begründete Ausnahme anlegen. Native Karten, Slots,
Fortschrittsanzeigen und Themenvariablen sind wiederverwendet; die an den
Charakterbogen gebundenen Facility-Styles sind lokal adaptiert und mit ihrem
MIT-Hinweis versehen. Keine Grafiken oder Schriften werden kopiert.

Alle zwölf Integrationstests bestehen im Gesamtlauf (6,4 min), dazu 30 Unit-Tests,
Schema-/Vorlagenprüfung und Paket-Audit. Native Erstellungsresultate werden in den
Kalender-Fixtures nach Namen zugeordnet; ihre Listenposition bestimmt keine
Besitzerrolle. Beide Themen, schmale Fenster und Dialoge sind visuell geprüft.
Details: [N01-Abnahme](native-sheet-acceptance.md). Die ursprüngliche eingerichtete
Testbastion liegt während des Prüflaufs auf einem getrennten Originalvolume.

## Erstellung über den nativen Akteurdialog (2026-10-20)

Auf Foundry 14.369 / D&D5e 6.0.6 ergänzt der öffentliche
`renderCreateDocumentDialog`-Hook ausschließlich den GM-Dialog für Weltakteure
um „Shared Bastion“. Der versionsabhängige DOM-Zugriff liegt in
`scripts/adapters/actor-creation.mjs`. Kein zusätzlicher Document-Subtyp und
keine Änderung installierter Systemdateien. Die Auswahl wird vor dem nativen
Formularhandler abgefangen: Sie erreicht weder `Actor.create` noch die gespeicherte
native Standardtyp-Auswahl. Normale Typen verwenden weiterhin den Systemablauf.

Die bestehende Teilnehmerkonfiguration übernimmt Name und Ordner. Ordnerreferenzen
werden im Befehlsvalidator und gegen einen existierenden Akteurordner geprüft.
Die kanonische Registrierung und die Beschränkung auf eine Bastion bleiben erhalten;
bei vorhandener Bastion ist der Eintrag mit erklärendem Tooltip gesperrt.
Der zusätzliche Verzeichnisbutton entfällt.

Der erweiterte native T03-Test besteht mit GM-/Spielerclient (24,9 s), einschließlich
Abbruch beider Schritte ohne Bastion, normaler NSC-Erstellung nach Auswahlwechsel,
Name/Ordner, Sperre einer zweiten Bastion, Spielerrechten und Neuladen.
Dialog-Screenshot geprüft; 30 Unit-Tests, statische und native Offline-Prüfung sowie
Paketbau bestanden. Nur T03 nativ wiederholt, kein neuer Gesamtlauf. Der bekannte
Core-Fehler `cycleTokens` bei Rechteentzug ohne Canvas tritt weiterhin auf.
