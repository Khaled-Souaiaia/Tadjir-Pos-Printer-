// =======================================================================
// TADJIR License Server - Security Middleware
// Authentication, Rate Limiting, and Input Validation
// =======================================================================

import { Request, Response, NextFunction } from 'express';

// Admin API Key Authentication (set in environment variables)
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'change-this-in-production';

/**
 * Authentication middleware for admin endpoints
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey || apiKey !== ADMIN_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or missing API key'
    });
  }

  next();
};

/**
 * Input validation middleware
 */
export const validateLicenseId = (req: Request, res: Response, next: NextFunction) => {
  const { id, licenseId, serialKey } = req.body;

  if (!id && !licenseId && !serialKey) {
    return res.status(400).json({
      success: false,
      message: 'License identifier required (id, licenseId, or serialKey)'
    });
  }

  next();
};

/**
 * Rate limiting configuration
 * Prevents brute force attacks and excessive API usage
 */
export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
};

/**
 * Sanitize license data before sending to client
 * Remove sensitive fields that shouldn't be exposed
 */
export const sanitizeLicenseData = (license: any) => {
  // Remove or mask sensitive fields if needed
  const sanitized = { ...license };

  // Keep all fields for now as they're needed for license management
  // In production, consider removing or masking certain fields based on access level

  return sanitized;
};

/**
 * Validate status value
 */
export const validateStatus = (status: string): boolean => {
  const validStatuses = ['active', 'revoked', 'suspended', 'expired'];
  return validStatuses.includes(status);
};

/**
 * Validate expiration date
 */
export const validateExpirationDate = (dateStr: string): boolean => {
  try {
    const date = new Date(dateStr);
    const now = new Date();

    if (isNaN(date.getTime())) {
      return false;
    }

    // Check if date is in the future
    return date > now;
  } catch {
    return false;
  }
};

/**
 * Validate duration hours
 */
export const validateDurationHours = (hours: number): boolean => {
  return typeof hours === 'number' && hours > 0 && hours <= 87600; // Max 10 years
};

/**
 * Log security events
 */
export const logSecurityEvent = (event: string, details: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY] ${timestamp} - ${event}:`, JSON.stringify(details, null, 2));
};

/**
 * CORS configuration for production
 */
export const getCorsOptions = () => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      // In development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      // In production, check whitelist
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    optionsSuccessStatus: 200
  };
};
