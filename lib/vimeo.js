// ─────────────────────────────────────────────────────────────
// VIMEO  ·  sube el mp4 a Vimeo con su titulo y descripcion, y
// devuelve los datos que necesita la web (enlace, embed, miniatura,
// dimensiones). Usa el protocolo tus (subida reanudable).
//
// Necesita un token personal de Vimeo con permisos de subir + editar,
// que David pega una sola vez en Ajustes.
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const tus = require('tus-js-client');

const API = 'https://api.vimeo.com';
const headers = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/vnd.vimeo.*+json;version=3.4',
});

// Sube el video y devuelve sus datos.
async function upload(videoPath, { title, description, token, onProgress }) {
  const size = fs.statSync(videoPath).size;

  // 1. Crear el video en Vimeo, con metadata, pidiendo subida tus
  const createRes = await fetch(`${API}/me/videos`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      upload: { approach: 'tus', size: String(size) },
      name: title || '',
      description: description || '',
      privacy: { view: 'anybody', embed: 'public' },
    }),
  });
  if (!createRes.ok) {
    throw new Error('Vimeo rechazó la subida (' + createRes.status + '): ' + (await createRes.text()));
  }
  const created = await createRes.json();
  const uploadLink = created.upload.upload_link;
  const id = created.uri.split('/').pop();

  // 2. Subir el archivo por tus (reanudable, en trozos)
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(videoPath);
    const up = new tus.Upload(stream, {
      uploadUrl: uploadLink,
      uploadSize: size,
      chunkSize: 10 * 1024 * 1024,
      retryDelays: [0, 1000, 3000, 5000],
      onError: reject,
      onProgress: (sent, total) => {
        if (onProgress) onProgress(`Subiendo a Vimeo… ${Math.round((sent / total) * 100)}%`);
      },
      onSuccess: resolve,
    });
    up.start();
  });

  // 3. Leer los datos finales del video
  return getVideo(id, token);
}

// Lee los datos de un video ya existente (tambien sirve si el video
// ya estaba en Vimeo y David solo pega el enlace).
async function getVideo(idOrUrl, token) {
  const id = String(idOrUrl).split('/').pop().split('?')[0];
  const fields = 'uri,link,name,description,width,height,duration,pictures.base_link,player_embed_url';
  const res = await fetch(`${API}/videos/${id}?fields=${fields}`, { headers: headers(token) });
  if (!res.ok) throw new Error('No se pudieron leer los datos del vídeo (' + res.status + ')');
  const v = await res.json();
  return {
    id,
    link: v.link,                              // https://vimeo.com/ID
    embed: v.player_embed_url,
    title: v.name,
    description: v.description,
    width: v.width,
    height: v.height,
    duration: v.duration,
    thumbnail: v.pictures && v.pictures.base_link,
  };
}

// Comprueba que el token de Vimeo es válido leyendo el perfil del usuario
async function verifyToken(token) {
  try {
    const res = await fetch(`${API}/me?fields=uri`, { headers: headers(token) });
    return res.ok;
  } catch {
    return false;
  }
}

module.exports = { upload, getVideo, verifyToken };
