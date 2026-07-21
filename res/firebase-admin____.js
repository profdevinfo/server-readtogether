// backend/src/firebase-admin.js
const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = require('../serviceAccountKey.json'); // سنحمله لاحقاً

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

const auth = admin.auth();
const db = admin.firestore();

module.exports = { auth, db, admin };