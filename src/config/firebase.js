const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue, FieldPath } = require('firebase-admin/firestore');
require('dotenv').config();

// const serviceAccount = require('./serviceAccountKey.json');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

const app = initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth(app);
const db = getFirestore(app);

// Compatibility wrapper for legacy code usages:
// - admin.firestore.FieldValue.serverTimestamp()
// - admin.firestore.FieldPath.documentId()
// - admin.firestore().collection(...)
// - admin.auth()
const adminCompat = {
  auth: () => auth,
  firestore: Object.assign(() => db, {
    FieldValue: FieldValue,
    FieldPath: FieldPath
  }),
  app: app
};

module.exports = { auth, db, admin: adminCompat, FieldValue, FieldPath };