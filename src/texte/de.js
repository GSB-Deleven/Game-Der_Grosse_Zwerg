// Alle allgemeinen Texte an einem Ort. Die Sätze der Dorf-Zwerge stehen in den Level-Dateien.
export const TEXTE = {
  titel: 'Der Grosse Zwerg',
  untertitel: 'Ein Abenteuer über Mut, Freundschaft und ein grosses Herz',
  spielen: 'Spielen',
  neu: 'Neu anfangen',
  neuFrage: 'Wirklich von vorne beginnen?',
  ja: 'Ja',
  nein: 'Nein',
  titelSprechen: 'Der Grosse Zwerg!',

  intro: [
    'Es war einmal ein Zwerg. Er war viel, viel grösser als alle anderen Zwerge im Dorf.',
    'Manche Zwerge lachten über ihn: Du bist doch gar kein Zwerg, du bist viel zu gross!',
    'Aber der Grosse Zwerg liess sich nicht beirren. Er hatte ein riesengrosses Herz und half allen, wo er nur konnte.',
    'Hilf dem Grossen Zwerg! Wer etwas braucht, zeigt es dir mit einem Bild über dem Kopf.',
  ],

  kapitel2: [
    'Der Grosse Zwerg packte seinen Rucksack und machte sich auf den Weg zum Schloss der Königin.',
    'Das Schloss hatte hohe Türme und bunte Fahnen. Die Königin wartete schon auf ihn.',
  ],
  kapitel3: [
    'Der Grosse Zwerg packte seine sieben Sachen und machte sich auf die grosse Reise.',
    'Er überquerte Seen, durchquerte tiefe Täler, lief durch dunkle Wälder und kletterte über hohe Berge.',
  ],
  kapitel4: [
    'Endlich erreichte der Grosse Zwerg den höchsten Berg.',
    'Ganz oben war eine dunkle Höhle. Es roch nach Feuer und ein bisschen nach Schwefel. Er zündete eine Fackel an und ging hinein.',
  ],

  kapitel6: [
    'Von nun an wohnten der Grosse Zwerg und Füürio zusammen, gleich neben dem Schloss.',
    'Am Anfang hatten sie nur ein kleines Zelt. Aber für die Ehrengarde gab es im Zwergenreich viel zu tun!',
    'Schau aufs Missionsbrett! Mit jeder Mission wird euer Zuhause schöner, und es gibt neue Kleider.',
  ],

  kapitelGeschafft: (n) => `Kapitel ${n} geschafft!`,
  weiter: 'Weiter',
  zurueck: 'Zum Titelbild',
};

// Was der Grosse Zwerg sagt, wenn er etwas holt
export const GEGENSTAENDE = {
  essen: { holen: 'Ein Korb voll Essen!' },
  wasser: { holen: 'Ein schwerer Kessel Wasser. Hau ruck!' },
  buch: { holen: 'Ein grosses Buch von ganz oben!' },
  frucht: { holen: 'Ein schöner Apfel von ganz oben!' },
  stein: { holen: 'Ein schwerer Stein. Kein Problem für mich!' },
  brett: { holen: 'Ein langes Brett. Das trage ich!' },
  seil: { holen: 'Ein langes, starkes Seil!' },
  beeren: { holen: 'Leckere Beeren!' },
  heu: { holen: 'Ein Arm voll Heu!' },
  fackel: { holen: 'Eine Fackel. Jetzt wird es hell!' },
  pilze: { holen: 'Leuchtende Höhlenpilze!' },
  blume_rot: { holen: 'Eine rote Blume. Rot wie eine Erdbeere!' },
  blume_gelb: { holen: 'Eine gelbe Blume. Gelb wie die Sonne!' },
  blume_blau: { holen: 'Eine blaue Blume. Blau wie der Himmel!' },
  holz: { holen: 'Ein dicker Baumstamm. Hau ruck!' },
  topf: { holen: 'Ein grosser Kochtopf!' },
  jacke: { holen: 'Eine warme, grüne Jacke!' },
  teddy: { holen: 'Da ist ja der Teddy!' },
  tee: { holen: 'Ein heisser Tee. Vorsichtig tragen!' },
  kristall: { holen: 'Ein funkelnder Kristall!' },
};

// Wegweiser: jedes Mal ein anderes Ziel (und Mordor kommt immer wieder …)
// [was draufsteht, was der Grosse Zwerg dazu sagt]
export const WEGWEISER = [
  ['Mordor: 1000 Meilen', 'Nein danke. Da ist es viel zu dunkel und niemand lacht.'],
  ['Erebor, der Einsame Berg – Gimlis Heimat', 'Gimli hat bestimmt einen noch längeren Bart als ich!'],
  ['Auenland: Zweites Frühstück um 11 Uhr', 'Zweites Frühstück? Das klingt wunderbar!'],
  ['Moria: Sag Freund und tritt ein', 'Freund! … Hm. Hier ist ja gar keine Tür.'],
  ['Mordor: Immer noch 1000 Meilen', 'Ich sagte doch schon: nein danke!'],
  ['Tiefwasser: Badehose nicht vergessen', 'Eine Badehose in meiner Grösse? Die gibt es nicht.'],
  ['Mithril-Halle: Zwerge willkommen. Riesen bitte bücken!', 'Bin ich jetzt ein Zwerg oder ein Riese? Ich bücke mich einfach.'],
  ['Baldurs Tor: Ganz, ganz weit weg', 'Dann gehe ich lieber ein anderes Mal.'],
  ['Mordor: Wirklich nicht. Auch nicht kurz.', 'Schon gut, schon gut!'],
  ['Bruchtal: Hier wohnen Elben. Bitte leise singen.', 'La la laaa … Oh, war das zu laut?'],
  ['Isengard: Wegen Bauarbeiten geschlossen', 'Schade! Ich hätte so gerne beim Bauen geholfen.'],
  ['Niewinter: Hier ist nie Winter. Trotzdem Mütze anziehen!', 'Eine Zwergenmütze passt immer.'],
  ['Mordor: Geh lieber heim und iss ein Zvieri', 'Endlich ein guter Vorschlag!'],
  ['Hier war der Grosse Zwerg noch nie', 'Doch! Jetzt schon!'],
  ['Zum Ende der Welt: 3 Tage. Zurück: auch 3 Tage.', 'Dann bin ich ja erst in 6 Tagen zum Znacht zurück.'],
  ['Khazad-dûm: Bitte keine Steine in den Brunnen werfen', 'Plumps … Oh. Das war ich nicht!'],
  ['Mordor → Nein. ← Hier ist es schön.', 'Ich bleibe hier!'],
];
