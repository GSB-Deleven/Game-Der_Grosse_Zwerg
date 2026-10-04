# So baust du ein neues Level

Ein Level ist eine Textdatei in `src/levels/`. Die Karte wird mit Zeichen «gemalt» – jedes Zeichen ist ein Feld
(16 × 16 Pixel). Am einfachsten kopierst du eine bestehende Datei (z. B. `see.js`) und änderst sie.
Nach jeder Änderung prüft `npm run pruefen`, ob alles erreichbar ist.

## 1. Karte malen
```js
karte: [
  'MMMMMMMMMMMM',
  'M....a.....M',
  'M..B....F..M',
  'M....@.....M',
  'MMMMM1MMMMMM',
],
```
Alle Zeilen müssen **gleich lang** sein.

### Böden
| Zeichen | Bedeutung | Zeichen | Bedeutung |
|---|---|---|---|
| `.` | Gras | `,` | Blumenwiese |
| `:` | Pflasterweg | `_` | Acker |
| `#` | Steinboden | `\|` | roter Teppich |
| `-` | Holzboden | `=` | Brücke (begehbar) |
| `"` | Schnee | `;` | Höhlenboden |
| `~` | Wasser (fest) | `X` | Schlucht (fest) |
| `M` | Fels / Berg (fest) | `Ö` | Höhlenwand (fest) |
| `W` | Steinmauer (fest) | `R` | Mauer mit Rune |
| `G` | Mauer mit Banner | `O` | Trittstein im Wasser (begehbar) |
| `[` | Strickleiter (begehbar) | `@` | Hier startet der Grosse Zwerg |

