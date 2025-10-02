
const admin = require('firebase-admin');

// This script assumes the environment is authenticated,
// e.g., via Application Default Credentials in a Cloud Workstation or by running `gcloud auth application-default login`.

// Initialize the Admin SDK.
try {
  admin.initializeApp();
} catch (e) {
  // This is to prevent re-initialization error during hot-reloads or multiple calls.
  if (e.code !== 'app/duplicate-app') {
    console.error('Firebase admin initialization error', e);
    process.exit(1);
  }
}

const email = 'riopradana@era5758.co.id';

async function setSuperAdminClaim(emailToUpgrade) {
  try {
    console.log(`Fetching user data for: ${emailToUpgrade}`);
    const user = await admin.auth().getUserByEmail(emailToUpgrade);
    
    const currentClaims = user.customClaims || {};
    if (currentClaims.role === 'superadmin') {
      console.log(`User ${emailToUpgrade} (UID: ${user.uid}) already has the 'superadmin' role.`);
      return;
    }

    console.log(`Setting 'superadmin' role for user ${user.uid}...`);
    // Set the custom claim. This will overwrite existing claims if not spread.
    await admin.auth().setCustomUserClaims(user.uid, { ...currentClaims, role: 'superadmin' });
    
    console.log(`Successfully set 'superadmin' role for ${emailToUpgrade} (UID: ${user.uid}).`);
    console.log('Please ask the user to log out and log back in to see the changes.');

  } catch (error) {
    console.error(`Error setting custom claim for ${emailToUpgrade}:`, error);
    process.exit(1); // Exit with error
  }
}

setSuperAdminClaim(email);
