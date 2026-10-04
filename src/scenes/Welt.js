import Phaser from 'phaser';
import { KARTEN, KAPITEL } from '../levels/index.js';
import { LEGENDE } from '../levels/legende.js';
import { KACHEL } from '../grafik/texturen.js';
import { maleBoden, erzeugeWeltTexturen, OBST_PLAETZE } from '../grafik/welt-grafik.js';
import { heldTexturen, figurTexturen, figurMasse } from '../grafik/figur-texturen.js';
import { sprich, verstummen } from '../systeme/stimme.js';
import { spiele } from '../systeme/ton.js';
import { spieleMusik, ducken } from '../systeme/musik.js';
import { sichere } from '../systeme/speichern.js';
import { GEGENSTAENDE, WEGWEISER } from '../texte/de.js';
import { beiGroesse } from '../systeme/bildschirm.js';
import { MISSIONEN, KLEIDER, belohnungVon } from '../levels/missionen.js';
import { schliesseMissionAb } from '../systeme/missionen.js';

const TEMPO = 84;          // Lauftempo (Pixel pro Sekunde)
const SCHRITTWEITE = 30;   // so viele Pixel pro ganzem Laufzyklus
const HELD = { name: 'Der Grosse Zwerg', hoehe: 0.75 };
const HOCH_OBEN = new Set(['obstbaum', 'regal']); // hier muss er sich strecken
const REDE_WUENSCHE = new Set(['mut', 'reden']);  // werden durch Reden erfüllt
// Bild in der Wunsch-Blase, wenn es nicht gleich heisst wie der Wunsch
const WUNSCH_BILD = { mut: 'herz', reden: 'ausruf', huehner: 'huhn0', suchen: 'lupe' };

export class Welt extends Phaser.Scene {
  constructor() { super('Welt'); }

  init(daten) {
    this.kartenName = daten.karte || 'dorf';
    this.zielAusgang = daten.ziel;
    this.startPos = daten.pos || null;
    this.karte = KARTEN[this.kartenName];
    this.stand = this.registry.get('stand');
    this.stand.fortschritt = this.stand.fortschritt || {};
    this.stand.ereignisse = this.stand.ereignisse || [];
    this.kapitel = KAPITEL[this.stand.kapitel] || KAPITEL[1];
    this.pfad = [];
    this.pfadZiel = null;
    this.zwischenszene = false;
    this.aktionGesperrt = false;
    this.wechselt = false;
    this.letzterWunsch = null;
    this.pfadLetztes = null;
    this.traegt = null;
    this.tempo = { x: 0, y: 0 };
    this.laufPhase = 0;
    this.blick = 'unten';
    this.heldPose = null; // 'strecken' | 'jubeln' für kurze Zeit
    this.heldPoseBis = 0;
    this.heldRedenBis = 0;
    this.naechstesBlinzeln = 2000;
    // Die Szene wird bei jedem Kartenwechsel wiederverwendet: alte Verweise löschen
    this.dunkelSchicht = null;
    this.maske = null;
    this.wolken = null;
    this.startFeld = null;
    this.letztePos = null;
    this.laufend = false;
    this.dunkelheit = this.karte.dunkel || 0;
    this.heldLicht = this.karte.heldLicht ?? 60;
    this.fackelAn = true;
    this.suche = null; // laufendes Versteckis
  }

  create() {
    heldTexturen(this, this.stand.kleid || 'standard');
    erzeugeWeltTexturen(this);
    this.dinge = [];
    this.figuren = [];
    this.ausgangsFelder = [];
    this.lichtQuellen = [];
    this.ausloeserFelder = [];
    this.zeilen = this.karte.karte.map((z) => z);
    this.zuhauseBild = null;
    this.wendeFortschrittAn();
    this.baueKarte();
    this.erzeugeHeld();
    // Auf breiten Handys oder hohen Tablets zeigt die Kamera einfach mehr von der Welt
    beiGroesse(this, () => this.richteKameraEin());
    this.richteEingabeEin();
    this.erzeugeLeben();
    this.erzeugeAtmosphaere();
    this.erzeugeDunkelheit();
    // Dauerhafte Folgen schon erlebter Ereignisse wiederherstellen (z.B. Drache sichtbar)
    for (const [name, schritte] of Object.entries(this.karte.ereignisse || {})) {
      if (this.ereignisErledigt(name)) this.fuehreAus(schritte, { still: true });
    }

    if (!this.scene.isActive('Oberflaeche')) this.scene.launch('Oberflaeche');
    this.scene.bringToTop('Oberflaeche');
    this.game.events.emit('herzen', this.stand.herzen);
    this.meldeOrtHerzen();
    this.game.events.emit('traegt', this.traegt);

    this.pfeil = this.add.image(0, 0, 'pfeil').setDepth(100000).setVisible(false);
    this.cameras.main.fadeIn(400);
    spieleMusik(this.karte.musik || 'dorf');

    this.lebt = true;
    this.game.events.on('aktion', this.beiAktion, this);
    this.game.events.on('pause', this.oeffnePause, this);
    this.events.once('shutdown', () => {
      this.lebt = false;
      this.game.events.off('aktion', this.beiAktion, this);
      this.game.events.off('pause', this.oeffnePause, this);
      verstummen();
    });

    this.sichern();
    this.time.delayedCall(500, () => this.beimBetreten());
  }

  async beimBetreten() {
    if (!this.stand.orteBesucht.includes(this.kartenName)) {
      this.stand.orteBesucht.push(this.kartenName);
      this.game.events.emit('ortBanner', this.karte.name);
      await new Promise((r) => setTimeout(r, 1800));
    }
    if (!this.lebt) return;
    await this.starteEreignis('beimBetreten');
    if (this.lebt && this.karte.zuhause && this.stand.neu) await this.zeigeBelohnung();
    await this.pruefeFertig();
  }

  sichern() {
    if (this.held) this.stand.ort = { karte: this.kartenName, x: Math.round(this.held.x), y: Math.round(this.held.y) };
    this.stand.traegt = this.traegt || null;
    return sichere(this.registry);
  }

  // -------------------------------------------------------------------------
  // KARTE
  // -------------------------------------------------------------------------
  zeichen(x, y) { return this.zeilen[y]?.[x]; }

  setzeZeichen(x, y, c) {
    const z = this.zeilen[y];
    this.zeilen[y] = z.slice(0, x) + c + z.slice(x + 1);
  }

  // Bereits gebaute Teile von Bauaufgaben (Trittsteine, Brücke …) wieder einsetzen
  wendeFortschrittAn() {
    for (const [buchstabe, f] of Object.entries(this.karte.figuren || {})) {
      if (!f.baustelle) continue;
      const n = this.stand.fortschritt[`${this.kartenName}:${buchstabe}`] || 0;
      for (let i = 0; i < n; i++) for (const [x, y] of this.bauFelder(f, i)) this.setzeZeichen(x, y, f.baustelle.zu);
    }
  }

  bauFelder(daten, stufe) {
    const s = daten.baustelle.baue[stufe] || [];
    return typeof s[0] === 'number' ? [s] : s;
  }

  berechneBoden() {
    const boden = this.zeilen.map((z) => [...z].map((c) => LEGENDE[c]?.boden || null));
    for (let runde = 0; runde < 8; runde++) {
      for (let y = 0; y < this.hoehe; y++) {
        for (let x = 0; x < this.breite; x++) {
          if (boden[y][x]) continue;
          const n = [[-1, 0], [1, 0], [0, 1], [0, -1]].map(([dx, dy]) => boden[y + dy]?.[x + dx])
            .filter((b) => b && !['wasser', 'fels', 'felswand', 'rune', 'schlucht', 'leiter', 'hoehlenwand'].includes(b));
          if (n.length) boden[y][x] = n.includes('weg') ? 'weg' : n[0];
        }
      }
    }
    for (let y = 0; y < this.hoehe; y++) for (let x = 0; x < this.breite; x++) {
      if (/[0-9]/.test(this.zeilen[y][x])) boden[y][x] = this.karte.ausgangBoden || 'weg';
      boden[y][x] = boden[y][x] || this.karte.grundBoden || 'gras';
    }
    return boden;
  }

  baueKarte() {
    this.breite = this.zeilen[0].length;
    this.hoehe = this.zeilen.length;
    const figuren = this.karte.figuren || {};
    const ausgaenge = this.karte.ausgaenge || {};

    this.bodenArt = this.berechneBoden();
    maleBoden(this, `boden_${this.kartenName}`, this.bodenArt);
    this.bodenBild = this.add.image(0, 0, `boden_${this.kartenName}`).setOrigin(0, 0).setDepth(-100);

    this.fest = [];
    const map = this.make.tilemap({ tileWidth: KACHEL, tileHeight: KACHEL, width: this.breite, height: this.hoehe });
    const set = map.addTilesetImage('kacheln', 'kacheln', KACHEL, KACHEL, 0, 0);
    this.sperre = map.createBlankLayer('sperre', set).setVisible(false);
    this.objekte = {}; // "x,y" -> Liste der Bilder an dieser Stelle

    const spaeter = [];
    for (let y = 0; y < this.hoehe; y++) {
      this.fest.push([]);
      for (let x = 0; x < this.breite; x++) {
        const z = this.zeilen[y][x];
        const eintrag = LEGENDE[z];
        let fest = !!eintrag?.fest;
        if (/[a-z]/.test(z) && figuren[z]) spaeter.push([z, x, y]);
        else if (/[1-9]/.test(z)) {
          const a = { x, y, nummer: z, ...(ausgaenge[z] || {}) };
          const inWand = this.istWand(x - 1, y) || this.istWand(x + 1, y);
          // nurWennFertig: dieser Weg ist erst offen, wenn das Spiel geschafft ist (z. B. Dorf -> Zuhause)
          if (a.nurWennFertig && !this.stand.fertig) fest = true;
          else {
            if (a.aussehen === 'weg') { /* offener Weg, kein Bild */ } else if (a.aussehen) this.add.image(x * KACHEL + 8, (y + 1) * KACHEL, `obj_${a.aussehen}`).setOrigin(0.5, 1).setDepth(-50);
            else if (inWand) this.add.image(x * KACHEL, y * KACHEL, 'obj_tuer').setOrigin(0, 0).setDepth(-50);
            this.ausgangsFelder.push(a);
          }
        } else if (z === '0') {
          this.ausloeserFelder.push({ x, y });
        } else if (eintrag?.start) {
          this.startFeld = { x, y };
        }
        this.fest[y].push(fest);
        if (fest) this.sperre.putTileAt(0, x, y);
        if (eintrag?.objekt) this.erzeugeObjekt(eintrag, x, y);
      }
    }
    // Figuren zuletzt (grosse Figuren sperren mehrere Felder)
    for (const [z, x, y] of spaeter) this.erzeugeFigur(z, figuren[z], x, y);
    this.sperre.setCollisionByExclusion([-1]);
    this.physics.world.setBounds(0, 0, this.breite * KACHEL, this.hoehe * KACHEL);
  }

  setzeFest(x, y, fest) {
    if (!this.fest[y]) return;
    this.fest[y][x] = fest;
    if (fest) this.sperre.putTileAt(0, x, y); else this.sperre.removeTileAt(x, y);
  }

  // Eine Kachel verwandeln (z.B. Wasser -> Trittstein) und den Boden neu malen
  verwandle(felder, zu) {
    const eintrag = LEGENDE[zu] || {};
    for (const [x, y] of felder) {
      this.setzeZeichen(x, y, zu);
      for (const b of this.objekte[`${x},${y}`] || []) b.destroy();
      this.objekte[`${x},${y}`] = [];
      this.setzeFest(x, y, !!eintrag.fest);
      if (eintrag.objekt) this.erzeugeObjekt(eintrag, x, y, true);
    }
    this.bodenArt = this.berechneBoden();
    maleBoden(this, `boden_${this.kartenName}`, this.bodenArt);
  }

  istWand(x, y) {
    const z = this.zeichen(x, y);
    return z === 'W' || z === 'R' || z === 'M' || z === 'G';
  }

  merke(x, y, bild) {
    (this.objekte[`${x},${y}`] = this.objekte[`${x},${y}`] || []).push(bild);
    return bild;
  }

