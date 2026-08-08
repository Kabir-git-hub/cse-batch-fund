import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.error('Please check your Firebase configuration.');
      } else if (error.message.includes('PERMISSION_DENIED') || (error as any).code === 'permission-denied') {
        console.warn('Firebase Firestore PERMISSION_DENIED: Please enable read/write rules in your Firebase Console for project sec-cse-batch-17-fund.');
      }
    }
  }
}
testConnection();

export { signInWithPopup, signOut };
