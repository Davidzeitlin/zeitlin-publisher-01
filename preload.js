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
  translate: (text, target) => ipcRenderer.invoke('translate', { text, target }),
  vimeoUpload: (videoPath, title, description) =>
    ipcRenderer.invoke('vimeo-upload', { videoPath, title, description }),
  publish: (data) => ipcRenderer.invoke('publish', data),

  // Escuchar mensajes de progreso desde el proceso principal
  onProgress: (cb) => ipcRenderer.on('progress', (_e, msg) => cb(msg)),
});
