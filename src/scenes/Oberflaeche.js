import Phaser from 'phaser';
import { stil, zahlStil } from '../systeme/schrift.js';
import { spiele } from '../systeme/ton.js';
import { zeichenMs, sprechDauer, setzeTextTempo } from '../systeme/stimme.js';
import { ladeEinstellungen } from '../systeme/speichern.js';
import { beiGroesse, sichererRand } from '../systeme/bildschirm.js';
import { baueSteuerTexturen } from '../grafik/knoepfe.js';

// Alles, was über der Spielwelt liegt: Herzen, Sprechtext, Touch-Knöpfe.
export class Oberflaeche extends Phaser.Scene {
  constructor() { super('Oberflaeche'); }

  create() {
    this.herzAnzahl = 0;
    this.steuerZonen = [];
    this.baueHerzen();
    this.setzeHerzen(this.registry.get('stand')?.herzen || 0);
    this.setzeOrtHerzen(this.registry.get('ortHerzen'));
    this.baueSprechfeld();
    this.baueMenueKnopf();

    this.einstellungen = ladeEinstellungen();
    setzeTextTempo(this.einstellungen.textTempo);
    this.zeigeTouch = this.einstellungen.touch === 'an' || (this.einstellungen.touch !== 'aus' && this.sys.game.device.input.touch);
    this.baueTouchSteuerung();
    if (!this.zeigeTouch) this.touchTeile.forEach((t) => t.setVisible(false));
    // Sobald jemand den Bildschirm berührt, erscheinen die Touch-Knöpfe
    this.input.on('pointerdown', (p) => {
      if (p.wasTouch && !this.zeigeTouch && this.einstellungen.touch !== 'aus') { this.zeigeTouch = true; this.touchTeile.forEach((t) => t.setVisible(true)); }
    });

    // Knöpfe an die Bildschirmränder setzen (auch nach dem Drehen des Geräts)
    beiGroesse(this, () => this.ordneAn());

    this.registry.set('touchRichtung', { x: 0, y: 0 });
    this.registry.set('istSteuerung', (p) => this.steuerZonen.some((z) => z(p)));

    const ev = this.game.events;
    ev.on('herzen', this.setzeHerzen, this);
    ev.on('herzFliegt', this.herzFliegt, this);
    ev.on('ortHerzen', this.setzeOrtHerzen, this);
    ev.on('sprechen', this.zeigeText, this);
    ev.on('sprechfeldWeg', this.versteckeText, this);
    ev.on('traegt', this.zeigeGetragen, this);
    ev.on('ortBanner', this.zeigeOrt, this);
    ev.on('einstellungen', this.neueEinstellungen, this);
    this.events.once('shutdown', () => {
      ev.off('herzen', this.setzeHerzen, this);
      ev.off('herzFliegt', this.herzFliegt, this);
      ev.off('ortHerzen', this.setzeOrtHerzen, this);
      ev.off('sprechen', this.zeigeText, this);
      ev.off('sprechfeldWeg', this.versteckeText, this);
      ev.off('traegt', this.zeigeGetragen, this);
      ev.off('ortBanner', this.zeigeOrt, this);
      ev.off('einstellungen', this.neueEinstellungen, this);
      this.registry.set('istSteuerung', null);
      this.registry.set('touchRichtung', { x: 0, y: 0 });
    });
  }

  neueEinstellungen(einst) {
    this.einstellungen = einst;
    setzeTextTempo(einst.textTempo);
    this.zeigeTouch = einst.touch === 'an' || (einst.touch !== 'aus' && this.sys.game.device.input.touch);
    this.touchTeile.forEach((t) => t.setVisible(this.zeigeTouch));
    this.ordneAn();
  }

