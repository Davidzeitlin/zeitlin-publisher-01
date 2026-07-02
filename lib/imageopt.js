// ─────────────────────────────────────────────────────────────
// IMAGEOPT  ·  optimiza imagenes al subirlas (PNG/JPG -> JPG 1920px,
// calidad alta, fondo negro para PNG transparentes), igual que el
// pipeline manual. Usa "sharp" si esta instalado; si no, pasa el
// archivo tal cual sin romper nada.
// ─────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

let sharp = null;
try { sharp = require('sharp'); } catch { sharp = null; }

const OPTIMIZABLE = ['.png', '.jpg', '.jpeg'];

// Devuelve { path, name } del archivo a subir: el optimizado si se pudo,
// o el original si sharp no esta o no aplica.
async function optimizeForUpload(localPath, opts = {}) {
  const ext = path.extname(localPath).toLowerCase();
  const base = path.basename(localPath, ext);
  if (!sharp || !OPTIMIZABLE.includes(ext)) {
    return { path: localPath, name: path.basename(localPath), optimized: false };
  }
  const maxW = opts.maxWidth || 1920;
  const outName = base + '.jpg';
  const outPath = path.join(opts.tmpDir || path.dirname(localPath), '_opt_' + outName);
  try {
    const img = sharp(localPath).rotate();
    const meta = await img.metadata();
    let pipe = img;
    if (meta.width && meta.width > maxW) pipe = pipe.resize({ width: maxW });
    pipe = pipe.flatten({ background: { r: 0, g: 0, b: 0 } }) // fondo negro para PNG transparentes
               .jpeg({ quality: 95, chromaSubsampling: '4:4:4', mozjpeg: true });
    await pipe.toFile(outPath);
    return { path: outPath, name: outName, optimized: true };
  } catch {
    return { path: localPath, name: path.basename(localPath), optimized: false };
  }
}

module.exports = { optimizeForUpload, available: () => !!sharp };
