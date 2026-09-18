# FULBITO — Reglas Version 1.0 (para desarrollo)

> Copiado desde `FULBITO_Reglas_Version_1_0_Para_Desarrollo.docx` (carpeta de Drive del proyecto) para tenerlo versionado junto con el codigo. Documento de trabajo para construir el primer prototipo jugable.

Este documento define las reglas que el equipo de desarrollo debe usar para crear el primer prototipo de FULBITO. El objetivo es validar un futbolin clasico evolucionado: figuras fijas, auras de accion, un capitan movil, pases, tiros, atajadas, penaltis y poderes tacticos.

Las reglas marcadas como **POR DEFINIR** no deben bloquear el prototipo. Deben implementarse como valores configurables para poder probarlos y ajustarlos.

## 1. Objetivo del primer prototipo

- Partida de dos equipos en una sola cancha.
- Turnos de hasta 20 segundos.
- Pases, tiros, rebotes, auras, capitan, arquero, goles, penaltis, zona fantasma y 10 poderes.
- Sin faltas, tarjetas, corners, tiros libres ni fuera de juego.
- Sin Pay to Win: las compras futuras no pueden dar mejoras permanentes de habilidad.

## 2. Equipos, cancha y formacion

El equipo usa figuras fijas y un capitan especial. Antes de comenzar, las posiciones rivales son invisibles. Cuando inicia el partido, todos los jugadores y sus auras se ven para ambos equipos.

| Elemento | Regla para Version 1.0 |
|---|---|
| Jugadores fijos | Seis jugadores por equipo contando al arquero. Los jugadores normales no se mueven. |
| Capitan | Figura real adicional. Es el unico jugador movil y no cuenta dentro de los limites de zona. |
| Auras | Cada figura tiene un aura propia que expresa su campo de accion. Todas las auras tienen el mismo tamano base. |
| Zonas | Zona baja: maximo 3 jugadores normales. Zona media: maximo 2. Zona alta: maximo 2. |
| Inicio | Los capitanes comienzan enfrentados en el centro de la cancha. |
| Balon | No puede salir de la cancha. Solo se reinicia despues de un gol, un penalti fallado o tiempo agotado. |

**POR DEFINIR:** Confirmar si el arquero conserva una suma maxima de 7 en sus cuatro habilidades o si tambien debe usar el nuevo total de 11.

## 3. Habilidades

| Figura | Habilidades | Regla |
|---|---|---|
| Jugador de campo y capitan | Fuerza, Pase, Precision, Tiro, Defensa | Las cinco habilidades suman exactamente 11. Pueden tener decimales y una habilidad puede valer 0. |
| Arquero | Altura, Velocidad, Volada, Salto | Altura responde a tiros altos. Velocidad permite reaccionar. Volada cubre los lados. Salto ayuda en atajadas elevadas. |

Fuerza determina la velocidad inicial y el alcance del balon. Pase determina la calidad de un pase. Tiro determina el peligro de un disparo. Precision controla la desviacion respecto a la flecha apuntada. Defensa permite intentar una intercepcion especial.

**POR DEFINIR:** Definir formulas numericas de fuerza, perdida de fuerza por distancia, desviacion de precision y comparacion entre Pase o Tiro y Defensa. Deben ser parametros modificables durante pruebas.

## 4. Inicio y ciclo de una jugada

| Paso | Regla |
|---|---|
| 1. Sorteo | El ganador del sorteo comienza con el balon en su arquero. |
| 2. Accion | La figura que tiene el balon puede pasar o tirar al arco. Se apunta con flecha y se carga una barra de fuerza. |
| 3. Recorrido | El balon se mueve, pierde fuerza mientras viaja y puede rebotar en paredes, figuras o arquero. |
| 4. Resolucion | El punto final del balon decide quien recibe la posesion. Pasar por encima de un aura o zona fantasma no activa nada. |
| 5. Siguiente turno | Se aplica la regla del resultado y el nuevo poseedor comienza su turno. |

