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

// Mueve archivos a una papelera dentro del hosting en vez de borrarlos.
// Asi nunca se pierde nada: David vacia la papelera a mano cuando quiera.
async function moveToTrash(cfg, files) {
  return withClient(cfg, async (client) => {
    const root = cfg.remoteRoot;
    const trash = root + '/_papelera';
    await client.ensureDir(trash);
    await client.cd('/');
    const moved = [];
    for (const rel of files) {
      if (!rel) continue;
      const from = root + rel;
      const to = trash + '/' + rel.split('/').pop();
      try {
        await client.rename(from, to);
        moved.push(rel);
      } catch (e) {
        // si el archivo ya no existe, se ignora sin romper el proceso
      }
    }
    return moved;
  });
}

// ─── Operaciones del gestor de archivos ───

// Lista el contenido de una carpeta remota (relativa a remoteRoot, '' = raiz)
async function list(cfg, dirRel) {
  return withClient(cfg, async (client) => {
    const items = await client.list(cfg.remoteRoot + (dirRel || ''));
    return items
      .filter((it) => it.name !== '.' && it.name !== '..')
      .map((it) => ({
        name: it.name,
        type: it.isDirectory ? 'folder' : 'file',
        size: it.size || 0,
        mtime: it.modifiedAt ? new Date(it.modifiedAt).getTime() : null,
      }));
  });
}

// Sube un archivo local a una carpeta remota
async function uploadFile(cfg, localPath, dirRel, name) {
  const target = cfg.remoteRoot + (dirRel || '') + '/' + (name || path.basename(localPath));
  return withClient(cfg, (client) => client.uploadFrom(localPath, target));
}

// Baja un archivo remoto a una ruta local del ordenador
async function downloadFile(cfg, remoteRel, localPath) {
  return withClient(cfg, (client) => client.downloadTo(localPath, cfg.remoteRoot + remoteRel));
}

// Renombra o mueve dentro del propio hosting
async function renamePath(cfg, fromRel, toRel) {
  return withClient(cfg, (client) => client.rename(cfg.remoteRoot + fromRel, cfg.remoteRoot + toRel));
}

// Crea una carpeta nueva
async function makeDir(cfg, dirRel) {
  return withClient(cfg, async (client) => {
    await client.ensureDir(cfg.remoteRoot + dirRel);
    await client.cd('/');
  });
}

// Comprueba si existe un archivo remoto (relativo a remoteRoot)
async function fileExists(cfg, rel) {
  return withClient(cfg, async (client) => {
    const dir = (cfg.remoteRoot + rel).replace(/\/[^/]*$/, '') || '/';
    const name = rel.split('/').pop();
    try {
      const items = await client.list(dir);
      return items.some((it) => it.name === name);
    } catch {
      return false;
    }
  });
}

// Guarda una copia con fecha de un contenido en /public_html/_backups,
// sin tocar el original. El llamante pasa el contenido que ya tiene en
// memoria (lo que acaba de descargar antes de modificarlo).
async function backupBuffer(cfg, name, buffer) {
  return withClient(cfg, async (client) => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await client.ensureDir(cfg.remoteRoot + '/_backups');
    await client.cd('/');
    const dest = cfg.remoteRoot + '/_backups/' + stamp + '__' + name;
    const stream = require('stream').Readable.from([Buffer.from(buffer)]);
    await client.uploadFrom(stream, dest);
    return '/_backups/' + stamp + '__' + name;
  });
}

// Prueba que las credenciales de FTP conectan y devuelve true/false
async function testConnection(cfg) {
  try {
    await withClient(cfg, (client) => client.list(cfg.remoteRoot));
    return true;
  } catch {
    return false;
  }
}

module.exports = { download, publishProject, moveToTrash, withClient, list, uploadFile, downloadFile, renamePath, makeDir, fileExists, backupBuffer, testConnection };
