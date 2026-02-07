/*
 * =================================================================================
 * CONFIGURAÇÃO DO FIREBASE (src/firebase.ts)
 * =================================================================================
 * Este arquivo inicializa a conexão com o projeto Firebase do Lumen.
 * As credenciais aqui são públicas (client-side) e identificam o projeto.
 * 
 * Para usar o Firebase em outros arquivos, importe o 'app', 'auth' ou 'db' daqui:
 * import { app, auth, db } from './firebase.ts';
 * =================================================================================
 */

import * as firebaseApp from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuração do Firebase conforme sua captura de tela
const firebaseConfig = {
  apiKey: "AIzaSyD9uGmMfDyr0sCTIfvLAJzdOJpLxoH9TXU",
  authDomain: "lumen-app-5a66c.firebaseapp.com",
  projectId: "lumen-app-5a66c",
  storageBucket: "lumen-app-5a66c.firebasestorage.app",
  messagingSenderId: "497817231365",
  appId: "1:497817231365:web:63fbb7228cca7d983dfc6c"
};

// Inicializa o Firebase
const app = firebaseApp.initializeApp(firebaseConfig);

// Inicializa serviços
const auth = firebaseAuth.getAuth(app);
const db = getFirestore(app);

export { app, auth, db };