  // Alles an die Ränder des (beliebig grossen) Bildschirms setzen, mit Abstand zur iPhone-Notch
  ordneAn() {
    const B = this.scale.width, H = this.scale.height;
    const r = sichererRand(this);
    const l = Math.max(0, r.links * 0.8), re = Math.max(0, r.rechts * 0.8), u = Math.max(0, r.unten * 0.5);
    // Oben: unter der Statusleiste bleiben (iPhone hochkant), dort kommen Berührungen nicht an
    const o = Math.max(0, r.oben, H > B ? 60 : 0);
    const rechts = this.einstellungen?.kreuz !== 'links'; // Standard: Steuerkreuz rechts
    const hochkant = H > B;
    this.herzBox.setPosition(l, o);
    if (this.ortHerzen) this.setzeOrtHerzen(this.ortHerzen); // Reihenlänge hängt von hochkant/quer ab
    this.menueKnopf.setPosition(B - 30 - re, 40 + o);

    // Sprechfeld: neben den Herzen, hochkant darunter und verkleinert
    const skala = Math.min(1, (B - 20) / 760);
    this.sprechfeld.setScale(skala);
    this.sprechfeld.setPosition(hochkant ? B / 2 : Math.max(540 + l, B / 2), (hochkant ? 90 : 12) + o);

    let kreuzX, kreuzY, knopfX, knopfY;
    if (hochkant) {
      // Einhändig: Steuerkreuz unten, Helfen-Knopf direkt darüber – beides mit einem Daumen
      kreuzX = rechts ? B - 125 - re : 125 + l;
      kreuzY = H - 150 - u;
      knopfX = rechts ? B - 110 - re : 110 + l;
      knopfY = kreuzY - 250;
    } else {
      // Quer: Steuerkreuz auf der gewählten Seite, Helfen-Knopf gegenüber
      kreuzX = rechts ? B - 130 - re : 130 + l;
      knopfX = rechts ? 120 + l : B - 120 - re;
      kreuzY = knopfY = H - 120 - u;
    }
    this.kreuz.x = kreuzX; this.kreuz.y = kreuzY;
    this.kreuzTeil.setPosition(kreuzX, kreuzY);
    this.kreuzKnauf.setPosition(kreuzX, kreuzY);
    this.aktionsKnopf.setPosition(knopfX, knopfY);
  }

  // ---- Herzen oben links: so viele leere Herzen, wie es an diesem Ort zu verdienen gibt ----
  baueHerzen() {
    this.herzBox = this.add.container(0, 0).setVisible(false);
    this.herzHintergrund = this.add.graphics();
    this.herzReihe = this.add.container(0, 0);
    this.herzBox.add([this.herzHintergrund, this.herzReihe]);
    this.ortHerzen = { max: 0, voll: 0 };
  }

  // Gesamtzahl (für Meilensteine usw.) – angezeigt werden die Herzen dieses Ortes
  setzeHerzen(n) { this.herzAnzahl = n; }

  herzPlatz(i) {
    const proReihe = this.scale.height > this.scale.width ? 10 : 8;
    return { x: 36 + (i % proReihe) * 30, y: 40 + Math.floor(i / proReihe) * 30, proReihe };
  }

  setzeOrtHerzen(ort) {
    this.ortHerzen = ort || { max: 0, voll: 0 };
    const { max, voll } = this.ortHerzen;
    this.herzReihe.removeAll(true);
    this.herzBox.setVisible(max > 0);
    if (!max) return;
    for (let i = 0; i < max; i++) {
      const p = this.herzPlatz(i);
      this.herzReihe.add(this.add.image(p.x, p.y, i < voll ? 'herz' : 'herz_leer').setScale(2));
    }
    const { proReihe } = this.herzPlatz(0);
    const reihen = Math.ceil(max / proReihe);
    const breite = 24 + Math.min(max, proReihe) * 30;
    this.herzHintergrund.clear().fillStyle(0x1b1420, 0.7).fillRoundedRect(12, 12, breite, 26 + reihen * 30, 16);
  }

  herzFliegt({ x, y, herzen, ort }) {
    const ziel = ort && ort.max ? this.herzPlatz(Math.max(0, ort.voll - 1)) : { x: 36, y: 40 };
    const h = this.add.image(x, y, 'herz').setScale(3);
    this.tweens.add({
      targets: h, x: this.herzBox.x + ziel.x, y: this.herzBox.y + ziel.y, scale: 2, duration: 700, ease: 'Cubic.easeIn',
      onComplete: () => {
        h.destroy();
        this.setzeHerzen(herzen);
        if (!ort) return;
        this.setzeOrtHerzen(ort);
        const neu = this.herzReihe.list[ort.voll - 1];
        if (neu) this.tweens.add({ targets: neu, scale: 3, duration: 140, yoyo: true });
        // Alle voll: die ganze Reihe hüpft nacheinander
        if (ort.voll >= ort.max) {
          this.herzReihe.list.forEach((herz, i) => this.tweens.add({ targets: herz, y: herz.y - 8, duration: 160, yoyo: true, delay: 300 + i * 70 }));
        }
      },
    });
  }

