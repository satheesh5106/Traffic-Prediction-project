import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
// Explicitly type the auth variable
import { Auth } from 'firebase-admin/auth';
import { ApiError } from './errorHandler';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Middleware to verify Firebase authentication token
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Not authorized, no token');
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decodedToken = await (auth as Auth).verifyIdToken(token);
    
    // Add user data to request
    req.user = decodedToken;
    
    next();
  } catch (error) {
    next(new ApiError(401, 'Not authorized, token failed'));
  }
};

// Middleware to check if user has admin role
export const admin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.admin) {
    next();
  } else {
    next(new ApiError(403, 'Not authorized as admin'));
  }
};