Cada turno dura 20 segundos. Mover al capitan, apuntar y lanzar consumen este tiempo. Si el tiempo se termina sin completar una accion, el rival recibe el balon desde su arquero.

## 5. Donde termina el balon

| Lugar final | Resultado |
|---|---|
| Aura propia | La figura propia recibe el balon. El equipo conserva la posesion. |
| Aura rival | La figura rival recibe el balon y comienza el turno rival. |
| Dos auras | Se activa el VAR de posesion. |
| Zona vacia | El capitan rival interviene y recupera el balon. |
| Zona fantasma rival | La zona se revela y el equipo que la descubrio recibe un penalti. |
| Aura del arquero | El arquero recibe el balon y puede hacer un pase. |
| Porteria | Es gol si el balon entra completamente. |

## 6. Capitan movil

El capitan es el jugador numero 7 y esta controlado por la persona que juega. Tiene las mismas cinco habilidades que un jugador de campo y su total es 11. Su aura se mueve junto con el.

- Es el unico jugador que puede cambiar de posicion en la cancha.
- No cuenta dentro de los limites de jugadores normales por zona.
- Cuando el balon termina en una zona vacia, comienza el turno rival: su capitan se mueve desde donde este hasta el balon.
- Al llegar, queda orientado hacia el arco rival, recupera el balon y puede pasar o tirar con el tiempo restante.
- Despues permanece quieto con su aura en ese lugar hasta su proxima intervencion.

**POR DEFINIR:** Definir si el capitan puede desplazarse por iniciativa propia en un turno sin que el balon haya terminado en una zona vacia. Para el primer prototipo se recomienda que solo se mueva al intervenir en una zona vacia.

## 7. VAR de posesion

Si el punto final del balon queda dentro de dos auras, el juego muestra un zoom corto de VAR. Todas las figuras ya son visibles durante el partido.

- Gana la figura cuyo centro este mas cerca del centro final del balon.
- Si la diferencia es muy pequena, gana el equipo cuyo aura tuvo el balon dentro durante mas milisegundos antes de detenerse.
- Si aun existe empate exacto, el balon rebota al centro y nadie recibe posesion.

**POR DEFINIR:** Definir el umbral exacto de "diferencia muy pequena" como porcentaje del radio del aura o como pixeles de pantalla.

## 8. Pases, bloqueos y rebotes

- Un pase o tiro se apunta con la misma flecha y barra de fuerza.
- Un jugador con baja Precision puede desviar el balon respecto a la direccion elegida, especialmente en acciones fuertes o largas.
- El balon puede rebotar varias veces en paredes, jugadores o arquero antes de detenerse.
- La Defensa no bloquea automaticamente. Cuando el balon pasa cerca de una figura rival, aparece una oportunidad de intercepcion.
- El rival puede intentar una intercepcion como maximo una vez por turno rival. Si tiene exito, el balon rebota o queda en su aura. Si falla, sigue su recorrido.
- Un jugador no puede marcar directamente de arco a arco, incluso con Fuerza maxima. Debe haber existido antes una jugada de pase.

## 9. Tiros, goles y atajadas

Un tiro apunta a una de nueve zonas del arco: izquierda, centro o derecha; y alta, media o baja. Precision reduce el error de la zona elegida. Fuerza y barra cargada aumentan velocidad. Tiro aumenta el peligro.

| Tipo de tiro | Habilidades principales del arquero |
|---|---|
| Alto | Altura y Salto |
| Bajo | Velocidad |
| Hacia un lado | Volada |
| Muy rapido | Velocidad |
| Alto hacia una esquina | Altura, Salto y Volada |

La direccion sigue siendo importante: un arquero con Volada alta cubre mejor las esquinas, pero un tiro preciso al lado contrario puede vencerlo.

