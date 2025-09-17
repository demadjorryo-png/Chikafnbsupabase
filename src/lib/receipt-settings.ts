// This file acts as a mock database for receipt settings.
// In a real application, this data would be stored in a database
// and fetched dynamically.

type ReceiptSettings = {
    headerText: string;
    footerText: string;
    promoText: string;
};

export let receiptSettings: ReceiptSettings = {
    headerText: "Bekupon Vape Store Tumpang\nJl. Raya Tumpang No. 123, Malang\nTelp: 0812-3456-7890",
    footerText: "Terima kasih atas kunjungan Anda!",
    promoText: "Dapatkan Liquid Gratis setiap pembelian 500rb!",
};

// In a real app, you'd have a function connected to a database.
// This is a simulation for demonstration purposes.
export function updateReceiptSettings(newSettings: Partial<ReceiptSettings>) {
    receiptSettings = {
        ...receiptSettings,
        ...newSettings,
    };
    console.log("Receipt settings updated (simulation):", receiptSettings);
    return receiptSettings;
}
