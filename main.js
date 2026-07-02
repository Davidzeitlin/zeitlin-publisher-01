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
const manage = require('./lib/manage');
const pagelib = require('./lib/page');
const health = require('./lib/health');
const imageopt = require('./lib/imageopt');
const stopmotion = require('./lib/stopmotion');
const seo = require('./lib/seo-naming');
let autoUpdater = null;
try { autoUpdater = require('electron-updater').autoUpdater; } catch { autoUpdater = null; }

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
  win.loadFile(path.join(__dirname, 'src', 'app-unificada-preview.html'));
}

app.whenReady().then(() => {
  config.init(app.getPath('userData'));
  createWindow();
  // Autoactualización: busca nuevas versiones publicadas y las instala
  if (autoUpdater) {
    try {
      autoUpdater.autoDownload = true;
      autoUpdater.on('update-downloaded', () => { if (win) win.webContents.send('progress', 'Actualización lista, se instalará al cerrar'); });
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    } catch {}
  }
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

// ── Leer la web real: baja global.js y devuelve el grid en orden ──
ipcMain.handle('load-site', async () => {
  const c = config.read();
  if (!c.ftp || !c.ftp.host) throw new Error('Faltan los datos de Hostinger. Ponlos en Ajustes.');
  progress('Cargando tu web…');
  const buf = await ftp.download(c.ftp, '/global.js');
  const projects = manage.readGrid(buf.toString('utf8'));
  progress('Web cargada ✓');
  return {
    siteUrl: (c.siteUrl || 'https://zeitlindavid.com').replace(/\/$/, ''),
    projects: projects.map(p => ({ type: p.type, slug: p.slug, file: p.file, name: p.name })),
  };
});

// ── Guardar cambios del grid: nuevo orden y proyectos quitados ──
ipcMain.handle('save-grid', async (_e, { order, removed }) => {
  const c = config.read();
  try {
    progress('Bajando tu web para no pisar nada…');
    let js = (await ftp.download(c.ftp, '/global.js')).toString('utf8');

    // copia de seguridad del global.js actual en el servidor antes de tocarlo
    try { progress('Copia de seguridad…'); await ftp.backupBuffer(c.ftp, 'global.js', js); } catch (e) { /* no bloquear */ }

    // Archivos a la papelera por cada proyecto quitado (antes de tocar el grid)
    const trashFiles = [];
    (removed || []).forEach((slug) => {
      const f = manage.projectFiles(js, slug);
      if (f) { if (f.page) trashFiles.push(f.page); if (f.gridFile) trashFiles.push(f.gridFile); }
    });

    // Quitar del grid los proyectos eliminados
    (removed || []).forEach((slug) => { js = manage.removeFromGrid(js, slug); });

    // Reordenar el grid segun el orden actual de la interfaz
    if (order && order.length) {
      const present = order.filter((slug) => manage.readGrid(js).some((p) => p.slug === slug));
      js = manage.reorderGrid(js, present);
    }

    progress('Subiendo el grid actualizado…');
    await ftp.withClient(c.ftp, (client) =>
      client.uploadFrom(require('stream').Readable.from([Buffer.from(js, 'utf8')]), c.ftp.remoteRoot + '/global.js')
    );

    if (trashFiles.length) {
      progress('Moviendo a la papelera lo eliminado…');
      await ftp.moveToTrash(c.ftp, trashFiles);
    }

    progress('Guardado ✓');
    return { ok: true };
  } catch (err) {
    progress('Error al guardar: ' + err.message);
    throw err;
  }
});

// ── Probar conexiones (FTP, Vimeo, DeepL) de verdad ──
ipcMain.handle('test-connections', async () => {
  const c = config.read();
  const out = { ftp: false, vimeo: false, deepl: false };
  out.ftp = (c.ftp && c.ftp.host && c.ftp.user) ? await ftp.testConnection(c.ftp).catch(() => false) : false;
  if (c.vimeoToken) { try { out.vimeo = await vimeo.verifyToken(c.vimeoToken); } catch { out.vimeo = false; } }
  if (c.deeplKey) { try { out.deepl = await translate.verifyKey(c.deeplKey); } catch { out.deepl = false; } }
  return out;
});

// ── Cargar el contenido real de un proyecto (para editarlo) ──
ipcMain.handle('load-project', async (_e, slug) => {
  const c = config.read();
  progress('Abriendo proyecto…');
  const html = (await ftp.download(c.ftp, '/work/' + slug + '.html')).toString('utf8');
  const info = pagelib.parsePage(html);
  progress('');
  return info;
});

// ── Guardar el contenido editado de un proyecto ──
ipcMain.handle('save-project', async (_e, { slug, edits }) => {
  const c = config.read();
  progress('Guardando proyecto…');
  const rel = '/work/' + slug + '.html';
  const html = (await ftp.download(c.ftp, rel)).toString('utf8');
  try { await ftp.backupBuffer(c.ftp, slug + '.html', html); } catch (e) { /* no bloquear */ }
  const edited = pagelib.applyEdits(html, edits);
  await ftp.withClient(c.ftp, (client) =>
    client.uploadFrom(require('stream').Readable.from([Buffer.from(edited, 'utf8')]), c.ftp.remoteRoot + rel)
  );
  progress('Proyecto guardado ✓');
  return { ok: true };
});

// ── Revisión de salud real del sitio ──
ipcMain.handle('health-scan', async () => {
  const c = config.read();
  const js = (await ftp.download(c.ftp, '/global.js')).toString('utf8');
  const getPage = async (slug) => {
    try { return (await ftp.download(c.ftp, '/work/' + slug + '.html')).toString('utf8'); } catch { return null; }
  };
  return health.scan(js, getPage);
});

// ── Gestor de archivos: operaciones reales por FTP ──
ipcMain.handle('fm-list', async (_e, dirRel) => {
  const c = config.read();
  if (!c.ftp || !c.ftp.host) throw new Error('Faltan los datos de Hostinger. Ponlos en Ajustes.');
  return ftp.list(c.ftp, dirRel || '');
});

ipcMain.handle('fm-upload', async (_e, dirRel) => {
  const c = config.read();
  const r = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'] });
  if (r.canceled) return { uploaded: [] };
  const uploaded = [];
  for (const local of r.filePaths) {
    const opt = await imageopt.optimizeForUpload(local, { tmpDir: app.getPath('temp') });
    progress('Subiendo ' + opt.name + (opt.optimized ? ' (optimizada)' : '') + '…');
    await ftp.uploadFile(c.ftp, opt.path, dirRel || '', opt.name);
    uploaded.push(opt.name);
  }
  progress('Subida completa ✓');
  return { uploaded };
});

ipcMain.handle('fm-upload-paths', async (_e, { dirRel, paths }) => {
  const c = config.read();
  const uploaded = [];
  for (const local of (paths || [])) {
    const opt = await imageopt.optimizeForUpload(local, { tmpDir: app.getPath('temp') });
    progress('Subiendo ' + opt.name + (opt.optimized ? ' (optimizada)' : '') + '…');
    await ftp.uploadFile(c.ftp, opt.path, dirRel || '', opt.name);
    uploaded.push(opt.name);
  }
  progress('Subida completa ✓');
  return { uploaded };
});

ipcMain.handle('fm-download', async (_e, remoteRel) => {
  const c = config.read();
  const name = remoteRel.split('/').pop();
  const r = await dialog.showSaveDialog(win, { defaultPath: name });
  if (r.canceled) return { ok: false };
  progress('Descargando ' + name + '…');
  await ftp.downloadFile(c.ftp, remoteRel, r.filePath);
  progress('Descargado ✓');
  return { ok: true };
});

ipcMain.handle('fm-rename', async (_e, { fromRel, toRel }) => {
  const c = config.read();
  await ftp.renamePath(c.ftp, fromRel, toRel);
  return { ok: true };
});

ipcMain.handle('fm-move', async (_e, { items, toDirRel }) => {
  const c = config.read();
  for (const rel of items) {
    const name = rel.split('/').pop();
    await ftp.renamePath(c.ftp, rel, (toDirRel || '') + '/' + name);
  }
  return { ok: true };
});

ipcMain.handle('fm-delete', async (_e, items) => {
  const c = config.read();
  progress('Moviendo a la papelera…');
  await ftp.moveToTrash(c.ftp, items);
  progress('Hecho ✓');
  return { ok: true };
});

ipcMain.handle('fm-mkdir', async (_e, dirRel) => {
  const c = config.read();
  await ftp.makeDir(c.ftp, dirRel);
  return { ok: true };
});

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
