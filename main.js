// ─────────────────────────────────────────────────────────────
// MAIN  ·  proceso principal de Electron. Crea la ventana y atiende
// las peticiones de la interfaz (subir a Vimeo, traducir, publicar,
// abrir el navegador, elegir archivos, guardar credenciales).
// ─────────────────────────────────────────────────────────────
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');

const config = require('./lib/config');
const vimeo = require('./lib/vimeo');
const translate = require('./lib/translate');
const ftp = require('./lib/ftp');
const generate = require('./lib/generate');
const grid = require('./lib/grid');
const stopmotion = require('./lib/stopmotion');
const seo = require('./lib/seo-naming');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 900,
    minWidth: 720,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  config.init(app.getPath('userData'));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Envia un mensaje de progreso a la interfaz
function progress(msg) {
  if (win) win.webContents.send('progress', msg);
}

// ── Elegir archivos (mp4, imagenes) ──
ipcMain.handle('pick-video', async () => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'Vídeo', extensions: ['mp4', 'mov', 'm4v'] }],
  });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('pick-images', async () => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'gif'] }],
  });
  return r.canceled ? [] : r.filePaths;
});

// ── Abrir el navegador por defecto (Chrome en el equipo de David) ──
ipcMain.handle('open-external', async (_e, url) => {
  await shell.openExternal(url);
});

// ── Config (guardar / leer credenciales) ──
ipcMain.handle('config-get', () => config.read());
ipcMain.handle('config-status', () => config.status());
ipcMain.handle('config-set', (_e, partial) => config.write(partial));

// ── Traducir (DeepL) ──
ipcMain.handle('translate', async (_e, { text, target }) => {
  const c = config.read();
  return translate.translate(text, target, c.deeplKey);
});

// ── Subir a Vimeo ──
ipcMain.handle('vimeo-upload', async (_e, { videoPath, title, description }) => {
  const c = config.read();
  if (!c.vimeoToken) throw new Error('Falta el token de Vimeo. Ponlo en Ajustes.');
  progress('Subiendo el vídeo a Vimeo…');
  const result = await vimeo.upload(videoPath, { title, description, token: c.vimeoToken, onProgress: progress });
  progress('Subido a Vimeo ✓');
  // Abrir la pagina del video en el navegador
  if (result.link) shell.openExternal(result.link);
  return result; // { id, link, embed, thumbnail, width, height }
});

// ── Publicar el proyecto entero ──
ipcMain.handle('publish', async (_e, data) => {
  const c = config.read();
  // data: { type, slug, title, descEs, descEn, meta, vimeoId, videoPath,
  //         images:[{path,ext}], renderName, ... }
  try {
    // 1. Generar la pagina HTML
    progress('Generando la página…');
    const html = generate.generatePage(data);

    // 2. Renombrar imagenes con SEO y preparar la galeria
    const renamed = data.images
      ? seo.renameImageBatch(data.renderName, data.images.map(im => ({ originalName: path.basename(im.path), ext: im.ext })))
      : [];

    // 3. Generar el clip cuadrado del grid (si hay video)
    let gridClip = null;
    if (data.videoPath) {
      progress('Generando el clip del grid…');
      gridClip = path.join(app.getPath('temp'), seo.seoGridClipName(data.slug));
      await stopmotion.generateStopMotion(data.videoPath, gridClip, data.gridOptions || {});
    }

    // 4. Bajar global.js del servidor, insertar el proyecto, dejarlo listo
    progress('Actualizando el grid…');
    const globalJs = await ftp.download(c.ftp, '/global.js');
    const newGlobal = grid.insertIntoGrid(globalJs.toString('utf8'), data);

    // 5. Subir todo por FTP a Hostinger
    progress('Subiendo a Hostinger…');
    await ftp.publishProject(c.ftp, {
      html, slug: data.slug, newGlobal, gridClip, renamed, images: data.images,
    });

    // 6. Abrir el proyecto online en el navegador
    const url = `${c.siteUrl}/work/${data.slug}`;
    progress('Publicado ✓');
    shell.openExternal(url);
    return { ok: true, url };
  } catch (err) {
    progress('Error: ' + err.message);
    throw err;
  }
});
