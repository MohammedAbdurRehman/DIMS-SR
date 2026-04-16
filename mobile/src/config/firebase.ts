import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC_ky-S0zRR8WPBo0_fKJ79-gON6VCIvtQ",
  authDomain: "dims-sr.firebaseapp.com",
  projectId: "dims-sr",
  storageBucket: "dims-sr.firebasestorage.app",
  messagingSenderId: "984107927612",
  appId: "1:984107927612:android:a2603c36b4dd35dd371b39"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);