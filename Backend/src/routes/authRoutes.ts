import express from 'express';
import { login, register, getProfile, updateProfile } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Public routes
router.post('/login', asyncHandler(login));
router.post('/register', asyncHandler(register));

// Protected routes
router.get('/profile', protect, asyncHandler(getProfile));
router.put('/profile', protect, asyncHandler(updateProfile));

export default router;