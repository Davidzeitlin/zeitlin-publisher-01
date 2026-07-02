// ─────────────────────────────────────────────────────────────
// MANAGE · GRID  ·  lee el grid actual de global.js para la pestana
// Organizar, y lo reordena moviendo las lineas enteras (sin re-
// serializar) para preservar el contenido exacto de cada entrada.
//
//   Cada entrada del grid es:
//   ['v'|'i', slug, archivo, textoAlt, clase, (img-N opcional)]
// ─────────────────────────────────────────────────────────────

// Localiza el bloque "var G=[ ... ];" dentro de global.js
function locateGrid(js) {
  const startMatch = js.match(/var\s+G\s*=\s*\[/);
  if (!startMatch) throw new Error('No se encontró el grid (var G=[) en global.js');
  const startIdx = startMatch.index + startMatch[0].length;
  // buscar el cierre "];" del array a partir de ahi
  const closeIdx = js.indexOf('];', startIdx);
  if (closeIdx === -1) throw new Error('No se encontró el cierre del grid');
  return {
    head: js.slice(0, startIdx),          // todo hasta "var G=["
    body: js.slice(startIdx, closeIdx),   // las lineas de entradas
    tail: js.slice(closeIdx),             // desde "];" hasta el final
  };
}

// Extrae los campos de una linea de entrada conservando la linea original.
// Tolera apostrofes escapados dentro de un valor (p. ej. 'Foxy\'s') para no
// descuadrar los campos.
function parseLine(raw) {
  const fields = [...raw.matchAll(/'((?:\\.|[^'\\])*)'/g)].map(m => m[1].replace(/\\(['\\])/g, '$1'));
  if (fields.length < 2) return null;
  return {
    type: fields[0],          // 'v' (video) o 'i' (imagenes)
    slug: fields[1],          // identificador del proyecto
    file: fields[2] || '',    // mp4 del grid o thumb
    name: fields[3] || '',    // texto alternativo / nombre
    raw,                      // la linea exacta, para reescribir sin tocarla
  };
}

// Lee el grid: devuelve la lista de proyectos en orden
function readGrid(js) {
  const { body } = locateGrid(js);
  const lines = body.split('\n').map(l => l.trim()).filter(l => l.startsWith("['"));
  return lines.map(parseLine).filter(Boolean);
}

// Reordena el grid segun una lista de slugs en el nuevo orden.
// Devuelve el global.js completo con solo el orden cambiado.
function reorderGrid(js, newSlugOrder) {
  const { head, body, tail } = locateGrid(js);
  const rawLines = body.split('\n').map(l => l.trim()).filter(l => l.startsWith("['"));
  // mapa slug -> linea original
  const bySlug = {};
  rawLines.forEach(l => {
    const p = parseLine(l);
    if (p) bySlug[p.slug] = l;
  });
  // construir el nuevo cuerpo en el orden pedido
  const ordered = newSlugOrder.map(slug => bySlug[slug]).filter(Boolean);
  // por seguridad, anadir al final cualquier linea que no estuviera en la lista
  rawLines.forEach(l => {
    const p = parseLine(l);
    if (p && !newSlugOrder.includes(p.slug)) ordered.push(l);
  });
  const newBody = '\n' + ordered.join('\n') + '\n';
  return head + newBody + tail;
}

// Quita un proyecto del grid por su slug. Devuelve el global.js sin esa
// linea, con el resto intacto y recolocado solo (los huecos no existen
// porque las lineas simplemente se juntan).
function removeFromGrid(js, slug) {
  const { head, body, tail } = locateGrid(js);
  const rawLines = body.split('\n').map(l => l.trim()).filter(l => l.startsWith("['"));
  const kept = rawLines.filter(l => {
    const p = parseLine(l);
    return p && p.slug !== slug;
  });
  if (kept.length === rawLines.length) {
    throw new Error('No se encontró el proyecto "' + slug + '" en el grid');
  }
  const newBody = '\n' + kept.join('\n') + '\n';
  return head + newBody + tail;
}

// Devuelve los archivos de un proyecto que habria que mover a la papelera:
// su pagina y el clip/thumb del grid. Las imagenes de galeria se anaden
// aparte cuando se lee la pagina (fase de edicion de paginas).
function projectFiles(js, slug) {
  const item = readGrid(js).find(p => p.slug === slug);
  if (!item) return null;
  return {
    page: `/work/${slug}.html`,
    gridFile: item.file ? `/img/${item.file}` : null,
  };
}

module.exports = { readGrid, reorderGrid, removeFromGrid, projectFiles, locateGrid, parseLine };
