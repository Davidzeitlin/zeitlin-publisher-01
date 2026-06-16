// ─────────────────────────────────────────────────────────────
// NOMBRADO SEO  ·  convierte archivos sueltos en nombres web ricos en
// palabras clave. El usuario escribe el nombre con espacios y la
// herramienta lo pasa a formato web (minusculas, guiones, sin acentos)
// y le anade el numero segun el orden.
//   "coral rewards club render"  ->  coral-rewards-club-render-01-david-zeitlin.jpg
// ─────────────────────────────────────────────────────────────

function slugify(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Nombre SEO de una imagen a partir del texto base que escribe el usuario.
//   baseText:  lo que el usuario teclea, con espacios ("coral rewards club render")
//   index:     posicion 0-based -> se numera 01, 02...
//   ext:       extension original conservada
//   appendAuthor: anadir "-david-zeitlin" al final (true por defecto)
function seoImageName(baseText, index, ext, appendAuthor = true) {
  const base = slugify(baseText);
  const nn = String(index + 1).padStart(2, '0');
  const e = (ext || 'jpg').toLowerCase().replace(/^\./, '');
  const author = appendAuthor ? '-david-zeitlin' : '';
  return `${base}-${nn}${author}.${e}`;
}

// Renombra un lote en el orden recibido (el orden de la galeria).
function renameImageBatch(baseText, files, appendAuthor = true) {
  return files.map((f, i) => ({
    from: f.originalName,
    to: seoImageName(baseText, i, f.ext, appendAuthor),
  }));
}

// Clip del grid y miniatura, a partir del slug del proyecto.
function seoGridClipName(slug) { return `${slug}-david-zeitlin.mp4`; }
function seoVideoThumbName(slug) { return `${slug}-video-thumb.jpg`; }

module.exports = { slugify, seoImageName, renameImageBatch, seoGridClipName, seoVideoThumbName };
