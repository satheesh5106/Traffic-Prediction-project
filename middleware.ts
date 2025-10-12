/**
 * Next.js Middleware for Vercel Edge Functions
 * Handles routing, security, and error prevention
 */

import { NextRequest, NextResponse } from 'next/server';

// Rate limiting store (in-memory for demo, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Configuration
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // requests per window
};

const BLOCKED_PATHS = [
  '/.env',
  '/config',
  '/admin',
  '/.git',
  '/node_modules'
];

const API_PATHS = [
  '/api/health',
  '/api/ping',
  '/api/traffic-data',
  '/api/ml-traffic',
  '/api/ml-incident'
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const url = pathname + search;
  
  try {
    // Security: Block access to sensitive paths
    if (BLOCKED_PATHS.some(blocked => pathname.startsWith(blocked))) {
      return new NextResponse('Not Found', { 
        status: 404,
        headers: {
          'X-Error-Code': 'RESOURCE_NOT_FOUND',
          'Cache-Control': 'no-cache'
        }
      });
    }

    // URL length validation
    if (url.length > 4096) {
      return NextResponse.json(
        {
          error: 'URL_TOO_LONG',
          message: 'Request URL exceeds maximum length',
          maxLength: 4096,
          currentLength: url.length
        },
        { 
          status: 414,
          headers: {
            'X-Error-Code': 'URL_TOO_LONG'
          }
        }
      );
    }

    // Rate limiting
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = checkRateLimit(clientIP);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'FUNCTION_THROTTLED',
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-Error-Code': 'FUNCTION_THROTTLED',
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': RATE_LIMIT.maxRequests.toString(),
            'X-RateLimit-Remaining': Math.max(0, RATE_LIMIT.maxRequests - rateLimitResult.count).toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          }
        }
      );
    }

    // API route validation
    if (pathname.startsWith('/api/')) {
      // Check if API endpoint exists
      const isValidAPI = API_PATHS.some(apiPath => pathname.startsWith(apiPath));
      
      if (!isValidAPI) {
        return NextResponse.json(
          {
            error: 'NOT_FOUND',
            message: 'API endpoint not found',
            availableEndpoints: API_PATHS
          },
          { 
            status: 404,
            headers: {
              'X-Error-Code': 'NOT_FOUND'
            }
          }
        );
      }

      // Validate request headers
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) { // 5MB limit
        return NextResponse.json(
          {
            error: 'REQUEST_HEADER_TOO_LARGE',
            message: 'Request body too large',
            maxSize: '5MB',
            currentSize: contentLength
          },
          { 
            status: 413,
            headers: {
              'X-Error-Code': 'REQUEST_HEADER_TOO_LARGE'
            }
          }
        );
      }

      // Add security headers for API routes
      const response = NextResponse.next();
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return response;
    }

    // Handle static files and pages
    const response = NextResponse.next();
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Cache headers for static assets
    if (pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    
    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    
    // Return generic error to prevent information leakage
    return NextResponse.json(
      {
        error: 'MIDDLEWARE_INVOCATION_FAILED',
        message: 'Request processing failed',
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'X-Error-Code': 'MIDDLEWARE_INVOCATION_FAILED'
        }
      }
    );
  }
}

/**
 * Rate limiting implementation
 */
function checkRateLimit(clientIP: string): { allowed: boolean; count: number; resetTime: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.windowMs;
  
  // Clean up old entries
  for (const [ip, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(ip);
    }
  }
  
  const existing = rateLimitStore.get(clientIP);
  
  if (!existing || existing.resetTime < now) {
    // New window
    const resetTime = now + RATE_LIMIT.windowMs;
    rateLimitStore.set(clientIP, { count: 1, resetTime });
    return { allowed: true, count: 1, resetTime };
  }
  
  // Increment existing count
  existing.count++;
  rateLimitStore.set(clientIP, existing);
  
  return {
    allowed: existing.count <= RATE_LIMIT.maxRequests,
    count: existing.count,
    resetTime: existing.resetTime
  };
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};