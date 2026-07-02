// ─────────────────────────────────────────────────────────────
// PAGE  ·  lee una pagina de proyecto ya publicada y extrae sus
// campos editables (titulo, meta, descripciones ES/EN, IDs de Vimeo,
// galeria). Y reescribe esos campos sobre la misma pagina sin tocar
// el resto, para no perder nada de lo que ya estaba.
// ─────────────────────────────────────────────────────────────

function decodeEntities(s) {
  return String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function encodeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// Extrae <h3 class="Titulo"> y los <p class="Texto"> de un bloque de idioma
function parseLangBlock(inner) {
  if (!inner) return { titulo: '', parrafos: [] };
  const tituloM = inner.match(/<h3[^>]*class="Titulo"[^>]*>([\s\S]*?)<\/h3>/i);
  const parrafos = [...inner.matchAll(/<p[^>]*class="Texto"[^>]*>([\s\S]*?)<\/p>/gi)].map(m => decodeEntities(m[1].trim()));
  return { titulo: tituloM ? decodeEntities(tituloM[1].trim()) : '', parrafos };
}

function parsePage(html) {
  const titleM = html.match(/<title>[^<]* - ([^<]*)<\/title>/i);
  const metaM = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const esM = html.match(/<div\s+id="text-es"[^>]*>([\s\S]*?)<\/div>/i);
  const enM = html.match(/<div\s+id="text-en"[^>]*>([\s\S]*?)<\/div>/i);
  const vimeoIds = [...html.matchAll(/data-video-id="([^"]*)"/gi)].map(m => m[1]).filter(Boolean);
  const gallery = [...html.matchAll(/<div\s+class="render-item">\s*<img\s+src="\/img\/([^"]*)"\s+alt="([^"]*)"/gi)]
    .map(m => ({ src: decodeEntities(m[1]), alt: decodeEntities(m[2]) }));
  return {
    titleSuffix: titleM ? decodeEntities(titleM[1].trim()) : '',
    metaDesc: metaM ? decodeEntities(metaM[1]) : '',
    descEs: parseLangBlock(esM ? esM[1] : ''),
    descEn: parseLangBlock(enM ? enM[1] : ''),
    vimeoIds,
    gallery,
  };
}

// Reconstruye el interior de un bloque de idioma (h3 + p)
function buildLangInner(d) {
  const lines = ['', '        <h3 class="Titulo">' + (d.titulo || '') + '</h3>'];
  (d.parrafos || []).forEach(p => lines.push('        <p class="Texto">' + p + '</p>'));
  lines.push('    ');
  return lines.join('\n');
}

// Reescribe los campos editados sobre la pagina original
function applyEdits(html, edits) {
  let out = html;
  if (edits.titleSuffix != null) {
    out = out.replace(/(<title>[^<]* - )([^<]*)(<\/title>)/i, (m, a, b, c) => a + edits.titleSuffix + c);
  }
  if (edits.metaDesc != null) {
    out = out.replace(/(<meta\s+name="description"\s+content=")([^"]*)(")/i, (m, a, b, c) => a + encodeAttr(edits.metaDesc) + c);
  }
  if (edits.descEs) {
    out = out.replace(/(<div\s+id="text-es"[^>]*>)([\s\S]*?)(<\/div>)/i, (m, a, b, c) => a + buildLangInner(edits.descEs) + c);
  }
  if (edits.descEn) {
    out = out.replace(/(<div\s+id="text-en"[^>]*>)([\s\S]*?)(<\/div>)/i, (m, a, b, c) => a + buildLangInner(edits.descEn) + c);
  }
  if (Array.isArray(edits.gallery)) {
    const items = edits.gallery.map(g =>
      '        <div class="render-item"><img src="/img/' + g.src + '" alt="' + encodeAttr(g.alt || '') + '" loading="lazy"></div>'
    ).join('\n');
    const blocks = [...out.matchAll(/<div\s+class="render-item">[\s\S]*?<\/div>/gi)];
    if (blocks.length) {
      const start = blocks[0].index;
      const end = blocks[blocks.length - 1].index + blocks[blocks.length - 1][0].length;
      out = out.slice(0, start) + items + out.slice(end);
    }
  }
  if (Array.isArray(edits.vimeoIds) && edits.vimeoIds.length) {
    let i = 0;
    out = out.replace(/(data-video-id=")([^"]*)(")/gi, (m, a, b, c) => a + (edits.vimeoIds[i++] != null ? edits.vimeoIds[i - 1] : b) + c);
  }
  return out;
}

module.exports = { parsePage, applyEdits };
