/**
 * Database utility functions for Firestore operations
 */

const { getFirestore } = require('firebase-admin/firestore');
const logger = require('./logger');
const { isDev } = require('./config');

// Initialize Firestore
const db = getFirestore();

/**
 * Generic function to get a document by ID
 * @param {string} collection - Collection name
 * @param {string} id - Document ID
 * @returns {Promise<Object|null>} - Document data or null if not found
 */
async function getDocumentById(collection, id) {
  try {
    const docRef = db.collection(collection).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      logger.warn(`Document not found: ${collection}/${id}`);
      return null;
    }
    
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    logger.error(`Error getting document ${collection}/${id}:`, error);
    throw error;
  }
}

/**
 * Generic function to query documents
 * @param {string} collection - Collection name
 * @param {Array} queries - Array of query conditions [field, operator, value]
 * @param {number} limit - Maximum number of documents to return
 * @returns {Promise<Array>} - Array of document data
 */
async function queryDocuments(collection, queries = [], limit = 50) {
  try {
    let query = db.collection(collection);
    
    // Apply query conditions
    queries.forEach(([field, operator, value]) => {
      query = query.where(field, operator, value);
    });
    
    // Apply limit
    if (limit > 0) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      logger.info(`No documents found in ${collection} with given query`);
      return [];
    }
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error(`Error querying documents in ${collection}:`, error);
    throw error;
  }
}

/**
 * Generic function to create a document
 * @param {string} collection - Collection name
 * @param {Object} data - Document data
 * @param {string} id - Optional document ID (if not provided, Firestore will generate one)
 * @returns {Promise<Object>} - Created document data with ID
 */
async function createDocument(collection, data, id = null) {
  try {
    const timestamp = new Date().toISOString();
    const documentData = {
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    let docRef;
    if (id) {
      docRef = db.collection(collection).doc(id);
      await docRef.set(documentData);
    } else {
      docRef = await db.collection(collection).add(documentData);
    }
    
    logger.info(`Document created: ${collection}/${docRef.id}`);
    return { id: docRef.id, ...documentData };
  } catch (error) {
    logger.error(`Error creating document in ${collection}:`, error);
    throw error;
  }
}

/**
 * Generic function to update a document
 * @param {string} collection - Collection name
 * @param {string} id - Document ID
 * @param {Object} data - Document data to update
 * @returns {Promise<Object>} - Updated document data
 */
async function updateDocument(collection, id, data) {
  try {
    const docRef = db.collection(collection).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      logger.warn(`Document not found for update: ${collection}/${id}`);
      return null;
    }
    
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    await docRef.update(updateData);
    
    // Get the updated document
    const updatedDoc = await docRef.get();
    logger.info(`Document updated: ${collection}/${id}`);
    
    return { id: updatedDoc.id, ...updatedDoc.data() };
  } catch (error) {
    logger.error(`Error updating document ${collection}/${id}:`, error);
    throw error;
  }
}

/**
 * Generic function to delete a document
 * @param {string} collection - Collection name
 * @param {string} id - Document ID
 * @returns {Promise<boolean>} - True if document was deleted
 */
async function deleteDocument(collection, id) {
  try {
    const docRef = db.collection(collection).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      logger.warn(`Document not found for deletion: ${collection}/${id}`);
      return false;
    }
    
    await docRef.delete();
    logger.info(`Document deleted: ${collection}/${id}`);
    
    return true;
  } catch (error) {
    logger.error(`Error deleting document ${collection}/${id}:`, error);
    throw error;
  }
}

/**
 * Get traffic data from Firestore
 * @param {string} cityId - City ID
 * @param {string} type - Type of traffic data (live, predicted, historical)
 * @param {Object} params - Additional parameters
 * @returns {Promise<Array>} - Array of traffic data
 */
async function getTrafficData(cityId, type, params = {}) {
  try {
    const { hoursAhead = 1, daysBack = 1 } = params;
    let query = db.collection('trafficData')
      .where('cityId', '==', cityId)
      .where('type', '==', type);
    
    // Additional filters based on type
    if (type === 'predicted') {
      // Get predictions up to hoursAhead hours in the future
      const now = new Date();
      const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
      query = query.where('timestamp', '<=', futureTime.toISOString());
    } else if (type === 'historical') {
      // Get historical data from the past daysBack days
      const now = new Date();
      const pastTime = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      query = query.where('timestamp', '>=', pastTime.toISOString());
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      logger.info(`No ${type} traffic data found for city: ${cityId}`);
      return [];
    }
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error(`Error getting ${type} traffic data for city ${cityId}:`, error);
    throw error;
  }
}

/**
 * Get route data from Firestore
 * @param {string} userId - User ID
 * @param {boolean} activeOnly - Get only active routes
 * @returns {Promise<Array>} - Array of route data
 */
async function getRouteData(userId, activeOnly = false) {
  try {
    let query = db.collection('routes').where('userId', '==', userId);
    
    if (activeOnly) {
      query = query.where('status', '==', 'active');
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      logger.info(`No routes found for user: ${userId}`);
      return [];
    }
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error(`Error getting routes for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Save a selected route
 * @param {string} userId - User ID
 * @param {Object} routeData - Route data
 * @returns {Promise<Object>} - Saved route data
 */
async function saveRoute(userId, routeData) {
  try {
    const route = {
      userId,
      ...routeData,
      status: 'active',
      selectedAt: new Date().toISOString()
    };
    
    return await createDocument('routes', route);
  } catch (error) {
    logger.error(`Error saving route for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Report a traffic incident
 * @param {Object} incidentData - Incident data
 * @returns {Promise<Object>} - Reported incident data
 */
async function reportTrafficIncident(incidentData) {
  try {
    const incident = {
      ...incidentData,
      status: 'reported',
      verified: false
    };
    
    return await createDocument('trafficIncidents', incident);
  } catch (error) {
    logger.error('Error reporting traffic incident:', error);
    throw error;
  }
}

/**
 * Get traffic metrics
 * @param {string} cityId - City ID
 * @returns {Promise<Object>} - Traffic metrics
 */
async function getTrafficMetrics(cityId) {
  try {
    const docRef = db.collection('trafficMetrics').doc(cityId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      logger.warn(`Traffic metrics not found for city: ${cityId}`);
      return null;
    }
    
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    logger.error(`Error getting traffic metrics for city ${cityId}:`, error);
    throw error;
  }
}

/**
 * Get route metrics
 * @returns {Promise<Object>} - Route metrics
 */
async function getRouteMetrics() {
  try {
    const docRef = db.collection('metrics').doc('routes');
    const doc = await docRef.get();
    
    if (!doc.exists) {
      logger.warn('Route metrics not found');
      return null;
    }
    
    return doc.data();
  } catch (error) {
    logger.error('Error getting route metrics:', error);
    throw error;
  }
}

module.exports = {
  // Generic CRUD operations
  getDocumentById,
  queryDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  
  // Traffic-specific operations
  getTrafficData,
  reportTrafficIncident,
  getTrafficMetrics,
  
  // Route-specific operations
  getRouteData,
  saveRoute,
  getRouteMetrics
};