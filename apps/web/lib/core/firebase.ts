import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyApeuHSS3RJJOkOwABDbjQPlR8KERnP7P4",
  authDomain: "ielts-nook.firebaseapp.com",
  projectId: "ielts-nook",
  storageBucket: "ielts-nook.firebasestorage.app",
  messagingSenderId: "643800782355",
  appId: "1:643800782355:web:e360fdca38cc832012d1e6",
  measurementId: "G-8ZH8817C60",
};

export const firebase = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebase);
