"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.admin = exports.protect = void 0;
const firebase_1 = require("../config/firebase");
const errorHandler_1 = require("./errorHandler");
// Middleware to verify Firebase authentication token
const protect = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errorHandler_1.ApiError(401, 'Not authorized, no token');
        }
        const token = authHeader.split(' ')[1];
        // Verify token
        const decodedToken = await firebase_1.auth.verifyIdToken(token);
        // Add user data to request
        req.user = decodedToken;
        next();
    }
    catch (error) {
        next(new errorHandler_1.ApiError(401, 'Not authorized, token failed'));
    }
};
exports.protect = protect;
// Middleware to check if user has admin role
const admin = (req, res, next) => {
    if (req.user && req.user.admin) {
        next();
    }
    else {
        next(new errorHandler_1.ApiError(403, 'Not authorized as admin'));
    }
};
exports.admin = admin;
//# sourceMappingURL=authMiddleware.js.map