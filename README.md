# Zeitlin Publisher

App de escritorio para publicar proyectos en zeitlindavid.com sin editar HTML a mano.

## Cómo conseguir la app de Mac (.dmg) y la de Windows (.exe)

No hace falta terminal. GitHub construye las dos por ti, en la nube, gratis.

1. Crea una cuenta gratis en github.com (si no la tienes).

2. Instala **GitHub Desktop** desde desktop.github.com. Es una aplicación normal, con botones.

3. En GitHub Desktop, entra con tu cuenta y elige **File > New repository**. Ponle un nombre, por ejemplo `zeitlin-publisher`. Te creará una carpeta.

4. Copia dentro de esa carpeta todo el contenido de este proyecto (las carpetas `lib`, `src`, `.github` y los archivos sueltos como `main.js`, `package.json`, etc).

5. Vuelve a GitHub Desktop. Verás que detecta los archivos. Abajo a la izquierda escribe cualquier texto en el resumen y pulsa **Commit to main**. Luego arriba pulsa **Publish repository**.

6. Eso sube el código y arranca la construcción sola. Ve a github.com, entra en tu repositorio, y pulsa la pestaña **Actions**. Verás el proceso en marcha. Tarda unos minutos. Cuando aparezcan dos marcas verdes, está listo.

7. Pulsa sobre la ejecución terminada y abajo, en **Artifacts**, descarga `Mac-app-dmg` y `Windows-exe`. Dentro están tu `.dmg` (Mac) y tu `.exe` (Windows).

## Primera vez que abres la app

Como la app no está firmada con un certificado de pago de Apple ni de Microsoft, la primera vez cada sistema avisa. Es normal y de una sola vez.

- **Mac**: clic derecho sobre la app y elige **Abrir**. Confirma. A partir de ahí, doble clic normal.
- **Windows**: si sale el aviso azul de SmartScreen, pulsa **Más información** y luego **Ejecutar de todas formas**.

## Antes de usarla

Abre la app, pulsa **Ajustes** arriba a la derecha y rellena una sola vez:

- **Vimeo**: tu token personal (con permisos de subir y editar).
- **DeepL**: tu clave de API (el plan gratuito sobra).
- **Hostinger**: host, usuario y contraseña de FTP.

Los puntitos se ponen verdes cuando cada cosa está lista.
