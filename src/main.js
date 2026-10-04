import Phaser from 'phaser';
// Schriften direkt im Spiel (funktioniert auch offline und im Artefakt)
import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-700.css';
import '@fontsource/press-start-2p/latin-400.css';
import { Boot } from './scenes/Boot.js';
import { vollbildUmschalten } from './systeme/vollbild.js';
import { passeFormAn } from './systeme/bildschirm.js';
import { ladeEinstellungen, speichereEinstellungen, sichere } from './systeme/speichern.js';
import { Titel } from './scenes/Titel.js';
import { Geschichte } from './scenes/Geschichte.js';
import { Welt } from './scenes/Welt.js';
import { Oberflaeche } from './scenes/Oberflaeche.js';
import { KapitelEnde } from './scenes/KapitelEnde.js';
import { Spielstaende } from './scenes/Spielstaende.js';
import { Pause } from './scenes/Pause.js';
import { Splash } from './scenes/Splash.js';
import { Entscheidung } from './scenes/Entscheidung.js';
import { Flug } from './scenes/Flug.js';
import { Abspann } from './scenes/Abspann.js';
import { Missionen } from './scenes/Missionen.js';

// Das Spiel rechnet mit 960 x 540 Punkten. Die Spielwelt wird 3-fach vergrössert
// gezeigt (so sieht man 20 x 11 Kacheln) – der typische Retro-Look.
export const BREITE = 960;
export const HOEHE = 540;

// Fehler in Phaser umgehen: Ist der Controller nicht als Nummer 0 angemeldet (unter Windows häufig),
// hat die Controller-Liste eine Lücke, und Phaser stürzt beim Verlassen jeder Szene ab
// (undefined.removeAllListeners). Diese zwei Funktionen überspringen Lücken, sonst wie das Original.
const ControllerPlugin = Phaser.Input.Gamepad?.GamepadPlugin;
if (ControllerPlugin) {
  ControllerPlugin.prototype.stopListeners = function () {
    this.target.removeEventListener('gamepadconnected', this.onGamepadHandler);
    this.target.removeEventListener('gamepaddisconnected', this.onGamepadHandler);
    this.sceneInputPlugin.pluginEvents.off(Phaser.Input.Events.UPDATE, this.update);
    this.gamepads.forEach((pad) => pad?.removeAllListeners());
  };
  ControllerPlugin.prototype.disconnectAll = function () {
    this.gamepads.forEach((pad) => { if (pad?.pad) pad.pad.connected = false; });
  };
}

// Controller nur einschalten, wenn der Browser das erlaubt (in eingebetteten Seiten manchmal gesperrt)
let controllerErlaubt = false;
try { controllerErlaubt = !!(navigator.getGamepads && (navigator.getGamepads(), true)); } catch (e) { controllerErlaubt = false; }

const spiel = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'spiel',
  width: BREITE,
  height: HOEHE,
  backgroundColor: '#1b1420',
  pixelArt: true,
  roundPixels: true,
  // EXPAND: füllt jeden Bildschirm aus, 960 x 540 bleibt immer sichtbar (siehe systeme/bildschirm.js)
  scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { debug: false } },
  input: { gamepad: controllerErlaubt, activePointers: 3 },
  scene: [Boot, Titel, Spielstaende, Geschichte, Welt, Oberflaeche, Pause, Splash, Entscheidung, Flug, Abspann, KapitelEnde, Missionen],
});

// Hochkant spielen (einhändig), falls eingeschaltet: Spielfeld dreht sich mit dem Handy
let einstellungenJetzt = ladeEinstellungen();
const form = () => passeFormAn(spiel, einstellungenJetzt);
spiel.events.once('ready', () => setTimeout(form, 100));
window.addEventListener('resize', () => setTimeout(form, 50));
window.addEventListener('orientationchange', () => setTimeout(form, 200));
spiel.events.on('einstellungen', (e) => { einstellungenJetzt = e; form(); });
document.getElementById('einhaendig')?.addEventListener('click', () => {
  const e = { ...ladeEinstellungen(), hochkant: 'ja' };
  speichereEinstellungen(e);
  spiel.events.emit('einstellungen', e);
});

