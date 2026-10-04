// Zusatz-Ort: die Stube im Haus rechts im Dorf
// Draussen friert Bauer Torvi (Jacke hängt hier am Haken), drinnen sucht Baby Fili den Teddy
export default {
  name: 'Familie Torvis Stube',
  musik: 'bibliothek',
  hintergrund: '#1b1420',
  karte: [
    'WWWWWWWWWWWWWW',
    'WWWφWWWWWWφWWW',
    'Wχ---κ+---β--W',
    'W---------+--W',
    'W---τ+---ω---W',
    'W---σ-----f--W',
    'W------||---θW',
    'W$-----||----W',
    'WWWWWWW1WWWWWW',
  ],
  ausgaenge: {
    1: { karte: 'dorf', ziel: 4, weiter: true },
  },
  figuren: {
    f: {
      name: 'Baby Fili',
      aussehen: 'fili',
      stimme: { hoehe: 2.1, tempo: 1.1 },
      zusatz: true,
      // selberSuchen: der Pfeil verrät den Teddy nicht – das Zimmer ist klein, Kinder finden ihn selber
      wuensche: [
        { wunsch: 'teddy', selberSuchen: true, sagt: 'Teddy! Wo ist mein Teddy? Hilfst du suchen?', falsch: 'Nein, das ist nicht mein Teddy!', danke: 'Teddy! Mein Teddy! Danke, danke!' },
      ],
      danach: 'Teddy und ich machen jetzt ein Schläfchen.',
    },
  },
};
