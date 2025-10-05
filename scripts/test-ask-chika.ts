#!/usr/bin/env tsx
/**
 * scripts/test-ask-chika.ts
 * Simple server-side test that calls askChika() from the business-analyst flow.
 * Run with: npx tsx scripts/test-ask-chika.ts
 *
 * NOTE: Do NOT commit any API keys. Set OPENAI_API_KEY in your environment or .env before running.
 */

import 'dotenv/config';

// Use relative import so this script runs under node/tsx without relying on path aliases
import { askChika } from '../src/ai/flows/business-analyst';

async function run() {
  try {
    const result = await askChika({
      question: 'Apa ide promo akhir pekan untuk meningkatkan penjualan minuman panas?',
      totalRevenueLastMonth: 12500000,
      topSellingProducts: ['Kopi Susu', 'Espresso', 'Cappuccino'],
      worstSellingProducts: ['Brownies', 'Lemonade'],
      activeStoreName: 'Toko Jalan Mawar',
    });

    console.log('AI response:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error('Test failed:', err?.message ?? err);
    process.exit(1);
  }
}

run();
