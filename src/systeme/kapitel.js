import { KAPITEL } from '../levels/index.js';
import { sichere } from './speichern.js';
import { stoppeMusik } from './musik.js';

// Startet das aktuelle Kapitel des Spielstands (mit Bildergeschichte, falls noch nicht gesehen)
export function starteKapitel(scene, { mitIntro = true } = {}) {
  const stand = scene.registry.get('stand');
  // Wer das Spiel geschafft hat, spielt bei der Ehrengarde weiter (Kapitel 6)
  if (stand.fertig && stand.kapitel < 6) { stand.kapitel = 6; stand.ort = null; stand.traegt = null; }
  const kapitel = KAPITEL[stand.kapitel] || KAPITEL[1];
  stand.geschichten = stand.geschichten || (stand.introGesehen ? ['intro'] : []);
  // Auch in freiwilligen Orten (zusatz) dort weiterspielen, wo man aufgehört hat
  const ort = stand.ort && kapitel.karten.concat(kapitel.zusatz || []).includes(stand.ort.karte) ? stand.ort : null;
  let weiter;
  if (ort) weiter = { szene: 'Welt', daten: { karte: ort.karte, pos: ort } };
  else if (kapitel.startSzene) weiter = { szene: kapitel.startSzene, daten: {} };
  else weiter = { szene: 'Welt', daten: { karte: kapitel.start } };
  stoppeMusik();
  if (mitIntro && kapitel.intro && !stand.geschichten.includes(kapitel.intro)) {
    scene.scene.start('Geschichte', { seiten: kapitel.intro, weiter });
  } else {
    scene.scene.start(weiter.szene, weiter.daten);
  }
}

// Nach einem geschafften Kapitel: das nächste beginnen
export function naechstesKapitel(scene) {
  const stand = scene.registry.get('stand');
  stand.kapitel += 1;
  stand.ort = null;
  stand.traegt = null;
  scene.registry.set('traegt', null);
  sichere(scene.registry);
  starteKapitel(scene);
}