// Automatisch aktualisieren: Die App auf dem Home-Bildschirm merkt sonst nicht, dass es eine neue Version gibt.
// Beim Start und beim Zurückkehren in die App die Seite frisch holen und das Skript vergleichen.
const meinSkript = document.querySelector('script[type="module"][src]')?.getAttribute('src');
async function pruefeNeueVersion() {
  if (!meinSkript) return; // Artefakt (alles in einer Datei): nichts zu tun
  try {
    const html = await (await fetch(location.pathname, { cache: 'no-store' })).text();
    const neu = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1];
    // Nur einmal pro neuer Version neu laden (falls der Browser hartnäckig die alte Seite liefert)
    if (neu && neu !== meinSkript && sessionStorage.getItem('neuGeladen') !== neu) {
      sessionStorage.setItem('neuGeladen', neu);
      location.reload();
    }
  } catch (e) { /* offline – dann eben später */ }
}
pruefeNeueVersion();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pruefeNeueVersion(); });

// Taste F: Vollbild – überall im Spiel (ausser beim Namen eintippen)
window.addEventListener('keydown', (e) => {
  if ((e.key === 'f' || e.key === 'F') && !(e.target instanceof HTMLInputElement)) vollbildUmschalten(spiel);
});

// Sicherheitsnetz: Ein Fehler im Spielablauf darf das Spiel nicht einfrieren. Phaser hält sonst beim ersten
// Fehler die ganze Schleife an. Der Fehler wird unten klein angezeigt (für Eltern), das Spiel läuft weiter.
const fehlerGesehen = new Set();
function zeigeFehler(fehler) {
  const text = fehler instanceof Error
    ? `${fehler.message} · ${(fehler.stack || '').split('\n').find((z) => /\.js|:\d+:\d+/.test(z) && !z.includes(fehler.message))?.trim() || ''}`
    : String(fehler?.message || fehler);
  console.error('Fehler im Spiel:', fehler);
  if (fehlerGesehen.has(text)) return;
  fehlerGesehen.add(text);
  let box = document.getElementById('fehler-anzeige');
  if (!box) {
    box = document.createElement('div');
    box.id = 'fehler-anzeige';
    Object.assign(box.style, {
      position: 'fixed', left: '8px', right: '8px', bottom: '8px', zIndex: 20, padding: '8px 12px', borderRadius: '10px',
      background: 'rgba(60, 10, 20, 0.92)', color: '#fff', font: '13px sans-serif', whiteSpace: 'pre-wrap', userSelect: 'text',
    });
    box.title = 'Antippen zum Schliessen';
    box.addEventListener('click', () => box.remove());
    document.body.appendChild(box);
  }
  box.textContent = `Hoppla, ein Fehler (bitte an David weitergeben, antippen schliesst):\n${text}`;
}
const schritt = spiel.step;
spiel.step = function (zeit, delta) {
  try { schritt.call(this, zeit, delta); } catch (e) { zeigeFehler(e); }
};
window.addEventListener('error', (e) => zeigeFehler(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => zeigeFehler(e.reason));

// Speichern, wenn das Fenster verdeckt oder geschlossen wird (z. B. neue Artefakt-Version, App gewechselt),
// damit nichts vom Spielstand verloren geht
function sichernBeimVerlassen() {
  try {
    const welt = spiel.scene.getScene('Welt');
    if (welt?.sys.isActive() || welt?.sys.isPaused()) welt.sichern();
    // sonst nur mitten im Spiel (nicht auf dem Titelbild oder bei «Wer spielt?», dort wurde evtl. gerade gelöscht)
    else if (['Flug', 'Missionen', 'KapitelEnde', 'Geschichte', 'Abspann'].some((k) => spiel.scene.isActive(k))) sichere(spiel.registry);
  } catch (e) { /* egal – dann eben beim nächsten Mal */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sichernBeimVerlassen(); });
window.addEventListener('pagehide', sichernBeimVerlassen);

// Für automatische Tests und zum Ausprobieren in der Browser-Konsole
window.spiel = spiel;
