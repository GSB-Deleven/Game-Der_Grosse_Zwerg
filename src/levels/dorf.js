// KAPITEL 1 – Die Zwergenfeste im Bergtal
// Jeder Buchstabe ist eine Kachel (16 x 16 Pixel). Bedeutung: siehe legende.js
export default {
  name: 'Die Zwergenfeste',
  musik: 'dorf',
  // Tiere und Leben auf der Karte
  leben: { falter: 7, voegel: true, wolken: true, huehner: [[41, 14], [43, 15], [30, 17]] },
  karte: [
    'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
    'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
    'MMMMMMMMMMMMMMMMMMMWWRWWRWWRWWMMMMMMMMMMMMMMMMMM',
    'MMMM...............WWWWW1WWWWWMMMMMMMMV6MMMMMMMM',
    'MM...H++......T,....Y.L:::L.Y........$,.K...MMMM',
    'M.,.,+3+.*,*....,T.....:::.,..,T...^...,...,..MM',
    'M..*,.:.,...%$..........:.....T....,...........M',
    'M.....:.a.........*..,,.:.........T.,.H++.t....M',
    'M...::::::::::::........:..,..*.......+4+..KK..M',
    'M..b,......c..!:!:::::::::::::::!:..%%::::E....M',
    'M.JJJJ.JJJJJJJ.:::S+$K::::::$S+K::.....:Ae:...TM',
    'M.....,........:::g::::::::::::::::::::::::::..M',
    'MM..........T..:::::::::B:::::::::...,.....K$,.M',
    'M..H++..*......:::::::::::::::::::.............M',
    'M..+5+...:...,.:::::::?:::::::::::*.........^,TM',
    'M......f.:.....:!:::::::::::::::!:.............M',
    'M.PP.PP..:...*.....,....:.......,.JJJJ..JJJJJJJM',
    'M.P.P....::::::::::::::::..*..........,.....,..M',
    'M.......,:..............:.........,....,F...F..M',
    'M...,...,:......T.......::::::::::::F::........M',
    'M..~~~~~~~,.........,*..@........j......h......M',
    'M~~~~~~~~~~~...^........:..______...,,....,....M',
    'M~~~~~~~~~~~~......T....:..______.......F...F..M',
    'M~~~~~~~~~~~~...........:.,______...F,...,.....M',
    'M~~~~~~~~~~~~...........:,.______..............M',
    'M~~~~~~~~~~~,.T....,....:..______..*........&&MM',
    'M..~~~~~~~..........T.,.:.?...........&...F....M',
    'M.T..,...T........*.....:...T..^.T.............M',
    'M...............,.......:.............,......T.M',
    'MMMMMMMMMMMMMMMMMMMMMMMM2MMMMMMMMMMMMMMMMMMMMMMM',
  ],
  ausgaenge: {
    1: { karte: 'bibliothek', ziel: 1 },
    // Weg nach Hause zu Füürio – erst offen, wenn das Spiel geschafft ist (Ehrengarde)
    2: { karte: 'zuhause', ziel: 1, aussehen: 'weg', nurWennFertig: true, weiter: true },
    // Begehbare Häuser und die Mine: freiwillige Zusatz-Orte (aussehen 'weg': die Tür ist schon im Hausbild)
    3: { karte: 'haus_kueche', ziel: 1, aussehen: 'weg' },
    4: { karte: 'haus_stube', ziel: 1, aussehen: 'weg' },
    5: { karte: 'haus_hedda', ziel: 1, aussehen: 'weg' },
    6: { karte: 'mine', ziel: 1, aussehen: 'weg' },
  },
  // Figuren: Buchstabe auf der Karte -> wer ist das und was wünscht er/sie sich?
  //   aussehen: Name aus src/grafik/figuren-liste.js (dort wird das Aussehen beschrieben)
  //   wunsch:   was sie sich wünschen (essen, wasser, buch, frucht)
  //   neckt:    wird beim ersten Mal gesagt (die frechen Zwerge)
  //   sagt:     die Bitte
  //   danke:    wenn der Wunsch erfüllt wird
  //   danach:   was sie später sagen
  figuren: {
    a: {
      name: 'Mama Hilde',
      aussehen: 'mama',
      stimme: { hoehe: 1.25 },
      wunsch: 'essen',
      sagt: 'Hallo, mein Grosser! Holst du uns bitte Essen vom Markt? Die Kinder haben so Hunger.',
      danke: 'Oh, danke schön! Du bist ein Schatz!',
      danach: 'Mit dir ist unser Dorf so viel schöner.',
    },
    b: {
      name: 'Tilda',
      aussehen: 'tilda',
      stimme: { hoehe: 1.8, tempo: 1.05 },
      wunsch: 'essen',
      neckt: 'Hihi! Du bist doch gar kein Zwerg, du bist viel zu gross!',
      sagt: 'Mein Bauch knurrt. Bringst du mir auch etwas zu essen?',
      danke: 'Mmmh, lecker! Danke! Du bist doch ein richtig toller Zwerg!',
      danach: 'Du bist der liebste Zwerg im ganzen Dorf!',
    },
    c: {
      name: 'Bruno',
      aussehen: 'bruno',
      stimme: { hoehe: 1.6, tempo: 1.05 },
      wunsch: 'frucht',
      neckt: 'Haha, schaut mal, der Riesen-Zwerg!',
      sagt: 'Ich möchte so gerne einen Apfel. Aber die hängen ganz, ganz oben am Baum.',
      danke: 'Juhuu, ein Apfel! Danke! Du bist so stark!',
      danach: 'Wenn ich gross bin, will ich so sein wie du!',
    },
    e: {
      name: 'Schmied Balin',
      aussehen: 'schmied',
      stimme: { hoehe: 0.6, tempo: 0.9 },
      wunsch: 'wasser',
      sagt: 'Puh, an der Esse ist es heiss! Holst du mir einen Kessel Wasser vom Brunnen? Der ist so schwer.',
      danke: 'Ah, herrlich kühl! Danke, starker Freund!',
      danach: 'Klong, klong! Ich schmiede dir einmal einen schönen Helm.',
    },
    f: {
      name: 'Oma Runa',
      aussehen: 'oma',
      stimme: { hoehe: 1.1, tempo: 0.85 },
      // Hühner einfangen: sie laufen herum und flattern beim ersten Mal noch einmal davon
      wunsch: 'huehner',
      anzahl: 3,
      ausreisser: [[5, 6], [20, 27], [44, 21]],
      sagt: 'Oh je! Meine drei Hühner sind ausgebüxt! Fängst du sie mir wieder ein? Lauf einfach zu ihnen hin.',
      weiter: 'Gack, gack! Da ist ja eins! Noch {rest}!',
      danke: 'Alle meine Hühner sind wieder da! Danke, mein Lieber!',
      danach: 'Ein grosses Herz ist mehr wert als alles Gold.',
    },
    g: {
      name: 'Händler Dwalin',
      aussehen: 'haendler',
      stimme: { hoehe: 0.8 },
      // hat keinen Wunsch – er verteilt Essen
      sagt: 'Willkommen am Markt! Nimm dir Essen mit, so viel du tragen kannst.',
    },
    h: {
      name: 'Bauer Gorm',
      aussehen: 'bauer',
      stimme: { hoehe: 0.75 },
      wunsch: 'frucht',
      sagt: 'Die schönsten Äpfel hängen ganz oben. Da komme ich nie hin. Pflückst du mir einen?',
      danke: 'Was für ein prächtiger Apfel! Danke dir!',
      danach: 'Ohne dich wäre die Ernte nur halb so gut.',
    },
    j: {
      name: 'Nella',
      aussehen: 'nella',
      stimme: { hoehe: 1.7, tempo: 1.05 },
      // Versteckis: Nella versteckt sich hinter einem dieser Dinge (jedes Mal ein anderes)
      wunsch: 'suchen',
      verstecke: [[27, 17], [21, 20], [35, 25], [38, 26], [28, 27]],
      neckt: 'Bist du ein Zwerg oder ein Baum? Hihi!',
      sagt: 'Spielst du Versteckis mit mir? Du zählst, und ich verstecke mich!',
      zaehlen: 'Eins … zwei … drei! Ich komme!',
      leer: ['Hier ist sie nicht. Nur ein Schmetterling!', 'Gack! Nur ein Huhn!', 'Hmm, leer. Wo ist sie nur?'],
      gefunden: 'Gefunden! Hihi!',
      danke: 'Du hast mich gefunden! Du bist mein allerbester Freund!',
      danach: 'Ich hab dich lieb, Grosser Zwerg!',
    },
    t: {
      name: 'Bauer Torvi',
      aussehen: 'torvi',
      stimme: { hoehe: 0.85 },
      zusatz: true, // freiwillig: Wunsch draussen, die Jacke hängt drinnen in seinem Haus
      wunsch: 'jacke',
      sagt: 'Brrr, ist das kalt heute! Holst du mir meine Jacke? Sie hängt in meinem Haus am Haken.',
      danke: 'Ah, schön warm! Danke, Grosser Zwerg.',
      danach: 'Mit Jacke macht die Arbeit wieder Spass.',
    },
  },
  // Was passiert, wenn alle Wünsche im Kapitel erfüllt sind?
  wennFertig: 'bote',
};
