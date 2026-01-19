import { Request, Response, NextFunction } from 'express';
import { CSRFProtection } from '../../lib/csrf';

/**
 * Express middleware for CSRF protection
 */
export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();

  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    // Add CSRF token to response headers for GET requests
    res.set('x-csrf-token', CSRFProtection.getToken());
    return next();
  }

  // For state-changing methods, validate CSRF token
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    // Get token from header
    const token = req.get('x-csrf-token');

    // If not in header, check body
    let bodyToken = token;
    if (!bodyToken && req.body && typeof req.body === 'object') {
      bodyToken = req.body._csrf || req.body.csrf_token;
    }

    // Validate token
    if (!CSRFProtection.validateToken(bodyToken)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_INVALID',
          message: 'Invalid or missing CSRF token',
        },
      });
      return;
    }
  }

  next();
}

/**
 * Cookie-based CSRF token middleware
 * Alternative implementation using cookies
 */
export function csrfCookieMiddleware(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();

  // Set CSRF token in cookie for GET requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    if (!req.cookies?.csrf_token) {
      const token = CSRFProtection.getToken();
      res.cookie('csrf_token', token, {
        httpOnly: false, // Needs to be accessible by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
    }
    return next();
  }

  // Validate CSRF token for state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const cookieToken = req.cookies?.csrf_token;
    const headerToken = req.get('x-csrf-token');
    const bodyToken = req.body?._csrf || req.body?.csrf_token;

    // Accept token from any source (cookie, header, or body)
    const token = headerToken || bodyToken;

    if (!CSRFProtection.validateToken(token) || token !== cookieToken) {
      res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_INVALID',
          message: 'Invalid or missing CSRF token',
        },
      });
      return;
    }
  }

  next();
}