import { db } from './firebase';
import { logger } from '../utils/logger';

// We're now using the db instance from firebase.ts

// Collection references
export const collections = {
  users: db.collection('users'),
  predictions: db.collection('predictions'),
  routes: db.collection('routes'),
  stats: db.collection('stats'),
};

// Define types for database operations
type CollectionName = 'users' | 'predictions' | 'routes' | 'stats' | 'routeStats';
type QueryOperator = '==' | '<' | '<=' | '>' | '>=' | '!=' | 'array-contains' | 'in' | 'array-contains-any';

// Helper functions for database operations
export const dbHelpers = {
  // Create a document
  create: async (collection: CollectionName, data: any) => {
    try {
      const docRef = await db.collection(collection).add({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { id: docRef.id, ...data };
    } catch (error) {
      logger.error(`Error creating document in ${collection}:`, error);
      throw error;
    }
  },
  
  // Get a document by ID
  getById: async (collection: CollectionName, id: string) => {
    try {
      const doc = await db.collection(collection).doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      logger.error(`Error getting document from ${collection}:`, error);
      throw error;
    }
  },
  
  // Update a document
  update: async (collection: CollectionName, id: string, data: any) => {
    try {
      await db.collection(collection).doc(id).update({
        ...data,
        updatedAt: new Date(),
      });
      return { id, ...data };
    } catch (error) {
      logger.error(`Error updating document in ${collection}:`, error);
      throw error;
    }
  },
  
  // Delete a document
  delete: async (collection: CollectionName, id: string) => {
    try {
      await db.collection(collection).doc(id).delete();
      return { id };
    } catch (error) {
      logger.error(`Error deleting document from ${collection}:`, error);
      throw error;
    }
  },
  
  // Query documents
  query: async (collection: CollectionName, field: string, operator: QueryOperator, value: any) => {
    try {
      const snapshot = await db.collection(collection).where(field, operator, value).get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error(`Error querying documents from ${collection}:`, error);
      throw error;
    }
  },
};