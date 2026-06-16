// ─────────────────────────────────────────────────────────────
// FTP  ·  habla con Hostinger. Baja el global.js actual para no
// pisar nada, y sube la pagina nueva, el global.js actualizado, el
// clip del grid y las imagenes ya renombradas.
//
// Datos de acceso (host, usuario, contrasena) en Ajustes, una vez.
// ─────────────────────────────────────────────────────────────
const ftp = require('basic-ftp');
const { Readable, Writable } = require('stream');
const path = require('path');

async function withClient(cfg, fn) {
  const client = new ftp.Client(30000);
  try {
    await client.access({
      host: cfg.host,
      user: cfg.user,
      password: cfg.password,
      secure: true,            // Hostinger admite FTPS; mas seguro
      secureOptions: { rejectUnauthorized: false },
    });
    return await fn(client);
  } finally {
    client.close();
  }
}

// Baja un archivo remoto a memoria (Buffer)
async function download(cfg, remotePathRelative) {
  return withClient(cfg, async (client) => {
    const chunks = [];
    const sink = new Writable({ write(c, e, cb) { chunks.push(c); cb(); } });
    await client.downloadTo(sink, cfg.remoteRoot + remotePathRelative);
    return Buffer.concat(chunks);
  });
}

// Sube un texto (string) como archivo remoto
function uploadString(client, str, remotePath) {
  return client.uploadFrom(Readable.from([Buffer.from(str, 'utf8')]), remotePath);
}

// Publica el proyecto completo
async function publishProject(cfg, { html, slug, newGlobal, gridClip, renamed, images }) {
  return withClient(cfg, async (client) => {
    const root = cfg.remoteRoot;
    await client.ensureDir(root + '/work');
    await client.cd('/');

    // 1. Pagina del proyecto
    await uploadString(client, html, `${root}/work/${slug}.html`);

    // 2. global.js actualizado (con el proyecto ya insertado en el grid)
    await uploadString(client, newGlobal, `${root}/global.js`);

    // 3. Clip cuadrado del grid
    if (gridClip) {
      await client.uploadFrom(gridClip, `${root}/img/${path.basename(gridClip)}`);
    }

    // 4. Imagenes de la galeria, ya con nombre SEO
    if (images && renamed) {
      for (let i = 0; i < images.length; i++) {
        await client.uploadFrom(images[i].path, `${root}/img/${renamed[i].to}`);
      }
    }
  });
}

module.exports = { download, publishProject, withClient };
