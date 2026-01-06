/**
 * Security Headers Component
 * Applies security headers and configurations at the application level
 */

import { useEffect } from 'react';

export function SecurityHeaders() {
  useEffect(() => {
    // Note: In a client-side React app, we can't directly set HTTP headers
    // But we can implement security measures at the application level

    // 1. Add meta tags for security (these help with some security measures)
    // NOTE: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection MUST be set 
    // via HTTP headers (configured in vercel.json), not via meta tags
    const addSecurityMetaTags = () => {
      const metaTags = [
        { name: 'referrer', content: 'strict-origin-when-cross-origin' },
        // Only add robots in production to prevent indexing of staging/dev
        ...(import.meta.env.PROD ? [{ name: 'robots', content: 'index, follow' }] : []),
      ];

      metaTags.forEach(tag => {
        // Check if meta tag already exists to avoid duplicates
        const existingMeta = document.querySelector(`meta[name="${tag.name}"]`);
        if (!existingMeta) {
          const meta = document.createElement('meta');
          Object.entries(tag).forEach(([key, value]) => {
            meta.setAttribute(key, value);
          });
          document.head.appendChild(meta);
        }
      });
    };

    // 2. Remove sensitive information from global scope
    const cleanupGlobalScope = () => {
      // Remove any sensitive data that might have been accidentally added to window
      const sensitiveKeys = [
        'password', 'token', 'secret', 'key', 'auth', 'credential'
      ];

      Object.keys(window).forEach(key => {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          delete (window as any)[key];
        }
      });
    };

    // 3. Disable console in production (to prevent information leakage)
    const disableConsoleInProduction = () => {
      if (import.meta.env.PROD) {
        // Keep console for debugging but remove sensitive logs
        const originalConsole = { ...console };
        const sensitiveMethods = ['log', 'info', 'warn', 'error'];

        sensitiveMethods.forEach(method => {
          (console as any)[method] = (...args: any[]) => {
            // Filter out potentially sensitive information
            const filteredArgs = args.map(arg => {
              if (typeof arg === 'string') {
                // Remove potential sensitive data patterns
                return arg
                  .replace(/(token|password|secret|key|auth)[s:=]+["']?[\w-/+]+=+["']?/gi, '[REDACTED]')
                  .replace(/Bearer[s][w-/+]+=+/gi, 'Bearer [REDACTED]')
                  .replace(/[a-zA-Z0-9]{20,}/g, '[LONG_STRING_REDACTED]');
              }
              return arg;
            });

            // Still log but with filtered data
            (originalConsole as any)[method](...filteredArgs);
          };
        });
      }
    };

    // 4. Implement content security policy violations handling
    const setupCSPViolationHandler = () => {
      document.addEventListener('securitypolicyviolation', (e) => {
        console.warn('🚨 CSP Violation:', {
          violatedDirective: e.violatedDirective,
          blockedURI: e.blockedURI,
          documentURI: e.documentURI,
          referrer: e.referrer,
          originalPolicy: e.originalPolicy,
        });
      });
    };

    // 5. Prevent clickjacking
    const preventClickjacking = () => {
      if (window.self !== window.top) {
        // The page is in an iframe
        console.warn('🚨 Page detected in iframe - potential clickjacking attempt');
        // You could redirect or take other action here
      }
    };

    // 6. Clear sensitive data from sessionStorage on page unload
    const clearSensitiveStorage = () => {
      const handleBeforeUnload = () => {
        // Clear sensitive data from sessionStorage but keep necessary session info
        const keysToKeep = ['auth_redirect', 'theme', 'language'];
        const allKeys = Object.keys(sessionStorage);

        allKeys.forEach(key => {
          if (!keysToKeep.includes(key)) {
            sessionStorage.removeItem(key);
          }
        });
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    };

    // Initialize all security measures
    addSecurityMetaTags();
    cleanupGlobalScope();
    disableConsoleInProduction();
    setupCSPViolationHandler();
    preventClickjacking();
    const cleanupStorage = clearSensitiveStorage();

    // Cleanup on unmount
    return cleanupStorage;
  }, []);

  // This component doesn't render anything visible
  return null;
}

export default SecurityHeaders;