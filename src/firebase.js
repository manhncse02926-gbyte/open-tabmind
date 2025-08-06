// firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB9zD4HApMJDoOxo6IbWPuF2N4u7x4HI-c",
  authDomain: "mcp-browser-48a27.firebaseapp.com",
  projectId: "mcp-browser-48a27",
  storageBucket: "mcp-browser-48a27.firebasestorage.app",
  messagingSenderId: "74114116852",
  appId: "1:74114116852:web:4c40d3108b09781561c2a1",
  measurementId: "G-70S7LYKYT6"
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };
