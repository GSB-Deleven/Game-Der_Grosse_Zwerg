// Gegenstände als Pixel-Raster (16 x 16). Jeder Buchstabe ist ein Pixel, die Farbe steht in PALETTE.
// "." = durchsichtig. Figuren, Gebäude und Deko entstehen im Baukasten (figuren-baukasten.js, welt-grafik.js).

export const PALETTE = {
  k: '#2b1d1a', // Umriss
  q: '#6e5a78', // leeres Herz innen
  Q: '#a892b0', // leeres Herz Glanz
  s: '#f2c29a', // Haut
  S: '#cf9272', // Haut Schatten
  e: '#2b1d1a', // Augen
  r: '#d0502a', // Bart rot
  R: '#8e2f17', // Bart rot dunkel
  o: '#f08a4b', // Bart Glanz
  h: '#c3ccd4', // Stahl
  H: '#6f7a86', // Stahl dunkel
  w: '#f3ead2', // Horn
  W: '#c7b58a', // Horn Schatten
  y: '#f2c94c', // Gold
  Y: '#b8862b', // Gold dunkel
  c: '#3f6fb5', // Tunika
  C: '#2b4c80', // Tunika dunkel
  b: '#8a5a33', // Leder
  B: '#5b3a22', // Leder dunkel / Hose
  n: '#3b2a22', // Stiefel
  x: '#ffffff', // Weiss
  g: '#4f9a4a', // Grün
  G: '#2f6b34', // Grün dunkel
  v: '#7cc862', // Grün hell
  p: '#e05a8a', // Rosa
  P: '#9c3564', // Rosa dunkel
  u: '#7aa6e0', // Hellblau
  U: '#3d6aa8', // Blau
  l: '#e8e0c8', // Pergament
  L: '#a89a78', // Pergament dunkel
  m: '#8a8f99', // Stein
  M: '#5c606b', // Stein dunkel
  a: '#b0413e', // Apfelrot
  A: '#7a2626', // Apfelrot dunkel
  f: '#ff9d2e', // Feuer
  F: '#ffe066', // Feuer hell
  t: '#6b4a2e', // Holz
  T: '#4a3220', // Holz dunkel
};

const ESSEN = [ // Korb mit Brot und Käse
  '................',
  '.....kkkk.......',
  '....kbbbbk.kkk..',
  '...kbybbyk.kyyk.',
  '...kbbbbbkkyYyk.',
  '..kkkkkkkkkkkkk.',
  '..kttttttttttk..',
  '.kTtTtTtTtTtTtk.',
  '.ktTtTtTtTtTtTk.',
  '.kTtTtTtTtTtTtk.',
  '.ktTtTtTtTtTtTk.',
  '..kTtTtTtTtTtk..',
  '..kttttttttttk..',
  '...kkkkkkkkkk...',
  '................',
  '................',
];
const WASSER = [ // Eisenkessel mit Wasser
  '................',
  '.....kkkkkk.....',
  '....k......k....',
  '...k........k...',
  '..kkkkkkkkkkkk..',
  '..kuuxuuuuuuuk..',
  '..kHuuuuuuuuHk..',
  '.kHhHHHHHHHHhHk.',
  '.kHhhhhhhhhhhHk.',
  '.kHhhhhhhhhhhHk.',
  '.kHHhhhhhhhhHHk.',
  '..kHHHHHHHHHHk..',
  '..kMMMMMMMMMMk..',
  '...kkkkkkkkkk...',
  '................',
  '................',
];
const BUCH = [ // dicker Wälzer mit Rune
  '................',
  '...kkkkkkkkkk...',
  '..kaaaaaaaaaakk.',
  '..kaAyyyyyyAakl.',
  '..kaAyaaaayAakl.',
  '..kaAyayyayAakl.',
  '..kaAyaaaayAakl.',
  '..kaAyayyayAakl.',
  '..kaAyaaaayAakl.',
  '..kaAyyyyyyAakl.',
  '..kaaaaaaaaaakl.',
  '..kAAAAAAAAAAkl.',
  '...kllllllllllk.',
  '....kkkkkkkkkk..',
  '................',
  '................',
];
const FRUCHT = [ // Apfel
  '................',
  '.......kk.......',
  '......ktk.kk....',
  '......kt.kggk...',
  '....kkktkkGk....',
  '...kaaakaaak....',
  '..kaxaaaaaaAk...',
  '..kaxaaaaaaAk...',
  '..kaaaaaaaaAk...',
  '..kaaaaaaaAAk...',
  '..kaaaaaaaAAk...',
  '...kaaaaAAAk....',
  '....kAAkAAk.....',
  '.....kk.kk......',
  '................',
  '................',
];
const HERZ = [
  '................',
  '..kkkk....kkkk..',
  '.kppppk..kppppk.',
  'kpxxppPkkpppppPk',
  'kpxpppppppppppPk',
  'kpppppppppppppPk',
  'kpppppppppppppPk',
  '.kpppppppppppPk.',
  '..kpppppppppPk..',
  '...kpppppppPk...',
  '....kpppppPk....',
  '.....kpppPk.....',
  '......kpPk......',
  '.......kk.......',
  '................',
  '................',
];
// Leeres Herz für die Herzreihe (noch nicht verdient): dunkles Inneres, heller Rand oben links
const HERZ_LEER = HERZ.map((z) => z.replace(/[pP]/g, 'q').replace(/x/g, 'Q'));
const FUNKE = ['.kk.', 'kyyk', 'kyyk', '.kk.'];

export const SPRITES = {
  essen: ESSEN,
  wasser: WASSER,
  buch: BUCH,
  frucht: FRUCHT,
  herz: HERZ,
  herz_leer: HERZ_LEER,
  funke_gold: FUNKE,
};
