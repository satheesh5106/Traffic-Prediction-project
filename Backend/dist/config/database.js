"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbHelpers = exports.collections = void 0;
const firebase_1 = require("./firebase");
const logger_1 = require("../utils/logger");
// We're now using the db instance from firebase.ts
// Collection references
exports.collections = {
    users: firebase_1.db.collection('users'),
    predictions: firebase_1.db.collection('predictions'),
    routes: firebase_1.db.collection('routes'),
    stats: firebase_1.db.collection('stats'),
};
// Helper functions for database operations
exports.dbHelpers = {
    // Create a document
    create: async (collection, data) => {
        try {
            const docRef = await firebase_1.db.collection(collection).add({
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            return { id: docRef.id, ...data };
        }
        catch (error) {
            logger_1.logger.error(`Error creating document in ${collection}:`, error);
            throw error;
        }
    },
    // Get a document by ID
    getById: async (collection, id) => {
        try {
            const doc = await firebase_1.db.collection(collection).doc(id).get();
            if (!doc.exists)
                return null;
            return { id: doc.id, ...doc.data() };
        }
        catch (error) {
            logger_1.logger.error(`Error getting document from ${collection}:`, error);
            throw error;
        }
    },
    // Update a document
    update: async (collection, id, data) => {
        try {
            await firebase_1.db.collection(collection).doc(id).update({
                ...data,
                updatedAt: new Date(),
            });
            return { id, ...data };
        }
        catch (error) {
            logger_1.logger.error(`Error updating document in ${collection}:`, error);
            throw error;
        }
    },
    // Delete a document
    delete: async (collection, id) => {
        try {
            await firebase_1.db.collection(collection).doc(id).delete();
            return { id };
        }
        catch (error) {
            logger_1.logger.error(`Error deleting document from ${collection}:`, error);
            throw error;
        }
    },
    // Query documents
    query: async (collection, field, operator, value) => {
        try {
            const snapshot = await firebase_1.db.collection(collection).where(field, operator, value).get();
            return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        }
        catch (error) {
            logger_1.logger.error(`Error querying documents from ${collection}:`, error);
            throw error;
        }
    },
};
//# sourceMappingURL=database.js.map