- Si el arquero controla el balon, queda en su aura y su equipo juega desde alli.
- Si alcanza un tiro muy fuerte, lo puede desviar: el balon rebota y se aplican las reglas de punto final.
- Si no alcanza el balon, es gol. El equipo que recibio el gol reinicia desde su arquero.

## 10. Zona fantasma y penaltis

- Cada equipo coloca una zona fantasma secreta antes del partido.
- Solo se activa si el balon termina con su centro dentro de la zona; pasar por encima no la activa.
- Cada zona puede descubrirse una sola vez por partido. Al descubrirse queda visible y se desactiva.
- El equipo que descubre la zona fantasma rival recibe un penalti. Si falla, el rival recibe el balon desde su arquero.
- En un empate al final de los 3 minutos, hay tanda de 3 penaltis por equipo. Si continua el empate, hay muerte subita.
- El capitan cobra los penaltis y se usan las mismas reglas de tiro y atajada.

**POR DEFINIR:** Definir el tamano final de la zona fantasma. Recomendacion de prototipo: maximo 5% del area de la cancha y no puede ubicarse sobre la linea del area grande.

## 11. Poderes Version 1.0

Cada persona elige exactamente dos poderes antes del partido. El rival no los ve. Cada poder se usa una sola vez. Los poderes no cambian permanentemente las estadisticas.

| Poder | Efecto | Uso |
|---|---|---|
| Farmear aura | Tras completar dos pases seguidos, se carga. Elige un aura propia: crece 25% hasta que el balon la toque o termine la siguiente accion rival. | Turno propio |
| Impulso | En la siguiente accion, la barra puede cargar 20% mas. No permite gol de arco a arco. | Turno propio |
| Tiempo extra | Anade 5 segundos al turno actual. | Turno propio |
| Plan B | Permite cancelar un apuntado antes de soltar el balon y volver a apuntar. | Turno propio |
| Segundo bloqueo | Permite una segunda oportunidad de intercepcion durante el turno rival actual. | Turno rival |
| Silencio | El rival no puede activar poderes durante su siguiente turno. | Turno propio |
| Escudo de aura | Elige un aura propia. Ignora el efecto de un poder rival durante una accion. | Turno propio o rival |
| Paso del capitan | Permite que el capitan se reposicione una vez extra durante el turno propio. | Turno propio |
| Revision VAR | Si hay una disputa VAR en la siguiente accion, el equipo recibe la informacion exacta de distancia y tiempo de cada aura antes del resultado. | Turno propio o rival |
| Recuperacion rapida | Cuando el capitan interviene en una zona vacia, recibe 5 segundos extra para pasar o tirar. | Al intervenir |

Impulso es una excepcion permitida: aumenta solo la carga de una accion y no cambia el valor de Fuerza del jugador.

## 12. Duracion y reglas excluidas

- Cada partido dura 3 minutos. No termina antes por llegar a 3 goles.
- Al finalizar, gana quien tenga mas goles. Si hay empate, se juegan penaltis.
- No hay faltas, tarjetas, corners, tiros libres ni fuera de juego.

## 13. Lista de desarrollo para el prototipo

| Prioridad | Entregable |
|---|---|
| 1 | Cancha, auras visibles durante partido, balon, rebotes y detector del punto final. |
| 2 | Turnos de 20 segundos, pase, tiro y resolucion de posesion. |
| 3 | Capitan que interviene en zona vacia. |
| 4 | VAR de posesion, defensa e intercepcion. |
| 5 | Arquero, goles, reinicios y penaltis. |
| 6 | Zona fantasma y los 10 poderes. |
| 7 | Pantalla de prueba para modificar valores de fuerza, precision, defensa y arquero. |

El primer objetivo de desarrollo es una partida local completa que permita probar todas las reglas principales. La tienda, rangos, torneos, amigos, IA y partidas online deben añadirse despues de validar que este prototipo sea divertido.
