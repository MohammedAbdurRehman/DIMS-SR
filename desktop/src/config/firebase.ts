import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBdHBihYhXapJmC_9N58HuZfeLcnrC08Dg",
  authDomain: "dims-sr.firebaseapp.com",
  projectId: "dims-sr",
  storageBucket: "dims-sr.firebasestorage.app",
  messagingSenderId: "984107927612",
  appId: "1:984107927612:web:9a84a2e1770e7c89371b39"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);