/**
 * Vite Security Plugin
 * Adds security headers to the development server and build output
 */

import type { Plugin } from 'vite';
import { securityHeaders } from './security';

export function securityPlugin(): Plugin {
  return {
    name: 'vite-security-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Add security headers
        Object.entries(securityHeaders).forEach(([header, value]) => {
          res.setHeader(header, value);
        });

        // Additional development-specific headers
        if (process.env.NODE_ENV === 'development') {
          res.setHeader('X-Development-Mode', 'true');
        }

        next();
      });
    },
    generateBundle(options, bundle) {
      // Note: For production, headers should be configured in your hosting service
      // This plugin mainly focuses on development security
      console.log('🔒 Security headers configured for development server');
    },
  };
}

export default securityPlugin;