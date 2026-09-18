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

## Estructura del proyecto

```
index.html              pantalla principal (HUD, cancha, menus, panel de pruebas)
css/style.css            todos los estilos
js/game.js                todo el motor del juego (fisica, reglas, IA, sonido, poderes)
manifest.webmanifest      hace que el juego se pueda "instalar" en el celular
icons/icon.svg             icono de la app
docs/REGLAS_v1.0.md        las reglas de diseño del juego, versionadas junto al codigo
```

Todo esta en JavaScript plano (sin frameworks ni instalacion de paquetes) para que sea facil de leer y de seguir modificando.

## Que esta implementado (Version 1.0 de las reglas)

- Cancha, auras, capitan movil, arquero, rebotes y deteccion de punto final (secc. 1-2, 4-6).
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

- El tiro es de puntaria libre (arrastrar y soltar), no el sistema de 9 zonas fijas del documento (seccion 9). Adaptarlo del todo implicaria rehacer el control de disparo.
- Las habilidades de cada jugador son un preset fijo por posicion (defensor/mediocampista/delantero/capitan). Falta una pantalla para editarlas jugador por jugador.
- La IA es basica: pasa hacia adelante y tira si esta cerca del arco. No usa poderes ni jugadas elaboradas.
- La zona fantasma se ubica sola al azar en la mitad propia; el documento no exige que sea elegible a mano, pero podria agregarse.
- El poder "Escudo de aura" solo protege contra "Silencio" por ahora; el resto de los poderes que dice "ignora el efecto de un poder rival" quedan para una version futura mas especifica.

## Proximos pasos sugeridos

1. **Editor de habilidades**: pantalla donde cada jugador reparte sus 11 puntos antes del partido.
2. **Sistema de tiro por 9 zonas** tal como lo describe la seccion 9, en vez del apuntado libre.
3. **Guardar partidas/estadisticas** (requeriria un backend o `localStorage`).
4. **Llevarlo a las tiendas de apps**: envolver esta misma pagina con [Capacitor](https://capacitorjs.com/) (`npx cap init`, `npx cap add android`, `npx cap add ios`) genera un proyecto nativo listo para Android Studio / Xcode sin reescribir el juego. Para publicarlo hace falta una cuenta de Google Play Console (pago unico) y/o Apple Developer Program (anual), mas las claves de firma — eso es un paso aparte que se hace cuando esas cuentas esten listas.
5. **Modo online**: jugar contra alguien en otro celular (necesitaria un servidor).

## Para vos, que segui el proyecto

Este prototipo arranco del `.html` original que ya tenian en la carpeta de Drive del proyecto y le sumo: las habilidades de los jugadores, el sistema de defensa/intercepcion, la zona fantasma, los 10 poderes completos (antes solo habia 2), el modo contra la PC, y la parte de "se siente como una app" (nombres de equipo, sonido, vibracion, instalable en el celular). El codigo esta comentado por seccion siguiendo los mismos numeros que `docs/REGLAS_v1.0.md`, para que sea facil encontrar donde esta implementada cada regla.
