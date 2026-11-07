// ─────────────────────────────────────────────────────────────────────────────
// 1) FIREBASE
// Paste your Firebase web-app config here
// (Firebase console → Project settings → General → Your apps → Web app → Config).
//
// While apiKey or projectId is empty the site runs in DEMO MODE:
//   • the shop shows the starter menu from seed.js
//   • the admin panel opens without a login and saves changes only in the
//     browser you are using, so customers will NOT see them.
// ─────────────────────────────────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey: "AIzaSyDy7nbZlC1dZHFO1GMkWlzK-S-EDloFrgU",
  authDomain: "the-pastry-palette.firebaseapp.com",
  projectId: "the-pastry-palette",
  storageBucket: "the-pastry-palette.firebasestorage.app",
  messagingSenderId: "1044646751260",
  appId: "1:1044646751260:web:5ac4b773b92eda7b4903d9"
};

// ─────────────────────────────────────────────────────────────────────────────
// 2) ADMIN LOGIN
// The shop has no email address, so the admin page asks for a username.
// A username such as "pp-7f3a9c2e" signs in as pp-7f3a9c2e@<adminEmailDomain>.
// Create that user in Firebase → Authentication → Users (README, step 5).
// The address never receives any mail; it only works as a login name.
// ─────────────────────────────────────────────────────────────────────────────
export const adminEmailDomain = "thepastrypalette.app";

// Firebase JS SDK version used by the admin panel.
export const firebaseSdkVersion = "10.12.2";
