// ─────────────────────────────────────────────────────────────
// MOTOR DE GENERACION DE PAGINAS DE PROYECTO  ·  zeitlindavid.com
// Nucleo reutilizable. La futura app (Electron) llamara a estas funciones.
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const TPL_DIR = path.join(__dirname, 'templates');

// Construye el bloque bilingue de titulo + descripcion, con el formato
// exacto que usan las paginas actuales (ES oculto por defecto, EN visible).
function buildDescriptionBlock(desc) {
  function lang(d, isEs) {
    const id = isEs ? 'text-es' : 'text-en';
    const style = isEs ? ' style="display:none;"' : '';
    const lines = [`    <div id="${id}"${style}>`];
    lines.push(`        <h3 class="Titulo">${d.titulo}</h3>`);
    d.parrafos.forEach(p => lines.push(`        <p class="Texto">${p}</p>`));
    lines.push('    </div>');
    return lines.join('\n');
  }
  return '<div class="VidDescripcion">\n'
    + lang(desc.es, true) + '\n'
    + lang(desc.en, false) + '\n'
    + '</div>';
}

// Construye los <div class="render-item"> de la galeria, en el orden recibido.
// images: [{ src, alt }]  (src es solo el nombre de archivo, sin /img/)
function buildGalleryItems(images) {
  return (images || []).map(img =>
    `        <div class="render-item"><img src="/img/${img.src}" alt="${img.alt}" loading="lazy"></div>`
  ).join('\n');
}

// Rellena una plantilla con los datos del proyecto.
function fill(template, data) {
  const map = {
    TITLE_SUFFIX: data.titleSuffix,
    SLUG: data.slug,
    META_DESC: data.metaDesc,
    OG_TITLE: data.ogTitle,
    OG_IMAGE: data.ogImage,
    VIMEO_ID: data.vimeoId || '',
    THUMB: data.thumb || '',
    THUMB_ALT: data.thumbAlt || '',
    VER: String(data.ver != null ? data.ver : 3),
    DESCRIPTION_BLOCK: buildDescriptionBlock(data.description),
    GALLERY_ITEMS: buildGalleryItems(data.images),
  };
  return template.replace(/\{\{(\w+)\}\}/g, (m, key) =>
    key in map ? map[key] : m
  );
}

// Genera el HTML de una pagina de proyecto segun su variante.
//   data.type: 'video' | 'images' | 'video-images'
function generatePage(data) {
  const tplPath = path.join(TPL_DIR, (data.type || 'video') + '.html');
  const template = fs.readFileSync(tplPath, 'utf8');
  return fill(template, data);
}

module.exports = { generatePage, buildDescriptionBlock, buildGalleryItems, fill };
