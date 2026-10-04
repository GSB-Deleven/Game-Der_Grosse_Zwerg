import Phaser from 'phaser';
import { mittig } from '../systeme/bildschirm.js';
import { stil, zahlStil } from '../systeme/schrift.js';
import { knopf } from '../systeme/knopf.js';
import { spiele } from '../systeme/ton.js';
import { bergKulisse } from '../systeme/kulisse.js';
import {
  ANZAHL_PLAETZE, PLATZ_BILDER, allePlaetze, ladePlatz, leererSpielstand, loeschePlatz, speicherePlatz, spielzeitText,
} from '../systeme/speichern.js';
import { KAPITEL } from '../levels/index.js';
import { starteKapitel } from '../systeme/kapitel.js';
import { figurTexturen } from '../grafik/figur-texturen.js';
import { stoppeMusik } from '../systeme/musik.js';

// Bild-Texturen für die Speicherplätze
function platzTextur(scene, bild) {
  if (bild === 'zwergin') return `${figurTexturen(scene, 'mama')}steh0`;
  if (bild === 'kind') return `${figurTexturen(scene, 'bruno')}steh0`;
  if (bild === 'held') return 'held_unten_steh0';
  return bild;
}

export class Spielstaende extends Phaser.Scene {
  constructor() { super('Spielstaende'); }

  create() {
    mittig(this);
    this.dialog = null;
    this.namensFeld = null;
    this.cameras.main.fadeIn(300);
    bergKulisse(this);
    this.add.rectangle(480, 270, 4000, 3000, 0x1b1420, 0.35);
    this.add.text(480, 50, 'Wer spielt?', stil(52, '#f2c94c', { strokeThickness: 9 })).setOrigin(0.5);
    this.karten = this.add.container(0, 0);
    this.zeigePlaetze();

    knopf(this, 90, 505, { text: 'Zurück', breite: 150, hoehe: 54, groesse: 24, farbe: 0x5c5460 }, () => this.scene.start('Titel'));
    this.richteTastenEin();
  }

  // Tastatur und Controller: links/rechts wählen, A/Enter bestätigen, B/Esc zurück, X/Entf löscht einen Platz
  richteTastenEin() {
    this.fokusPlatz = Math.max(0, Math.min(ANZAHL_PLAETZE - 1, this.registry.get('platz') ?? 0));
    this.fokusRahmen = this.add.graphics().setDepth(5);
    this.zeigeFokus();
    const k = this.input.keyboard;
    const taste = (namen, f) => namen.forEach((n) => k.on(`keydown-${n}`, () => { if (!this.namensFeld) f(); }));
    taste(['LEFT', 'A'], () => this.schritt(-1));
    taste(['RIGHT', 'D'], () => this.schritt(1));
    taste(['ENTER', 'SPACE'], () => this.bestaetige());
    taste(['ESC', 'BACKSPACE'], () => this.zurueck());
    taste(['DELETE', 'X'], () => this.loescheFokus());
    this.input.gamepad?.on('down', (pad, knopf) => {
      if (this.namensFeld) return;
      if (knopf.index === 14) this.schritt(-1);
      else if (knopf.index === 15) this.schritt(1);
      else if (knopf.index === 0 || knopf.index === 9) this.bestaetige();
      else if (knopf.index === 1 || knopf.index === 8) this.zurueck();
      else if (knopf.index === 2) this.loescheFokus();
    });
    this.stickSperre = 0;
  }

  update(zeit) {
    // Stick: ein Ausschlag = ein Schritt
    const pad = this.input.gamepad?.pad1;
    if (!pad || this.namensFeld) return;
    const x = pad.leftStick.x;
    if (Math.abs(x) < 0.5) { this.stickSperre = 0; return; }
    if (zeit < this.stickSperre) return;
    this.stickSperre = zeit + (this.stickSperre ? 280 : 450);
    this.schritt(Math.sign(x));
  }

  schritt(d) {
    if (this.dialog) { this.dialog.steuerung?.schritt(d); return; }
    this.fokusPlatz = (this.fokusPlatz + d + ANZAHL_PLAETZE) % ANZAHL_PLAETZE;
    spiele('knopf');
    this.zeigeFokus();
  }

  bestaetige() {
    if (this.dialog) { this.dialog.steuerung?.ok(); return; }
    this.oeffnePlatz(this.fokusPlatz);
  }

  zurueck() {
    if (this.dialog) { this.dialog.steuerung?.zurueck(); return; }
    this.scene.start('Titel');
  }

