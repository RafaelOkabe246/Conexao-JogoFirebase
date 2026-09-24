// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getDatabase, ref, set, update, get, remove, onValue, onDisconnect, child } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAOHlyWGYimKUyR9NYmKUoMvSQE6QPbD5E",
  authDomain: "partygame-cloud.firebaseapp.com",
  databaseURL: "https://partygame-cloud-default-rtdb.firebaseio.com",
  projectId: "partygame-cloud",
  storageBucket: "partygame-cloud.firebasestorage.app",
  messagingSenderId: "433102927492",
  appId: "1:433102927492:web:def87b4fec9254efaf34d1",
  measurementId: "G-KHYV7RPLXF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

const realtimeDataBaseMethods = {
  getDatabase: () => database,
  ref,
  set,
  update,
  get,
  remove,
  onValue,
  onDisconnect,
  child
};

const authenticationMethods = {
  signInAnonymously: () => signInAnonymously(auth),
  onAuthStateChanged: (callback) => onAuthStateChanged(auth, callback),
  getUserId: () => auth.currentUser
};


export {app, auth, database, realtimeDataBaseMethods, authenticationMethods};