### Dinge zum Holen (Quellen)
| Zeichen | Ding | gibt |
|---|---|---|
| `B` | Brunnen | Wasser |
| `]` | Höhlenquelle | Wasser |
| `S+` | Marktstand (2 Felder) | Essen |
| `F` | Obstbaum | Äpfel |
| `Q` | Bücherregal | Bücher |
| `C` | Steinhaufen | Steine |
| `` ` `` | Bretterstapel | Bretter |
| `/` | Seilkiste | Seil |
| `D` | Beerenbusch | Beeren |
| `N` | Heuhaufen | Heu |
| `(` | Feuerschale | Fackel |
| `)` | Höhlenpilze | Pilze |
| `Ä` / `Ë` / `Ï` | Blumenbeet rot / gelb / blau | Blumen in dieser Farbe |

### Gebäude und Deko
| Zeichen | Bedeutung | Zeichen | Bedeutung |
|---|---|---|---|
| `H++` / `+++` | Zwergenhaus (3 × 2) | `U++` / `+++` | Stall (3 × 2) |
| `>+` / `++` | Burgturm (2 × 2) | `{` + `+` | Schloss (7 × 4) |
| `V+` | Mineneingang | `Y` | Ahnen-Statue |
| `Ü+` | Thron | `I` | Säule |
| `T` | Tanne | `<` | Laubbaum |
| `*` | Busch | `^` | Felsbrocken |
| `J` | Zaun | `Z` | Rosen |
| `!` | Laterne (leuchtet) | `L` | Feuerschale (Deko) |
| `E` / `A` | Esse / Amboss | `K` / `$` | Fass / Kiste |
| `%` / `&` | Holzstapel / Heuballen | `?` | Wegweiser (anklickbar, jedes Mal ein lustiges Ziel – Texte in `src/texte/de.js` unter `WEGWEISER`) |
| `P` | Pilze (Deko) | `}` | Kristall (leuchtet) |
| `0` | Auslöse-Feld für ein Ereignis | `a`–`z` | Figur (siehe unten) |
| `1`–`9` | Tür / Ausgang | | |

Grosse Dinge stehen mit ihrem Zeichen oben links, die restlichen Felder bekommen ein `+`.
Neue Zeichen lassen sich in `src/levels/legende.js` erfinden.

## 2. Figuren beschreiben
Jeder Kleinbuchstabe auf der Karte bekommt einen Eintrag unter `figuren`:
```js
figuren: {
  a: {
    name: 'Onkel Gimli',
    aussehen: 'gimli',               // Name aus src/grafik/figuren-liste.js
    stimme: { hoehe: 0.7 },          // Tonhöhe beim Plappern: 0.5 = tief, 2 = hoch
    wunsch: 'wasser',                // essen, wasser, buch, frucht, stein, brett, seil, beeren, heu, fackel, pilze
    neckt: 'Hoho, du Riese!',        // (freiwillig) nur beim ersten Mal
    sagt: 'Holst du mir bitte Wasser?',
    danke: 'Danke, mein Freund!',
    danach: 'Du bist ein echter Held.',
  },
},
```
Weitere Möglichkeiten:
| Eintrag | Wirkung |
|---|---|
| `wunsch: 'mut'` | Wird erfüllt, sobald man mit der Figur redet (Herz in der Blase) |
| `wunsch: 'reden'` + `gespraech: [...]` | Ein Gespräch als Drehbuch (siehe unten), danach erfüllt |
| `wuensche: [{ wunsch, sagt, danke }, …]` | Mehrere Wünsche nacheinander (wie bei Füürio) |
| `anzahl: 3` | Braucht 3 Stück (Blase zeigt «1/3») |
| `wunsch: 'huehner'`, `anzahl: 3`, `ausreisser: [[x, y], …]` | **Hühner einfangen:** Hühner laufen an diesen Stellen herum. Beim ersten Hinlaufen flattern sie davon, beim zweiten Mal hüpfen sie zurück zur Figur (`weiter: 'Noch {rest}!'`) |
| `wunsch: 'suchen'`, `verstecke: [[x, y], …]` | **Versteckis:** Die Figur versteckt sich hinter einem dieser Dinge (Busch, Fass, Tanne …). Das richtige raschelt und kichert. Texte: `zaehlen`, `leer: [...]`, `gefunden` |
| `selberSuchen: true`, `falsch: '…'` (in einem Wunsch) | **Selber suchen** (z. B. Farben): Der Pfeil zeigt die richtige Quelle erst, wenn man einmal das Falsche gebracht hat. `falsch` wird dann gesagt |
| `geschenk: 'fackel'` | Gibt nach dem Helfen etwas mit |
| `versteckt: true` | Erst unsichtbar, erscheint durch ein Ereignis (`zeige`) |
| `licht: 70`, `lichtNachErfuellt: true` | Leuchtet (in dunklen Karten), optional erst nach dem Helfen |
| `sprecher: 'held'` | Der Grosse Zwerg spricht die Texte selbst |
| `aussehen: 'drache'`, `zustand: 'froh'` | Füürio (belegt 3 × 2 Felder) |
| `aussehen: 'pony'` | Das Pony |

Das **Aussehen** steht in `src/grafik/figuren-liste.js`, z. B.
```js
gimli: { typ: 'zwerg', haar: 'rot', bart: 'gabel', kleid: 'gruen', kopf: 'hoernerhelm', kopfFarbe: 'stahl', umhang: 'blau' },
```
- **typ:** `zwerg`, `zwergin`, `kind`, `koenigin`, `bote`
- **bart:** `lang`, `gabel`, `zoepfe`, `kurz`, `keiner`
- **kopf:** `nasenhelm`, `hoernerhelm`, `federhelm`, `kapuze`, `stirnband`, `krone`, `glatze`
- **Farben** (haar, kleid, kopfFarbe, schuerze, umhang): `rot`, `braun`, `kastanie`, `grau`, `weiss`, `schwarz`, `blond`,
  `stahl`, `gold`, `kupfer`, `blau`, `gruen`, `moos`, `lila`, `weinrot`, `orange`, `rosa`, `gelb`, `leder`, `beige`
- Alle Figuren ansehen: `galerie.html` im Entwicklungsmodus öffnen.

## 3. Bauaufgaben (Trittsteine, Brücke, Strickleiter …)
Eine Bauaufgabe ist eine Figur ohne Aussehen, mit einem Schild. Jede Lieferung verwandelt Felder der Karte:
```js
a: {
  name: 'Brücke',
  baustelle: { zu: '=', baue: [[[14, 10], [15, 10]], [[16, 10], [17, 10]], [[18, 10], [19, 10]]] },
  sprecher: 'held',
  wunsch: 'brett',
  anzahl: 3,
  sagt: 'Mit Brettern vom Holzstapel baue ich eine Brücke.',
  weiter: 'Klong! Noch {rest} Bretter!',
  danke: 'Die Brücke ist fertig!',
},
```
`baue` enthält pro Lieferung die Felder `[x, y]`, die zu dem Zeichen `zu` werden (x = Spalte, y = Zeile, ab 0 gezählt).

## 4. Türen verbinden
```js
ausgaenge: {
  1: { karte: 'dorf', ziel: 1 },                                // Tür 1 führt zur Tür 1 im Dorf
  2: { karte: 'wald', ziel: 1, weiter: true, aussehen: 'weg' }, // offener Weg ohne Tür-Bild
},
```
`weiter: true` sagt dem Pfeil, dass es hier im Kapitel weitergeht. `aussehen` kann `'weg'` (kein Bild),
`'hoehleneingang'` oder `'schlosstor'` sein; ohne Angabe wird in Mauern eine Holztür gezeichnet.
`nurWennFertig: true`: Der Weg ist erst offen, wenn das ganze Spiel geschafft ist (z. B. Dorf → Zuhause der Ehrengarde).

**Begehbare Häuser:** Das untere mittlere Feld eines Hauses im Dorf wird eine Ziffer mit `aussehen: 'weg'`
(die Tür ist schon im Hausbild). Innen kommt man durch eine eigene Ziffer zurück, mit `ziel` = Ziffer der Haustür.
Vorbild: `src/levels/haus_kueche.js`. Möbel-Zeichen (siehe `legende.js`): `β` Bett, `τ` Tisch, `σ` Stuhl,
`η` Herd (gibt Tee), `ς` Schrank (gibt Kochtopf), `κ` Kamin, `χ` Kleiderhaken (gibt Jacke), `ω` Wiege,
`θ` Teddy-Platz (gibt Teddy), `π` Schaukelstuhl, `φ` Fenster. Für Minen: `ρ` Schienen, `λ` Lore, `ϑ` Stützbalken,
`ψ` Kristall (gibt Kristall).

## 5. Ereignisse (Drehbücher)
```js
ereignisse: {
  beimBetreten: [ { sage: ['held', 'Hier ist es aber dunkel!'] } ],   // beim ersten Betreten
  wennFertig:   [ { splash: { titel: 'Geschafft!', bild: 'herz' } } ], // wenn alle Wünsche der Karte erfüllt sind
  ausloeser:    [ { fackel: false }, { augen: { figur: 'd' } } ],     // wenn man auf ein Feld "0" tritt
},
```
| Schritt | Wirkung |
|---|---|
| `{ sage: ['held' \| 'a' \| 'k', 'Text'] }` | Jemand spricht (Buchstabe der Figur) |
| `{ splash: { titel, text, bild, farbe } }` | Grosse Einblendung mit Konfetti |
| `{ entscheidung: { frage, knopf } }` | Grosser Herz-Knopf, der gedrückt werden will |
| `{ zeige: 'd' }` / `{ verstecke: 'd' }` | Figur erscheint / verschwindet |
| `{ figurKommt: { aussehen, name, buchstabe, von: [x, y], nach: [x, y] } }` | Eine Figur läuft ins Bild |
| `{ jubel: ['a', 'b'] }` | Figuren jubeln (mit Konfetti) |
| `{ licht: 0.5 }` / `{ heldLicht: 40 }` / `{ fackel: false }` | Dunkelheit, Lichtkreis, Fackel aus |
| `{ augen: { figur: 'd' } }` | Zwei leuchtende Augen im Dunkeln |
| `{ zustand: ['d', 'froh'] }` | Füürio schaut froh |
| `{ gib: 'fackel' }` | Der Grosse Zwerg bekommt etwas |
| `{ warte: 800 }`, `{ ton: 'fanfare' }`, `{ musik: 'fest' }`, `{ wackeln: 400 }` | Pause, Ton, Musik, Wackeln |
| `{ kapitelEnde: true }` / `{ kapitelWechsel: 5, szene: 'Flug' }` / `{ szene: 'Abspann' }` | Weiter im Spiel |

## 6. Stimmung der Karte
```js
name: 'Der dunkle Wald',     // erscheint als Banner beim ersten Betreten
musik: 'wald',               // dorf, bibliothek, schloss, reise, wald, hoehle, flug, fest, titel
dunkel: 0.82,                // 0 = hell, 1 = ganz dunkel
heldLicht: 58,               // Lichtkreis um den Grossen Zwerg
hintergrund: '#0e140e',
leben: {
  falter: 6, voegel: true, wolken: true, schnee: true,
  huehner: [[10, 5], [12, 6]], gluehwuermchen: [[5, 10], [9, 8]], dampf: [[13, 3]],
},
```

## 7. Level anmelden
In `src/levels/index.js` die Datei importieren, bei `KARTEN` eintragen und beim passenden Kapitel unter `karten`.
Ein Kapitel ist geschafft, wenn **alle Wünsche** auf allen seinen Karten erfüllt sind; dann läuft sein `wennFertig`.
**Freiwillige Orte:** Karten unter `zusatz` beim Kapitel (z. B. Häuser und Mine im Dorf) und Figuren mit
`zusatz: true` zählen **nicht** fürs Kapitel-Ende, aber für die Herzen am Ort. Der Pfeil zeigt zuerst die
Pflicht-Aufgaben und die Geschichte; freiwillige Orte erst, wenn das Spiel geschafft ist (Ehrengarde).
Aufgaben über eine Tür hinweg gehen von selbst: Wunsch draussen (`wunsch: 'jacke'`), Quelle drinnen – der Pfeil führt durch die Tür.
**Spielstand:** Buchstaben bestehender Figuren nie umbenennen (sonst gehen erfüllte Wünsche verloren), neue Figuren
bekommen neue Buchstaben.

Coole Momente mit Splash stehen unter `meilensteine` (`{ herzen: 1 }`, `{ wunsch: 'frucht' }`, `{ figuren: ['see:a'] }`).

## 8. Neue Mission für die Ehrengarde (Kapitel 6)
Nach dem Abspann wählt man Missionen am Missionsbrett. So kommt eine neue dazu:
1. **Karte** anlegen wie `src/levels/damm.js` – mit Figuren, Wünschen, Bauaufgaben. Am Ende von `ereignisse.wennFertig`
   steht `{ missionFertig: 'meine-id' }`: Dann geht es nach Hause, und die Belohnung wird gezeigt.
   Praktisch dafür: `{ verwandle: { von: 'Ç', zu: '.' } }` wandelt alle Kacheln mit einem Zeichen um (z. B. Wasser weg).
2. In `src/levels/index.js` bei `KARTEN` und bei `KAPITEL[6].karten` eintragen.
3. In `src/levels/missionen.js` unter `MISSIONEN` eintragen: `titel`, `text` (wird vorgelesen), `bild`, `karte`,
   `belohnung: { haus: 2 }` (nächste Ausbaustufe, siehe `HAUS`) oder `belohnung: { kleid: 'name' }` (siehe `KLEIDER`).
   Eine Flug-Mission geht mit `szene: 'Flug', daten: { mission: 'id' }` (siehe `POST` in `src/scenes/Flug.js`).
4. Neue Kleider: in `KLEIDER` Farben aus `RAMPEN` angeben (z. B. `{ tunika: 'gruen', helm: 'gold' }`).
   Neue Ausbaustufe: Bild `zuhauseN` in `src/grafik/welt-grafik.js` malen und bei `HAUS` eintragen.
5. `KAPITEL=6 node tests/durchlauf.mjs` spielt alle Missionen automatisch durch.

## 9. Ausprobieren
- `npm run pruefen` – findet Tippfehler und unerreichbare Figuren
- `npm run dev` und im Browser `?kapitel=3` anhängen, um direkt ins Kapitel zu springen
- `KAPITEL=3 node tests/durchlauf.mjs` – spielt das Kapitel automatisch durch
- `node tests/zusatz.mjs` – lädt einen Ehrengarde-Spielstand und spielt Häuser und Mine dem Pfeil nach durch
