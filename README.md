# FULBITO

Futbolin clasico evolucionado para celular: figuras fijas, auras de accion, un capitan movil, arquero, tiros, atajadas, VAR de posesion, zona fantasma, penales y 10 poderes tacticos.

Basado en `docs/REGLAS_v1.0.md` (documento de reglas del proyecto).

## Jugar ahora mismo

No hace falta instalar nada. Es una pagina web:

1. Abri `index.html` en el navegador del celular o la compu (doble click, o serví la carpeta con cualquier servidor estatico).
2. En el celular: desde Chrome o Safari, toca el menu del navegador y elegi **"Agregar a pantalla de inicio"**. Queda instalado como si fuera una app, con su propio icono.
3. Elegi el modo (2 jugadores en el mismo celular, o 1 jugador contra la PC), ponele nombre a los equipos y a jugar.

Para probarlo desde la compu con un servidor local (evita restricciones del navegador al abrir el archivo directo):

```bash
cd fulbito
python3 -m http.server 8080
# abrir http://localhost:8080 en el navegador
```

## Como se juega

El jugador que tiene el balon se marca con un anillo dorado. Apunta con el mouse o el dedo, manten presionado para cargar la fuerza y solta para pasar o tirar. Cuando el balon se detiene, el juego decide quien se queda con la posesion segun en que aura cayo (ver seccion 5 y 7 de las reglas).

## Cuenta, tienda y equipo propio

Ademas del partido en si, FULBITO tiene una app chica alrededor:

- **Cuenta**: jugar de invitado (sin nada, se crea sola), o crear una cuenta con nombre + PIN — sin pedir email ni ningun dato real. Con nombre + PIN podes volver a tu cuenta desde cualquier celular.
- **Mi Equipo**: arma tu plantilla de 7 (arquero + 5 de campo + capitan), y elegi el color de tu equipo.
- **Tienda**: jugadores nuevos con otra forma de repartir los mismos puntos (nunca mas fuerte, solo distinto — sin pay to win), comprados con monedas que se ganan jugando partidos, nunca con dinero real.
- **Crear jugador propio**: repartir vos mismo los 11 puntos entre las 5 habilidades.
- **Modo 2 jugadores con cuentas propias**: al arrancar un partido hotseat, si escribis el nombre de una cuenta real en "Equipo B" (por ejemplo la de tu hijo), el partido usa SU equipo y color guardados — sin tener que iniciar sesion como el en el mismo celular.