  // ---- Sprechfeld oben: Porträt, Name, Text erscheint Buchstabe für Buchstabe ----
  baueSprechfeld() {
    this.sprechfeld = this.add.container(540, 12).setVisible(false);
    this.sprechRahmen = this.add.graphics();
    this.portraitRahmen = this.add.graphics();
    this.portrait = this.add.image(-322, 50, 'herz').setScale(2.4);
    this.sprechName = this.add.text(-270, 10, '', stil(21, '#f2c94c'));
    this.sprechText = this.add.text(-270, 38, '', stil(23, '#ffffff', { wordWrap: { width: 610 }, lineSpacing: 2 }));
    this.sprechfeld.add([this.sprechRahmen, this.portraitRahmen, this.portrait, this.sprechName, this.sprechText]);
  }

  zeigeText({ name, text, bild }) {
    this.sprechName.setText(name || '');
    this.sprechText.setText(text);
    const hoehe = Math.max(100, 38 + this.sprechText.height + 14);
    this.sprechText.setText('');
    this.sprechRahmen.clear()
      .fillStyle(0x1b1420, 0.9).fillRoundedRect(-370, 0, 740, hoehe, 16)
      .lineStyle(3, 0xf2c94c).strokeRoundedRect(-370, 0, 740, hoehe, 16);
    this.portraitRahmen.clear().fillStyle(0x3a3048, 1).fillRoundedRect(-360, 10, 76, 80, 10);
    if (bild && this.textures.exists(bild)) {
      const f = this.textures.get(bild).getSourceImage();
      // Ausschnitt um den Kopf: kleine Figuren die obersten 28 Pixel, grosse (Drache) ein Quadrat oben in der Mitte
      const gross = f.width > 40;
      const b = gross ? Math.round(Math.min(f.width, f.height * 0.6)) : f.width;
      const h = gross ? b : Math.min(f.height, 28);
      const x0 = Math.round((f.width - b) / 2);
      const skala = Math.min(2.4, 72 / b, 76 / h);
      this.portrait.setTexture(bild).setOrigin(0.5, 0).setCrop(x0, 0, b, h).setVisible(true);
      // bei setCrop bleibt der Ursprung auf das ganze Bild bezogen: Mitte des Ausschnitts auf die Rahmenmitte schieben
      this.portrait.setScale(skala).setPosition(-322 - (x0 + b / 2 - f.width / 2) * skala, 14);
    } else this.portrait.setVisible(false);
    this.sprechfeld.setVisible(true).setAlpha(1);
    this.textZeit?.remove();
    this.schreiber?.remove();
    this.tweens.killTweensOf(this.sprechfeld);
    let i = 0;
    this.schreiber = this.time.addEvent({
      delay: zeichenMs(), repeat: text.length - 1,
      callback: () => { i++; this.sprechText.setText(text.slice(0, i)); },
    });
    this.textZeit = this.time.delayedCall(sprechDauer(text) + 400, () => {
      this.tweens.add({ targets: this.sprechfeld, alpha: 0, duration: 400, onComplete: () => this.sprechfeld.setVisible(false) });
    });
  }

  // Sprechfeld sofort ausblenden (z. B. damit man die Drachenaugen sieht)
  versteckeText() {
    this.textZeit?.remove();
    this.schreiber?.remove();
    this.tweens.killTweensOf(this.sprechfeld);
    this.tweens.add({ targets: this.sprechfeld, alpha: 0, duration: 250, onComplete: () => this.sprechfeld.setVisible(false) });
  }

  // ---- Orts-Banner (wie bei Zelda) ------------------------------------------
  zeigeOrt(name) {
    const c = this.add.container(this.scale.width / 2, this.scale.height / 2 - 20).setAlpha(0).setScale(Math.min(1, (this.scale.width - 20) / 680));
    const g = this.add.graphics();
    g.fillStyle(0x1b1420, 0.85).fillRect(-330, -38, 660, 76);
    g.lineStyle(3, 0xf2c94c).lineBetween(-330, -38, 330, -38).lineBetween(-330, 38, 330, 38);
    c.add([g, this.add.text(0, 0, name, stil(40, '#f2c94c', { strokeThickness: 8 })).setOrigin(0.5)]);
    this.tweens.add({ targets: c, alpha: 1, duration: 500, hold: 1800, yoyo: true, onComplete: () => c.destroy() });
  }

