'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/loyalty-point-recommendation.ts';
import '@/ai/flows/pending-order-follow-up.ts';
import '@/ai/flows/birthday-follow-up.ts';
import '@/ai/flows/challenge-generator.ts';
import '@/ai/flows/admin-recommendation.ts';
import '@/ai/flows/promotion-recommendation.ts';
import '@/ai/flows/receipt-promo-generator.ts';
import '@/ai/flows/business-analyst.ts';
import '@/ai/flows/order-ready-follow-up.ts';
import '@/ai/flows/text-to-speech.ts';
import '@/ai/flows/whatsapp-notification.ts';
import '@/ai/flows/app-consultant.ts';
