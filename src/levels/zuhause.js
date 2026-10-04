// KAPITEL 6 – Das Zuhause von Grossem Zwerg und Füürio
// §  = das Zuhause (wird mit jeder Mission grösser: Zelt → Holzhütte → Steinhaus)
// Ø  = Missionsbrett der Garde, Þ = Kleiderkiste
export default {
  name: 'Unser Zuhause',
  musik: 'dorf',
  zuhause: true,
  leben: { falter: 6, voegel: true, wolken: true, huehner: [[16, 11], [18, 12]] },
  karte: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T..,.....T.......,....T.....,T',
    'T.............<..............T',
    'T....,.....§++........,......T',
    'T..........+++...............T',
    'T..*......Þ.:........d.......T',
    'T...........:................T',
    'T..,........::::::::::Ø......T',
    'T.....P.....:.........:......T',
    'T...........:...,.....:..~~~.T',
    '1:::::::::::@.........:.~~~~.T',
    'T...........:.........:..~~..T',
    'T..T....?...:.........:......T',
    'T...........::::::::::::.,...T',
    'T..,.....*.......,......T....T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  ausgaenge: {
    // Weg zurück ins Dorf (Zwergenfeste): dort warten die Häuser und die Mine
    1: { karte: 'dorf', ziel: 2, aussehen: 'weg' },
  },
  figuren: {
    d: {
      name: 'Füürio',
      aussehen: 'drache',
      zustand: 'froh',
      stimme: { hoehe: 0.5 },
      // saetze: bei jedem Reden der nächste
      saetze: [
        'Hier wohnen wir jetzt, du und ich!',
        'Am Missionsbrett steht, wo man uns braucht. Schau mal nach!',
        'Mit jeder Mission wird unser Zuhause schöner.',
        'In der roten Kiste sind deine Kleider.',
        'Ich bin so froh, dass wir Freunde sind!',
      ],
    },
  },
};
