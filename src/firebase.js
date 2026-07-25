import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDHEDLSfMdiuToEYFruqBZHOLqFZFGf64o',
  authDomain: 'hindu-awakening-wiki.firebaseapp.com',
  projectId: 'hindu-awakening-wiki',
  storageBucket: 'hindu-awakening-wiki.firebasestorage.app',
  messagingSenderId: '481865203153',
  appId: '1:481865203153:web:c49be77867681684bcf4f0',
  measurementId: 'G-PG1JX4NDB8',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
