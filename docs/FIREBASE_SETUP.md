# Poner las cuentas y la tienda en linea (Firebase)

FULBITO usa [Firebase](https://firebase.google.com) solo para: cuentas anonimas (sin email ni contraseña), y guardar la coleccion de jugadores y el equipo de cada usuario. No procesa pagos reales — la tienda se paga con monedas que se ganan jugando.

## 1. Crear el proyecto (una sola vez)

1. Entra a [console.firebase.google.com](https://console.firebase.google.com) con tu cuenta de Google.
2. **Crear proyecto** → nombre "Fulbito" → podes desactivar Google Analytics.
3. **Build → Authentication → Sign-in method** → activa **Anonymous**.
4. **Build → Firestore Database → Create database** → modo **production**.
5. **Project settings** (el engranaje) → "Your apps" → boton **`</>`** (Web) → nombre "fulbito-web" → **Register app**. Copia el bloque `firebaseConfig`.
6. Pega ese bloque en `js/firebase-init.js` (reemplaza el objeto `firebaseConfig` que esta ahi con valores de ejemplo).
7. **Firestore Database → Reglas** → pega el contenido de `firestore.rules` (esta en la raiz del repo) → **Publicar**.

## 2. Modelo de datos

| Coleccion | Documento | Contenido |
|---|---|---|
| `profiles` | uno por usuario (id = su uid) | `username`, `coins`, `wins`, `losses`, `draws` |
| `players` | uno por jugador que el usuario tiene | `ownerId`, `name`, `role`, `skills` (o `gkSkills` si es arquero), `source` (`store`/`custom`/`starter`) |
| `teams` | uno por usuario (id = su uid) | `roster`: ids de `players` para cada puesto (`keeper`, `def1`, `def2`, `mid1`, `mid2`, `fwd`, `captain`) |

El catalogo de la tienda **no** vive en Firestore: es la lista fija en `js/store-data.js`, para no tener que sembrar datos aparte. Agregar un jugador nuevo a la tienda es editar ese archivo.

## 3. Si no se configura

Sin `js/firebase-init.js` completado, el juego sigue funcionando igual que antes (presets fijos por posicion, sin cuentas ni tienda) — las pantallas de Mi Equipo/Tienda avisan que hace falta configurar Firebase en vez de romperse.
