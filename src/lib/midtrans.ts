import midtransClient from 'midtrans-client';

// IMPORTANT: Fill these values with your Midtrans API keys from your Midtrans dashboard.
// You can find them under Settings > Access Keys.
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || 'YOUR_SERVER_KEY';
const MIDTRANS_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || 'YOUR_CLIENT_KEY';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const snap = new midtransClient.Snap({
    isProduction: IS_PRODUCTION,
    serverKey: MIDTRANS_SERVER_KEY,
    clientKey: MIDTRANS_CLIENT_KEY
});
