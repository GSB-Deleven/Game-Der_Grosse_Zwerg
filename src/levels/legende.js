// Was bedeutet welcher Buchstabe auf einer Karte?
//   boden   = welcher Boden darunter liegt (fehlt er, wird der Boden der Nachbarn genommen)
//   fest    = kann man nicht durchlaufen
//   objekt  = Bild, das auf die Kachel gestellt wird (siehe src/grafik/welt-grafik.js)
//   breite / hoehe = wie viele Kacheln das Objekt belegt (Rest mit "+" auffüllen)
//   gibt    = hier kann der Grosse Zwerg etwas holen
//   licht, flamme, rauch, funken = Lichtschein, Feuer, Kaminrauch, Schmiedefunken
// Kleinbuchstaben (a, b, c …) sind Figuren – sie stehen in der Level-Datei unter "figuren".
// Ziffern (1, 2, 3 …) sind Türen/Ausgänge – sie stehen unter "ausgaenge".
export const LEGENDE = {
  // Böden
  '.': { boden: 'gras' },
  ',': { boden: 'blumen' },
  ':': { boden: 'weg' },
  '_': { boden: 'erde' },
  '#': { boden: 'steinboden' },
  '|': { boden: 'teppich' },
  '=': { boden: 'bruecke' },
  '-': { boden: 'holzboden' },
  '~': { boden: 'wasser', fest: true },
  'M': { boden: 'fels', fest: true },
  'W': { boden: 'felswand', fest: true },
  'R': { boden: 'rune', fest: true },
  '@': { boden: 'weg', start: true },
  '+': { fest: true }, // gehört zu einem grossen Objekt links/oberhalb davon

  // Dinge, bei denen man etwas holen kann
  'F': { fest: true, objekt: 'obstbaum', gibt: 'frucht' },
  'B': { fest: true, objekt: 'brunnen', gibt: 'wasser' },
  'S': { fest: true, objekt: 'marktstand', breite: 2, gibt: 'essen' },
  'Q': { boden: 'steinboden', fest: true, objekt: 'regal', gibt: 'buch' },

  // Gebäude
  'H': { fest: true, objekt: 'haus', breite: 3, hoehe: 2, rauch: [37, -40], licht: [[11, -18], [38, -18]] },
  'Y': { fest: true, objekt: 'statue' },

  // Deko
  'T': { fest: true, objekt: 'tanne' },
  '*': { fest: true, objekt: 'busch' },
  '^': { fest: true, objekt: 'fels' },
  'J': { fest: true, objekt: 'zaun' },
  '!': { fest: true, objekt: 'laterne', licht: [[0, -24]], leuchtet: 45 },
  'L': { fest: true, objekt: 'feuerschale', flamme: [0, -18], licht: [[0, -20]], leuchtet: 50 },
  'E': { fest: true, objekt: 'esse', funken: [0, -12], licht: [[0, -10]], rauch: [0, -34] },
  'A': { fest: true, objekt: 'amboss' },
  'K': { fest: true, objekt: 'fass' },
  '$': { fest: true, objekt: 'kiste' },
  '%': { fest: true, objekt: 'holzstapel' },
  '&': { fest: true, objekt: 'heuballen' },
  '?': { fest: true, objekt: 'wegweiser' },
  'P': { objekt: 'pilze', flach: true },

  // Reise, Schloss und Höhle
  '"': { boden: 'schnee' },
  ';': { boden: 'hoehle' },
  'O': { boden: 'wasser', objekt: 'trittstein', flach: true, schatten: false }, // Trittstein – begehbar
  'X': { boden: 'schlucht', fest: true },
  '[': { boden: 'leiter' },                                                  // Strickleiter – begehbar
  'C': { fest: true, objekt: 'steinhaufen', gibt: 'stein' },
  'D': { fest: true, objekt: 'beerenbusch', gibt: 'beeren' },
  '/': { fest: true, objekt: 'seilkiste', gibt: 'seil' },
  'N': { fest: true, objekt: 'heuhaufen', gibt: 'heu' },
  '(': { fest: true, objekt: 'feuerschale', gibt: 'fackel', flamme: [0, -18], licht: [[0, -20]], leuchtet: 50 },
  'Z': { fest: true, objekt: 'rosen' },
  'U': { fest: true, objekt: 'stall', breite: 3, hoehe: 2 },
  '>': { fest: true, objekt: 'turm', breite: 2, hoehe: 2 },
  '<': { fest: true, objekt: 'laubbaum' },
  'I': { boden: 'steinboden', fest: true, objekt: 'saeule' },
  'G': { boden: 'felswand', fest: true, objekt: 'banner', schatten: false },
  'V': { boden: 'fels', fest: true, objekt: 'mine', breite: 2 },
  '}': { fest: true, objekt: 'kristall', leuchtet: 38 },
  ')': { fest: true, objekt: 'hoehlenpilze', gibt: 'pilze' },
  ']': { fest: true, objekt: 'quelle', gibt: 'wasser' },
  '{': { fest: true, objekt: 'schloss', breite: 7, hoehe: 4 },
  'Ü': { fest: true, objekt: 'thron', breite: 2 },
  'Ö': { boden: 'hoehlenwand', fest: true },
  '`': { fest: true, objekt: 'holzstapel', gibt: 'brett' },

  // Blumenbeete zum Farben-Sortieren
  'Ä': { fest: true, objekt: 'beet_rot', gibt: 'blume_rot' },
  'Ë': { fest: true, objekt: 'beet_gelb', gibt: 'blume_gelb' },
  'Ï': { fest: true, objekt: 'beet_blau', gibt: 'blume_blau' },

  // Ehrengarde: Zuhause, Missionsbrett, Kleiderkiste, Mission «Staudamm»
  '§': { fest: true, objekt: 'zuhause', breite: 3, hoehe: 2 },       // Bild hängt von der Ausbaustufe ab
  'Ø': { fest: true, objekt: 'anschlagbrett' },
  'Þ': { fest: true, objekt: 'kleiderkiste' },
  'Ð': { fest: true, objekt: 'stammhaufen', gibt: 'holz' },
  'Ç': { boden: 'wasser', fest: true },                             // überflutete Wiese
  'Ŧ': { boden: 'wasser', objekt: 'dammstamm', flach: true, schatten: false }, // Damm aus Baumstämmen – begehbar

  // Einrichtung der Häuser im Dorf (Innenräume)
  'β': { boden: 'holzboden', fest: true, objekt: 'bett', hoehe: 2 },
  'τ': { boden: 'holzboden', fest: true, objekt: 'tisch', breite: 2 },
  'σ': { boden: 'holzboden', fest: true, objekt: 'stuhl' },
  'η': { boden: 'holzboden', fest: true, objekt: 'herd', gibt: 'tee', licht: [[0, -10]], leuchtet: 30 },
  'ς': { boden: 'holzboden', fest: true, objekt: 'schrank', gibt: 'topf' },
  'κ': { boden: 'holzboden', fest: true, objekt: 'kamin', breite: 2, flamme: [0, -8], licht: [[0, -10]], leuchtet: 55 },
  'χ': { boden: 'holzboden', fest: true, objekt: 'kleiderhaken', gibt: 'jacke' },
  'ω': { boden: 'holzboden', fest: true, objekt: 'wiege' },
  'θ': { boden: 'holzboden', fest: true, objekt: 'teddyplatz', gibt: 'teddy' },
  'π': { boden: 'holzboden', fest: true, objekt: 'schaukelstuhl' },
  'φ': { boden: 'felswand', fest: true, objekt: 'fenster', flach: true, schatten: false }, // Fenster in der Wand

  // Die Zwergenmine
  'ρ': { boden: 'schiene' },                                               // Gleis – begehbar
  'λ': { fest: true, objekt: 'lore', breite: 2 },
  'ϑ': { fest: true, objekt: 'balken', hoehe: 2 },
  'ψ': { fest: true, objekt: 'kristall', gibt: 'kristall', leuchtet: 38 },
};
