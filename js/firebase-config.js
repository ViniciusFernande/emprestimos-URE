/**
 * URE SOROCABA - Configuração Oficial do Firebase
 * Projeto: emprestimo-ure-d2382
 */

var firebaseConfig = {
  apiKey: "AIzaSyBE5VrFRVcTWxB3W35xupCudKpaWhm_Azk",
  authDomain: "emprestimo-ure-d2382.firebaseapp.com",
  projectId: "emprestimo-ure-d2382",
  storageBucket: "emprestimo-ure-d2382.firebasestorage.app",
  messagingSenderId: "76649710494",
  appId: "1:76649710494:web:8af08e913e1b31fbdb0c8f"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

var fbAuth = typeof firebase !== 'undefined' ? firebase.auth() : null;
var fbDb = typeof firebase !== 'undefined' ? firebase.firestore() : null;

window.firebaseConfig = firebaseConfig;
window.fbAuth = fbAuth;
window.fbDb = fbDb;
