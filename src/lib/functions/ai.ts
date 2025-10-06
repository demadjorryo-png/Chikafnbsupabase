

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { VertexAI } from "@google-cloud/vertexai";

// Initialize Vertex AI
const vertexAI = new VertexAI({
    project: process.env.GCLOUD_PROJECT,
    location: 'asia-southeast1' // Match your function's region
});

const textModel = vertexAI.getGenerativeModel({
    model: 'gemini-1.0-pro',
});

/**
 * A callable function that generates a product description using Gemini.
 * Expects a `productName` and `productDetails` in the request data.
 */
export const generateProductDescription = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to use this feature.');
    }

    const { productName, productDetails } = request.data;
    if (!productName || !productDetails) {
        throw new HttpsError('invalid-argument', 'Product name and details are required.');
    }

    const prompt = `Buat deskripsi produk yang menarik dan singkat untuk sebuah item di menu kafe. 
    Nama Produk: "${productName}". 
    Detail: "${productDetails}". 
    Gaya bahasanya harus santai, ramah, dan menggugah selera. Maksimal 3 kalimat.`;

    try {
        logger.info(`Generating description for: ${productName}`);
        const resp = await textModel.generateContent(prompt);
        const description = resp.response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!description) {
            throw new HttpsError('internal', 'Failed to generate description from AI.');
        }

        return { description };

    } catch (error) {
        logger.error('Error calling Gemini API for product description:', error);
        throw new HttpsError('internal', 'An error occurred while communicating with the AI service.');
    }
});

/**
 * A callable function that provides sales insights using Gemini.
 * Expects `salesData` (an array of transaction-like objects) in the request data.
 */
export const getSalesInsight = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to use this feature.');
    }

    // Superadmins and admins are allowed
    if (!['superadmin', 'admin'].includes(request.auth.token.role)) {
        throw new HttpsError('permission-denied', 'You do not have permission to access sales insights.');
    }

    const { salesData } = request.data;
    if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
        throw new HttpsError('invalid-argument', 'Valid sales data is required.');
    }

    // Convert sales data to a more digestible string format for the prompt
    const dataString = salesData.map(item => 
        `${item.name} (terjual ${item.quantity})`
    ).join(', ');

    const prompt = `Anda adalah seorang analis bisnis untuk sebuah kafe. Berdasarkan data penjualan berikut: [${dataString}], berikan satu wawasan atau insight menarik dalam satu kalimat singkat. 
    Contoh: "Cappuccino adalah minuman paling populer, mungkin bisa dibuatkan promo bundle dengan croissant."
    Insight Anda harus relevan, ringkas, dan actionable.`;

    try {
        logger.info('Generating sales insight...');
        const resp = await textModel.generateContent(prompt);
        const insight = resp.response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!insight) {
            throw new HttpsError('internal', 'Failed to generate insight from AI.');
        }

        return { insight };

    } catch (error) {
        logger.error('Error calling Gemini API for sales insight:', error);
        throw new HttpsError('internal', 'An error occurred while communicating with the AI service.');
    }
});
