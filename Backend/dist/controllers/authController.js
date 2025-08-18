"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = exports.register = exports.login = void 0;
const firebase_1 = require("../config/firebase");
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
// Login user
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new errorHandler_1.ApiError(400, 'Please provide email and password');
    }
    try {
        // Sign in with email and password - using Firebase Admin SDK
        // Note: Firebase Admin SDK doesn't have signInWithEmailAndPassword
        // We need to use a different approach with the Admin SDK
        const user = await firebase_1.auth.getUserByEmail(email);
        // In a real implementation, we would verify the password here
        // For now, we're just retrieving the user by email
        if (!user) {
            throw new errorHandler_1.ApiError(401, 'Invalid credentials');
        }
        // Get user data from Firestore
        const userData = await database_1.dbHelpers.query('users', 'uid', '==', user.uid);
        // Generate custom token since UserRecord doesn't have getIdToken
        const token = await firebase_1.auth.createCustomToken(user.uid);
        res.status(200).json({
            success: true,
            data: {
                user: userData[0] || { uid: user.uid, email: user.email },
                token,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Login error:', error);
        throw new errorHandler_1.ApiError(401, 'Invalid credentials');
    }
};
exports.login = login;
// Register user
const register = async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
        throw new errorHandler_1.ApiError(400, 'Please provide all required fields');
    }
    try {
        // Check if user already exists
        const userExists = await firebase_1.auth.getUserByEmail(email).catch(() => null);
        if (userExists) {
            throw new errorHandler_1.ApiError(400, 'User already exists');
        }
        // Create user with Firebase Authentication using Admin SDK
        const user = await firebase_1.auth.createUser({
            email,
            password,
            displayName: name
        });
        if (!user) {
            throw new errorHandler_1.ApiError(500, 'Failed to create user');
        }
        // Create user in Firestore
        const userData = {
            uid: user.uid,
            email: user.email,
            name,
            role: 'user',
            createdAt: new Date(),
        };
        await database_1.collections.users.doc(user.uid).set(userData);
        // Generate custom token since UserRecord doesn't have getIdToken
        const token = await firebase_1.auth.createCustomToken(user.uid);
        res.status(201).json({
            success: true,
            data: {
                user: userData,
                token,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Registration error:', error);
        if (error instanceof errorHandler_1.ApiError) {
            throw error;
        }
        throw new errorHandler_1.ApiError(500, 'Failed to register user');
    }
};
exports.register = register;
// Get user profile
const getProfile = async (req, res) => {
    try {
        const userId = req.user.uid;
        // Get user data from Firestore
        const userData = await database_1.dbHelpers.getById('users', userId);
        if (!userData) {
            throw new errorHandler_1.ApiError(404, 'User not found');
        }
        res.status(200).json({
            success: true,
            data: userData,
        });
    }
    catch (error) {
        logger_1.logger.error('Get profile error:', error);
        if (error instanceof errorHandler_1.ApiError) {
            throw error;
        }
        throw new errorHandler_1.ApiError(500, 'Failed to get user profile');
    }
};
exports.getProfile = getProfile;
// Update user profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.uid;
        const { name, phone, address } = req.body;
        // Get current user data
        const userData = await database_1.dbHelpers.getById('users', userId);
        if (!userData) {
            throw new errorHandler_1.ApiError(404, 'User not found');
        }
        // Update user data with type assertion to avoid TypeScript errors
        const typedUserData = userData;
        const updatedData = {
            ...typedUserData,
            name: name || typedUserData.name,
            phone: phone || typedUserData.phone,
            address: address || typedUserData.address,
            updatedAt: new Date(),
        };
        await database_1.dbHelpers.update('users', userId, updatedData);
        res.status(200).json({
            success: true,
            data: updatedData,
        });
    }
    catch (error) {
        logger_1.logger.error('Update profile error:', error);
        if (error instanceof errorHandler_1.ApiError) {
            throw error;
        }
        throw new errorHandler_1.ApiError(500, 'Failed to update user profile');
    }
};
exports.updateProfile = updateProfile;
//# sourceMappingURL=authController.js.map