  loescheFokus() {
    if (this.dialog) return;
    const stand = ladePlatz(this.fokusPlatz);
    if (stand) { spiele('knopf'); this.frageLoeschen(this.fokusPlatz, stand); }
  }

  // Gelber Rahmen um den gewählten Platz (bzw. um einen Knopf im Dialog)
  zeigeFokus(ziel) {
    const g = this.fokusRahmen;
    if (!g) return;
    g.clear();
    if (!ziel) {
      if (this.dialog) return;
      ziel = { x: 170 + this.fokusPlatz * 310, y: 285, b: 270, h: 330 };
    }
    g.lineStyle(4, 0xffffff, 0.95).strokeRoundedRect(ziel.x - ziel.b / 2 - 9, ziel.y - ziel.h / 2 - 9, ziel.b + 18, ziel.h + 18, 24);
    this.tweens.killTweensOf(g);
    g.setAlpha(1);
    this.tweens.add({ targets: g, alpha: 0.45, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  zeigePlaetze() {
    this.karten.removeAll(true);
    const plaetze = allePlaetze();
    for (let i = 0; i < ANZAHL_PLAETZE; i++) this.karten.add(this.karte(i, plaetze[i], 170 + i * 310, 285));
  }

  oeffnePlatz(nummer) {
    if (this.dialog) return;
    const c = this.karten.list[nummer];
    const stand = ladePlatz(nummer); // mit Standardwerten für Felder, die es früher noch nicht gab
    this.fokusPlatz = nummer;
    this.zeigeFokus();
    spiele('knopf');
    this.tweens.add({
      targets: c, scale: 0.95, duration: 80, yoyo: true,
      onComplete: () => (stand ? this.starte(nummer, stand) : this.neuesSpiel(nummer)),
    });
  }

  karte(nummer, stand, x, y) {
    const c = this.add.container(x, y);
    const b = 270, h = 330;
    const g = this.add.graphics();
    const male = (hell) => {
      g.clear();
      g.fillStyle(0x1b1420, 0.5).fillRoundedRect(-b / 2 + 6, -h / 2 + 8, b, h, 20);
      g.fillStyle(hell ? 0x3a3048 : 0x2a2236, 0.95).fillRoundedRect(-b / 2, -h / 2, b, h, 20);
      g.lineStyle(5, stand ? 0xf2c94c : 0x8a8296).strokeRoundedRect(-b / 2, -h / 2, b, h, 20);
    };
    male(false);
    c.add(g);
    c.add(this.add.text(-b / 2 + 18, -h / 2 + 12, `${nummer + 1}`, stil(26, '#8a8296')));

    if (stand) {
      const bild = this.add.image(0, -50, platzTextur(this, stand.bild));
      bild.setScale(Math.min(5, 150 / bild.height));
      this.tweens.add({ targets: bild, y: bild.y - 5, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      c.add(bild);
      c.add(this.add.text(0, 30, stand.name, stil(34, '#ffffff')).setOrigin(0.5));
      if (stand.fertig) c.add(this.add.text(0, -150, '👑 Geschafft!', stil(22, '#f2c94c')).setOrigin(0.5));
      const kapitel = KAPITEL[stand.kapitel]?.name || `Kapitel ${stand.kapitel}`;
      c.add(this.add.text(0, 72, `Kapitel ${stand.kapitel}: ${kapitel}`, stil(18, '#f2c94c', { align: 'center', wordWrap: { width: 240 } })).setOrigin(0.5));
      c.add(this.add.image(-40, 112, 'herz').setScale(2));
      c.add(this.add.text(-18, 113, `${stand.herzen}`, zahlStil(20)).setOrigin(0, 0.5));
      c.add(this.add.text(30, 112, spielzeitText(stand.spielzeit), stil(18, '#cccccc')).setOrigin(0, 0.5));

      // Löschen (klein, oben rechts)
      const weg = this.add.container(b / 2 - 26, -h / 2 + 26);
      const wg = this.add.graphics();
      wg.fillStyle(0xb0413e, 1).fillCircle(0, 0, 18);
      wg.lineStyle(4, 0xffffff).lineBetween(-7, -7, 7, 7).lineBetween(7, -7, -7, 7);
      weg.add(wg);
      weg.setSize(40, 40).setInteractive({ useHandCursor: true });
      weg.on('pointerdown', (p, lx, ly, ev) => { ev.stopPropagation(); spiele('knopf'); this.frageLoeschen(nummer, stand); });
      c.add(weg);
    } else {
      const plus = this.add.text(0, -30, '+', stil(110, '#8a8296')).setOrigin(0.5);
      c.add(plus);
      c.add(this.add.text(0, 70, 'Neues Spiel', stil(32, '#ffffff')).setOrigin(0.5));
    }

    c.setSize(b, h).setInteractive({ useHandCursor: true });
    c.on('pointerover', () => male(true));
    c.on('pointerout', () => male(false));
    c.on('pointerdown', () => this.oeffnePlatz(nummer));
    return c;
  }

  dialogRahmen(breite, hoehe) {
    const c = this.dialog = this.add.container(480, 280);
    c.add(this.add.rectangle(0, 0, 4000, 3000, 0x000000, 0.55).setInteractive());
    const g = this.add.graphics();
    g.fillStyle(0x2a2236, 0.98).fillRoundedRect(-breite / 2, -hoehe / 2, breite, hoehe, 20);
    g.lineStyle(5, 0xf2c94c).strokeRoundedRect(-breite / 2, -hoehe / 2, breite, hoehe, 20);
    c.add(g);
    this.zeigeFokus();
    return c;
  }

  schliesseDialog() {
    this.dialog?.destroy();
    this.dialog = null;
    this.namensFeld?.remove();
    this.namensFeld = null;
    this.zeigeFokus();
  }

  frageLoeschen(nummer, stand) {
    const c = this.dialogRahmen(560, 240);
    c.add(this.add.text(0, -60, `Spielstand «${stand.name}» löschen?`, stil(30, '#ffffff', { align: 'center', wordWrap: { width: 500 } })).setOrigin(0.5));
    const loeschen = () => { loeschePlatz(nummer); this.schliesseDialog(); this.zeigePlaetze(); };
    const behalten = () => this.schliesseDialog();
    c.add(knopf(this, -120, 50, { text: 'Löschen', breite: 200, hoehe: 70, farbe: 0xb0413e }, loeschen));
    c.add(knopf(this, 120, 50, { text: 'Behalten', breite: 200, hoehe: 70 }, behalten));
    // Tastatur/Controller: Fokus startet sicherheitshalber auf «Behalten»
    let wahl = 1;
    const zeige = () => this.zeigeFokus({ x: 480 + (wahl ? 120 : -120), y: 330, b: 200, h: 70 });
    c.steuerung = {
      schritt: () => { wahl = 1 - wahl; spiele('knopf'); zeige(); },
      ok: () => { spiele('knopf'); (wahl ? behalten : loeschen)(); },
      zurueck: behalten,
    };
    zeige();
  }

  neuesSpiel(nummer) {
    const c = this.dialogRahmen(760, 400);
    c.add(this.add.text(0, -160, 'Neues Spiel – wähle ein Bild', stil(32, '#f2c94c')).setOrigin(0.5));
    let gewaehlt = 'held';
    let name = PLATZ_BILDER[gewaehlt];
    const nameText = this.add.text(0, 60, name, stil(40)).setOrigin(0.5);
    const rahmen = [];
    const bilder = Object.keys(PLATZ_BILDER);
    const waehle = (bild) => {
      spiele('knopf');
      const alterName = PLATZ_BILDER[gewaehlt];
      gewaehlt = bild;
      if (name === alterName) { name = PLATZ_BILDER[bild]; nameText.setText(name); }
      rahmen.forEach((rr, j) => rr.setStrokeStyle(bilder[j] === bild ? 5 : 4, bilder[j] === bild ? 0xf2c94c : 0x5c5460));
    };
    bilder.forEach((bild, i) => {
      const x = -275 + i * 110, y = -60;
      const r = this.add.rectangle(x, y, 96, 120, 0x1b1420, 0.8).setStrokeStyle(4, 0x5c5460);
      const img = this.add.image(x, y, platzTextur(this, bild));
      img.setScale(Math.min(4, 105 / img.height));
      r.setInteractive({ useHandCursor: true }).on('pointerdown', () => waehle(bild));
      if (bild === gewaehlt) r.setStrokeStyle(5, 0xf2c94c);
      rahmen.push(r);
      c.add([r, img]);
    });
    // Name in einem Kästchen mit Stift: die ganze Fläche ist antippbar (Feld öffnet beim Loslassen,
    // sonst erscheint auf dem iPad die Tastatur nicht zuverlässig)
    const nameKasten = this.add.rectangle(0, 60, 340, 58, 0x1b1420, 0.85).setStrokeStyle(3, 0x8a8296);
    const stift = this.add.text(150, 60, '✎', { fontFamily: 'sans-serif', fontSize: '30px', color: '#f2c94c' }).setOrigin(0.5);
    c.add([nameKasten, nameText, stift]);
    c.add(this.add.text(0, 102, '(Name ändern: Kästchen antippen)', stil(16, '#aaaaaa')).setOrigin(0.5));
    nameKasten.setInteractive({ useHandCursor: true })
      .on('pointerover', () => nameKasten.setStrokeStyle(3, 0xf2c94c))
      .on('pointerout', () => nameKasten.setStrokeStyle(3, 0x8a8296))
      .on('pointerup', () => this.namenEingeben(name, (neu) => {
        if (neu) { name = neu.slice(0, 14); nameText.setText(name); }
      }));
    const abbrechen = () => this.schliesseDialog();
    const los = () => {
      const stand = leererSpielstand(name, gewaehlt);
      speicherePlatz(nummer, stand);
      this.schliesseDialog();
      this.starte(nummer, stand);
    };
    c.add(knopf(this, -130, 160, { text: 'Abbrechen', breite: 220, hoehe: 64, groesse: 26, farbe: 0x5c5460 }, abbrechen));
    c.add(knopf(this, 130, 160, { text: "Los geht's!", breite: 240, hoehe: 64, groesse: 28 }, los));
    // Tastatur/Controller: links/rechts wählt das Bild, A/Enter = «Los geht's!», B/Esc = Abbrechen
    c.steuerung = {
      schritt: (d) => waehle(bilder[(bilder.indexOf(gewaehlt) + d + bilder.length) % bilder.length]),
      ok: () => { spiele('knopf'); los(); },
      zurueck: abbrechen,
    };
    this.zeigeFokus({ x: 610, y: 440, b: 240, h: 64 });
  }

  // Für Eltern: Name über ein normales Eingabefeld eintippen (mit OK-Knopf für Touch)
  namenEingeben(vorher, fertig) {
    if (this.namensFeld) return;
    const huelle = document.createElement('div');
    Object.assign(huelle.style, {
      position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 10,
      display: 'flex', gap: '8px', alignItems: 'center',
    });
    const feld = document.createElement('input');
    feld.id = 'spielstand-name';
    feld.value = vorher;
    feld.maxLength = 14;
    feld.autocomplete = 'off';
    Object.assign(feld.style, {
      font: '28px "Pixelify Sans", sans-serif', padding: '10px 16px', borderRadius: '12px',
      border: '4px solid #f2c94c', background: '#1b1420', color: '#fff', width: '260px', textAlign: 'center',
    });
    const ok = document.createElement('button');
    ok.id = 'spielstand-name-ok';
    ok.textContent = 'OK';
    Object.assign(ok.style, {
      font: '28px "Pixelify Sans", sans-serif', padding: '10px 18px', borderRadius: '12px',
      border: '4px solid #f2c94c', background: '#3f8a44', color: '#fff', cursor: 'pointer',
    });
    huelle.append(feld, ok);
    document.body.appendChild(huelle);
    // Das Spiel reserviert Tasten wie W, A, S, D und die Leertaste für die Steuerung.
    // Solange das Namensfeld offen ist, gehören alle Tasten dem Feld.
    const tastatur = this.input.keyboard;
    tastatur.disableGlobalCapture();
    const lassDurch = (e) => e.stopPropagation();
    feld.addEventListener('keydown', lassDurch);
    feld.addEventListener('keyup', lassDurch);
    feld.addEventListener('keypress', lassDurch);
    feld.focus();
    feld.select();
    this.namensFeld = huelle;
    const geoeffnet = Date.now();
    const ende = () => {
      if (!this.namensFeld) return;
      const wert = feld.value.trim();
      tastatur.enableGlobalCapture();
      huelle.remove();
      this.namensFeld = null;
      fertig(wert);
    };
    feld.addEventListener('keydown', (e) => { if (e.key === 'Enter') ende(); if (e.key === 'Escape') { feld.value = ''; ende(); } });
    ok.addEventListener('pointerdown', (e) => { e.preventDefault(); ende(); });
    // Kurz nach dem Öffnen nimmt der Browser manchmal den Fokus weg (Antippen) – dann einfach wieder hinein
    feld.addEventListener('blur', () => {
      if (Date.now() - geoeffnet < 500) { setTimeout(() => this.namensFeld && feld.focus(), 0); return; }
      setTimeout(() => { if (document.activeElement !== ok) ende(); }, 0);
    });
    this.events.once('shutdown', () => { tastatur.enableGlobalCapture(); huelle.remove(); });
  }

  starte(nummer, stand) {
    this.registry.set('platz', nummer);
    this.registry.set('stand', stand);
    this.registry.set('traegt', stand.traegt || null);
    spiele('fanfare');
    stoppeMusik();
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => starteKapitel(this));
  }

}
