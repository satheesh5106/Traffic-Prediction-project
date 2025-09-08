import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validation Middleware
 * Validates request data against Zod schemas
 */

export class ValidationError extends Error {
  public statusCode = 400;
  public code = 'VALIDATION_ERROR';
  public details: any[];

  constructor(message: string, details: any[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Validates request body against a Zod schema
 * @param schema Zod schema to validate against
 * @returns Express middleware function
 */
export function validateRequest<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and parse the request body
      const validatedData = schema.parse(req.body);
      
      // Replace req.body with validated data
      req.body = validatedData;
      
      console.log('Request validation successful', {
        requestId: req.headers['x-request-id'],
        path: req.path,
        method: req.method,
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationDetails = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        const validationError = new ValidationError(
          'Invalid request data: ' + validationDetails.map(d => `${d.field}: ${d.message}`).join(', '),
          validationDetails
        );

        console.error('Request validation failed', {
          requestId: req.headers['x-request-id'],
          path: req.path,
          method: req.method,
          errors: validationDetails,
        });

        return next(validationError);
      }

      console.error('Unexpected validation error', {
        requestId: req.headers['x-request-id'],
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      next(error);
    }
  };
}

/**
 * Validates request query parameters against a Zod schema
 * @param schema Zod schema to validate against
 * @returns Express middleware function
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData as any;
      
      console.log('Query validation successful', {
        requestId: req.headers['x-request-id'],
        path: req.path,
        method: req.method,
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationDetails = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        const validationError = new ValidationError(
          'Invalid query parameters: ' + validationDetails.map(d => `${d.field}: ${d.message}`).join(', '),
          validationDetails
        );

        console.error('Query validation failed', {
          requestId: req.headers['x-request-id'],
          path: req.path,
          method: req.method,
          errors: validationDetails,
        });

        return next(validationError);
      }

      next(error);
    }
  };
}

/**
 * Validates request parameters against a Zod schema
 * @param schema Zod schema to validate against
 * @returns Express middleware function
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData as any;
      
      console.log('Params validation successful', {
        requestId: req.headers['x-request-id'],
        path: req.path,
        method: req.method,
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationDetails = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        const validationError = new ValidationError(
          'Invalid path parameters: ' + validationDetails.map(d => `${d.field}: ${d.message}`).join(', '),
          validationDetails
        );

        console.error('Params validation failed', {
          requestId: req.headers['x-request-id'],
          path: req.path,
          method: req.method,
          errors: validationDetails,
        });

        return next(validationError);
      }

      next(error);
    }
  };
}

export function createValidationErrorResponse(error: ValidationError) {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };
}

export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError;
}