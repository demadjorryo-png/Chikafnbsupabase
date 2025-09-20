import { NextResponse } from 'next/server';
import { snap } from '@/lib/midtrans';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { createHash } from 'crypto';

export async function POST(request: Request) {
  try {
    const notificationJson = await request.json();

    const serverKey = process.env.MIDTRANS_SERVER_KEY || 'YOUR_SERVER_KEY';

    // 1. Validate signature key
    const signatureKey = createHash('sha512')
      .update(notificationJson.order_id + notificationJson.status_code + notificationJson.gross_amount + serverKey)
      .digest('hex');

    if (signatureKey !== notificationJson.signature_key) {
      return NextResponse.json({ status: 'error', message: 'Invalid signature' }, { status: 400 });
    }

    // 2. Process the transaction status
    const orderId = notificationJson.order_id;
    const transactionStatus = notificationJson.transaction_status;
    const fraudStatus = notificationJson.fraud_status;

    console.log(`Transaction notification received. Order ID: ${orderId}. Transaction status: ${transactionStatus}. Fraud status: ${fraudStatus}`);

    if (transactionStatus == 'capture') {
      if (fraudStatus == 'accept') {
        // Payment is successful and secure
        await handleSuccessfulPayment(notificationJson);
      }
    } else if (transactionStatus == 'settlement') {
        // Payment is settled
        await handleSuccessfulPayment(notificationJson);
    } else if (transactionStatus == 'deny' || transactionStatus == 'cancel' || transactionStatus == 'expire') {
        // Denied, canceled, or expired. No action needed for token balance.
    } else if (transactionStatus == 'pending') {
        // Pending payment. No action needed for token balance yet.
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error("Midtrans notification handler error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ status: 'error', message: errorMessage }, { status: 500 });
  }
}

async function handleSuccessfulPayment(notification: any) {
    const storeId = notification.custom_field1;
    const tokensToAdd = Number(notification.custom_field3);

    if (!storeId || !tokensToAdd) {
        console.error("Missing custom fields in Midtrans notification:", notification);
        throw new Error("Missing custom fields in notification.");
    }
    
    const storeRef = doc(db, 'stores', storeId);

    // Using a transaction to be safe, although increment is atomic.
    const storeDoc = await getDoc(storeRef);
    if (!storeDoc.exists()) {
        console.error(`Store with ID ${storeId} not found for order ${notification.order_id}`);
        throw new Error(`Store not found.`);
    }

    await updateDoc(storeRef, {
        pradanaTokenBalance: increment(tokensToAdd)
    });

    console.log(`Successfully added ${tokensToAdd} tokens to store ${storeId}.`);
}
