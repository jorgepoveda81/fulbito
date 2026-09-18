// Pega aca las claves que te da Firebase (Project settings -> Your apps -> Web).
// Ver docs/FIREBASE_SETUP.md para los pasos. Mientras digan "TU_API_KEY", el resto
// de la app sigue funcionando en modo local (sin cuentas ni tienda guardada en linea).
const firebaseConfig = {
  apiKey: "AIzaSyC-YOuehNcZPsNiEGVqis288KZ4wLmwacs",
  authDomain: "fulbito-91dc8.firebaseapp.com",
  projectId: "fulbito-91dc8",
  storageBucket: "fulbito-91dc8.firebasestorage.app",
  messagingSenderId: "265856078206",
  appId: "1:265856078206:web:25d5441006f50d2d85a32f",
};

const SDK = "https://www.gstatic.com/firebasejs/10.14.1";

export const isFirebaseConfigured = firebaseConfig.apiKey !== "TU_API_KEY";

let firebasePromise = null;

// Devuelve { auth, db, authMod, fsMod } o null si no esta configurado / no se pudo cargar.
export function getFirebase(){
  if (!isFirebaseConfigured) return Promise.resolve(null);
  if (!firebasePromise){
    firebasePromise = (async () => {
      try {
        const [{ initializeApp }, authMod, fsMod] = await Promise.all([
          import(`${SDK}/firebase-app.js`),
          import(`${SDK}/firebase-auth.js`),
          import(`${SDK}/firebase-firestore.js`),
        ]);
        const app = initializeApp(firebaseConfig);
        const auth = authMod.getAuth(app);
        const db = fsMod.getFirestore(app);
        return { auth, db, authMod, fsMod };
      } catch (err){
        console.warn('FULBITO: Firebase no disponible, sigo en modo local.', err);
        return null;
      }
    })();
  }
  return firebasePromise;
}
