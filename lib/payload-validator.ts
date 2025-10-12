/**
 * Payload Validation and Optimization Utilities
 * Prevents FUNCTION_PAYLOAD_TOO_LARGE and related errors
 */

// Vercel limits
export const VERCEL_LIMITS = {
  REQUEST_BODY_SIZE: 4.5 * 1024 * 1024, // 4.5MB (Vercel limit is 5MB, leaving buffer)
  RESPONSE_SIZE: 4.5 * 1024 * 1024, // 4.5MB
  URL_LENGTH: 4096, // 4KB
  HEADER_SIZE: 8192, // 8KB
  FUNCTION_TIMEOUT: 30000, // 30 seconds for serverless functions
  EDGE_FUNCTION_TIMEOUT: 30000 // 30 seconds for edge functions
};

export interface PayloadValidationResult {
  isValid: boolean;
  size: number;
  errors: string[];
  warnings: string[];
  optimizations?: string[];
}

export class PayloadValidator {
  /**
   * Validate request payload size
   */
  static validateRequestPayload(data: any): PayloadValidationResult {
    const result: PayloadValidationResult = {
      isValid: true,
      size: 0,
      errors: [],
      warnings: [],
      optimizations: []
    };

    try {
      // Calculate payload size
      const jsonString = JSON.stringify(data);
      const sizeInBytes = new TextEncoder().encode(jsonString).length;
      result.size = sizeInBytes;

      // Check against limits
      if (sizeInBytes > VERCEL_LIMITS.REQUEST_BODY_SIZE) {
        result.isValid = false;
        result.errors.push(
          `Request payload size (${this.formatBytes(sizeInBytes)}) exceeds Vercel limit (${this.formatBytes(VERCEL_LIMITS.REQUEST_BODY_SIZE)})`
        );
      }

      // Warning for large payloads (>1MB)
      if (sizeInBytes > 1024 * 1024) {
        result.warnings.push(
          `Large payload detected (${this.formatBytes(sizeInBytes)}). Consider optimization.`
        );
        result.optimizations?.push('Consider compressing data or splitting into smaller chunks');
      }

      // Check for common optimization opportunities
      this.addOptimizationSuggestions(data, result);

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Payload validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Validate response payload size
   */
  static validateResponsePayload(data: any): PayloadValidationResult {
    const result: PayloadValidationResult = {
      isValid: true,
      size: 0,
      errors: [],
      warnings: [],
      optimizations: []
    };

    try {
      const jsonString = JSON.stringify(data);
      const sizeInBytes = new TextEncoder().encode(jsonString).length;
      result.size = sizeInBytes;

      if (sizeInBytes > VERCEL_LIMITS.RESPONSE_SIZE) {
        result.isValid = false;
        result.errors.push(
          `Response payload size (${this.formatBytes(sizeInBytes)}) exceeds Vercel limit (${this.formatBytes(VERCEL_LIMITS.RESPONSE_SIZE)})`
        );
      }

      // Warning for large responses
      if (sizeInBytes > 1024 * 1024) {
        result.warnings.push(
          `Large response detected (${this.formatBytes(sizeInBytes)}). Consider pagination or compression.`
        );
      }

      this.addOptimizationSuggestions(data, result);

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Response validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Validate URL length
   */
  static validateUrlLength(url: string): PayloadValidationResult {
    const result: PayloadValidationResult = {
      isValid: true,
      size: url.length,
      errors: [],
      warnings: []
    };

    if (url.length > VERCEL_LIMITS.URL_LENGTH) {
      result.isValid = false;
      result.errors.push(
        `URL length (${url.length}) exceeds limit (${VERCEL_LIMITS.URL_LENGTH})`
      );
    }

    if (url.length > 2048) {
      result.warnings.push('Long URL detected. Consider using POST with body data instead.');
    }

    return result;
  }

  /**
   * Optimize payload by removing unnecessary data
   */
  static optimizePayload(data: any, options: {
    removeNulls?: boolean;
    removeEmptyStrings?: boolean;
    removeEmptyArrays?: boolean;
    removeEmptyObjects?: boolean;
    maxDepth?: number;
  } = {}): any {
    const {
      removeNulls = true,
      removeEmptyStrings = true,
      removeEmptyArrays = true,
      removeEmptyObjects = true,
      maxDepth = 10
    } = options;

    const optimize = (obj: any, depth = 0): any => {
      if (depth > maxDepth) return obj;

      if (Array.isArray(obj)) {
        const optimized = obj
          .map(item => optimize(item, depth + 1))
          .filter(item => {
            if (removeNulls && (item === null || item === undefined)) return false;
            if (removeEmptyStrings && item === '') return false;
            if (removeEmptyArrays && Array.isArray(item) && item.length === 0) return false;
            if (removeEmptyObjects && typeof item === 'object' && item !== null && Object.keys(item).length === 0) return false;
            return true;
          });
        
        return optimized;
      }

      if (typeof obj === 'object' && obj !== null) {
        const optimized: any = {};
        
        for (const [key, value] of Object.entries(obj)) {
          const optimizedValue = optimize(value, depth + 1);
          
          // Skip based on optimization rules
          if (removeNulls && (optimizedValue === null || optimizedValue === undefined)) continue;
          if (removeEmptyStrings && optimizedValue === '') continue;
          if (removeEmptyArrays && Array.isArray(optimizedValue) && optimizedValue.length === 0) continue;
          if (removeEmptyObjects && typeof optimizedValue === 'object' && optimizedValue !== null && Object.keys(optimizedValue).length === 0) continue;
          
          optimized[key] = optimizedValue;
        }
        
        return optimized;
      }

      return obj;
    };

    return optimize(data);
  }

  /**
   * Compress large strings in payload
   */
  static compressStrings(data: any, minLength = 1000): any {
    const compress = (obj: any): any => {
      if (typeof obj === 'string' && obj.length > minLength) {
        // Simple compression: remove extra whitespace
        return obj.replace(/\s+/g, ' ').trim();
      }

      if (Array.isArray(obj)) {
        return obj.map(compress);
      }

      if (typeof obj === 'object' && obj !== null) {
        const compressed: any = {};
        for (const [key, value] of Object.entries(obj)) {
          compressed[key] = compress(value);
        }
        return compressed;
      }

      return obj;
    };

    return compress(data);
  }

  /**
   * Paginate large arrays
   */
  static paginateArray<T>(array: T[], pageSize = 100, page = 1): {
    data: T[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const data = array.slice(startIndex, endIndex);
    const totalPages = Math.ceil(array.length / pageSize);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total: array.length,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Format bytes to human readable string
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Add optimization suggestions based on payload analysis
   */
  private static addOptimizationSuggestions(data: any, result: PayloadValidationResult): void {
    try {
      const analysis = this.analyzePayload(data);
      
      if (analysis.hasLargeStrings) {
        result.optimizations?.push('Consider compressing or truncating large text fields');
      }
      
      if (analysis.hasDeepNesting) {
        result.optimizations?.push('Consider flattening deeply nested objects');
      }
      
      if (analysis.hasLargeArrays) {
        result.optimizations?.push('Consider implementing pagination for large arrays');
      }
      
      if (analysis.hasEmptyFields) {
        result.optimizations?.push('Remove null, undefined, or empty fields to reduce payload size');
      }
      
    } catch (error) {
      // Ignore analysis errors
    }
  }

  /**
   * Analyze payload structure for optimization opportunities
   */
  private static analyzePayload(data: any, depth = 0): {
    hasLargeStrings: boolean;
    hasDeepNesting: boolean;
    hasLargeArrays: boolean;
    hasEmptyFields: boolean;
  } {
    const analysis = {
      hasLargeStrings: false,
      hasDeepNesting: depth > 5,
      hasLargeArrays: false,
      hasEmptyFields: false
    };

    if (typeof data === 'string' && data.length > 10000) {
      analysis.hasLargeStrings = true;
    }

    if (Array.isArray(data)) {
      if (data.length > 1000) {
        analysis.hasLargeArrays = true;
      }
      
      data.forEach(item => {
        const subAnalysis = this.analyzePayload(item, depth + 1);
        Object.keys(analysis).forEach(key => {
          if (subAnalysis[key as keyof typeof subAnalysis]) {
            (analysis as any)[key] = true;
          }
        });
      });
    }

    if (typeof data === 'object' && data !== null) {
      Object.entries(data).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '' || 
            (Array.isArray(value) && value.length === 0) ||
            (typeof value === 'object' && value !== null && Object.keys(value).length === 0)) {
          analysis.hasEmptyFields = true;
        }
        
        const subAnalysis = this.analyzePayload(value, depth + 1);
        Object.keys(analysis).forEach(key => {
          if (subAnalysis[key as keyof typeof subAnalysis]) {
            (analysis as any)[key] = true;
          }
        });
      });
    }

    return analysis;
  }
}

/**
 * Middleware for automatic payload validation
 */
export function withPayloadValidation(handler: Function) {
  return async (req: any, res: any) => {
    try {
      // Validate request payload if present
      if (req.body && Object.keys(req.body).length > 0) {
        const requestValidation = PayloadValidator.validateRequestPayload(req.body);
        
        if (!requestValidation.isValid) {
          return res.status(413).json({
            error: 'FUNCTION_PAYLOAD_TOO_LARGE',
            message: 'Request payload exceeds size limits',
            details: requestValidation.errors,
            size: PayloadValidator['formatBytes'](requestValidation.size)
          });
        }
        
        // Log warnings
        if (requestValidation.warnings.length > 0) {
          console.warn('Payload warnings:', requestValidation.warnings);
        }
      }

      // Execute the handler
      const result = await handler(req, res);
      
      return result;
      
    } catch (error) {
      console.error('Payload validation middleware error:', error);
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Payload validation failed'
      });
    }
  };
}