// ─────────────────────────────────────────────────────────────
// CONFIG  ·  guarda credenciales una sola vez en el disco del usuario.
// Se guarda en la carpeta de datos de la app (userData), no en el
// proyecto. Los secretos (token de Vimeo, clave de DeepL y contrasena
// del FTP) se cifran con el llavero del sistema operativo cuando esta
// disponible (Electron safeStorage); si no, se guardan en claro.
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let CONFIG_PATH = null;

function init(userDataDir) {
  CONFIG_PATH = path.join(userDataDir, 'zeitlin-config.json');
}

// Cifrado opcional con el llavero del sistema (solo dentro de Electron)
function safe() {
  try { return require('electron').safeStorage; } catch { return null; }
}
const ENC_PREFIX = 'enc:v1:';
function enc(str) {
  if (!str) return str;
  const s = safe();
  if (s && s.isEncryptionAvailable && s.isEncryptionAvailable()) {
    try { return ENC_PREFIX + s.encryptString(str).toString('base64'); } catch { return str; }
  }
  return str;
}
function dec(str) {
  if (typeof str !== 'string' || !str.startsWith(ENC_PREFIX)) return str;
  const s = safe();
  if (s && s.isEncryptionAvailable && s.isEncryptionAvailable()) {
    try { return s.decryptString(Buffer.from(str.slice(ENC_PREFIX.length), 'base64')); } catch { return ''; }
  }
  return '';
}

// Aplica enc/dec a los campos secretos de un objeto de config
function transformSecrets(cfg, fn) {
  const out = { ...cfg, ftp: { ...(cfg.ftp || {}) } };
  if (out.vimeoToken) out.vimeoToken = fn(out.vimeoToken);
  if (out.deeplKey) out.deeplKey = fn(out.deeplKey);
  if (out.ftp && out.ftp.password) out.ftp.password = fn(out.ftp.password);
  return out;
}

function readRaw() {
  try {
    if (!CONFIG_PATH || !fs.existsSync(CONFIG_PATH)) return defaults();
    return { ...defaults(), ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
  } catch {
    return defaults();
  }
}

// Devuelve la config con los secretos ya descifrados, listos para usar
function read() {
  const raw = readRaw();
  const out = transformSecrets(raw, dec);
  // fusion profunda del ftp con los valores por defecto
  out.ftp = { ...defaults().ftp, ...(raw.ftp || {}) };
  if (out.ftp.password) out.ftp.password = dec(out.ftp.password);
  return out;
}

// Guarda fusionando en profundidad y cifrando los secretos
function write(partial) {
  const current = readRaw(); // secretos aun cifrados en disco
  const currentPlain = transformSecrets(current, dec);
  const next = {
    ...currentPlain,
    ...partial,
    ftp: { ...currentPlain.ftp, ...(partial && partial.ftp ? partial.ftp : {}) },
  };
  const toStore = transformSecrets(next, enc);
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(toStore, null, 2), 'utf8');
  return next; // devuelve en claro para uso inmediato
}

function defaults() {
  return {
    vimeoToken: '',
    deeplKey: '',
    ftp: {
      host: 'ftp.zeitlindavid.com',
      user: '',
      password: '',
      remoteRoot: '/public_html',
    },
    siteUrl: 'https://www.zeitlindavid.com',
  };
}

function status() {
  const c = read();
  return {
    vimeo: !!c.vimeoToken,
    deepl: !!c.deeplKey,
    ftp: !!(c.ftp && c.ftp.user && c.ftp.password),
  };
}

module.exports = { init, read, write, status };
