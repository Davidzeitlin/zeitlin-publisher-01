// ─────────────────────────────────────────────────────────────
// PRELOAD  ·  expone una API segura y acotada a la interfaz.
// La interfaz (index.html) llama a window.api.algo(...) y eso viaja
// al proceso principal. No tiene acceso directo a Node ni al disco.
// ─────────────────────────────────────────────────────────────
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Archivos
  pickVideo: () => ipcRenderer.invoke('pick-video'),
  pickImages: () => ipcRenderer.invoke('pick-images'),

  // Navegador
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Credenciales
  configGet: () => ipcRenderer.invoke('config-get'),
  configStatus: () => ipcRenderer.invoke('config-status'),
  configSet: (partial) => ipcRenderer.invoke('config-set', partial),

  // Acciones principales
  loadSite: () => ipcRenderer.invoke('load-site'),
  saveGrid: (payload) => ipcRenderer.invoke('save-grid', payload),
  testConnections: () => ipcRenderer.invoke('test-connections'),
  loadProject: (slug) => ipcRenderer.invoke('load-project', slug),
  saveProject: (slug, edits) => ipcRenderer.invoke('save-project', { slug, edits }),
  healthScan: () => ipcRenderer.invoke('health-scan'),
  translate: (text, target) => ipcRenderer.invoke('translate', { text, target }),
  vimeoUpload: (videoPath, title, description) =>
    ipcRenderer.invoke('vimeo-upload', { videoPath, title, description }),
  publish: (data) => ipcRenderer.invoke('publish', data),

  // Gestor de archivos
  fmList: (dirRel) => ipcRenderer.invoke('fm-list', dirRel),
  fmUpload: (dirRel) => ipcRenderer.invoke('fm-upload', dirRel),
  fmUploadPaths: (dirRel, paths) => ipcRenderer.invoke('fm-upload-paths', { dirRel, paths }),
  fmDownload: (remoteRel) => ipcRenderer.invoke('fm-download', remoteRel),
  fmRename: (fromRel, toRel) => ipcRenderer.invoke('fm-rename', { fromRel, toRel }),
  fmMove: (items, toDirRel) => ipcRenderer.invoke('fm-move', { items, toDirRel }),
  fmDelete: (items) => ipcRenderer.invoke('fm-delete', items),
  fmMkdir: (dirRel) => ipcRenderer.invoke('fm-mkdir', dirRel),

  // Escuchar mensajes de progreso desde el proceso principal
  onProgress: (cb) => ipcRenderer.on('progress', (_e, msg) => cb(msg)),
});
