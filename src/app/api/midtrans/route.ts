import { NextResponse } from 'next/server';
import { snap } from '@/lib/midtrans';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const { amount, tokens, storeId, storeName, customerDetails } = await request.json();

    if (!amount || !tokens || !storeId || !customerDetails) {
        return NextResponse.json({ message: "Data tidak lengkap." }, { status: 400 });
    }

    const orderId = `TOKEN-${storeId}-${randomUUID()}`;

    let parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      item_details: [{
        id: `TOPUP-${tokens}`,
        price: amount / tokens,
        quantity: tokens,
        name: `Top Up ${tokens} Pradana Token`,
        merchant_name: "Chika POS F&B"
      }],
      customer_details: customerDetails,
      // Metadata untuk webhook
      custom_field1: storeId,
      custom_field2: storeName,
      custom_field3: tokens,
    };

    const token = await snap.createTransactionToken(parameter);
    
    return NextResponse.json({ token });

  } catch (error) {
    console.error("Midtrans API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan pada server.";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
