// Aussehen aller Figuren. Wird von den Levels über den Namen benutzt (aussehen: 'mama').
// Möglichkeiten:
//   typ:   zwerg, zwergin, kind, koenigin, bote
//   bart:  lang, gabel, zoepfe, kurz, keiner
//   kopf:  nasenhelm, hoernerhelm, federhelm, kapuze, stirnband, krone, glatze
//   Farben (haar, kleid, kopfFarbe, schuerze, umhang): siehe RAMPEN in figuren-baukasten.js
export const FIGUREN_AUSSEHEN = {
  mama: { typ: 'zwergin', haar: 'kastanie', kleid: 'lila', kopf: 'stirnband', kopfFarbe: 'gold', schuerze: 'beige' },
  oma: { typ: 'zwergin', haar: 'grau', kleid: 'moos', kopf: 'stirnband', kopfFarbe: 'weinrot', umhang: 'braun' },
  tilda: { typ: 'kind', haar: 'blond', kleid: 'blau', kopf: 'kapuze', kopfFarbe: 'rosa' },
  bruno: { typ: 'kind', haar: 'rot', kleid: 'orange', kopf: 'kapuze', kopfFarbe: 'gruen' },
  nella: { typ: 'kind', haar: 'kastanie', kleid: 'lila', kopf: 'kapuze', kopfFarbe: 'orange' },
  pip: { typ: 'kind', haar: 'schwarz', kleid: 'gruen', kopf: 'kapuze', kopfFarbe: 'blau' },
  schmied: { typ: 'zwerg', haar: 'schwarz', bart: 'gabel', kleid: 'leder', kopf: 'glatze', schuerze: 'braun' },
  haendler: { typ: 'zwerg', haar: 'grau', bart: 'lang', kleid: 'blau', kopf: 'nasenhelm', kopfFarbe: 'stahl' },
  bauer: { typ: 'zwerg', haar: 'braun', bart: 'kurz', kleid: 'moos', kopf: 'kapuze', kopfFarbe: 'leder' },
  bibliothekar: { typ: 'zwerg', haar: 'weiss', bart: 'zoepfe', kleid: 'lila', kopf: 'glatze', umhang: 'blau' },
  bote: { typ: 'bote', haar: 'blond', bart: 'kurz', kleid: 'weinrot', kopf: 'federhelm', kopfFarbe: 'stahl' },
  koenigin: { typ: 'koenigin', haar: 'rot', kleid: 'lila', kopf: 'krone', umhang: 'weinrot' },
  wache: { typ: 'zwerg', haar: 'braun', bart: 'zoepfe', kleid: 'blau', kopf: 'hoernerhelm', kopfFarbe: 'stahl', umhang: 'weinrot' },
  wache2: { typ: 'zwerg', haar: 'rot', bart: 'gabel', kleid: 'blau', kopf: 'nasenhelm', kopfFarbe: 'stahl', umhang: 'weinrot' },
  // Kapitel 2 – Schloss
  baeuerin: { typ: 'zwergin', haar: 'kastanie', kleid: 'orange', kopf: 'kapuze', kopfFarbe: 'weinrot', schuerze: 'beige' },
  gaertnerin: { typ: 'zwergin', haar: 'blond', kleid: 'gruen', kopf: 'stirnband', kopfFarbe: 'rosa', schuerze: 'beige' },
  stalljunge: { typ: 'kind', haar: 'braun', kleid: 'leder', kopf: 'kapuze', kopfFarbe: 'moos' },
  berater: { typ: 'zwerg', haar: 'grau', bart: 'lang', kleid: 'weinrot', kopf: 'glatze', umhang: 'lila' },
  beraterin: { typ: 'zwergin', haar: 'schwarz', kleid: 'blau', kopf: 'stirnband', kopfFarbe: 'gold', umhang: 'lila' },
  // Kapitel 3 – Reise
  fischerin: { typ: 'zwergin', haar: 'kastanie', kleid: 'blau', kopf: 'kapuze', kopfFarbe: 'moos', schuerze: 'leder' }, // Kapuze nicht gelb: sah sonst aus wie blondes Haar über braunen Zöpfen
  wanderer: { typ: 'zwerg', haar: 'weiss', bart: 'lang', kleid: 'moos', kopf: 'kapuze', kopfFarbe: 'braun', umhang: 'braun' },
  mira: { typ: 'kind', haar: 'blond', kleid: 'moos', kopf: 'kapuze', kopfFarbe: 'weinrot' },
  angsthase: { typ: 'zwerg', haar: 'braun', bart: 'kurz', kleid: 'orange', kopf: 'nasenhelm', kopfFarbe: 'kupfer' },
  zitterbart: { typ: 'zwerg', haar: 'rot', bart: 'zoepfe', kleid: 'blau', kopf: 'hoernerhelm', kopfFarbe: 'stahl' },
  // Häuser im Dorf und die Zwergenmine (freiwillige Zusatz-Orte)
  koch: { typ: 'zwerg', haar: 'weiss', bart: 'lang', kleid: 'weinrot', kopf: 'glatze', schuerze: 'weiss' },
  torvi: { typ: 'zwerg', haar: 'rot', bart: 'kurz', kleid: 'blau', kopf: 'kapuze', kopfFarbe: 'braun' },
  fili: { typ: 'kind', haar: 'blond', kleid: 'rosa', kopf: 'kapuze', kopfFarbe: 'blau' },
  hedda: { typ: 'zwergin', haar: 'weiss', kleid: 'lila', kopf: 'stirnband', kopfFarbe: 'gruen', umhang: 'moos' },
  dori: { typ: 'zwerg', haar: 'schwarz', bart: 'gabel', kleid: 'leder', kopf: 'nasenhelm', kopfFarbe: 'kupfer' },
  gimla: { typ: 'zwergin', haar: 'rot', kleid: 'moos', kopf: 'stirnband', kopfFarbe: 'kupfer', schuerze: 'leder' },
  nori: { typ: 'kind', haar: 'braun', kleid: 'orange', kopf: 'kapuze', kopfFarbe: 'leder' },
};