Todo esto se guarda en [Firebase](https://firebase.google.com) (cuentas + base de datos). Sin configurarlo, el juego funciona igual pero con el equipo por defecto de siempre — ver `docs/FIREBASE_SETUP.md` para activarlo.

## Estructura del proyecto

```
index.html                   pantalla principal: menu, HUD del partido y cancha
css/style.css                 estilos del partido (cancha, HUD, poderes, formacion)
css/app-ui.css                 estilos de las pantallas de cuenta/equipo/tienda
js/rules-core.js               reglas puras (sin canvas ni DOM) del motor: testeadas en tests/
js/game.js                     el motor del partido (fisica, reglas, IA, sonido, poderes)
js/app.js                       arranca todo y conecta las pantallas nuevas con game.js
js/firebase-init.js             configuracion de Firebase (claves)
js/auth.js                      cuentas (invitado o nombre+PIN) y perfil (nombre, monedas, resultados)
js/auth-ui.js                    pantalla para crear cuenta / iniciar sesion / jugar de invitado
js/player-repo.js               leer/guardar jugadores propios y el equipo en Firestore
js/store-data.js                catalogo de jugadores de la tienda + equipo inicial gratis
js/player-creator.js            creador de jugador propio (repartir 11 puntos)
js/menu-ui.js                   pantalla "Inicio"
js/team-ui.js                    pantalla "Mi Equipo"
js/store-ui.js                   pantalla "Tienda"
firestore.rules                 reglas de seguridad (cada quien solo ve lo suyo)
manifest.webmanifest            hace que el juego se pueda "instalar" en el celular
icons/icon.svg                   icono de la app
docs/REGLAS_v1.0.md              las reglas de diseño del juego
docs/FIREBASE_SETUP.md           como activar cuentas/tienda
tests/rules-core.test.js         tests de js/rules-core.js (node --test, sin dependencias)
package.json                     "npm test" corre los tests
```

Todo esta en JavaScript plano (sin frameworks ni paso de compilacion) y repartido en archivos chicos, cada uno con una sola responsabilidad, para que sea facil de leer y de seguir modificando.

## Que esta implementado (Version 1.0 de las reglas)

- Cancha, auras, capitan movil, arquero, rebotes y deteccion de punto final (secc. 1-2, 4-6).
- Formacion pre-partido: cada equipo arrastra sus 5 jugadores de campo a donde quiera dentro de su mitad, respetando los cupos de zona baja/media/alta (secc. 2). Arquero y capitan quedan fijos como marca el documento.
- Habilidades por jugador (Fuerza/Pase/Precision/Tiro/Defensa sumando 11, arquero configurable) afectando velocidad y desvio del disparo (secc. 3).
- VAR de posesion con umbral configurable y desempate por milisegundos dentro del aura (secc. 7).
- Defensa/intercepcion: el rival tiene un intento por turno, con probabilidad segun Defensa vs. Tiro/Pase (secc. 8).
- Goles, atajadas, reinicios (secc. 9).
- Zona fantasma secreta por equipo con penal al descubrirla, y tanda de penales con muerte subita (secc. 10).
- Los 10 poderes de la seccion 11, elegidos en secreto antes de cada partido.
- Modo 1 jugador contra una IA sencilla (para cuando no hay alguien al lado para jugar).
- Nombres de equipo personalizables, sonido, vibracion en celular, confeti y camara con sacudida en los goles.
- Pantalla de pruebas para ajustar en vivo los valores que el documento marca como "POR DEFINIR".

## Simplificaciones conocidas (para seguir mejorando)

- El tiro es de puntaria libre (arrastrar y soltar), no el sistema de 9 zonas fijas del documento (seccion 9). Se decidio a proposito dejarlo asi.
- La IA es basica: pasa hacia adelante y tira si esta cerca del arco. No usa poderes ni jugadas elaboradas, y siempre juega con el equipo por defecto (no tiene cuenta propia).
- En el modo de 2 jugadores, el Equipo B usa su equipo/color guardados solo si escribiste el nombre de una cuenta real que exista (busqueda de solo lectura); las monedas y estadisticas de esa partida solo se acreditan a la cuenta que esta con la sesion iniciada en el celular (el Equipo A), no al Equipo B.
- Solo se pueden crear jugadores de campo/capitan (11 puntos). Crear arqueros personalizados (7 puntos) queda pendiente.
- Las monedas se suman desde el navegador al terminar el partido; alguien que sepa tocar el codigo podria darse monedas de mas. Para una cuenta privada entre ustedes dos no es un problema real; si en algun momento se abre a mas gente, conviene mover ese calculo a una funcion de servidor (Firebase Cloud Functions).
- La zona fantasma se ubica sola al azar la primera vez, pero se puede reubicar a mano en cualquier parte de la cancha antes de cada partido.
- El poder "Escudo de aura" solo protege contra "Silencio" por ahora; el resto de los poderes que dice "ignora el efecto de un poder rival" quedan para una version futura mas especifica.

## Proximos pasos sugeridos

1. **Arqueros personalizados** (7 puntos) en el creador de jugador.
2. **Sesiones realmente simultaneas** para el Equipo B en modo 2 jugadores (hoy usa su equipo guardado por busqueda, pero sus monedas/estadisticas no se acreditan porque no tiene la sesion iniciada en ese celular).
3. **Sistema de tiro por 9 zonas** tal como lo describe la seccion 9, en vez del apuntado libre, si en algun momento lo prefieren.
4. **Llevarlo a las tiendas de apps**: envolver esta misma pagina con [Capacitor](https://capacitorjs.com/) (`npx cap init`, `npx cap add android`, `npx cap add ios`) genera un proyecto nativo listo para Android Studio / Xcode sin reescribir el juego. Para publicarlo hace falta una cuenta de Google Play Console (pago unico) y/o Apple Developer Program (anual), mas las claves de firma.
5. **Modo online**: jugar contra alguien en otro celular en vez de compartir la pantalla (Firebase ya deja la base puesta con Firestore, se podria usar para sincronizar la partida).

## Para vos, que segui el proyecto

Este prototipo arranco del `.html` original que ya tenian en la carpeta de Drive del proyecto y le sumo: las habilidades de los jugadores, el sistema de defensa/intercepcion, la zona fantasma, los 10 poderes completos (antes solo habia 2), el modo contra la PC, y la parte de "se siente como una app" (nombres de equipo, sonido, vibracion, instalable en el celular). El codigo esta comentado por seccion siguiendo los mismos numeros que `docs/REGLAS_v1.0.md`, para que sea facil encontrar donde esta implementada cada regla.
