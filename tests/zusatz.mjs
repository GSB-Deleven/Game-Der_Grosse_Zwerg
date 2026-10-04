// Zusatz-Orte-Test: Spielstand «Ehrengarde» (Kapitel 6, alle Missionen geschafft) wie ein altes Spiel in den
// Speicher legen, laden und dem gelben Pfeil nach vom Zuhause ins Dorf, in die Häuser und die Mine gehen,
// bis alle freiwilligen Aufgaben erfüllt sind. Prüft: volle Herzen an jedem Ort, Spielstand bleibt erhalten.
//   SPIEL_URL=http://localhost:4173/Game-Der_Grosse_Zwerg/ node tests/zusatz.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASIS = process.env.SPIEL_URL || 'http://localhost:5173/Game-Der_Grosse_Zwerg/';
const BILDER = process.env.BILDER || 'test-bilder';
fs.mkdirSync(BILDER, { recursive: true });
const pruefe = (ok, text) => { console.log(`${ok ? '✔' : '✘'} ${text}`); if (!ok) process.exitCode = 1; };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const fehler = [];
page.on('pageerror', (e) => fehler.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CERT')) fehler.push(m.text()); });

// Ein Spielstand wie aus einer älteren Version (ohne neue Felder): Kapitel 6, Spiel geschafft, beide Missionen
await page.addInitScript(() => {
  if (sessionStorage.getItem('gestartet')) return;
  sessionStorage.setItem('gestartet', '1');
  localStorage.clear();
  const stand = {
    name: 'Liv', bild: 'held', kapitel: 6, erfuellt: ['damm:a'], herzen: 40, introGesehen: true,
    geschichten: ['intro', 'kapitel2', 'kapitel3', 'kapitel4', 'kapitel6'], fortschritt: {}, ereignisse: [],
    fertig: true, missionen: ['damm', 'post'], ort: null, traegt: null,
  };
  localStorage.setItem('grosser-zwerg-plaetze-v2', JSON.stringify({ plaetze: [stand, null, null] }));
});
await page.goto(`${BASIS}${BASIS.includes('?') ? '&' : '?'}schnell`);
await page.waitForTimeout(2500);
await page.keyboard.press('Space');
await page.waitForTimeout(1000);
await page.evaluate(() => window.spiel.scene.getScene('Spielstaende').oeffnePlatz(0));

const zustand = () => page.evaluate(() => {
  const sp = window.spiel, w = sp.scene.getScene('Welt'), stand = sp.registry.get('stand');
  const aktiv = sp.scene.getScenes(true).map((s) => s.scene.key);
  return {
    aktiv, karte: w?.kartenName, lebt: w?.lebt, zw: w?.zwischenszene, herzen: stand?.herzen, traegt: w?.traegt,
    pos: w?.held ? [Math.round(w.held.x), Math.round(w.held.y)] : null, ort: sp.registry.get('ortHerzen'),
    offen: w?.lebt ? w.alleWuensche({ mitZusatz: true }).filter((x) => w.kapitel.zusatz.includes(x.karte) && !w.istErfuellt(x.id)).map((x) => x.id) : null,
  };
});

const besucht = {}; // Karte -> letzte Ortsherzen
let letzteAktion = '', gleichSeit = 0, fertig = false, stillSeit = Date.now(), abdruck = '';
const start = Date.now();
while (Date.now() - start < 15 * 60 * 1000) {
  const z = await zustand();
  const f = JSON.stringify([z.aktiv, z.karte, z.pos, z.herzen, z.zw, z.traegt]);
  if (f !== abdruck) { abdruck = f; stillSeit = Date.now(); }
  else if (Date.now() - stillSeit > 90000) { await page.screenshot({ path: `${BILDER}/fehler.png` }); throw new Error(`Nichts passiert seit 90 s: ${JSON.stringify(z)}`); }
  if (z.aktiv.includes('Geschichte') || z.aktiv.includes('Entscheidung')) { await page.keyboard.press('Space'); await page.waitForTimeout(400); continue; }
  if (z.aktiv.includes('Splash')) { await page.evaluate(() => { const s = window.spiel.scene.getScene('Splash'); if (!s.fertig) s.schliessen(); }); continue; }
  if (z.karte && z.lebt && !besucht[z.karte]) {
    besucht[z.karte] = z.ort;
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${BILDER}/zusatz-${z.karte}.png` });
    console.log(`→ ${z.karte}: Herzen hier ${z.ort?.voll}/${z.ort?.max}, noch offen: ${z.offen.join(', ') || '–'}`);
  }
  if (z.karte && z.lebt) besucht[z.karte] = z.ort;
  if (z.lebt && !z.zw && z.offen && !z.offen.length) { fertig = true; break; }
  if (z.aktiv.includes('Welt') && z.lebt && !z.zw && !z.aktiv.includes('Pause')) {
    const aktion = await page.evaluate(() => {
      const w = window.spiel.scene.getScene('Welt');
      if (!w.held || w.wechselt || w.pfad.length || w.pfadZiel || w.aktionGesperrt) return 'warte';
      const ziel = w.loesungsZiel();
      if (!ziel) return 'kein Ziel';
      const f = ziel.ding ? ziel.ding.feld : ziel.feld;
      w.laufeZu(f.x * 16 + 8, f.y * 16 + 8);
      return `${w.kartenName}:${ziel.ding ? (ziel.ding.id || ziel.ding.gibt) : `feld ${f.x},${f.y}`}`;
    });
    if (aktion === letzteAktion && aktion !== 'warte') gleichSeit++; else gleichSeit = 0;
    if (aktion !== 'warte') letzteAktion = aktion;
    if (gleichSeit > 25) { await page.screenshot({ path: `${BILDER}/fehler.png` }); throw new Error(`Hänger bei ${aktion}: ${JSON.stringify(z)}`); }
  }
  await page.waitForTimeout(350);
}

pruefe(fertig, 'Alle freiwilligen Aufgaben dem Pfeil nach erfüllt');
for (const k of ['dorf', 'haus_kueche', 'haus_stube', 'haus_hedda', 'mine']) {
  pruefe(!!besucht[k], `${k} besucht`);
}
// Jeden Zusatz-Ort noch einmal betreten: alle Herzen dort voll?
for (const k of ['haus_kueche', 'haus_stube', 'haus_hedda', 'mine', 'dorf']) {
  await page.evaluate((k) => window.spiel.scene.getScene('Welt').scene.restart({ karte: k }), k);
  await page.waitForFunction(() => window.spiel.scene.getScene('Welt')?.lebt, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  const ort = await page.evaluate(() => window.spiel.registry.get('ortHerzen'));
  pruefe(ort && ort.max > 0 && ort.voll === ort.max, `${k}: alle Herzen voll (${ort?.voll}/${ort?.max})`);
}
await page.screenshot({ path: `${BILDER}/zusatz-dorf-voll.png` });
// Spielstand gespeichert? (neue Herzen, Missionen und «fertig» noch da)
await page.evaluate(() => window.spiel.scene.getScene('Welt').sichern());
const gespeichert = await page.evaluate(() => JSON.parse(localStorage.getItem('grosser-zwerg-plaetze-v2')).plaetze[0]);
pruefe(gespeichert.kapitel === 6 && gespeichert.fertig && gespeichert.missionen.length === 2 && gespeichert.herzen > 40,
  `Spielstand erhalten (Kapitel ${gespeichert.kapitel}, ${gespeichert.herzen} Herzen, Missionen ${gespeichert.missionen})`);
pruefe(!fehler.length, `Keine Fehler im Browser${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
