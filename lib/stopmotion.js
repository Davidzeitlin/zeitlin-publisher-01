// ─────────────────────────────────────────────────────────────
// STOP-MOTION DEL GRID  ·  genera el clip corto y cuadrado que va en el grid
// Replica el formato de los clips actuales: ~250x250, h264, ~1s, pocas poses
// sostenidas (efecto stop-motion). Recorta a cuadrado sea cual sea el formato.
// ─────────────────────────────────────────────────────────────
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Resuelve el binario: usa el empaquetado (ffmpeg-static / ffprobe-static)
// dentro de la app, y el del sistema como respaldo en desarrollo.
// El .replace ajusta la ruta cuando va dentro del paquete (asar).
function resolveBin(pkg, fallback) {
  try {
    let p = require(pkg);
    if (p && typeof p === 'object' && p.path) p = p.path;
    if (typeof p === 'string' && p) return p.replace('app.asar', 'app.asar.unpacked');
  } catch (e) { /* no instalado: usar el del sistema */ }
  return fallback;
}
const FFMPEG  = process.env.FFMPEG_PATH  || resolveBin('ffmpeg-static', 'ffmpeg');
const FFPROBE = process.env.FFPROBE_PATH || resolveBin('ffprobe-static', 'ffprobe');

// Duracion del video de entrada en segundos
function probeDuration(input) {
  const out = execFileSync(FFPROBE, [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', input,
  ]).toString().trim();
  return parseFloat(out);
}

// Genera el stop-motion.
//   input:  ruta del mp4 original del proyecto
//   output: ruta del mp4 resultante para el grid
//   opts: { frames=6, size=250, duration=1, fps=24, cropX=null }
//     cropX: desplazamiento horizontal del recorte (0..1). null = centrado.
function generateStopMotion(input, output, opts = {}) {
  const frames   = opts.frames   || 6;
  const size     = opts.size     || 250;
  const duration = opts.duration || 1;
  const fps      = opts.fps      || 24;

  const dur = probeDuration(input);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-'));

  // Expresion de recorte a cuadrado. Por defecto centrado; si se pide
  // cropX (0..1), se desplaza horizontalmente para encuadres no centrados.
  let crop;
  if (opts.cropX != null && opts.cropX >= 0 && opts.cropX <= 1) {
    // S = lado menor; x = desplazamiento dentro del margen sobrante
    crop = `crop='min(iw,ih)':'min(iw,ih)':'(iw-min(iw,ih))*${opts.cropX}':'(ih-min(iw,ih))/2'`;
  } else {
    crop = `crop='min(iw,ih)':'min(iw,ih)'`; // centrado (ffmpeg centra por defecto)
  }
  const vf = `${crop},scale=${size}:${size}:flags=lanczos`;

  // 1. Extraer N poses equiespaciadas (centro de cada segmento)
  for (let i = 0; i < frames; i++) {
    const ts = (dur * (i + 0.5) / frames).toFixed(3);
    execFileSync(FFMPEG, [
      '-y', '-ss', ts, '-i', input,
      '-vf', vf, '-frames:v', '1',
      path.join(tmp, `f_${String(i).padStart(3, '0')}.png`),
    ], { stdio: 'ignore' });
  }

  // 2. Montar el clip: N poses repartidas en 'duration' seg, salida a 'fps'
  //    framerate de entrada = frames/duration  ->  cada pose se sostiene
  const inFps = (frames / duration).toFixed(6);
  execFileSync(FFMPEG, [
    '-y', '-framerate', inFps,
    '-i', path.join(tmp, 'f_%03d.png'),
    '-vf', `fps=${fps}`,
    '-frames:v', String(Math.round(fps * duration)),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    output,
  ], { stdio: 'ignore' });

  // limpieza
  fs.rmSync(tmp, { recursive: true, force: true });
  return output;
}

module.exports = { generateStopMotion, probeDuration };
