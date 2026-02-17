// Firebase Configuration Template
// Copy this file to firebase-config.js and fill in your actual Firebase credentials

module.exports = {
  // Firebase Project Configuration
  // Get these from Firebase Console > Project Settings > Service Accounts
  
  // Your Firebase project ID
  projectId: "your-project-id",
  
  // Service Account Key Details
  privateKeyId: "your-private-key-id",
  
  // Private key (replace \n with actual newlines)
  privateKey: `-----BEGIN PRIVATE KEY-----
your-private-key-here
-----END PRIVATE KEY-----`,
  
  // Client email from service account
  clientEmail: "firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com",
  
  // Client ID
  clientId: "your-client-id",
  
  // Client certificate URL
  clientCertUrl: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project-id.iam.gserviceaccount.com"
};

// Environment Variables Alternative:
// You can also set these as environment variables in your .env file:
/*
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-here\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project-id.iam.gserviceaccount.com
*/
