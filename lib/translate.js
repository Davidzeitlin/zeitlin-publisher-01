// ─────────────────────────────────────────────────────────────
// TRANSLATE  ·  traduce texto entre espanol e ingles con DeepL.
// DeepL da una calidad muy alta para ES <-> EN.
//
// La clave gratuita de DeepL termina en ":fx" y usa otro dominio;
// se detecta automaticamente. David la pega una vez en Ajustes.
// ─────────────────────────────────────────────────────────────

// text:   texto a traducir
// target: 'en' o 'es' (idioma de destino)
async function translate(text, target, key) {
  if (!key) throw new Error('Falta la clave de DeepL. Ponla en Ajustes.');
  if (!text || !text.trim()) return '';

  const targetLang = target === 'en' ? 'EN-GB' : 'ES';
  const endpoint = key.trim().endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ text, target_lang: targetLang }),
  });
  if (!res.ok) throw new Error('DeepL falló (' + res.status + ')');
  const data = await res.json();
  return data.translations[0].text;
}

module.exports = { translate };
