"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSalesInsight = exports.generateProductDescription = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const vertexai_1 = require("@google-cloud/vertexai");
// Initialize Vertex AI
const vertexAI = new vertexai_1.VertexAI({
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
exports.generateProductDescription = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in to use this feature.');
    }
    const { productName, productDetails } = request.data;
    if (!productName || !productDetails) {
        throw new https_1.HttpsError('invalid-argument', 'Product name and details are required.');
    }
    const prompt = `Buat deskripsi produk yang menarik dan singkat untuk sebuah item di menu kafe. 
    Nama Produk: "${productName}". 
    Detail: "${productDetails}". 
    Gaya bahasanya harus santai, ramah, dan menggugah selera. Maksimal 3 kalimat.`;
    try {
        logger.info(`Generating description for: ${productName}`);
        const resp = await textModel.generateContent(prompt);
        const description = (_e = (_d = (_c = (_b = (_a = resp.response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
        if (!description) {
            throw new https_1.HttpsError('internal', 'Failed to generate description from AI.');
        }
        return { description };
    }
    catch (error) {
        logger.error('Error calling Gemini API for product description:', error);
        throw new https_1.HttpsError('internal', 'An error occurred while communicating with the AI service.');
    }
});
/**
 * A callable function that provides sales insights using Gemini.
 * Expects `salesData` (an array of transaction-like objects) in the request data.
 */
exports.getSalesInsight = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in to use this feature.');
    }
    // Superadmins and admins are allowed
    if (!['superadmin', 'admin'].includes(request.auth.token.role)) {
        throw new https_1.HttpsError('permission-denied', 'You do not have permission to access sales insights.');
    }
    const { salesData } = request.data;
    if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'Valid sales data is required.');
    }
    // Convert sales data to a more digestible string format for the prompt
    const dataString = salesData.map(item => `${item.name} (terjual ${item.quantity})`).join(', ');
    const prompt = `Anda adalah seorang analis bisnis untuk sebuah kafe. Berdasarkan data penjualan berikut: [${dataString}], berikan satu wawasan atau insight menarik dalam satu kalimat singkat. 
    Contoh: "Cappuccino adalah minuman paling populer, mungkin bisa dibuatkan promo bundle dengan croissant."
    Insight Anda harus relevan, ringkas, dan actionable.`;
    try {
        logger.info('Generating sales insight...');
        const resp = await textModel.generateContent(prompt);
        const insight = (_e = (_d = (_c = (_b = (_a = resp.response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
        if (!insight) {
            throw new https_1.HttpsError('internal', 'Failed to generate insight from AI.');
        }
        return { insight };
    }
    catch (error) {
        logger.error('Error calling Gemini API for sales insight:', error);
        throw new https_1.HttpsError('internal', 'An error occurred while communicating with the AI service.');
    }
});
//# sourceMappingURL=ai.js.map