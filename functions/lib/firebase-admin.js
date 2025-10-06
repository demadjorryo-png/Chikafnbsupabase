"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminApp = exports.adminDb = exports.adminAuth = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
let adminApp;
if (!(0, app_1.getApps)().length) {
    exports.adminApp = adminApp = (0, app_1.initializeApp)();
}
else {
    exports.adminApp = adminApp = (0, app_1.getApp)();
}
const adminAuth = (0, auth_1.getAuth)(adminApp);
exports.adminAuth = adminAuth;
const adminDb = (0, firestore_1.getFirestore)(adminApp);
exports.adminDb = adminDb;
//# sourceMappingURL=firebase-admin.js.map