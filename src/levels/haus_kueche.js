// Zusatz-Ort (Kapitel 1 und Ehrengarde): die Küche im Haus oben links im Dorf
// Opa Balin kocht Suppe – Kochtopf aus dem Schrank, Gemüse vom Marktstand draussen
export default {
  name: 'Opa Balins Küche',
  musik: 'bibliothek',
  hintergrund: '#1b1420',
  karte: [
    'WWWWWWWWWWWWWW',
    'WWφWWWWWWWφWWW',
    'Wςη----K---κ+W',
    'W------------W',
    'W--στ+σ---b--W',
    'W------||----W',
    'W$-----||---KW',
    'W------||----W',
    'WWWWWWW1WWWWWW',
  ],
  ausgaenge: {
    1: { karte: 'dorf', ziel: 3, weiter: true },
  },
  figuren: {
    b: {
      name: 'Opa Balin',
      aussehen: 'koch',
      stimme: { hoehe: 0.75, tempo: 0.9 },
      zusatz: true, // freiwillig: zählt für die Herzen hier, nicht fürs Kapitel-Ende
      wuensche: [
        { wunsch: 'topf', sagt: 'Ich koche eine feine Suppe! Aber wo ist mein Kochtopf? Er steht im Schrank dort.', danke: 'Mein Kochtopf! Danke, Grosser Zwerg.' },
        { wunsch: 'essen', sagt: 'Jetzt fehlt noch Gemüse. Holst du mir einen Korb vom Marktstand draussen?', danke: 'Mmmh! Das wird die beste Suppe im ganzen Dorf!' },
      ],
      danach: 'Die Suppe blubbert schon. Komm später zum Essen!',
    },
  },
};
