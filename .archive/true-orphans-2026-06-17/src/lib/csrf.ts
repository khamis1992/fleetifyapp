import crypto from 'crypto';

/**
 * CSRF Protection Utilities
 * Provides CSRF token generation and validation for forms
 */

export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly SESSION_KEY = 'csrf_token';
  private static readonly HEADER_NAME = 'x-csrf-token';
  private static readonly INPUT_NAME = '_csrf';

  /**
   * Generate a new CSRF token
   */
  static generateToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  /**
   * Get or create CSRF token from session storage
   */
  static getToken(): string {
    if (typeof window === 'undefined') {
      // Server-side: generate a new token
      return this.generateToken();
    }

    // Client-side: check sessionStorage
    let token = sessionStorage.getItem(this.SESSION_KEY);

    if (!token) {
      token = this.generateToken();
      sessionStorage.setItem(this.SESSION_KEY, token);
    }

    return token;
  }

  /**
   * Refresh the CSRF token
   */
  static refreshToken(): string {
    const token = this.generateToken();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(this.SESSION_KEY, token);
    }
    return token;
  }

  /**
   * Validate a CSRF token
   */
  static validateToken(token?: string): boolean {
    if (!token) return false;

    const storedToken = this.getToken();
    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(storedToken, 'hex')
    );
  }

  /**
   * Get the HTML input field for CSRF token
   */
  static getHiddenInput(): string {
    const token = this.getToken();
    return `<input type="hidden" name="${this.INPUT_NAME}" value="${token}" />`;
  }

  /**
   * Get the header name for CSRF token
   */
  static getHeaderName(): string {
    return this.HEADER_NAME;
  }

  /**
   * Get the input field name for CSRF token
   */
  static getInputName(): string {
    return this.INPUT_NAME;
  }

  /**
   * Add CSRF token to fetch headers
   */
  static addTokenToHeaders(headers: Record<string, string> = {}): Record<string, string> {
    return {
      ...headers,
      [this.HEADER_NAME]: this.getToken(),
    };
  }

  /**
   * Extract CSRF token from request
   */
  static extractToken(request: Request): string | null {
    // Check header first
    const headerToken = request.headers.get(this.HEADER_NAME);
    if (headerToken) return headerToken;

    // Check body if it's form data
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/x-www-form-urlencoded')) {
      // Note: This would need to be implemented server-side
      // as we don't have direct access to the parsed body here
    }

    return null;
  }
}

/**
 * Middleware for CSRF protection
 */
export function createCSRFMiddleware() {
  return async (request: Request, next: () => Promise<Response>) => {
    const method = request.method.toUpperCase();

    // Only validate for state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const token = CSRFProtection.extractToken(request);

      if (!CSRFProtection.validateToken(token || undefined)) {
        return new Response('Invalid CSRF token', {
          status: 403,
          headers: {
            'Content-Type': 'text/plain',
          },
        });
      }
    }

    // Continue with the request
    const response = await next();

    // Add new CSRF token to response headers for GET requests
    if (method === 'GET') {
      response.headers.set('x-csrf-token', CSRFProtection.getToken());
    }

    return response;
  };
}

/**
 * React hook for CSRF protection
 */
export function useCSRF() {
  const getToken = () => CSRFProtection.getToken();
  const refreshToken = () => CSRFProtection.refreshToken();

  const addTokenToFormData = (formData: FormData) => {
    formData.append(CSRFProtection.getInputName(), getToken());
    return formData;
  };

  const addTokenToHeaders = (headers: HeadersInit = {}): HeadersInit => {
    return CSRFProtection.addTokenToHeaders(headers as Record<string, string>);
  };

  return {
    getToken,
    refreshToken,
    addTokenToFormData,
    addTokenToHeaders,
    headerName: CSRFProtection.getHeaderName(),
    inputName: CSRFProtection.getInputName(),
  };
}