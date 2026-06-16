// ─────────────────────────────────────────────────────────────
// CONFIG  ·  guarda credenciales una sola vez en el disco del usuario.
// Se guarda en la carpeta de datos de la app (userData), no en el
// proyecto, asi que no viaja con el codigo ni se sube a ningun sitio.
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let CONFIG_PATH = null;

// Llamar una vez al arrancar, con app.getPath('userData')
function init(userDataDir) {
  CONFIG_PATH = path.join(userDataDir, 'zeitlin-config.json');
}

function read() {
  try {
    if (!CONFIG_PATH || !fs.existsSync(CONFIG_PATH)) return defaults();
    return { ...defaults(), ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
  } catch {
    return defaults();
  }
}

function write(partial) {
  const next = { ...read(), ...partial };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function defaults() {
  return {
    vimeoToken: '',          // token personal de Vimeo (subir + editar)
    deeplKey: '',            // clave de DeepL para traduccion
    ftp: {
      host: 'ftp.zeitlindavid.com',
      user: '',
      password: '',
      remoteRoot: '/public_html',   // raiz del sitio en Hostinger
    },
    siteUrl: 'https://www.zeitlindavid.com',
  };
}

// Comprueba que esta lo minimo para cada accion
function status() {
  const c = read();
  return {
    vimeo: !!c.vimeoToken,
    deepl: !!c.deeplKey,
    ftp: !!(c.ftp && c.ftp.user && c.ftp.password),
  };
}

module.exports = { init, read, write, status };
