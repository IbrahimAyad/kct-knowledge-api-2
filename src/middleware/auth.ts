import { Request, Response, NextFunction } from 'express';
import { createApiResponse } from '../utils/data-loader';

// Expected API key for KCT Knowledge API
const EXPECTED_API_KEY = 'kct-menswear-api-2024-secret';

/**
 * Authentication middleware to validate API key
 * Secures all API endpoints except health checks
 */
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction) => {
  // Skip authentication for public endpoints
  const publicEndpoints = [
    '/health',
    '/',
    '/api/v1/health',
    '/api/recommendations',
    '/api/v2/recommendations', 
    '/api/combinations/validate',
    '/api/colors',
    '/api/trending',
    '/api/venues',
    '/api/styles'
  ];
  
  const isPublicEndpoint = publicEndpoints.some(endpoint => 
    req.path === endpoint || req.path.startsWith(endpoint + '/')
  );
  
  if (isPublicEndpoint) {
    return next();
  }

  // Check for API key in headers (preferred method)
  const apiKeyFromHeader = req.headers['x-api-key'] as string;
  
  // Check for API key in query parameters (fallback)
  const apiKeyFromQuery = req.query.api_key as string;
  
  // Check for API key in Authorization header (Bearer format)
  const authHeader = req.headers.authorization;
  const apiKeyFromAuth = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const providedApiKey = apiKeyFromHeader || apiKeyFromQuery || apiKeyFromAuth;

  // Log authentication attempt (without exposing the key)
  console.log(`🔐 Auth attempt for ${req.method} ${req.path} - Key provided: ${!!providedApiKey}`);

  if (!providedApiKey) {
    return res.status(401).json(createApiResponse(
      false,
      undefined,
      'API key required. Provide via X-API-Key header, Authorization Bearer token, or api_key query parameter'
    ));
  }

  if (providedApiKey !== EXPECTED_API_KEY) {
    console.log(`❌ Invalid API key attempt from ${req.ip}`);
    return res.status(401).json(createApiResponse(
      false,
      undefined,
      'Invalid API key'
    ));
  }

  // Log successful authentication
  console.log(`✅ API key authenticated for ${req.method} ${req.path}`);
  next();
};

/**
 * Extended request interface to include authenticated flag
 */
export interface AuthenticatedRequest extends Request {
  authenticated: boolean;
}

/**
 * Middleware to add authenticated flag to request
 */
export const addAuthenticatedFlag = (req: Request, _res: Response, next: NextFunction) => {
  (req as AuthenticatedRequest).authenticated = true;
  next();
};