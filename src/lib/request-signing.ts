import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

/**
 * API Request Signing Utility
 * Provides cryptographic signing of requests for sensitive operations
 */

export interface SignedRequest {
  method: string;
  path: string;
  body?: any;
  timestamp: number;
  nonce: string;
  signature: string;
  api_key?: string;
}

/**
 * Request signing class
 */
export class RequestSigner {
  private static readonly ALGORITHM = 'sha256';
  private static readonly TIMESTAMP_WINDOW = 300000; // 5 minutes
  private static readonly NONCE_LENGTH = 16;

  /**
   * Create a signed request
   */
  static async sign(
    method: string,
    path: string,
    body?: any,
    apiSecret?: string
  ): Promise<SignedRequest> {
    const timestamp = Date.now();
    const nonce = this.generateNonce();
    const secret = apiSecret || await this.getApiSecret();

    // Create payload to sign
    const payload = {
      method,
      path,
      body: body || {},
      timestamp,
      nonce,
    };

    // Create signature
    const signature = this.createSignature(payload, secret);

    return {
      method,
      path,
      body,
      timestamp,
      nonce,
      signature,
    };
  }

  /**
   * Verify a signed request
   */
  static async verify(request: SignedRequest): Promise<boolean> {
    try {
      // Check timestamp window
      const now = Date.now();
      if (Math.abs(now - request.timestamp) > this.TIMESTAMP_WINDOW) {
        console.error('Request timestamp out of window');
        return false;
      }

      // Check nonce uniqueness (in production, use Redis or database)
      // For now, we'll skip nonce checking

      // Get API secret
      const secret = await this.getApiSecret();

      // Verify signature
      const payload = {
        method: request.method,
        path: request.path,
        body: request.body || {},
        timestamp: request.timestamp,
        nonce: request.nonce,
      };

      const expectedSignature = this.createSignature(payload, secret);
      const isValid = crypto.timingSafeEqual(
        Buffer.from(request.signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      return isValid;
    } catch (error) {
      console.error('Error verifying request:', error);
      return false;
    }
  }

  /**
   * Create signature for payload
   */
  private static createSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload, Object.keys(payload).sort());
    const hmac = crypto.createHmac(this.ALGORITHM, secret);
    hmac.update(payloadString);
    return hmac.digest('hex');
  }

  /**
   * Generate random nonce
   */
  private static generateNonce(): string {
    return crypto.randomBytes(this.NONCE_LENGTH).toString('hex');
  }

  /**
   * Get API secret from secure storage
   */
  private static async getApiSecret(): Promise<string> {
    // In production, this should come from environment variables
    // or a secure key management service
    const secret = process.env.API_SECRET_KEY || process.env.VITE_ENCRYPTION_SECRET;

    if (!secret) {
      throw new Error('API secret key not configured');
    }

    return secret;
  }
}

/**
 * Middleware for request verification
 */
export function createSignedRequestMiddleware() {
  return async (request: Request, next: () => Promise<Response>) => {
    const method = request.method;
    const path = new URL(request.url).pathname;

    // List of endpoints that require signed requests
    const signedEndpoints = [
      '/api/payments/process',
      '/api/admin/users/create',
      '/api/admin/users/delete',
      '/api/contracts/terminate',
      '/api/invoices/write-off',
      '/api/sensitive-data/export',
    ];

    // Check if this endpoint requires signing
    const requiresSigning = signedEndpoints.some(endpoint =>
      path.startsWith(endpoint)
    );

    if (!requiresSigning) {
      return next();
    }

    // Get signature from headers
    const signature = request.headers.get('x-signature');
    const timestamp = request.headers.get('x-timestamp');
    const nonce = request.headers.get('x-nonce');

    if (!signature || !timestamp || !nonce) {
      return new Response('Missing required signature headers', {
        status: 401,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    // Get request body
    let body: any;
    try {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        body = await request.json();
      } else {
        body = await request.text();
      }
    } catch {
      body = null;
    }

    // Create signed request object
    const signedRequest: SignedRequest = {
      method,
      path,
      body,
      timestamp: parseInt(timestamp),
      nonce,
      signature,
    };

    // Verify signature
    const isValid = await RequestSigner.verify(signedRequest);

    if (!isValid) {
      return new Response('Invalid request signature', {
        status: 401,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    // Create new request with body (as it was consumed)
    const newRequest = new Request(request, {
      body: body && typeof body === 'object' ? JSON.stringify(body) : body,
    });

    return next();
  };
}

/**
 * Client-side utility for sending signed requests
 */
export class SignedApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async signedRequest(
    method: string,
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    // Get session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session');
    }

    // Get request body
    let body: any;
    if (options.body) {
      if (typeof options.body === 'string') {
        body = JSON.parse(options.body);
      } else {
        body = options.body;
      }
    }

    // Create signed request
    const signed = await RequestSigner.sign(
      method,
      path,
      body,
      session.access_token
    );

    // Create headers
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('x-signature', signed.signature);
    headers.set('x-timestamp', signed.timestamp.toString());
    headers.set('x-nonce', signed.nonce);
    headers.set('Authorization', `Bearer ${session.access_token}`);

    // Send request
    return fetch(`${this.baseURL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }
}

/**
 * Hook for using signed API client
 */
export function useSignedApi() {
  return new SignedApiClient(process.env.VITE_API_URL || '/api');
}