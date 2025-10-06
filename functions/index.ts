
// This file acts as a central export for all Cloud Functions.
// Firebase will look at this file to determine which functions to deploy.

// Import Genkit configuration to ensure flows are registered
import './src/ai/genkit';

// Export all regular Cloud Functions
export * from './ai';
export * from './reports';

// Export all AI Flows. Genkit will handle their deployment as Cloud Functions.
export * from './src/ai/flows/admin-recommendation';
export * from './src/ai/flows/app-consultant';
export * from './src/ai/flows/birthday-follow-up';
export * from './src/ai/flows/business-analyst';
export * from './src/ai/flows/challenge-generator';
export * from './src/ai/flows/loyalty-point-recommendation';
export * from './src/ai/flows/order-ready-follow-up';
export * from './src/ai/flows/promotion-recommendation';
export * from './src/ai/flows/receipt-promo-generator';
export * from './src/ai/flows/text-to-speech';
