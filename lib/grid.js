// ─────────────────────────────────────────────────────────────
// CONEXION CON EL GRID  ·  inserta un proyecto nuevo en el array G de global.js
// El grid se ordena de mas reciente (arriba) a mas antiguo (abajo),
// asi que un proyecto nuevo se inserta al PRINCIPIO del array por defecto.
// ─────────────────────────────────────────────────────────────

// Localiza el array "var G=[ ... ];" dentro de global.js
function findGridArray(js) {
  const startMarker = 'var G=[';
  const start = js.indexOf(startMarker);
  if (start === -1) throw new Error('No se encontro "var G=[" en global.js');
  const arrOpen = start + startMarker.length - 1; // posicion del '['
  // buscar el cierre "];" equilibrando corchetes
  let i = arrOpen, depth = 0;
  for (; i < js.length; i++) {
    if (js[i] === '[') depth++;
    else if (js[i] === ']') { depth--; if (depth === 0) break; }
  }
  return { open: arrOpen, close: i }; // indices del '[' y del ']' exterior
}

// Calcula el siguiente numero "img-N" mirando los ya usados en el array.
function getNextImgNumber(js) {
  const nums = [...js.matchAll(/img-(\d+)/g)].map(m => parseInt(m[1], 10));
  const max = nums.length ? Math.max(...nums) : 0;
  return max + 1;
}

// Escapa comillas simples para insertar texto dentro de la cadena JS.
function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// Construye la linea del array para un proyecto.
//   data.type: 'video' | 'images' | 'video-images'
//   data.gridFile: nombre del archivo que se muestra en el grid (mp4 stop-motion o jpg)
//   data.gridAlt:  texto alternativo del item del grid
//   data.slug, y para video se asigna img-N automatico
function buildGridLine(data, nextNum) {
  const isVideo = data.type === 'video' || data.type === 'video-images';
  const tipo = isVideo ? 'v' : 'i';
  const fields = [
    `'${tipo}'`,
    `'${esc(data.slug)}'`,
    `'${esc(data.gridFile)}'`,
    `'${esc(data.gridAlt)}'`,
  ];
  if (isVideo) {
    const tag = 'img-' + nextNum;
    fields.push(`'${tag}'`); // id
    fields.push(`'${tag}'`); // clase css
  } else {
    // id descriptivo derivado del slug (unico, sin uso funcional)
    fields.push(`'${esc(data.gridId || ('grid-' + data.slug))}'`);
  }
  return '[' + fields.join(',') + ']';
}

// Inserta la linea al principio del array (proyecto mas reciente arriba).
function insertIntoGrid(js, data) {
  const { open, close } = findGridArray(js);
  const nextNum = getNextImgNumber(js);
  const line = buildGridLine(data, nextNum);

  // Contenido actual entre corchetes (sin los corchetes)
  const inner = js.slice(open + 1, close);
  // Insertar la nueva linea al principio, respetando el formato (una linea + coma)
  const newInner = '\n' + line + ',\n' + inner.replace(/^\n/, '');
  const newJs = js.slice(0, open + 1) + newInner + js.slice(close);
  return { js: newJs, line, imgNumber: nextNum };
}

module.exports = { findGridArray, getNextImgNumber, buildGridLine, insertIntoGrid };
