import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Aqui escrevemos as chaves diretamente (é seguro para o Firebase frontend!)
const firebaseConfig = {
  apiKey: "AIzaSyAgBiYdWi2bocXxVaKavhQR-xFv0uF1Y3Y",
  authDomain: "helios-6ee68.firebaseapp.com",
  projectId: "helios-6ee68",
  storageBucket: "helios-6ee68.firebasestorage.app",
  messagingSenderId: "664370308050",
  appId: "1:664370308050:web:220ca26023c58f20bdde0b"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa a Autenticação e a Base de Dados
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);