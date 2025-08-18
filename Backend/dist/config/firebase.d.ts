import * as admin from 'firebase-admin';
declare let app: admin.app.App;
declare let db: admin.firestore.Firestore;
declare let auth: admin.auth.Auth;
export { app, auth, db };
