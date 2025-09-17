'use client';

import { db } from './firebase';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { products, stores } from './data';

/**
 * Seeds the Firestore database with initial product data for each store.
 * This function is intended for one-time use during development setup.
 */
export async function seedDatabase() {
  console.log('Seeding database...');

  for (const store of stores) {
    const productCollectionName = `products_${store.id.replace('store_', '')}`;
    const productCollectionRef = collection(db, productCollectionName);
    console.log(`Processing collection: ${productCollectionName}`);

    // Use a batch to write all products for a store at once.
    // This is more efficient than individual writes.
    const batch = writeBatch(db);

    products.forEach((product) => {
      // Use the existing product ID for the new document ID
      const productDocRef = doc(productCollectionRef, product.id);
      
      // We are creating a new object to avoid sending the `id` field
      // inside the document data itself, as it's already the document ID.
      const { id, ...productData } = product; 
      
      batch.set(productDocRef, productData);
    });

    try {
      await batch.commit();
      console.log(`Successfully seeded ${products.length} products for ${store.name}.`);
    } catch (error) {
      console.error(`Error seeding products for ${store.name}:`, error);
      // Re-throw the error to be caught by the calling function
      throw error;
    }
  }

  console.log('Database seeding finished.');
}
