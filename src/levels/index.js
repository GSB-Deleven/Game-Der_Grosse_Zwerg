import dorf from './dorf.js';
import bibliothek from './bibliothek.js';
import burghof from './burghof.js';
import thronsaal from './thronsaal.js';
import see from './see.js';
import tal from './tal.js';
import wald from './wald.js';
import berg from './berg.js';
import gipfel from './gipfel.js';
import hoehle from './hoehle.js';
import marktplatz from './marktplatz.js';
import zuhause from './zuhause.js';
import damm from './damm.js';
import hausKueche from './haus_kueche.js';
import hausStube from './haus_stube.js';
import hausHedda from './haus_hedda.js';
import mine from './mine.js';

// Alle Karten des Spiels. Neue Karte: Datei anlegen und hier eintragen.
export const KARTEN = {
  dorf, bibliothek, burghof, thronsaal, see, tal, wald, berg, gipfel, hoehle, marktplatz, zuhause, damm,
  haus_kueche: hausKueche, haus_stube: hausStube, haus_hedda: hausHedda, mine,
};

// Freiwillige Zusatz-Orte im Dorf: begehbare Häuser und die Mine
const DORF_ZUSATZ = ['haus_kueche', 'haus_stube', 'haus_hedda', 'mine'];

// Kapitel fassen Karten zusammen. Ein Kapitel ist geschafft, wenn alle Wünsche erfüllt sind.
//   start       – auf welcher Karte es losgeht
//   startSzene  – (freiwillig) eine besondere Szene zu Beginn, z.B. der Flug
//   intro       – Bildergeschichte vor dem Kapitel (Texte in src/texte/de.js)
//   fertigAuf   – (freiwillig) das Kapitelende passiert nur auf dieser Karte
//   wennFertig  – Drehbuch, wenn alles erledigt ist
//   meilensteine: coole Momente mit grosser Einblendung (Splash). Bedingungen:
//     { herzen: 1 } · { wunsch: 'frucht' } · { figuren: ['dorf:b', …] }
export const KAPITEL = {
  1: {
    name: 'Die Zwergenfeste',
    karten: ['dorf', 'bibliothek'],
    zusatz: DORF_ZUSATZ, // freiwillig: zählt nicht fürs Kapitel-Ende
    start: 'dorf',
    intro: 'intro',
    meilensteine: [
      { id: 'erstesHerz', wenn: { herzen: 1 }, titel: 'Dein erstes Herz!', text: 'Du hast einem Zwerg geholfen. Wie schön!', bild: 'held_unten_jubeln', farbe: 0xe05a8a },
      { id: 'freunde', wenn: { figuren: ['dorf:b', 'dorf:c', 'dorf:j'] }, titel: 'Freundschaft!', text: 'Die frechen Kinder sind jetzt deine Freunde.', bild: 'fig_tilda_jubeln', farbe: 0x3f8a44 },
      { id: 'aepfel', wenn: { wunsch: 'frucht' }, titel: 'Alle Äpfel gepflückt!', text: 'Nur der Grosse Zwerg kommt so weit hinauf.', bild: 'frucht', farbe: 0xb0413e },
      { id: 'buecher', wenn: { wunsch: 'buch' }, titel: 'Bücher für alle!', text: 'Die Bibliothek ist glücklich.', bild: 'buch', farbe: 0x3f6fb5 },
    ],
    wennFertig: [
      { warte: 400 },
      { ton: 'fanfare' },
      { figurKommt: { aussehen: 'bote', name: 'Bote der Königin', hoehe: 1.2, buchstabe: 'bote' } },
      { splash: { titel: 'Eine Nachricht!', text: 'Der Bote der Königin ist da!', bild: 'fig_bote_jubeln', farbe: 0x7c52a6 } },
      { sage: ['bote', 'Hört, hört! Eine Nachricht von der Zwergenkönigin!'] },
      { sage: ['bote', 'Auf dem höchsten Berg wohnt ein Drache. Alle haben Angst! Die Königin sucht einen mutigen Helden.'] },
      { sage: ['held', 'Ich bin gross, ich bin stark, und ich bin mutig. Ich gehe zur Königin!'] },
      { kapitelEnde: true },
    ],
  },
  2: {
    name: 'Der Ruf der Königin',
    karten: ['burghof', 'thronsaal'],
    start: 'burghof',
    intro: 'kapitel2',
    wennFertig: [
      { splash: { titel: 'Die Königin braucht dich!', text: 'Auf zum höchsten Berg!', bild: 'fig_koenigin_jubeln', farbe: 0x7c52a6 } },
      { kapitelEnde: true },
    ],
  },
  3: {
    name: 'Die grosse Reise',
    karten: ['see', 'tal', 'wald', 'berg'],
    start: 'see',
    intro: 'kapitel3',
    fertigAuf: 'berg',
    meilensteine: [
      { id: 'see', wenn: { figuren: ['see:a'] }, titel: 'Über den See!', text: 'Stein für Stein – geschafft!', bild: 'stein', farbe: 0x3d74b8 },
      { id: 'bruecke', wenn: { figuren: ['tal:a'] }, titel: 'Eine Brücke!', text: 'Der Grosse Zwerg hat sie selbst gebaut.', bild: 'brett', farbe: 0x8a5a33 },
      { id: 'licht', wenn: { figuren: ['wald:m'] }, titel: 'Licht im Wald!', text: 'Mira hat keine Angst mehr.', bild: 'fig_mira_jubeln', farbe: 0x3f8a44 },
    ],
    wennFertig: [
      { splash: { titel: 'Mut macht stark!', text: 'Jetzt klettert der Grosse Zwerg ganz nach oben.', bild: 'held_unten_jubeln', farbe: 0x6e4a9a } },
      { kapitelEnde: true },
    ],
  },
  4: {
    name: 'Der Drache',
    karten: ['gipfel', 'hoehle'],
    start: 'gipfel',
    intro: 'kapitel4',
    fertigAuf: 'hoehle',
    wennFertig: [
      { zustand: ['d', 'froh'] },
      { licht: 0.15 },
      { jubel: 'd' },
      { splash: { titel: 'Freunde!', text: 'Füürio und der Grosse Zwerg sind jetzt Freunde.', bild: 'fig_drache_froh_jubeln', farbe: 0xe05a8a } },
      { sage: ['d', 'Du bist der Erste, der keine Angst vor mir hat!'] },
      { sage: ['d', 'Spring auf meinen Rücken! Wir machen einen Rundflug!'] },
      { sage: ['held', 'Juhu! Komm, wir fliegen zum Schloss der Königin!'] },
      { kapitelWechsel: 5, szene: 'Flug' },
    ],
  },
  5: {
    name: 'Das grosse Fest',
    karten: ['marktplatz'],
    start: 'marktplatz',
    startSzene: 'Flug',
  },
  // Nach dem Happy End: Missionen der Ehrengarde (siehe src/levels/missionen.js). Hört nie auf.
  6: {
    name: 'Die Ehrengarde',
    karten: ['zuhause', 'damm'],
    zusatz: ['dorf', 'bibliothek', ...DORF_ZUSATZ], // vom Zuhause aus zurück ins Dorf
    start: 'zuhause',
    intro: 'kapitel6',
  },
};