  // ---- Pause-Knopf -----------------------------------------------------------
  baueMenueKnopf() {
    const k = this.menueKnopf = this.add.container(930, 40);
    const g = this.add.graphics();
    g.fillStyle(0x1b1420, 0.7).fillRoundedRect(-26, -26, 52, 52, 12);
    g.fillStyle(0xffffff, 1);
    g.fillRect(-12, -13, 8, 26); g.fillRect(4, -13, 8, 26);
    k.add(g);
    k.setSize(52, 52).setInteractive({ useHandCursor: true });
    k.on('pointerdown', () => { spiele('knopf'); this.game.events.emit('pause'); });
    this.steuerZonen.push((p) => Math.abs(p.x - k.x) < 32 && Math.abs(p.y - k.y) < 32);
  }

  // ---- Touch: Steuerkreuz links, Helfen-Knopf rechts ----------------------
  baueTouchSteuerung() {
    this.touchTeile = [];
    const kr = 95;
    const kreuz = this.kreuz = { x: 130, y: 420 };

    // Zwergen-Schild mit Steinkreuz, Knauf als goldener Schildbuckel (siehe grafik/knoepfe.js)
    baueSteuerTexturen(this);
    const basis = this.kreuzTeil = this.add.image(kreuz.x, kreuz.y, 'kreuz_basis').setScale(3).setAlpha(0.9);
    const knauf = this.kreuzKnauf = this.add.image(kreuz.x, kreuz.y, 'kreuz_knauf').setScale(2.5);
    this.touchTeile.push(basis, knauf);

    let zeigerId = null;
    const setze = (p) => {
      const dx = p.x - kreuz.x, dy = p.y - kreuz.y;
      const l = Math.hypot(dx, dy);
      const max = kr - 30;
      const k = l > max ? max / l : 1;
      knauf.setPosition(kreuz.x + dx * k, kreuz.y + dy * k);
      if (l < 12) { this.registry.set('touchRichtung', { x: 0, y: 0 }); return; }
      const staerke = Math.min(1, l / 40);
      this.registry.set('touchRichtung', { x: (dx / l) * staerke, y: (dy / l) * staerke });
    };
    const loslassen = () => {
      zeigerId = null;
      knauf.setPosition(kreuz.x, kreuz.y);
      this.registry.set('touchRichtung', { x: 0, y: 0 });
    };
    const imKreuz = (p) => this.zeigeTouch && Math.hypot(p.x - kreuz.x, p.y - kreuz.y) < kr + 30;
    this.steuerZonen.push(imKreuz);

    this.input.on('pointerdown', (p) => { if (imKreuz(p) && zeigerId === null) { zeigerId = p.id; setze(p); } });
    this.input.on('pointermove', (p) => { if (p.id === zeigerId) setze(p); });
    this.input.on('pointerup', (p) => { if (p.id === zeigerId) loslassen(); });
    this.input.on('pointerupoutside', (p) => { if (p.id === zeigerId) loslassen(); });

    // Grosser Helfen-Knopf
    const ar = 78;
    const aktion = this.aktionsKnopf = this.add.container(840, 420);
    const ag = this.add.graphics();
    ag.fillStyle(0x1b1420, 0.6).fillCircle(4, 6, ar);
    ag.fillStyle(0xe05a8a, 0.92).fillCircle(0, 0, ar);
    ag.lineStyle(5, 0xffffff, 0.9).strokeCircle(0, 0, ar);
    this.aktionsBild = this.add.image(0, -6, 'herz').setScale(4);
    this.aktionsText = this.add.text(0, 48, 'Helfen', stil(22)).setOrigin(0.5);
    aktion.add([ag, this.aktionsBild, this.aktionsText]);
    this.touchTeile.push(aktion);
    const imKnopf = (p) => this.zeigeTouch && Math.hypot(p.x - aktion.x, p.y - aktion.y) < ar + 20;
    this.steuerZonen.push(imKnopf);
    this.input.on('pointerdown', (p) => {
      if (!imKnopf(p)) return;
      this.tweens.add({ targets: aktion, scale: 0.88, duration: 70, yoyo: true });
      this.game.events.emit('aktion');
    });
  }

  zeigeGetragen(gegenstand) {
    // Der Helfen-Knopf zeigt, was der Grosse Zwerg gerade trägt
    this.aktionsBild.setTexture(gegenstand || 'herz');
  }
}
