/**
 * Secure CORS configuration utility for Supabase Edge Functions
 * Replaces wildcard '*' origins with environment-specific allowed origins
 */

export function getAllowedOrigins(): string[] {
  const env = Deno.env.get('ENVIRONMENT') || 'development';
  
  switch (env) {
    case 'production':
      return [
        'https://app.fleetify.com',
        'https://fleetify.com',
        'https://www.fleetify.com'
      ];
    case 'staging':
      return [
        'https://staging.fleetify.com',
        'https://dev.fleetify.com'
      ];
    default:
      return [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000'
      ];
  }
}

export function createCorsHeaders(origin?: string): HeadersInit {
  const allowedOrigins = getAllowedOrigins();
  const isOriginAllowed = origin && allowedOrigins.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isOriginAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  };
}

export function handleCorsPreflightRequest(req: Request): Response {
  const origin = req.headers.get('origin');
  const corsHeaders = createCorsHeaders(origin);
  
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}

/**
 * Enhanced CORS handler with security features
 */
export function withCors(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return handleCorsPreflightRequest(req);
    }
    
    // Get origin from request
    const origin = req.headers.get('origin');
    const corsHeaders = createCorsHeaders(origin);
    
    try {
      const response = await handler(req);
      
      // Add CORS headers to response
      const headers = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      console.error('Error in CORS handler:', error);
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Internal server error'
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
  };
}