  erzeugeObjekt(eintrag, x, y, neu = false) {
    if (eintrag.objekt === 'zuhause') {
      // Das Zuhause: Bild je nach Ausbaustufe, ab der Holzhütte raucht der Kamin
      const stufe = Math.min(this.stand.haus || 0, 2);
      eintrag = { ...eintrag, objekt: `zuhause${stufe}`, rauch: [null, [36, -46], [37, -40]][stufe], licht: stufe === 2 ? [[11, -18], [38, -18]] : undefined };
    }
    const b = eintrag.breite || 1, h = eintrag.hoehe || 1;
    const px = x * KACHEL + (b * KACHEL) / 2;
    const py = (y + h) * KACHEL;
    const flach = eintrag.flach;
    if (!flach && eintrag.schatten !== false) this.merke(x, y, this.add.image(px, py - 2, 'bodenschatten').setScale((b * KACHEL + 6) / 32, 1).setDepth(-60));
    const bild = this.merke(x, y, this.add.image(px, py, `obj_${eintrag.objekt}`).setOrigin(0.5, 1).setDepth(flach ? -40 : py));
    if (neu) { bild.setScale(0.2); this.tweens.add({ targets: bild, scale: 1, duration: 350, ease: 'Back.easeOut' }); }

    for (const [lx, ly] of eintrag.licht || []) this.lichtschein(px + (b === 3 ? lx - 24 : lx), py + ly, b === 3 ? 0.5 : 1, x, y);
    if (eintrag.flamme) this.flamme(px + eintrag.flamme[0], py + eintrag.flamme[1], py + 1, x, y);
    if (eintrag.rauch) this.kaminrauch(px + (b === 3 ? eintrag.rauch[0] - 24 : eintrag.rauch[0]), py + eintrag.rauch[1]);
    if (eintrag.funken) this.schmiedefunken(px + eintrag.funken[0], py + eintrag.funken[1], py + 1);
    if (eintrag.leuchtet) this.lichtQuellen.push({ x: px, y: py - 8, r: eintrag.leuchtet });

    if (eintrag.objekt === 'wegweiser') this.dinge.push({ typ: 'schild', bild, feld: { x, y, b, h } });
    if (eintrag.objekt === 'anschlagbrett') this.dinge.push({ typ: 'missionen', bild, feld: { x, y, b, h } });
    if (eintrag.objekt === 'kleiderkiste') this.dinge.push({ typ: 'kleider', bild, feld: { x, y, b, h } });
    if (eintrag.objekt?.startsWith('zuhause')) this.zuhauseBild = bild;
    if (eintrag.gibt) {
      const ding = { typ: 'quelle', gibt: eintrag.gibt, objekt: eintrag.objekt, bild, feld: { x, y, b, h } };
      if (eintrag.objekt === 'obstbaum') {
        ding.fruechte = OBST_PLAETZE.map(([fx, fy]) => this.merke(x, y, this.add.image(bild.x - 20 + fx, bild.y - 46 + fy, 'apfel').setDepth(py + 1)));
      }
      this.dinge.push(ding);
    }
  }

