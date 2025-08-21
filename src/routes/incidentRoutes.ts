/**
 * Incident Prediction API Routes
 * 
 * Defines API endpoints for incident prediction and classification.
 */

import express from 'express';
import * as incidentController from '../controllers/incidentController.js';

const router = express.Router();

/**
 * @route   POST /api/incidents/predict
 * @desc    Predict incident severity based on input parameters
 * @access  Public
 */
router.post('/predict', incidentController.predictIncident);

/**
 * @route   POST /api/incidents/sms
 * @desc    Send SMS alert for severe incidents
 * @access  Public
 */
router.post('/sms', incidentController.sendSMSAlert);

/**
 * @route   GET /api/incidents/stats
 * @desc    Get incident prediction statistics
 * @access  Public
 */
router.get('/stats', incidentController.getIncidentStats);

/**
 * @route   GET /api/incidents/history
 * @desc    Get recent incident predictions
 * @access  Public
 */
router.get('/history', incidentController.getIncidentHistory);

/**
 * @route   GET /api/incidents/model-info
 * @desc    Get information about the ML model
 * @access  Public
 */
router.get('/model-info', incidentController.getModelInfo);

export default router;