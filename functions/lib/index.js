"use strict";
// This file acts as a central export for all Cloud Functions.
// Firebase will look at this file to determine which functions to deploy.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Import Genkit configuration to ensure flows are registered
require("./src/ai/genkit");
// Export all regular Cloud Functions
__exportStar(require("./ai"), exports);
__exportStar(require("./reports"), exports);
// Export all AI Flows. Genkit will handle their deployment as Cloud Functions.
__exportStar(require("./src/ai/flows/admin-recommendation"), exports);
__exportStar(require("./src/ai/flows/app-consultant"), exports);
__exportStar(require("./src/ai/flows/birthday-follow-up"), exports);
__exportStar(require("./src/ai/flows/business-analyst"), exports);
__exportStar(require("./src/ai/flows/challenge-generator"), exports);
__exportStar(require("./src/ai/flows/loyalty-point-recommendation"), exports);
__exportStar(require("./src/ai/flows/order-ready-follow-up"), exports);
__exportStar(require("./src/ai/flows/promotion-recommendation"), exports);
__exportStar(require("./src/ai/flows/receipt-promo-generator"), exports);
__exportStar(require("./src/ai/flows/text-to-speech"), exports);
//# sourceMappingURL=index.js.map