  lichtschein(x, y, skala = 1, tx, ty) {
    const s = this.add.image(x, y, 'schein').setBlendMode(Phaser.BlendModes.ADD).setDepth(99800).setScale(skala);
    this.tweens.add({ targets: s, alpha: 0.65, scale: skala * 0.92, duration: 400 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.lichtQuellen.push({ x, y, r: 48 * skala, bild: s });
    if (tx !== undefined) this.merke(tx, ty, s);
  }

  flamme(x, y, tiefe, tx, ty) {
    const f = this.add.image(x, y, 'flamme0').setOrigin(0.5, 1).setDepth(tiefe);
    if (tx !== undefined) this.merke(tx, ty, f);
    let i = 0;
    this.time.addEvent({ delay: 110, loop: true, callback: () => { if (f.active) { i = (i + 1) % 3; f.setTexture(`flamme${i}`); } } });
  }

  kaminrauch(x, y) {
    this.time.addEvent({
      delay: 420, loop: true, callback: () => {
        const r = this.add.image(x + Phaser.Math.Between(-1, 1), y, 'rauch').setDepth(98000).setAlpha(0.8).setScale(0.5);
        this.tweens.add({
          targets: r, y: y - 34, x: r.x + Phaser.Math.Between(4, 12), alpha: 0, scale: 1.8,
          duration: 2600, ease: 'Sine.easeOut', onComplete: () => r.destroy(),
        });
      },
    });
  }

  schmiedefunken(x, y, tiefe) {
    this.time.addEvent({
      delay: 260, loop: true, callback: () => {
        const f = this.add.image(x + Phaser.Math.Between(-4, 4), y, 'funke').setDepth(tiefe + 2);
        this.tweens.add({
          targets: f, y: y - Phaser.Math.Between(10, 24), x: f.x + Phaser.Math.Between(-6, 6), alpha: 0,
          duration: 700, ease: 'Quad.easeOut', onComplete: () => f.destroy(),
        });
      },
    });
  }

  // -------------------------------------------------------------------------
  // FIGUREN (auch Bauaufgaben, Tiere und der Drache)
  // -------------------------------------------------------------------------
  erzeugeFigur(buchstabe, daten, x, y) {
    const id = `${this.kartenName}:${buchstabe}`;
    const ding = {
      typ: 'figur', id, buchstabe, daten, feld: { x, y, b: 1, h: 1 }, gesprochen: false,
      naechstesBlinzeln: 1000 + Math.random() * 3000, blinzelnBis: 0, redenBis: 0, jubelnBis: 0,
      atemVersatz: Math.random() * 1000, hoehe: daten.stimme?.hoehe || 1,
    };
    const px = x * KACHEL + KACHEL / 2;
    const py = (y + 1) * KACHEL - 1;

    if (daten.baustelle) {
      // Bauaufgabe: ein Schild mit Bild zeigt, was fehlt
      ding.baustelle = true;
      ding.bild = this.add.image(px, py + 1, `obj_${daten.baustelle.schild || 'schild'}`).setOrigin(0.5, 1).setDepth(py);
      ding.icon = this.add.image(px, py - 14, daten.wunsch).setScale(0.6).setDepth(py + 1);
      ding.vorsilbe = null;
      if (this.istErfuellt(id)) { ding.bild.setVisible(false); ding.icon.setVisible(false); ding.fertig = true; }
      else this.setzeFest(x, y, true);
    } else {
      const masse = figurMasse(daten.aussehen);
      ding.vorsilbe = figurTexturen(this, daten.aussehen, daten.zustand);
      ding.masse = masse;
      ding.feld = { x: x - Math.floor((masse.felderB - 1) / 2), y: y - (masse.felderH - 1), b: masse.felderB, h: masse.felderH };
      ding.schatten = this.add.image(px, py - 1, 'bodenschatten').setScale(masse.schatten).setDepth(-60);
      ding.bild = this.add.image(px, py, `${ding.vorsilbe}steh0`).setOrigin(0.5, masse.fussY).setDepth(py);
      for (let fy = ding.feld.y; fy < ding.feld.y + ding.feld.h; fy++) {
        for (let fx = ding.feld.x; fx < ding.feld.x + ding.feld.b; fx++) this.setzeFest(fx, fy, true);
      }
      if (daten.licht) this.lichtQuellen.push({ x: px, y: py - 16, r: daten.licht, figur: ding, nurWennErfuellt: daten.lichtNachErfuellt });
      this.figuren.push(ding);
    }
    this.dinge.push(ding);
    if (daten.versteckt) this.verstecke(ding, true);
    this.aktualisiereWunsch(ding);
  }

  verstecke(ding, versteckt) {
    ding.versteckt = versteckt;
    ding.bild.setVisible(!versteckt && !ding.fertig);
    ding.schatten?.setVisible(!versteckt);
    if (ding.blase) ding.blase.setVisible(!versteckt);
    for (let fy = ding.feld.y; fy < ding.feld.y + ding.feld.h; fy++) {
      for (let fx = ding.feld.x; fx < ding.feld.x + ding.feld.b; fx++) this.setzeFest(fx, fy, !versteckt || ding.baustelle);
    }
  }

  // Der gerade aktuelle Wunsch (bei "wuensche" der Reihe nach)
  wunschVon(ding) {
    const d = ding.daten || {};
    if (!d.wuensche) return d;
    const i = Math.min(this.stand.fortschritt[ding.id] || 0, d.wuensche.length - 1);
    return { ...d, ...d.wuensche[i] };
  }

  // Wunsch-Blase über dem Kopf anzeigen/aktualisieren
  aktualisiereWunsch(ding) {
    const d = this.wunschVon(ding);
    ding.blase?.destroy();
    ding.blase = null;
    if (!d.wunsch || this.istErfuellt(ding.id)) return;
    const hoch = ding.baustelle ? ding.bild.height + 16 : ding.bild.height * (ding.masse?.fussY || 1) + 8;
    const c = this.add.container(ding.bild.x, ding.bild.y - hoch).setDepth(90000);
    const icon = WUNSCH_BILD[d.wunsch] || d.wunsch;
    c.add(this.add.image(0, 0, 'blase').setScale(0.8));
    c.add(this.add.image(0, -1.5, icon).setScale(0.65));
    if (d.anzahl > 1) {
      const n = this.stand.fortschritt[ding.id] || 0;
      c.add(this.add.text(9, 2, `${n}/${d.anzahl}`, { fontFamily: '"Pixelify Sans", sans-serif', fontSize: '24px', color: '#ffffff', stroke: '#1b1420', strokeThickness: 5 }).setScale(0.25).setOrigin(0, 0));
    }
    this.tweens.add({ targets: c, y: c.y - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    ding.blase = c;
    if (ding.versteckt) c.setVisible(false);
  }

  // -------------------------------------------------------------------------
  // LEBEN: Schmetterlinge, Hühner, Vögel, Wolkenschatten, Glitzern, Glühwürmchen
  // -------------------------------------------------------------------------
  erzeugeLeben() {
    const leben = this.karte.leben || {};
    this.falter = [];
    for (let i = 0; i < (leben.falter || 0); i++) {
      const f = this.zufallsFeld((b) => b === 'gras' || b === 'blumen');
      if (!f) continue;
      const s = this.add.image(f.x * KACHEL + 8, f.y * KACHEL, 'falter0').setDepth(97000)
        .setTint(Phaser.Utils.Array.GetRandom([0xffffff, 0xffc0e0, 0xc0e0ff, 0xfff0a0]));
      this.falter.push({ s, ziel: { x: s.x, y: s.y }, zeit: 0 });
    }
    this.huehner = [];
    for (const [hx, hy] of leben.huehner || []) {
      const s = this.add.image(hx * KACHEL + 8, hy * KACHEL + 12, 'huhn0').setOrigin(0.5, 1).setDepth(hy * KACHEL + 12);
      this.huehner.push({ s, ziel: null, warte: Math.random() * 2000, pickt: 0 });
    }
    // Ausgebüxte Hühner (Wunsch "huehner"): schon gefangene sitzen bei der Besitzerin
    for (const f of this.figuren) {
      const d = f.daten;
      if (d.wunsch !== 'huehner' || !d.ausreisser) continue;
      const gefangen = this.istErfuellt(f.id) ? d.anzahl : (this.stand.fortschritt[f.id] || 0);
      d.ausreisser.forEach(([hx, hy], i) => {
        const frei = i >= gefangen;
        const platz = frei ? { x: hx, y: hy } : this.platzBei(f);
        const s = this.add.image(platz.x * KACHEL + 8, platz.y * KACHEL + 12, 'huhn0').setOrigin(0.5, 1).setDepth(platz.y * KACHEL + 12);
        this.huehner.push({ s, ziel: null, warte: Math.random() * 2000, pickt: 0, frei, besitzer: f, geflohen: false });
      });
    }
    this.gluehwuermchen = [];
    for (const [gx, gy] of leben.gluehwuermchen || []) {
      for (let i = 0; i < 3; i++) {
        const s = this.add.image(gx * KACHEL + 8, gy * KACHEL + 8, 'gluehwurm').setDepth(99900).setBlendMode(Phaser.BlendModes.ADD);
        const q = { x: s.x, y: s.y, r: 26 };
        this.lichtQuellen.push(q);
        this.gluehwuermchen.push({ s, q, ox: gx * KACHEL + 8, oy: gy * KACHEL + 8, phase: Math.random() * 10 });
      }
    }
    if (leben.wolken) {
      this.wolken = [];
      for (let i = 0; i < 3; i++) {
        const w = this.add.image(Math.random() * this.breite * KACHEL, Math.random() * this.hoehe * KACHEL, 'wolke')
          .setDepth(99500).setScale(2 + Math.random());
        this.wolken.push({ s: w, v: 6 + Math.random() * 5 });
      }
    }
    if (leben.voegel) {
      this.time.addEvent({ delay: 9000, loop: true, callback: () => this.vogelschwarm() });
      this.time.delayedCall(3000, () => this.vogelschwarm());
    }
    if (leben.dampf) {
      for (const [dx, dy] of leben.dampf) {
        this.time.addEvent({
          delay: 700, loop: true, callback: () => {
            const r = this.add.image(dx * KACHEL + 8 + Phaser.Math.Between(-4, 4), dy * KACHEL + 8, 'rauch').setDepth(98000).setAlpha(0.5).setTint(0xe8e0a0).setScale(0.6);
            this.tweens.add({ targets: r, y: r.y - 30, alpha: 0, scale: 2, duration: 2400, onComplete: () => r.destroy() });
          },
        });
      }
    }
    if (leben.schnee) {
      this.time.addEvent({
        delay: 90, loop: true, callback: () => {
          const cam = this.cameras.main.worldView;
          const f = this.add.rectangle(cam.x + Math.random() * cam.width, cam.y - 4, 1.5, 1.5, 0xffffff, 0.9).setDepth(99850);
          this.tweens.add({ targets: f, y: f.y + cam.height + 10, x: f.x - 30 - Math.random() * 30, duration: 3000 + Math.random() * 1500, onComplete: () => f.destroy() });
        },
      });
    }
    // Glitzern auf dem Wasser
    const wasser = [];
    this.bodenArt.forEach((r, y) => r.forEach((b, x) => { if (b === 'wasser' && this.bodenArt[y - 1]?.[x] === 'wasser') wasser.push({ x, y }); }));
    if (wasser.length) {
      this.time.addEvent({
        delay: 180, loop: true, callback: () => {
          const w = Phaser.Utils.Array.GetRandom(wasser);
          const g = this.add.image(w.x * KACHEL + Math.random() * 16, w.y * KACHEL + Math.random() * 16, 'glitzer').setDepth(-30).setScale(0);
          this.tweens.add({ targets: g, scale: 1, duration: 300, yoyo: true, onComplete: () => g.destroy() });
        },
      });
    }
  }

  zufallsFeld(passt) {
    for (let i = 0; i < 200; i++) {
      const x = Phaser.Math.Between(1, this.breite - 2), y = Phaser.Math.Between(1, this.hoehe - 2);
      if (!this.fest[y][x] && passt(this.bodenArt[y][x])) return { x, y };
    }
    return null;
  }

  vogelschwarm() {
    const cam = this.cameras.main.worldView;
    const vonLinks = Math.random() < 0.5;
    const y0 = cam.y + 10 + Math.random() * 50;
    for (let i = 0; i < 3; i++) {
      const v = this.add.image(vonLinks ? cam.x - 20 - i * 12 : cam.right + 20 + i * 12, y0 + (i % 2) * 8, 'vogel0').setDepth(99800).setFlipX(!vonLinks);
      let f = 0;
      const flatter = this.time.addEvent({ delay: 160, loop: true, callback: () => { f = 1 - f; v.setTexture(`vogel${f}`); } });
      this.tweens.add({
        targets: v, x: vonLinks ? cam.right + 60 : cam.x - 60, y: y0 - 20 + Math.random() * 40, duration: 7000,
        onComplete: () => { flatter.remove(); v.destroy(); },
      });
    }
  }

  aktualisiereLeben(zeit, delta) {
    const dt = delta / 1000;
    for (const f of this.falter) {
      f.zeit += delta;
      if (Phaser.Math.Distance.Between(f.s.x, f.s.y, f.ziel.x, f.ziel.y) < 3) {
        f.ziel = { x: f.s.x + Phaser.Math.Between(-40, 40), y: f.s.y + Phaser.Math.Between(-30, 30) };
        f.ziel.x = Phaser.Math.Clamp(f.ziel.x, 20, this.breite * KACHEL - 20);
        f.ziel.y = Phaser.Math.Clamp(f.ziel.y, 50, this.hoehe * KACHEL - 20);
      }
      const w = Math.atan2(f.ziel.y - f.s.y, f.ziel.x - f.s.x);
      f.s.x += Math.cos(w) * 18 * dt;
      f.s.y += Math.sin(w) * 18 * dt + Math.sin(zeit / 120 + f.zeit) * 0.3;
      f.s.setTexture(Math.floor(zeit / 110) % 2 ? 'falter1' : 'falter0');
    }
    for (const g of this.gluehwuermchen) {
      g.phase += dt;
      g.s.x = g.ox + Math.sin(g.phase * 1.3) * 10 + Math.cos(g.phase * 0.7) * 5;
      g.s.y = g.oy + Math.cos(g.phase * 1.1) * 6 - 6;
      g.s.setAlpha(0.6 + Math.sin(g.phase * 5) * 0.4);
      g.q.x = g.s.x; g.q.y = g.s.y;
    }
    for (const h of this.huehner) {
      if (h.fliegt) continue;
      if (h.frei && !this.zwischenszene && Phaser.Math.Distance.Between(h.s.x, h.s.y, this.held.x, this.held.y) < 14) { this.fangeHuhn(h); continue; }
      h.warte -= delta;
      if (h.ziel) {
        const dx = h.ziel.x - h.s.x, dy = h.ziel.y - h.s.y, d = Math.hypot(dx, dy);
        if (d < 1.5) { h.ziel = null; h.warte = 800 + Math.random() * 2500; }
        else {
          h.s.x += (dx / d) * 16 * dt; h.s.y += (dy / d) * 16 * dt;
          h.s.setFlipX(dx < 0).setTexture(Math.floor(zeit / 120) % 2 ? 'huhn1' : 'huhn0');
          h.s.setDepth(h.s.y);
        }
      } else if (h.warte <= 0) {
        if (Math.random() < 0.4) { h.pickt = 600; h.warte = 900; }
        else {
          const nx = h.s.x + Phaser.Math.Between(-40, 40), ny = h.s.y + Phaser.Math.Between(-30, 30);
          const tx = Math.floor(nx / KACHEL), ty = Math.floor((ny - 2) / KACHEL);
          if (this.istFrei(tx, ty)) h.ziel = { x: nx, y: ny }; else h.warte = 300;
        }
      }
      if (h.pickt > 0) { h.pickt -= delta; h.s.setTexture(Math.floor(zeit / 150) % 2 ? 'huhn2' : 'huhn0'); }
    }
    if (this.wolken) {
      for (const w of this.wolken) {
        w.s.x += w.v * dt; w.s.y += w.v * 0.3 * dt;
        if (w.s.x > this.breite * KACHEL + 200) { w.s.x = -200; w.s.y = Math.random() * this.hoehe * KACHEL; }
      }
    }
  }

  // Ein freies Feld neben einer Figur (z.B. für gefangene Hühner)
  platzBei(figur) {
    const felder = this.felderUm(figur.feld);
    return felder.length ? Phaser.Utils.Array.GetRandom(felder) : { x: figur.feld.x, y: figur.feld.y + 1 };
  }

  // Der Grosse Zwerg erreicht ein ausgebüxtes Huhn: beim ersten Mal flattert es davon, dann ist es gefangen
  fangeHuhn(h) {
    spiele('gack');
    h.fliegt = true;
    h.ziel = null;
    // im Bogen hüpfen/flattern
    const hopser = (x, y, dauer, fertig) => {
      const x0 = h.s.x, y0 = h.s.y, hoehe = dauer / 25;
      h.s.setFlipX(x < x0).setTexture('huhn1');
      this.tweens.addCounter({
        from: 0, to: 1, duration: dauer, onComplete: fertig,
        onUpdate: (tw) => {
          const t = tw.getValue();
          h.s.setPosition(x0 + (x - x0) * t, y0 + (y - y0) * t - Math.sin(t * Math.PI) * hoehe).setDepth(y0 + (y - y0) * t);
          h.s.setTexture(Math.floor(t * 8) % 2 ? 'huhn1' : 'huhn0');
        },
      });
    };
    if (!h.geflohen) {
      h.geflohen = true;
      const hx = Math.floor(h.s.x / KACHEL), hy = Math.floor((h.s.y - 4) / KACHEL);
      const weg = Math.sign(h.s.x - this.held.x) || 1, wegY = Math.sign(h.s.y - this.held.y);
      const ziel = [[3 * weg, 2 * wegY], [3 * weg, 0], [0, 3 * (wegY || 1)], [-3 * weg, 0], [2 * weg, -2], [0, -3]]
        .map(([dx, dy]) => ({ x: hx + dx, y: hy + dy })).find((p) => this.istFrei(p.x, p.y) && this.sucheWeg([p])) || { x: hx, y: hy };
      this.konfetti(h.s.x, h.s.y - 8, 8);
      hopser(ziel.x * KACHEL + 8, ziel.y * KACHEL + 12, 500, () => { h.fliegt = false; h.warte = 1500; });
      return;
    }
    h.frei = false;
    const f = h.besitzer;
    const platz = this.platzBei(f);
    this.konfetti(h.s.x, h.s.y - 8, 16);
    hopser(platz.x * KACHEL + 8, platz.y * KACHEL + 12, 1100, () => { h.fliegt = false; h.warte = 1000; });
    const n = (this.stand.fortschritt[f.id] || 0) + 1;
    this.stand.fortschritt[f.id] = n;
    this.letzterWunsch = f;
    this.sichern();
    if (n >= f.daten.anzahl) { this.erfuelle(f, true); return; }
    this.aktualisiereWunsch(f);
    this.sage(f, (f.daten.weiter || 'Super! Noch {rest}!').replace('{rest}', f.daten.anzahl - n));
  }

  // -------------------------------------------------------------------------
  // DUNKELHEIT: eine dunkle Schicht, in die Lichtkreise "gestanzt" werden
  // -------------------------------------------------------------------------
  erzeugeDunkelheit() {
    if (!this.karte.dunkel && !this.karte.kannDunkelWerden) return;
    this.dunkelSchicht = this.add.renderTexture(0, 0, this.breite * KACHEL, this.hoehe * KACHEL).setOrigin(0, 0).setDepth(99700);
    this.maske = this.make.image({ key: 'lichtmaske', add: false }).setOrigin(0.5);
  }

  zeichneDunkelheit(zeit) {
    if (!this.dunkelSchicht) return;
    const rt = this.dunkelSchicht;
    rt.clear();
    if (this.dunkelheit <= 0.01) return;
    rt.fill(0x07040c, this.dunkelheit);
    const flackern = 1 + Math.sin(zeit / 90) * 0.03 + Math.sin(zeit / 37) * 0.02;
    const stanze = (x, y, r) => {
      if (r <= 0) return;
      this.maske.setScale((r * 2) / 64);
      rt.erase(this.maske, x, y);
    };
    let r = this.heldLicht;
    if (this.traegt === 'fackel') r = Math.max(r, 95);
    if (this.fackelAn || this.traegt === 'fackel') stanze(this.held.x, this.held.y - 16, r * flackern);
    for (const q of this.lichtQuellen) {
      if (q.bild && !q.bild.active) continue;
      if (q.figur && (q.figur.versteckt || (q.nurWennErfuellt && !this.istErfuellt(q.figur.id)))) continue;
      stanze(q.x, q.y, q.r * flackern);
    }
  }

  // -------------------------------------------------------------------------
  // ATMOSPHÄRE: schwebende Partikel für Stimmung (Waldsporen, Blätter, Staub)
  // -------------------------------------------------------------------------

  // Stimmungs-Presets: was schwebt auf welcher Karte?
  // Jedes Preset erzeugt leichte Partikel, die innerhalb der Kamera schweben.
  static STIMMUNG = {
    waldsporen: {
      textur: 'partikel_glanz', anzahl: 18, blend: 'ADD',
      tiefe: 99820, // über der Dunkelheit → selbstleuchtend
      tint: [0xc0ffa0, 0xa0ff80, 0xe0ffb0, 0xfff8a0],
      groesse: [0.25, 0.6], alpha: [0.15, 0.55],
      drift: { x: 3, y: -2 }, schwebe: { rx: 14, ry: 8, tempo: 0.5 },
      puls: { min: 0.15, max: 0.55, tempo: 2.5 },
    },
    blaetter: {
      textur: ['blatt0', 'blatt1'], anzahl: 10, blend: 'NORMAL',
      tiefe: 97500, // unter der Dunkelheit → werden verdunkelt
      tint: [0x8ac04a, 0x6a9a3a, 0xc07830, 0xd8a048, 0xb09030],
      groesse: [0.6, 1.0], alpha: [0.5, 0.9],
      drift: { x: 6, y: 8 }, schwebe: { rx: 10, ry: 4, tempo: 0.7 },
      drehen: true,
    },
    lichtstaub: {
      textur: 'partikel_staub', anzahl: 14, blend: 'NORMAL',
      tiefe: 97100,
      tint: [0xffeedd, 0xffe8c0, 0xfffff0],
      groesse: [0.5, 1.0], alpha: [0.12, 0.35],
      drift: { x: 1, y: -1 }, schwebe: { rx: 20, ry: 12, tempo: 0.3 },
      puls: { min: 0.12, max: 0.35, tempo: 1.5 },
    },
    hoehlenglimm: {
      textur: 'partikel_glanz', anzahl: 10, blend: 'ADD',
      tiefe: 99820,
      tint: [0x80c0ff, 0xa0d0ff, 0xc0a0ff, 0xe0d0ff],
      groesse: [0.2, 0.45], alpha: [0.1, 0.4],
      drift: { x: 0, y: -2 }, schwebe: { rx: 8, ry: 10, tempo: 0.3 },
      puls: { min: 0.1, max: 0.4, tempo: 1.8 },
    },
    funkenglut: {
      textur: 'partikel_glanz', anzahl: 8, blend: 'ADD',
      tiefe: 99820,
      tint: [0xff9040, 0xffc060, 0xff6030, 0xffe080],
      groesse: [0.15, 0.35], alpha: [0.2, 0.5],
      drift: { x: 2, y: -5 }, schwebe: { rx: 6, ry: 4, tempo: 0.8 },
      puls: { min: 0.2, max: 0.5, tempo: 3.5 },
    },
    schneeflocken: {
      textur: 'partikel_staub', anzahl: 12, blend: 'NORMAL',
      tiefe: 99860,
      tint: [0xffffff, 0xe8f0ff, 0xf0f8ff],
      groesse: [0.5, 1.2], alpha: [0.4, 0.8],
      drift: { x: -4, y: 6 }, schwebe: { rx: 16, ry: 3, tempo: 0.6 },
    },
  };

  // Automatische Stimmung anhand der Level-Eigenschaften (oder von Hand: leben.stimmung = 'name' oder ['a', 'b'])
  stimmungFuerKarte() {
    const leben = this.karte.leben || {};
    if (leben.stimmung) return [].concat(leben.stimmung);
    const liste = [];
    if (this.karte.dunkel >= 0.5 && leben.gluehwuermchen) liste.push('waldsporen');
    else if (this.karte.dunkel >= 0.5) liste.push('hoehlenglimm');
    if (leben.falter && !this.karte.dunkel) liste.push('lichtstaub');
    if (leben.wolken && leben.falter) liste.push('blaetter');
    if (leben.dampf) liste.push('funkenglut'); // Drachenhort: warme Funken
    // Schnee: dafür sorgt schon leben.schnee (erzeugeLeben)
    return liste;
  }

  erzeugeAtmosphaere() {
    this.atmosphaere = [];
    // Anzahl passt sich der Kartengrösse an (Preset-Zahl gilt für ca. 300 Felder)
    const flaeche = Math.max(0.5, (this.breite * this.hoehe) / 300);
    for (const name of this.stimmungFuerKarte()) {
      const preset = Welt.STIMMUNG[name];
      if (!preset) continue;
      const partikel = [];
      const anzahl = Math.round(preset.anzahl * flaeche);
      for (let i = 0; i < anzahl; i++) {
        const tex = Array.isArray(preset.textur) ? Phaser.Utils.Array.GetRandom(preset.textur) : preset.textur;
        const tint = Phaser.Utils.Array.GetRandom(preset.tint);
        const [gMin, gMax] = preset.groesse;
        const skala = gMin + Math.random() * (gMax - gMin);
        const [aMin, aMax] = preset.alpha;
        const startAlpha = aMin + Math.random() * (aMax - aMin);
        const ox = Math.random() * (this.breite * KACHEL);
        const oy = Math.random() * (this.hoehe * KACHEL);
        const s = this.add.image(ox, oy, tex)
          .setDepth(preset.tiefe)
          .setScale(skala)
          .setAlpha(startAlpha)
          .setTint(tint);
        if (preset.blend === 'ADD') s.setBlendMode(Phaser.BlendModes.ADD);
        partikel.push({ s, ox, oy, phase: Math.random() * Math.PI * 20 });
      }
      this.atmosphaere.push({ name, preset, partikel });
    }
  }

  aktualisiereAtmosphaere(zeit, delta) {
    if (!this.atmosphaere || !this.atmosphaere.length) return;
    const dt = delta / 1000;
    const kartenB = this.breite * KACHEL;
    const kartenH = this.hoehe * KACHEL;
    for (const gruppe of this.atmosphaere) {
      const p = gruppe.preset;
      for (const a of gruppe.partikel) {
        a.phase += dt;
        // Grundbewegung: langsames Driften + Sinuswellen-Schweben
        const schw = p.schwebe;
        a.ox += p.drift.x * dt;
        a.oy += p.drift.y * dt;
        // Am Kartenrand sanft umbrechen (endloser Strom)
        if (a.ox > kartenB + 16) a.ox -= kartenB + 32;
        if (a.ox < -16) a.ox += kartenB + 32;
        if (a.oy > kartenH + 16) a.oy -= kartenH + 32;
        if (a.oy < -16) a.oy += kartenH + 32;
        const nx = a.ox + Math.sin(a.phase * schw.tempo) * schw.rx + Math.cos(a.phase * schw.tempo * 0.7) * schw.rx * 0.3;
        const ny = a.oy + Math.cos(a.phase * schw.tempo * 0.8) * schw.ry;
        a.s.setPosition(nx, ny);
        // Pulsierendes Leuchten
        if (p.puls) {
          const t = (Math.sin(a.phase * p.puls.tempo) + 1) / 2;
          a.s.setAlpha(p.puls.min + t * (p.puls.max - p.puls.min));
        }
        // Blätter drehen sich langsam
        if (p.drehen) {
          a.s.setAngle(Math.sin(a.phase * 1.3) * 40);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // HELD
  // -------------------------------------------------------------------------
  erzeugeHeld() {
    let x, y;
    if (this.startPos && this.startPos.karte === this.kartenName && this.istFrei(Math.floor(this.startPos.x / KACHEL), Math.floor((this.startPos.y - 3) / KACHEL))) {
      x = this.startPos.x; y = this.startPos.y;
    } else {
      let start = this.startFeld || { x: 2, y: 2 };
      if (this.zielAusgang !== undefined) {
        const a = this.ausgangsFelder.find((f) => String(f.nummer) === String(this.zielAusgang));
        if (a) start = this.freiesNachbarfeld(a.x, a.y) || start;
      }
      x = start.x * KACHEL + KACHEL / 2;
      y = (start.y + 1) * KACHEL - 4;
    }
    this.heldSchatten = this.add.image(x, y, 'bodenschatten').setScale(0.8).setDepth(-60);
    this.held = this.physics.add.sprite(x, y, 'held_unten_steh0').setOrigin(0.5, 46 / 48);
    this.held.body.setSize(12, 7).setOffset(10, 39);
    this.held.setCollideWorldBounds(true);
    this.physics.add.collider(this.held, this.sperre);

    this.getragen = this.add.image(x, y - 48, 'herz').setVisible(false).setDepth(95000);
    const traegt = this.registry.get('traegt');
    if (traegt) this.nimm(traegt, false);
  }

  freiesNachbarfeld(x, y) {
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      if (this.istFrei(x + dx, y + dy)) return { x: x + dx, y: y + dy };
    }
    return null;
  }

  istFrei(x, y) {
    return x >= 0 && y >= 0 && x < this.breite && y < this.hoehe && !this.fest[y][x];
  }

  nimm(gegenstand, mitTon = true) {
    this.traegt = gegenstand;
    this.registry.set('traegt', gegenstand);
    this.getragen.setTexture(gegenstand).setVisible(true);
    if (mitTon) {
      spiele('aufheben');
      this.getragen.setScale(0.2);
      this.tweens.add({ targets: this.getragen, scale: 1, duration: 250, ease: 'Back.easeOut' });
    }
    this.game.events.emit('traegt', gegenstand);
  }

  gibAb() {
    this.traegt = null;
    this.registry.set('traegt', null);
    this.getragen.setVisible(false);
    this.game.events.emit('traegt', null);
  }

  richteKameraEin() {
    const cam = this.cameras.main;
    cam.setZoom(3);
    const sichtB = cam.width / 3, sichtH = cam.height / 3;
    const kartenB = this.breite * KACHEL, kartenH = this.hoehe * KACHEL;
    const bx = kartenB < sichtB ? -(sichtB - kartenB) / 2 : 0;
    const by = kartenH < sichtH ? -(sichtH - kartenH) / 2 : 0;
    cam.setBounds(bx, by, Math.max(kartenB, sichtB), Math.max(kartenH, sichtH));
    cam.startFollow(this.held, true, 0.1, 0.1, 0, 20);
    cam.setBackgroundColor(this.karte.hintergrund || '#241c2a');
  }

  // -------------------------------------------------------------------------
  // EINGABE (Tastatur, Controller, Touch)
  // -------------------------------------------------------------------------
  richteEingabeEin() {
    this.tasten = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE,ENTER,E');
    this.input.keyboard.on('keydown-SPACE', () => this.beiAktion());
    this.input.keyboard.on('keydown-ENTER', () => this.beiAktion());
    this.input.keyboard.on('keydown-E', () => this.beiAktion());
    this.input.keyboard.on('keydown-ESC', () => this.oeffnePause());
    this.input.keyboard.on('keydown-P', () => this.oeffnePause());
    // Nach dem Menü kurz keine Controller-Knöpfe annehmen: Der Knopf, der das Menü geschlossen hat,
    // ist sonst beim Weiterspielen noch «neu gedrückt» und öffnet es gleich wieder.
    const ruhe = () => { this.padRuheBis = this.time.now + 350; };
    this.events.on('resume', ruhe);
    this.events.once('shutdown', () => this.events.off('resume', ruhe));
    this.input.gamepad?.on('down', (pad, knopf) => {
      if (this.time.now < (this.padRuheBis || 0)) return;
      if (knopf.index === 9 || knopf.index === 8) this.oeffnePause();
      else if (knopf.index <= 3) this.beiAktion();
    });

    this.input.on('pointerdown', (zeiger) => {
      const ui = this.registry.get('istSteuerung');
      if (ui && ui(zeiger)) return;
      if (this.zwischenszene) return;
      const p = this.cameras.main.getWorldPoint(zeiger.x, zeiger.y);
      const huhn = this.huehner.find((h) => Phaser.Math.Distance.Between(h.s.x, h.s.y - 6, p.x, p.y) < 10);
      if (huhn?.frei) { this.laufeZuHuhn(huhn); return; }
      if (huhn) { spiele('gack'); this.tweens.add({ targets: huhn.s, y: huhn.s.y - 6, duration: 120, yoyo: true }); return; }
      this.laufeZu(p.x, p.y);
    });
  }

  oeffnePause() {
    if (this.zwischenszene || !this.scene.isActive()) return;
    this.sichern();
    this.scene.pause();
    this.scene.launch('Pause', { von: 'Welt' });
    this.scene.bringToTop('Pause');
  }

  richtungEingabe() {
    let dx = 0, dy = 0;
    const t = this.tasten;
    if (t.LEFT.isDown || t.A.isDown) dx -= 1;
    if (t.RIGHT.isDown || t.D.isDown) dx += 1;
    if (t.UP.isDown || t.W.isDown) dy -= 1;
    if (t.DOWN.isDown || t.S.isDown) dy += 1;
    const pad = this.input.gamepad?.pad1;
    if (pad) {
      if (pad.left) dx -= 1;
      if (pad.right) dx += 1;
      if (pad.up) dy -= 1;
      if (pad.down) dy += 1;
      if (Math.abs(pad.leftStick.x) > 0.3) dx += pad.leftStick.x;
      if (Math.abs(pad.leftStick.y) > 0.3) dy += pad.leftStick.y;
    }
    const touch = this.registry.get('touchRichtung');
    if (touch && (touch.x || touch.y)) { dx += touch.x; dy += touch.y; }
    const laenge = Math.hypot(dx, dy);
    if (laenge > 1) { dx /= laenge; dy /= laenge; }
    return { dx, dy };
  }

  // -------------------------------------------------------------------------
  // WEG FINDEN (für Antippen)
  // -------------------------------------------------------------------------
  laufeZu(wx, wy) {
    const sichtbar = this.dinge.filter((d) => !d.versteckt && !d.fertig);
    const tx0 = Math.floor(wx / KACHEL), ty0 = Math.floor(wy / KACHEL);
    const aufFeld = sichtbar.find((d) => tx0 >= d.feld.x && tx0 < d.feld.x + d.feld.b && ty0 >= d.feld.y && ty0 < d.feld.y + d.feld.h);
    const imBild = sichtbar.filter((d) => d.bild.getBounds().contains(wx, wy))
      .sort((a, b) => (a.typ === 'figur' ? 0 : 1) - (b.typ === 'figur' ? 0 : 1) || b.bild.depth - a.bild.depth);
    const getroffen = aufFeld || imBild[0];

    let ziele;
    if (getroffen) ziele = this.felderUm(getroffen.feld);
    else if (this.istFrei(tx0, ty0)) ziele = [{ x: tx0, y: ty0 }];
    else ziele = this.felderUm({ x: tx0, y: ty0, b: 1, h: 1 });
    const pfad = this.sucheWeg(ziele);
    if (!pfad) return;
    this.pfad = pfad;
    this.pfadLetztes = this.heldFeld();
    this.haengtSeit = 0;
    this.pfadZiel = getroffen || null;
    this.zeigeTippMarke(wx, wy);
    if (pfad.length === 0 && getroffen) {
      this.pfadZiel = null;
      this.schaueZu(getroffen);
      this.interagiere(getroffen);
    }
  }

  // Zu einem Huhn laufen (ohne dabei aus Versehen den Baum dahinter anzutippen)
  laufeZuHuhn(h) {
    const f = { x: Math.floor(h.s.x / KACHEL), y: Math.floor((h.s.y - 4) / KACHEL) };
    const pfad = this.sucheWeg(this.istFrei(f.x, f.y) ? [f] : this.felderUm({ ...f, b: 1, h: 1 }));
    if (!pfad) return;
    this.pfad = pfad;
    this.pfadLetztes = this.heldFeld();
    this.haengtSeit = 0;
    this.pfadZiel = null;
    this.zeigeTippMarke(h.s.x, h.s.y - 6);
  }

  zeigeTippMarke(x, y) {
    const m = this.add.circle(x, y, 4, 0xffffff, 0.7).setDepth(99999);
    this.tweens.add({ targets: m, scale: 2.2, alpha: 0, duration: 450, onComplete: () => m.destroy() });
  }

  felderUm(feld) {
    const felder = [];
    for (let x = feld.x - 1; x <= feld.x + feld.b; x++) {
      for (let y = feld.y - 1; y <= feld.y + feld.h; y++) {
        const innen = x >= feld.x && x < feld.x + feld.b && y >= feld.y && y < feld.y + feld.h;
        if (!innen && this.istFrei(x, y)) felder.push({ x, y });
      }
    }
    return felder;
  }

  heldFeld() {
    return { x: Math.floor(this.held.x / KACHEL), y: Math.floor((this.held.y - 3) / KACHEL) };
  }

  sucheWeg(ziele) {
    if (!ziele.length) return null;
    const start = this.heldFeld();
    const zielSet = new Set(ziele.map((z) => `${z.x},${z.y}`));
    if (zielSet.has(`${start.x},${start.y}`)) return [];
    const vorher = new Map([[`${start.x},${start.y}`, null]]);
    const schlange = [start];
    while (schlange.length) {
      const f = schlange.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { x: f.x + dx, y: f.y + dy };
        const k = `${n.x},${n.y}`;
        if (vorher.has(k) || !this.istFrei(n.x, n.y)) continue;
        vorher.set(k, f);
        if (zielSet.has(k)) {
          const pfad = [];
          let p = n;
          while (p && !(p.x === start.x && p.y === start.y)) { pfad.unshift(p); p = vorher.get(`${p.x},${p.y}`); }
          return pfad;
        }
        schlange.push(n);
      }
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // JEDES BILD
  // -------------------------------------------------------------------------
  update(zeit, delta) {
    if (!this.held) return;
    const dt = Math.min(delta, 50) / 1000;
    this.stand.spielzeit = (this.stand.spielzeit || 0) + dt;

    let { dx, dy } = this.zwischenszene ? { dx: 0, dy: 0 } : this.richtungEingabe();
    if (dx || dy) {
      this.pfad = [];
      this.pfadZiel = null;
    } else if (this.pfad.length && !this.zwischenszene) {
      ({ dx, dy } = this.folgePfad(delta));
    }

    const weich = Math.min(1, dt * (dx || dy ? 14 : 18));
    this.tempo.x += (dx * TEMPO - this.tempo.x) * weich;
    this.tempo.y += (dy * TEMPO - this.tempo.y) * weich;
    if (Math.abs(this.tempo.x) < 1 && !dx) this.tempo.x = 0;
    if (Math.abs(this.tempo.y) < 1 && !dy) this.tempo.y = 0;
    this.held.setVelocity(this.tempo.x, this.tempo.y);

    this.animiereHeld(zeit, dt, dx, dy);
    this.animiereFiguren(zeit);
    this.aktualisiereLeben(zeit, delta);
    this.zeichneDunkelheit(zeit);
    this.aktualisiereAtmosphaere(zeit, delta);

    this.held.setDepth(this.held.y);
    this.heldSchatten.setPosition(this.held.x, this.held.y - 1);
    this.getragen.setPosition(this.held.x, this.held.y - 50 + (this.laufend ? Math.round(Math.abs(Math.sin(this.laufPhase * Math.PI * 2))) * -1 : 0));

    this.pruefeAusgang();
    this.pruefeAusloeser();
    this.aktualisierePfeil(zeit);
  }

  folgePfad(delta) {
    const f = this.pfad[0];
    const vorher = this.pfadLetztes || this.heldFeld();
    const zx = f.x * KACHEL + KACHEL / 2, zy = (f.y + 1) * KACHEL - 4;
    const ex = zx - this.held.x, ey = zy - this.held.y;
    if (Math.abs(ex) < 2.5 && Math.abs(ey) < 2.5) {
      this.pfadLetztes = this.pfad.shift();
      this.haengtSeit = 0;
      if (!this.pfad.length) {
        this.held.setPosition(zx, zy);
        this.tempo = { x: 0, y: 0 };
        if (this.pfadZiel) {
          const ziel = this.pfadZiel;
          this.pfadZiel = null;
          this.schaueZu(ziel);
          this.interagiere(ziel);
        }
        return { dx: 0, dy: 0 };
      }
      return this.folgePfad(delta);
    }
    const bewegt = this.letztePos ? Math.hypot(this.held.x - this.letztePos.x, this.held.y - this.letztePos.y) : 1;
    this.letztePos = { x: this.held.x, y: this.held.y };
    this.haengtSeit = bewegt < 0.2 ? (this.haengtSeit || 0) + delta : 0;
    if (this.haengtSeit > 500) {
      this.haengtSeit = 0;
      const ziel = this.pfad[this.pfad.length - 1];
      this.pfadLetztes = null;
      this.held.setPosition(this.held.x + Math.sign(ex), this.held.y + Math.sign(ey));
      this.pfad = this.sucheWeg([ziel]) || [];
      return { dx: 0, dy: 0 };
    }
    const waagrecht = f.x !== vorher.x;
    const senkrecht = f.y !== vorher.y;
    if (waagrecht && !senkrecht && Math.abs(ey) > 1.5) return { dx: 0, dy: Math.sign(ey) };
    if (senkrecht && !waagrecht && Math.abs(ex) > 1.5) return { dx: Math.sign(ex), dy: 0 };
    const d = Math.hypot(ex, ey);
    return { dx: ex / d, dy: ey / d };
  }

  animiereHeld(zeit, dt, dx, dy) {
    const v = Math.hypot(this.tempo.x, this.tempo.y);
    const warLaufend = this.laufend;
    this.laufend = v > 8;
    if (dx || dy) {
      if (Math.abs(dx) > Math.abs(dy) * 0.9) { this.blick = 'seite'; this.held.setFlipX(dx < 0); }
      else { this.blick = dy < 0 ? 'oben' : 'unten'; this.held.setFlipX(false); }
    }
    if (this.laufend && !warLaufend) this.staubwolke();

    const tragen = this.traegt ? '_tragen' : '';
    let bild;
    if (this.heldPose && zeit < this.heldPoseBis) {
      bild = `held_${this.blick}_${this.heldPose}`;
    } else if (this.laufend) {
      const alt = Math.floor(this.laufPhase * 6);
      this.laufPhase = (this.laufPhase + (v * dt) / SCHRITTWEITE) % 1;
      const neu = Math.floor(this.laufPhase * 6);
      if (neu !== alt && (neu === 0 || neu === 3)) spiele('schritt');
      bild = `held_${this.blick}${tragen}_lauf${neu}`;
    } else {
      this.laufPhase = 0;
      this.naechstesBlinzeln -= dt * 1000;
      if (this.naechstesBlinzeln < 0) { this.blinzelnBis = zeit + 140; this.naechstesBlinzeln = 2500 + Math.random() * 3000; }
      if (zeit < this.heldRedenBis && this.blick !== 'oben') bild = `held_${this.blick}${tragen}_${Math.floor(zeit / 140) % 2 ? 'reden' : 'steh0'}`;
      else if (zeit < this.blinzelnBis && this.blick !== 'oben') bild = `held_${this.blick}${tragen}_blinzeln`;
      else bild = `held_${this.blick}${tragen}_steh${Math.floor(zeit / 700) % 2}`;
    }
    this.held.setTexture(bild);
  }

  staubwolke() {
    for (let i = 0; i < 2; i++) {
      const s = this.add.image(this.held.x + (i ? 5 : -5), this.held.y - 1, 'staub').setDepth(this.held.y - 2).setAlpha(0.8);
      this.tweens.add({ targets: s, x: s.x + (i ? 6 : -6), y: s.y - 3, alpha: 0, scale: 1.6, duration: 380, onComplete: () => s.destroy() });
    }
  }

  animiereFiguren(zeit) {
    for (const f of this.figuren) {
      if (f.versteckt || !f.vorsilbe) continue;
      let bild;
      const nah = Phaser.Math.Distance.Between(f.bild.x, f.bild.y, this.held.x, this.held.y) < 70;
      const seite = !nah || Math.abs(this.held.x - f.bild.x) < 10 ? '' : this.held.x < f.bild.x ? 'links' : 'rechts';
      if (zeit >= f.naechstesBlinzeln) { f.blinzelnBis = zeit + 140; f.naechstesBlinzeln = zeit + 2000 + Math.random() * 4000; }
      if (zeit < f.jubelnBis) bild = Math.floor(zeit / 200) % 2 ? 'jubeln' : 'steh0';
      else if (zeit < f.redenBis) bild = Math.floor(zeit / 130) % 2 ? (seite ? `${seite}_reden` : 'reden') : (seite || 'steh0');
      else if (zeit < f.blinzelnBis) bild = 'blinzeln';
      else if (seite) bild = seite;
      else bild = Math.floor((zeit + f.atemVersatz) / 800) % 2 ? 'steh1' : 'steh0';
      f.bild.setTexture(f.vorsilbe + bild);
    }
  }

  schaueZu(ding) {
    const dx = ding.bild.x - this.held.x, dy = (ding.bild.y - 8) - (this.held.y - 8);
    if (Math.abs(dx) > Math.abs(dy)) { this.blick = 'seite'; this.held.setFlipX(dx < 0); }
    else { this.blick = dy < 0 ? 'oben' : 'unten'; this.held.setFlipX(false); }
  }

  pruefeAusgang() {
    if (this.wechselt || this.zwischenszene) return;
    const f = this.heldFeld();
    const a = this.ausgangsFelder.find((e) => e.x === f.x && e.y === f.y);
    if (!a || !a.karte) return;
    this.wechselt = true;
    spiele('tuer');
    this.held.setVelocity(0, 0);
    this.stand.ort = null;
    this.stand.traegt = this.traegt || null;
    // Wunsch von hier mitnehmen (z. B. Torvi draussen will die Jacke von drinnen): der Pfeil zeigt dort zur Quelle
    const lw = this.letzterWunsch;
    if (lw?.id && !this.istErfuellt(lw.id) && this.wunschVon(lw).wunsch) this.registry.set('fremderWunsch', { id: lw.id, wunsch: this.wunschVon(lw).wunsch });
    sichere(this.registry);
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ karte: a.karte, ziel: a.ziel }));
  }

  pruefeAusloeser() {
    if (this.zwischenszene || !this.ausloeserFelder.length || !this.karte.ereignisse?.ausloeser) return;
    if (this.ereignisErledigt('ausloeser')) return;
    const f = this.heldFeld();
    if (this.ausloeserFelder.some((a) => a.x === f.x && a.y === f.y)) this.starteEreignis('ausloeser');
  }

  // -------------------------------------------------------------------------
  // HELFEN
  // -------------------------------------------------------------------------
  beiAktion() {
    if (this.zwischenszene || this.aktionGesperrt || !this.held || !this.scene.isActive()) return;
    const ding = this.naechstesDing();
    if (ding) {
      this.schaueZu(ding);
      this.interagiere(ding);
    }
  }

  naechstesDing() {
    const fx = this.held.x, fy = this.held.y - 5;
    let bestes = null, beste = 22;
    for (const d of this.dinge) {
      if (d.versteckt || d.fertig) continue;
      const r = new Phaser.Geom.Rectangle(d.feld.x * KACHEL, d.feld.y * KACHEL, d.feld.b * KACHEL, d.feld.h * KACHEL);
      const nx = Phaser.Math.Clamp(fx, r.left, r.right), ny = Phaser.Math.Clamp(fy, r.top, r.bottom);
      const dist = Math.hypot(fx - nx, fy - ny);
      if (dist < beste) { beste = dist; bestes = d; }
    }
    return bestes;
  }

  interagiere(ding) {
    if (this.zwischenszene || this.aktionGesperrt || ding.versteckt || ding.fertig) return;
    this.aktionGesperrt = true;
    this.time.delayedCall(350, () => { this.aktionGesperrt = false; });
    if (ding.typ === 'quelle') this.hole(ding);
    else if (ding.typ === 'schild') this.liesSchild(ding);
    else if (ding.typ === 'versteck') this.schaueHinter(ding);
    else if (ding.typ === 'missionen') this.oeffneMissionen();
    else if (ding.typ === 'kleider') this.wechsleKleid(ding);
    else this.redeMit(ding);
  }

  // wer: 'held', ein Buchstabe einer Figur, ein Figur-Objekt oder { name, aussehen, hoehe }
  sage(wer, text) {
    let name, hoehe, bild, figur = null;
    if (wer === 'held') {
      ({ name, hoehe } = HELD); bild = 'held_unten_steh0';
      this.heldRedenBis = this.time.now + text.length * 32;
    } else {
      figur = typeof wer === 'string' ? this.figuren.find((f) => f.buchstabe === wer || f.name === wer) : wer;
      if (!figur) return Promise.resolve();
      name = figur.daten.name; hoehe = figur.hoehe; bild = figur.vorsilbe ? `${figur.vorsilbe}steh0` : 'held_unten_steh0';
      figur.redenBis = this.time.now + text.length * 32;
    }
    this.game.events.emit('sprechen', { name, text, bild });
    ducken(true);
    return sprich(text, { hoehe }).then(() => ducken(false));
  }

  hole(quelle) {
    if (this.traegt === quelle.gibt) return;
    let startX = quelle.bild.x, startY = quelle.bild.y - quelle.bild.height + 8;
    if (quelle.fruechte) {
      const haengend = quelle.fruechte.filter((f) => f.visible);
      if (!haengend.length) return;
      const frucht = Phaser.Utils.Array.GetRandom(haengend);
      startX = frucht.x; startY = frucht.y;
      frucht.setVisible(false);
      if (haengend.length === 1) {
        this.time.delayedCall(2500, () => quelle.fruechte.forEach((f) => {
          if (!f.active) return;
          f.setVisible(true).setScale(0);
          this.tweens.add({ targets: f, scale: 1, duration: 300, ease: 'Back.easeOut' });
        }));
      }
    }
    const hochOben = HOCH_OBEN.has(quelle.objekt);
    if (hochOben) {
      this.heldPose = 'strecken';
      this.heldPoseBis = this.time.now + 450;
      spiele('strecken');
    }
    const flug = this.add.image(startX, startY, quelle.gibt).setDepth(96000).setScale(0.6);
    this.tweens.add({
      targets: flug, x: this.held.x, y: this.held.y - 50, scale: 1, duration: hochOben ? 450 : 350,
      delay: hochOben ? 200 : 0, ease: 'Quad.easeOut',
      onComplete: () => { flug.destroy(); this.nimm(quelle.gibt); },
    });
    this.sage('held', GEGENSTAENDE[quelle.gibt]?.holen || '');
  }

  async redeMit(figur) {
    const d = this.wunschVon(figur);
    const sprecher = d.sprecher === 'held' ? 'held' : figur;
    if (!d.wunsch && d.saetze) {
      // bei jedem Reden der nächste Satz
      const n = figur.satzNr || 0;
      figur.satzNr = n + 1;
      return this.sage(sprecher, d.saetze[n % d.saetze.length]);
    }
    if (!d.wunsch) return this.sage(sprecher, d.sagt);
    if (this.istErfuellt(figur.id)) return this.sage(sprecher, d.danach || d.danke);
    if (d.gespraech) {
      await this.starteEreignis(`gespraech_${figur.buchstabe}`, d.gespraech);
      if (REDE_WUENSCHE.has(d.wunsch) && this.lebt) return this.erfuelle(figur, true, true);
      return;
    }
    if (REDE_WUENSCHE.has(d.wunsch)) return this.erfuelle(figur, true);
    if (d.wunsch === 'suchen') return this.starteVersteckis(figur);
    if (this.traegt && d.falsch && this.traegt !== d.wunsch) {
      // Falsche Farbe gebracht: jetzt hilft der Pfeil
      figur.falschGebracht = true;
      this.letzterWunsch = figur;
      return this.sage(figur, d.falsch);
    }
    if (this.traegt === d.wunsch) {
      if (d.anzahl > 1 || figur.baustelle) return this.liefereTeil(figur);
      return this.erfuelle(figur);
    }
    const text = (!figur.gesprochen && d.neckt ? `${d.neckt} ` : '') + d.sagt;
    figur.gesprochen = true;
    this.letzterWunsch = figur;
    if (figur.blase) this.tweens.add({ targets: figur.blase, scale: 1.3, duration: 150, yoyo: true });
    return this.sage(sprecher, text);
  }

  // Ein Teil einer Bauaufgabe abliefern (z.B. 1 von 3 Steinen)
  async liefereTeil(figur) {
    const d = figur.daten;
    this.gibAb();
    const n = (this.stand.fortschritt[figur.id] || 0) + 1;
    this.stand.fortschritt[figur.id] = n;
    if (figur.baustelle) {
      this.heldPose = 'strecken';
      this.heldPoseBis = this.time.now + 400;
      spiele('kling');
      this.cameras.main.shake(120, 0.002);
      this.verwandle(this.bauFelder(d, n - 1), d.baustelle.zu);
      for (const [x, y] of this.bauFelder(d, n - 1)) this.konfetti(x * KACHEL + 8, y * KACHEL + 8, 12);
    }
    this.sichern();
    if (n >= d.anzahl) return this.erfuelle(figur);
    this.letzterWunsch = figur;
    this.aktualisiereWunsch(figur);
    const rest = d.anzahl - n;
    return this.sage(figur.baustelle ? 'held' : figur, (d.weiter || 'Super! Noch {rest}!').replace('{rest}', rest));
  }

  // Missionsbrett der Garde
  oeffneMissionen() {
    if (this.zwischenszene) return;
    this.sichern();
    this.pfad = [];
    this.scene.pause();
    this.scene.launch('Missionen');
    this.scene.bringToTop('Missionen');
  }

  // Kleiderkiste: die nächste gewonnene Kleidung anziehen
  wechsleKleid(kiste) {
    const kleider = this.stand.kleider || ['standard'];
    this.tweens.add({ targets: kiste.bild, scaleY: 1.15, duration: 120, yoyo: true });
    if (kleider.length < 2) return this.sage('held', 'Meine Kleiderkiste. Mit Missionen verdiene ich neue Kleider!');
    const i = (kleider.indexOf(this.stand.kleid || 'standard') + 1) % kleider.length;
    this.stand.kleid = kleider[i];
    heldTexturen(this, this.stand.kleid);
    this.konfetti(this.held.x, this.held.y - 30, 30);
    spiele('herz');
    this.heldPose = 'jubeln';
    this.heldPoseBis = this.time.now + 900;
    this.sichern();
    return this.sage('held', `Jetzt trage ich ${KLEIDER[this.stand.kleid].name}!`);
  }

  // Zurück von einer Mission: die neue Belohnung zeigen
  async zeigeBelohnung() {
    const m = MISSIONEN.find((x) => x.id === this.stand.neu);
    this.stand.neu = null;
    this.sichern();
    if (!m) return;
    const b = belohnungVon(m);
    this.zwischenszene = true;
    if (m.belohnung.haus !== undefined && this.zuhauseBild) {
      this.cameras.main.pan(this.zuhauseBild.x, this.zuhauseBild.y - 20, 900, 'Sine.easeInOut');
      await new Promise((r) => setTimeout(r, 1000));
      this.konfetti(this.zuhauseBild.x, this.zuhauseBild.y - 30, 60);
    } else {
      this.konfetti(this.held.x, this.held.y - 30, 60);
    }
    spiele('splash');
    await this.zeigeSplash({ titel: 'Mission geschafft!', text: b.text, bild: b.bild, farbe: 0xe0b23c });
    if (this.lebt && b.sagt) await this.sage('d', b.sagt);
    if (this.lebt && m.belohnung.kleid) await this.sage('held', 'Die Kleider sind jetzt in der roten Kiste. Da kann ich mich immer umziehen.');
    this.cameras.main.startFollow(this.held, true, 0.1, 0.1, 0, 20);
    this.zwischenszene = false;
  }

  // Wegweiser: jedes Mal ein anderes (lustiges) Ziel
  liesSchild(schild) {
    const n = this.stand.schildNr || 0;
    this.stand.schildNr = n + 1;
    const [steht, sagt] = WEGWEISER[n % WEGWEISER.length];
    this.tweens.add({ targets: schild.bild, angle: 4, duration: 90, yoyo: true, repeat: 1 });
    return this.sage('held', `Da steht: «${steht}». ${sagt}`);
  }

  // Versteckis: die Figur versteckt sich hinter einem von mehreren Dingen
  async starteVersteckis(figur) {
    const d = figur.daten;
    this.zwischenszene = true;
    this.pfad = [];
    this.held.setVelocity(0, 0);
    await this.sage(figur, (!figur.gesprochen && d.neckt ? `${d.neckt} ` : '') + d.sagt);
    figur.gesprochen = true;
    if (!this.lebt) return;
    this.konfetti(figur.bild.x, figur.bild.y - 16, 20);
    spiele('aufheben');
    this.verstecke(figur, true);
    this.blick = 'oben';
    await this.sage('held', d.zaehlen || 'Eins … zwei … drei! Ich komme!');
    if (!this.lebt) return;
    const orte = d.verstecke.map(([x, y], nr) => {
      const bild = (this.objekte[`${x},${y}`] || []).filter((b) => b.texture?.key?.startsWith('obj_')).at(-1);
      return { typ: 'versteck', nr, bild, feld: { x, y, b: 1, h: 1 }, geprueft: false };
    }).filter((o) => o.bild);
    let richtig = Phaser.Math.Between(0, orte.length - 1);
    if (richtig === this.letztesVersteck) richtig = (richtig + 1) % orte.length;
    this.letztesVersteck = richtig;
    this.suche = { figur, orte, richtig: orte[richtig], leer: 0 };
    this.dinge.push(...orte);
    // Das richtige Versteck raschelt ab und zu – und kichert
    this.suche.rascheln = this.time.addEvent({
      delay: 2200, loop: true, callback: () => {
        const b = this.suche?.richtig.bild;
        if (!b) return;
        this.tweens.add({ targets: b, angle: { from: -5, to: 5 }, duration: 80, yoyo: true, repeat: 2, onComplete: () => b.setAngle(0) });
        const t = this.add.text(b.x + 6, b.y - b.height, 'hihi', { fontFamily: '"Pixelify Sans", sans-serif', fontSize: '24px', color: '#ffffff', stroke: '#1b1420', strokeThickness: 5 }).setScale(0.25).setDepth(99950);
        this.tweens.add({ targets: t, y: t.y - 10, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
      },
    });
    this.letzterWunsch = figur;
    this.zwischenszene = false;
  }

  async schaueHinter(ort) {
    const s = this.suche;
    if (!s || ort.geprueft) return;
    ort.geprueft = true;
    const d = s.figur.daten;
    this.tweens.add({ targets: ort.bild, angle: { from: -6, to: 6 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => ort.bild.setAngle(0) });
    if (ort !== s.richtig) {
      const text = (d.leer || ['Hier ist sie nicht.'])[s.leer++ % (d.leer?.length || 1)];
      // Kleine Überraschung hinter dem Versteck
      if (text.includes('Schmetterling')) {
        const f = this.add.image(ort.bild.x, ort.bild.y - 10, 'falter0').setDepth(97000).setTint(0xffc0e0);
        this.tweens.add({ targets: f, y: f.y - 50, x: f.x + 30, alpha: 0, duration: 1600, onComplete: () => f.destroy() });
      } else if (text.includes('Huhn')) {
        spiele('gack');
        const h = this.add.image(ort.bild.x, ort.bild.y, 'huhn1').setOrigin(0.5, 1).setDepth(ort.bild.y + 1);
        this.tweens.add({ targets: h, x: h.x + 40, y: h.y - 6, alpha: 0, duration: 1200, onComplete: () => h.destroy() });
      }
      return this.sage('held', text);
    }
    // Gefunden!
    this.zwischenszene = true;
    s.rascheln.remove();
    this.dinge = this.dinge.filter((x) => x.typ !== 'versteck');
    this.suche = null;
    const f = s.figur;
    const heim = { x: f.bild.x, y: f.bild.y };
    f.bild.setPosition(ort.bild.x + (this.held.x < ort.bild.x ? -10 : 10), ort.bild.y).setVisible(true).setDepth(ort.bild.y + 1);
    this.erscheine(f);
    spiele('herz');
    await this.sage(f, d.gefunden || 'Gefunden!');
    if (!this.lebt) return;
    await new Promise((r) => this.tweens.add({ targets: f.bild, x: heim.x, y: heim.y, duration: 900, onUpdate: () => f.bild.setDepth(f.bild.y), onComplete: r }));
    this.verstecke(f, false);
    this.zwischenszene = false;
    await this.erfuelle(f, true);
  }

  async erfuelle(figur, durchReden = false, ohneDanke = false) {
    const d = this.wunschVon(figur);
    if (!durchReden && !(d.anzahl > 1)) this.gibAb();
    const alle = figur.daten.wuensche;
    const nochMehr = alle && (this.stand.fortschritt[figur.id] || 0) < alle.length - 1;
    if (alle) this.stand.fortschritt[figur.id] = (this.stand.fortschritt[figur.id] || 0) + 1;
    if (!nochMehr) this.stand.erfuellt.push(figur.id);
    this.stand.herzen += 1;
    if (this.letzterWunsch === figur) this.letzterWunsch = null;
    figur.falschGebracht = false;
    this.sichern();

    figur.blase?.destroy();
    figur.blase = null;
    figur.jubelnBis = this.time.now + 1600;
    this.heldPose = 'jubeln';
    this.heldPoseBis = this.time.now + 900;
    if (figur.baustelle) {
      figur.fertig = true;
      this.tweens.add({ targets: [figur.bild, figur.icon], alpha: 0, y: '-=8', duration: 500, onComplete: () => { figur.bild.setVisible(false); figur.icon.setVisible(false); } });
      this.setzeFest(figur.feld.x, figur.feld.y, false);
    } else {
      const y0 = figur.bild.y;
      this.tweens.add({ targets: figur.bild, y: y0 - 6, duration: 170, yoyo: true, repeat: 3, ease: 'Quad.easeOut' });
    }
    this.konfetti(figur.bild.x, figur.bild.y - 24);
    spiele('herz');
    const herz = this.add.image(figur.bild.x, figur.bild.y - 30, 'herz').setDepth(99950).setScale(0.3);
    this.tweens.add({
      targets: herz, y: herz.y - 20, scale: 1.2, duration: 500, ease: 'Back.easeOut',
      onComplete: () => {
        const cam = this.cameras.main;
        const bx = (herz.x - cam.worldView.x) * cam.zoom, by = (herz.y - cam.worldView.y) * cam.zoom;
        herz.destroy();
        const ort = this.ortHerzen();
        this.registry.set('ortHerzen', ort);
        this.game.events.emit('herzFliegt', { x: bx, y: by, herzen: this.stand.herzen, ort });
      },
    });

    if (!ohneDanke) await this.sage(figur.baustelle ? 'held' : figur, d.danke);
    if (!this.lebt) return;
    if (nochMehr) {
      this.aktualisiereWunsch(figur);
      this.letzterWunsch = figur;
      const naechster = this.wunschVon(figur);
      if (naechster.sagt) await this.sage(figur, naechster.sagt);
      return;
    }
    if (d.geschenk) {
      await this.sage(figur, d.geschenkText || `Hier, nimm das mit!`);
      this.nimm(d.geschenk);
      this.sichern();
    }
    await this.pruefeMeilensteine();
    await this.pruefeFertig();
  }

  konfetti(x, y, anzahl = 30) {
    const farben = [0xf2c94c, 0xe05a8a, 0x7aa6e0, 0x6cc46a, 0xffffff, 0xf08a4b];
    for (let i = 0; i < anzahl; i++) {
      const s = this.add.rectangle(x, y, 2, 2, Phaser.Utils.Array.GetRandom(farben)).setDepth(99950);
      const winkel = Math.random() * Math.PI * 2, weite = 14 + Math.random() * 30;
      this.tweens.add({
        targets: s, x: x + Math.cos(winkel) * weite, y: y + Math.sin(winkel) * weite + 16,
        alpha: 0, angle: 360, duration: 800 + Math.random() * 500, ease: 'Quad.easeOut',
        onComplete: () => s.destroy(),
      });
    }
  }

  // -------------------------------------------------------------------------
  // SPLASH, ENTSCHEIDUNG, MEILENSTEINE
  // -------------------------------------------------------------------------
  zeigeUeberlagerung(szene, daten, ereignis) {
    return new Promise((fertig) => {
      this.game.events.once(ereignis, fertig);
      this.scene.pause();
      this.scene.launch(szene, daten);
      this.scene.bringToTop(szene);
    });
  }

  zeigeSplash(daten) { return this.zeigeUeberlagerung('Splash', daten, 'splashFertig'); }

  async pruefeMeilensteine() {
    for (const m of this.kapitel.meilensteine || []) {
      if (this.stand.meilensteine.includes(m.id)) continue;
      const w = m.wenn;
      let erreicht = false;
      if (w.herzen) erreicht = this.stand.herzen >= w.herzen;
      else if (w.wunsch) erreicht = this.alleWuensche().filter((x) => x.wunsch === w.wunsch).every((x) => this.istErfuellt(x.id));
      else if (w.figuren) erreicht = w.figuren.every((id) => this.istErfuellt(id));
      if (!erreicht) continue;
      this.stand.meilensteine.push(m.id);
      this.sichern();
      await this.zeigeSplash(m);
    }
  }

  // -------------------------------------------------------------------------
  // EREIGNISSE (kleine Drehbücher aus den Level-Daten)
  // -------------------------------------------------------------------------
  ereignisSchluessel(name) { return name.startsWith('kapitel') ? name : `${this.kartenName}:${name}`; }
  ereignisErledigt(name) { return this.stand.ereignisse.includes(this.ereignisSchluessel(name)); }

  async starteEreignis(name, schritte = this.karte.ereignisse?.[name]) {
    if (!schritte || this.ereignisErledigt(name) || this.zwischenszene) return;
    this.zwischenszene = true;
    this.pfad = [];
    this.tempo = { x: 0, y: 0 };
    this.held.setVelocity(0, 0);
    this.pfeil.setVisible(false);
    const weiter = await this.fuehreAus(schritte);
    if (!this.lebt) return;
    this.stand.ereignisse.push(this.ereignisSchluessel(name));
    this.sichern();
    if (weiter !== 'verlassen') this.zwischenszene = false;
  }

  // Führt Schritte aus. still = nur dauerhafte Änderungen (beim Neuladen), ohne Reden/Warten.
  async fuehreAus(schritte, { still = false } = {}) {
    for (const s of schritte) {
      if (!this.lebt && !still) return 'verlassen';
      if (s.zeige) for (const b of [].concat(s.zeige)) { const f = this.figuren.find((x) => x.buchstabe === b); if (f) { this.verstecke(f, false); if (!still) this.erscheine(f); } }
      if (s.verstecke) for (const b of [].concat(s.verstecke)) { const f = this.figuren.find((x) => x.buchstabe === b); if (f) this.verstecke(f, true); }
      if (s.licht !== undefined) { if (still) this.dunkelheit = s.licht; else this.tweens.add({ targets: this, dunkelheit: s.licht, duration: 1200 }); }
      if (s.heldLicht !== undefined) { if (still) this.heldLicht = s.heldLicht; else this.tweens.add({ targets: this, heldLicht: s.heldLicht, duration: 600 }); }
      if (s.fackel === false) { this.fackelAn = false; if (this.traegt === 'fackel') this.gibAb(); if (!still) spiele('wind'); }
      if (s.zustand) { const f = this.figuren.find((x) => x.buchstabe === s.zustand[0]); if (f) f.vorsilbe = figurTexturen(this, f.daten.aussehen, s.zustand[1]); }
      if (s.gib && !still) this.nimm(s.gib);
      if (s.verwandle) {
        // alle Kacheln mit einem Zeichen umwandeln, z.B. überflutete Wiese -> Gras
        const felder = [];
        this.zeilen.forEach((z, y) => [...z].forEach((c, x) => { if (c === s.verwandle.von) felder.push([x, y]); }));
        if (felder.length) this.verwandle(felder, s.verwandle.zu);
      }
      if (still) continue;
      if (s.sage) await this.sage(s.sage[0], s.sage[1]);
      if (s.warte) await new Promise((r) => setTimeout(r, s.warte));
      if (s.ton) spiele(s.ton);
      if (s.wackeln) this.cameras.main.shake(s.wackeln, 0.006);
      if (s.musik) spieleMusik(s.musik);
      if (s.augen) await this.zeigeAugen(s.augen);
      if (s.jubel) for (const b of [].concat(s.jubel)) { const f = this.figuren.find((x) => x.buchstabe === b); if (f) { f.jubelnBis = this.time.now + 2000; this.konfetti(f.bild.x, f.bild.y - 30, 40); } }
      if (s.splash) await this.zeigeSplash(s.splash);
      if (s.entscheidung) await this.zeigeUeberlagerung('Entscheidung', s.entscheidung, 'entscheidungFertig');
      if (s.figurKommt) await this.figurKommt(s.figurKommt);
      if (s.missionFertig) {
        schliesseMissionAb(this.registry, s.missionFertig);
        this.verlasse(() => this.scene.start('Welt', { karte: KAPITEL[6].start }));
        return 'verlassen';
      }
      if (s.kapitelEnde) { this.verlasse(() => this.scene.start('KapitelEnde', { kapitel: this.stand.kapitel })); return 'verlassen'; }
      if (s.kapitelWechsel) {
        this.stand.kapitel = s.kapitelWechsel; this.stand.ort = null; this.stand.traegt = null; this.registry.set('traegt', null);
        sichere(this.registry);
        this.verlasse(() => this.scene.start(s.szene || 'Welt', s.daten || { karte: KAPITEL[s.kapitelWechsel].start }));
        return 'verlassen';
      }
      if (s.szene) { this.verlasse(() => this.scene.start(s.szene, s.daten)); return 'verlassen'; }
    }
    return 'ok';
  }

  verlasse(danach) {
    this.cameras.main.fadeOut(900);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('Oberflaeche');
      danach();
    });
  }

  erscheine(f) {
    const y = f.bild.y;
    f.bild.setAlpha(0).setY(y - 30);
    this.tweens.add({ targets: f.bild, alpha: 1, y, duration: 700, ease: 'Bounce.easeOut' });
    this.konfetti(f.bild.x, y - 20, 20);
  }

  // Zwei leuchtende Augen im Dunkeln (für den Drachen)
  async zeigeAugen({ figur, dauer = 2500 }) {
    const f = this.figuren.find((x) => x.buchstabe === figur);
    const x = f ? f.bild.x : this.held.x, y = f ? f.bild.y - f.bild.height * 0.7 : this.held.y - 60;
    // Sprechfeld weg und Kamera zu den Augen (sie lagen sonst ausserhalb des Bildes oder unter dem Text)
    this.game.events.emit('sprechfeldWeg');
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.pan(x, y + 45, 800, 'Sine.easeInOut');
    const augen = this.add.image(x, y, 'drachenaugen').setDepth(99990).setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: augen, alpha: 1, scale: 1, duration: 900 });
    this.time.addEvent({ delay: 1400, repeat: 2, callback: () => { augen.setScale(1, 0.1); this.time.delayedCall(120, () => augen.setScale(1)); } });
    spiele('grollen');
    this.cameras.main.shake(700, 0.004);
    await new Promise((r) => setTimeout(r, dauer));
    this.tweens.add({ targets: augen, alpha: 0, duration: 800, delay: 1500, onComplete: () => augen.destroy() });
    // danach zurück zum Helden
    this.time.delayedCall(2400, () => {
      if (!this.held) return;
      cam.pan(this.held.x, this.held.y - 20, 700, 'Sine.easeInOut', false, (c, fortschritt) => {
        if (fortschritt === 1) cam.startFollow(this.held, true, 0.1, 0.1, 0, 20);
      });
    });
  }

  // Eine Figur läuft ins Bild (für Zwischenszenen)
  figurKommt({ aussehen, name, hoehe = 1, von, nach, dauer = 1600, buchstabe }) {
    if (!von || !nach) {
      // neben dem Grossen Zwerg auftauchen
      const f = this.heldFeld();
      const platz = [[-2, 0], [2, 0], [0, 2], [-1, 1], [1, 1], [0, -2], [-2, 1], [2, 1]].map(([dx, dy]) => ({ x: f.x + dx, y: f.y + dy }))
        .find((p) => this.istFrei(p.x, p.y)) || f;
      nach = [platz.x, platz.y];
      von = [platz.x, platz.y - 3];
      dauer = 700;
    }
    return new Promise((fertig) => {
      const vorsilbe = figurTexturen(this, aussehen);
      const masse = figurMasse(aussehen);
      const [vx, vy] = von, [nx, ny] = nach;
      const bild = this.add.image(vx * KACHEL + 8, (vy + 1) * KACHEL - 1, `${vorsilbe}steh0`).setOrigin(0.5, masse.fussY).setDepth((vy + 1) * KACHEL);
      const f = { buchstabe: buchstabe || name, name, bild, vorsilbe, daten: { name, aussehen }, hoehe, naechstesBlinzeln: 0, blinzelnBis: 0, redenBis: 0, jubelnBis: 0, atemVersatz: 0, feld: { x: nx, y: ny, b: 1, h: 1 } };
      this.figuren.push(f);
      this.tweens.add({
        targets: bild, x: nx * KACHEL + 8, y: (ny + 1) * KACHEL - 1, duration: dauer,
        onUpdate: () => bild.setDepth(bild.y),
        onComplete: () => { this.setzeFest(nx, ny, true); fertig(); },
      });
      this.tweens.add({ targets: bild, scaleY: 0.94, duration: 140, yoyo: true, repeat: Math.floor(dauer / 280) });
    });
  }

  // -------------------------------------------------------------------------
  // WÜNSCHE & KAPITEL
  // -------------------------------------------------------------------------
  istErfuellt(id) { return this.stand.erfuellt.includes(id); }

  // Herzen an diesem Ort: jede Figur/Baustelle mit Wunsch = 1 Herz, mit mehreren Wünschen = so viele Herzen
  ortHerzen() {
    let max = 0, voll = 0;
    const gesehen = new Set();
    for (const d of this.figuren.concat(this.dinge.filter((x) => x.baustelle))) {
      if (!d.id || gesehen.has(d.id) || !(d.daten?.wunsch || d.daten?.wuensche)) continue;
      gesehen.add(d.id);
      const n = d.daten.wuensche ? d.daten.wuensche.length : 1;
      max += n;
      voll += this.istErfuellt(d.id) ? n : (d.daten.wuensche ? Math.min(n, this.stand.fortschritt[d.id] || 0) : 0);
    }
    return { max, voll };
  }

  meldeOrtHerzen() {
    const ort = this.ortHerzen();
    this.registry.set('ortHerzen', ort);
    this.game.events.emit('ortHerzen', ort);
  }

  // Alle Wünsche des Kapitels. mitZusatz: auch freiwillige Orte (kapitel.zusatz) und freiwillige Aufgaben
  alleWuensche({ mitZusatz = false } = {}) {
    const liste = [];
    const karten = mitZusatz ? this.kapitel.karten.concat(this.kapitel.zusatz || []) : this.kapitel.karten;
    for (const name of karten) {
      const k = KARTEN[name];
      if (!k) continue;
      const zeilen = k.karte.join('');
      for (const [b, f] of Object.entries(k.figuren || {})) {
        if (f.zusatz && !mitZusatz) continue; // freiwillig: zählt nicht fürs Kapitel-Ende
        if ((f.wunsch || f.wuensche) && zeilen.includes(b)) liste.push({ id: `${name}:${b}`, karte: name, wunsch: f.wunsch || f.wuensche.at(-1).wunsch });
      }
    }
    return liste;
  }

  karteFertig() {
    return this.figuren.concat(this.dinge.filter((d) => d.baustelle)).filter((d) => (d.daten?.wunsch || d.daten?.wuensche) && d.id).every((d) => this.istErfuellt(d.id));
  }

  kapitelFertig() {
    return this.alleWuensche().every((w) => this.istErfuellt(w.id));
  }

  async pruefeFertig() {
    if (!this.lebt || this.zwischenszene) return;
    if (this.karte.ereignisse?.wennFertig && this.karteFertig() && !this.ereignisErledigt('wennFertig')) {
      await this.starteEreignis('wennFertig');
    }
    if (!this.lebt) return;
    const schluessel = `kapitel${this.stand.kapitel}:fertig`;
    if (this.kapitel.wennFertig && this.kapitelFertig() && !this.stand.ereignisse.includes(schluessel) && (!this.kapitel.fertigAuf || this.kapitel.fertigAuf === this.kartenName)) {
      await this.starteEreignis(schluessel, this.kapitel.wennFertig);
    }
  }

  // Wohin soll der Hilfe-Pfeil zeigen?
  pfeilZiel() {
    if (this.zwischenszene) return null;
    const offen = this.figuren.filter((d) => this.wunschVon(d).wunsch && d.id && !d.versteckt && !this.istErfuellt(d.id))
      .concat(this.dinge.filter((d) => d.baustelle && !d.fertig && !d.versteckt));
    const naechste = (liste) => liste.sort((a, b) =>
      Phaser.Math.Distance.Between(this.held.x, this.held.y, a.bild.x, a.bild.y) -
      Phaser.Math.Distance.Between(this.held.x, this.held.y, b.bild.x, b.bild.y))[0];
    const ziel = (d) => ({ x: d.bild.x, y: d.bild.y, hoch: d.typ === 'figur' && !d.baustelle ? d.bild.height * (d.masse?.fussY || 1) + 4 : Math.min(d.bild.height, 40), ding: d });

    if (this.traegt && (this.traegt !== 'fackel' || offen.some((d) => this.wunschVon(d).wunsch === 'fackel'))) {
      if (this.letzterWunsch && this.wunschVon(this.letzterWunsch).wunsch === this.traegt && !this.istErfuellt(this.letzterWunsch.id)) return ziel(this.letzterWunsch);
      const passend = naechste(offen.filter((d) => this.wunschVon(d).wunsch === this.traegt));
      if (passend) return ziel(passend);
      const tuer = this.ausgangZu((w) => w.wunsch === this.traegt, null, false, true);
      if (tuer) return tuer;
      // niemand braucht das Getragene mehr: einfach mit der nächsten Aufgabe weitermachen (es wird ausgetauscht)
    }
    const lw = this.letzterWunsch && this.wunschVon(this.letzterWunsch).wunsch;
    if (lw === 'huehner' && !this.istErfuellt(this.letzterWunsch.id)) {
      const huhn = naechste(this.huehner.filter((h) => h.frei && h.besitzer === this.letzterWunsch).map((h) => ({ h, bild: h.s })));
      if (huhn) return this.huhnZiel(huhn.h);
    }
    if (lw === 'suchen' && this.suche) {
      // zeigt nur zum nächsten noch nicht angeschauten Versteck – suchen muss man selber
      const ort = naechste(this.suche.orte.filter((o) => !o.geprueft));
      return ort ? ziel(ort) : null;
    }
    if (lw && this.wunschVon(this.letzterWunsch).selberSuchen && !this.letzterWunsch.falschGebracht && !this.istErfuellt(this.letzterWunsch.id)) return null;
    if (lw && !this.istErfuellt(this.letzterWunsch.id) && !REDE_WUENSCHE.has(lw)) {
      const quelle = naechste(this.dinge.filter((d) => d.typ === 'quelle' && d.gibt === lw));
      if (quelle) return ziel(quelle);
      return this.ausgangZu(null, lw);
    }
    // Wunsch von einem anderen Ort mitgebracht? Dann zur Quelle hier (falls es eine gibt)
    const fremd = this.registry.get('fremderWunsch');
    if (!lw && fremd && !this.istErfuellt(fremd.id) && this.traegt !== fremd.wunsch) {
      const quelle = naechste(this.dinge.filter((d) => d.typ === 'quelle' && d.gibt === fremd.wunsch));
      if (quelle) return ziel(quelle);
    }
    // Pflicht-Aufgaben zuerst, freiwillige (zusatz) danach
    const pflicht = offen.filter((d) => !d.daten?.zusatz);
    const n = naechste(pflicht.length ? pflicht : offen);
    if (n) return ziel(n);
    // Noch ein Ereignis-Feld offen (z.B. tiefer in die Höhle)?
    if (this.ausloeserFelder.length && this.karte.ereignisse?.ausloeser && !this.ereignisErledigt('ausloeser')) {
      const a = this.ausloeserFelder[0];
      return { x: a.x * KACHEL + 8, y: (a.y + 1) * KACHEL, hoch: 14, feld: a };
    }
    // Danach: Wege zu Pflicht-Aufgaben, Missionsbrett, dann weiter in der Geschichte – freiwillige Orte erst,
    // wenn das Spiel geschafft ist (sonst lockt der Pfeil die Kinder von der Geschichte weg)
    const zusatz = () => this.ausgangZu(() => true, null, false, true);
    const weiter = () => this.ausgangZu(null, null, true);
    return this.ausgangZu(() => true) || this.brettZiel() || (this.stand.fertig ? zusatz() || weiter() : weiter() || zusatz());
  }

  // Zuhause: der Pfeil zeigt zum Missionsbrett, solange es offene Missionen gibt
  brettZiel() {
    if (!this.karte.zuhause || MISSIONEN.every((m) => (this.stand.missionen || []).includes(m.id))) return null;
    const brett = this.dinge.find((d) => d.typ === 'missionen');
    return brett ? { x: brett.bild.x, y: brett.bild.y, hoch: brett.bild.height, ding: brett } : null;
  }

  huhnZiel(h) {
    return { x: h.s.x, y: h.s.y, hoch: 14, huhn: h, feld: { x: Math.floor(h.s.x / KACHEL), y: Math.floor((h.s.y - 4) / KACHEL) } };
  }

  // Für den automatischen Test: wie der Pfeil, aber er kennt auch die Lösung (richtige Farbe, richtiges Versteck)
  loesungsZiel() {
    if (this.suche && !this.zwischenszene) return { x: this.suche.richtig.bild.x, y: this.suche.richtig.bild.y, hoch: 16, ding: this.suche.richtig };
    const lw = this.letzterWunsch && !this.istErfuellt(this.letzterWunsch.id) && this.wunschVon(this.letzterWunsch);
    if (lw?.selberSuchen && this.traegt !== lw.wunsch) {
      const q = this.dinge.find((d) => d.typ === 'quelle' && d.gibt === lw.wunsch);
      if (q) return { x: q.bild.x, y: q.bild.y, hoch: 16, ding: q };
    }
    return this.pfeilZiel();
  }

  // Tür zu einer Karte, auf der es einen passenden Wunsch (oder eine Quelle) gibt
  ausgangZu(passt, quelleFuer, weiterImKapitel = false, mitZusatz = false) {
    for (const a of this.ausgangsFelder) {
      if (!a.karte) continue;
      const k = KARTEN[a.karte];
      let treffer = false;
      if (weiterImKapitel) treffer = a.weiter === true;
      else if (quelleFuer) treffer = k.karte.some((z) => [...z].some((c) => LEGENDE[c]?.gibt === quelleFuer));
      else {
        // freiwillige Orte: auch eine Tür weiter schauen (Zuhause -> Dorf -> Haus)
        const karten = new Set([a.karte]);
        if (mitZusatz) Object.values(k.ausgaenge || {}).forEach((b) => b.karte !== this.kartenName && karten.add(b.karte));
        treffer = this.alleWuensche({ mitZusatz }).some((w) => karten.has(w.karte) && !this.istErfuellt(w.id) && passt(w));
      }
      if (treffer) return { x: a.x * KACHEL + KACHEL / 2, y: (a.y + 1) * KACHEL, hoch: 16, feld: a };
    }
    return null;
  }

  aktualisierePfeil(zeit) {
    const ziel = this.pfeilZiel();
    if (!ziel) { this.pfeil.setVisible(false); return; }
    const cam = this.cameras.main.worldView;
    const zielX = ziel.x, zielY = ziel.y - ziel.hoch - 12;
    const rand = 10;
    const imBild = zielX > cam.x + rand && zielX < cam.right - rand && zielY > cam.y + rand && zielY < cam.bottom - rand;
    this.pfeil.setVisible(true);
    if (imBild) {
      this.pfeil.setRotation(0).setScale(0.8).setAlpha(0.95);
      this.pfeil.setPosition(zielX, zielY + Math.sin(zeit / 180) * 3);
    } else {
      const winkel = Math.atan2(ziel.y - 10 - this.held.y, ziel.x - this.held.x);
      const px = Phaser.Math.Clamp(cam.centerX + Math.cos(winkel) * 400, cam.x + 12, cam.right - 12);
      const py = Phaser.Math.Clamp(cam.centerY + Math.sin(winkel) * 400, cam.y + 12, cam.bottom - 12);
      const puls = 1 + Math.sin(zeit / 150) * 0.08;
      this.pfeil.setPosition(px, py).setRotation(winkel - Math.PI / 2).setScale(0.9 * puls).setAlpha(0.9);
    }
  }
}
