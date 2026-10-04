// Zusatz-Ort: das Haus unten links im Dorf – Grossmutter Hedda möchte einen Tee
export default {
  name: 'Grossmutter Heddas Haus',
  musik: 'bibliothek',
  hintergrund: '#1b1420',
  karte: [
    'WWWWWWWWWWWW',
    'WWφWWWWWφWWW',
    'Wη---κ+--β-W',
    'W--------+-W',
    'W-πh---τ+--W',
    'W------σ---W',
    'W$---||---KW',
    'WWWWW1WWWWWW',
  ],
  ausgaenge: {
    1: { karte: 'dorf', ziel: 5, weiter: true },
  },
  figuren: {
    h: {
      name: 'Grossmutter Hedda',
      aussehen: 'hedda',
      stimme: { hoehe: 1.05, tempo: 0.85 },
      zusatz: true,
      wunsch: 'tee',
      sagt: 'Mir ist ein bisschen kalt. Bringst du mir einen Tee? Die Teekanne steht auf dem Herd.',
      danke: 'Ah, schön warm! Du bist ein lieber Zwerg.',
      danach: 'Setz dich ans Feuer und wärm dich auf!',
    },
  },
};
