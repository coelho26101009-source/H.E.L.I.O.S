import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// As chaves oficiais do teu cofre H.E.L.I.O.S.
const firebaseConfig = {
  apiKey: "AIzaSyAg8iYdWi2bocXxVaKAvhOR-xFvOuF1Y3Y",
  authDomain: "helios-6ee68.firebaseapp.com",
  projectId: "helios-6ee68",
  storageBucket: "helios-6ee68.firebasestorage.app",
  messagingSenderId: "664370308050",
  appId: "1:664370308050:web:220ca26023c58f20bdde0b"
};

// Iniciar a aplicação Firebase
const app = initializeApp(firebaseConfig);

// Exportar as ferramentas que vamos usar no App.tsx
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();