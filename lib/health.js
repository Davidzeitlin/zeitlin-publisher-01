// ─────────────────────────────────────────────────────────────
// HEALTH  ·  revisa la salud del sitio: proyectos sin ID de Vimeo,
// paginas que faltan, descripciones vacias. Trabaja sobre el grid
// (global.js) y, si se le pasan, sobre el HTML de cada pagina.
// ─────────────────────────────────────────────────────────────
const manage = require('./manage');
const page = require('./page');

// grid: texto de global.js. getPage(slug)->Promise<html|null> opcional.
async function scan(gridJs, getPage) {
  const grid = manage.readGrid(gridJs);
  const issues = [];
  for (const p of grid) {
    if (!p.file) issues.push({ slug: p.slug, level: 'warn', msg: 'sin archivo de grid (miniatura)' });
    if (getPage) {
      let html = null;
      try { html = await getPage(p.slug); } catch { html = null; }
      if (!html) { issues.push({ slug: p.slug, level: 'error', msg: 'no se encontró su página' }); continue; }
      const info = page.parsePage(html);
      if (p.type === 'v' && (!info.vimeoIds.length || info.vimeoIds.every((v) => !v))) {
        issues.push({ slug: p.slug, level: 'error', msg: 'vídeo sin ID de Vimeo' });
      }
      if (!info.descEn.parrafos.length && !info.descEs.parrafos.length) {
        issues.push({ slug: p.slug, level: 'warn', msg: 'sin descripción' });
      }
      if (!info.titleSuffix) issues.push({ slug: p.slug, level: 'warn', msg: 'sin título en la pestaña' });
    }
  }
  return { total: grid.length, issues };
}

module.exports = { scan };
