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

    const batch = writeBatch(db);

    products.forEach((product) => {
      const productDocRef = doc(productCollectionRef, product.id);
      
      const { id, ...productData } = product; 
      
      batch.set(productDocRef, productData);
    });

    try {
      await batch.commit();
      console.log(`Successfully seeded ${products.length} products for ${store.name}.`);
    } catch (error) {
      console.error(`Error seeding products for ${store.name}:`, error);
      throw error;
    }
  }

  console.log('Database seeding finished.');
}
