import admin from "firebase-admin";

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || "lumenstream5";
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
      console.log("[Firebase Admin] Initialized with service account credentials");
    } catch (err) {
      console.error("[Firebase Admin] Service account init failed:", err.message);
    }
  } else {
    try {
      admin.initializeApp({
        projectId,
      });
      console.log("[Firebase Admin] Initialized in lightweight token verification mode");
    } catch (err) {
      console.warn("[Firebase Admin] Default init note:", err.message);
    }
  }
}

export default admin;
