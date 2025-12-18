/**
 * API Versioning Middleware
 * Handles multiple API versions with backward compatibility
 */

import { Request, Response, NextFunction } from 'express';

// Supported API versions
const SUPPORTED_VERSIONS = ['v1', 'v2'];
const DEFAULT_VERSION = 'v1';

// Version configuration
interface VersionConfig {
  minVersion: string;
  maxVersion: string;
  deprecatedVersions: string[];
  sunsetDate?: Date;
}

const VERSION_CONFIG: Record<string, VersionConfig> = {
  'v1': {
    minVersion: 'v1',
    maxVersion: 'v1',
    deprecatedVersions: [],
  },
  'v2': {
    minVersion: 'v2',
    maxVersion: 'v2',
    deprecatedVersions: [],
  },
};

/**
 * Extract API version from request
 */
function extractVersion(req: Request): string {
  // Try header first (preferred method)
  const headerVersion = req.headers['api-version'] as string;
  if (headerVersion) {
    const version = headerVersion.startsWith('v') ? headerVersion : `v${headerVersion}`;
    if (SUPPORTED_VERSIONS.includes(version)) {
      return version;
    }
  }

  // Try query parameter
  const queryVersion = req.query.version as string;
  if (queryVersion) {
    const version = queryVersion.startsWith('v') ? queryVersion : `v${queryVersion}`;
    if (SUPPORTED_VERSIONS.includes(version)) {
      return version;
    }
  }

  // Try URL path
  const pathParts = req.path.split('/');
  const pathIndex = pathParts.indexOf('api');
  if (pathIndex !== -1 && pathParts.length > pathIndex + 1) {
    const possibleVersion = pathParts[pathIndex + 1];
    if (possibleVersion.startsWith('v') && SUPPORTED_VERSIONS.includes(possibleVersion)) {
      return possibleVersion;
    }
  }

  // Return default version
  return DEFAULT_VERSION;
}

/**
 * Check if version is deprecated
 */
function isVersionDeprecated(version: string): boolean {
  return VERSION_CONFIG[version]?.deprecatedVersions?.length > 0 || false;
}

/**
 * Get version compatibility info
 */
function getVersionCompatibility(version: string): { compatible: boolean; recommendedVersion?: string } {
  if (!SUPPORTED_VERSIONS.includes(version)) {
    return {
      compatible: false,
      recommendedVersion: DEFAULT_VERSION,
    };
  }

  const latestVersion = SUPPORTED_VERSIONS[SUPPORTED_VERSIONS.length - 1];
  const isLatest = version === latestVersion;

  return {
    compatible: true,
    recommendedVersion: isLatest ? undefined : latestVersion,
  };
}

/**
 * Main API versioning middleware
 */
export function apiVersioningMiddleware(req: Request, res: Response, next: NextFunction): void {
  const version = extractVersion(req);
  const compatibility = getVersionCompatibility(version);

  // Set version in request for downstream use
  (req as any).apiVersion = version;
  (req as any).apiVersionInfo = {
    version,
    ...compatibility,
    deprecated: isVersionDeprecated(version),
  };

  // Add version headers to response
  res.setHeader('API-Version', version);
  res.setHeader('Supported-Versions', SUPPORTED_VERSIONS.join(', '));
  res.setHeader('Default-Version', DEFAULT_VERSION);

  // Handle unsupported versions
  if (!compatibility.compatible) {
    res.status(400).json({
      error: {
        code: 'UNSUPPORTED_VERSION',
        message: `API version ${version} is not supported`,
        supported_versions: SUPPORTED_VERSIONS,
        recommended_version: compatibility.recommendedVersion,
      },
    });
    return;
  }

  // Handle deprecated versions
  if ((req as any).apiVersionInfo.deprecated) {
    const deprecationWarning = {
      code: 'DEPRECATED_VERSION',
      message: `API version ${version} is deprecated`,
      deprecation_date: VERSION_CONFIG[version]?.sunsetDate?.toISOString(),
      migrate_to: compatibility.recommendedVersion,
    };

    res.setHeader('Deprecation-Warning', JSON.stringify(deprecationWarning));

    // Log deprecation warning
    console.warn(`[API_VERSIONING] Deprecated version ${version} used`, {
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
    });
  }

  // Add version recommendations if not using latest
  if (compatibility.recommendedVersion) {
    res.setHeader('API-Recommendation', `Upgrade to ${compatibility.recommendedVersion} for latest features`);
  }

  next();
}

/**
 * Version-specific route handler factory
 */
export function createVersionedHandler(
  handlers: Record<string, (req: Request, res: Response, next?: NextFunction) => void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const version = (req as any).apiVersion;

    // Try to find handler for the version
    if (handlers[version]) {
      return handlers[version](req, res, next);
    }

    // Fall back to default version handler
    if (handlers[DEFAULT_VERSION]) {
      return handlers[DEFAULT_VERSION](req, res, next);
    }

    // No handler found
    res.status(501).json({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: `Endpoint not implemented for version ${version}`,
      },
    });
  };
}

/**
 * Version compatibility checker utility
 */
export class VersionCompatibility {
  static canUpgrade(fromVersion: string, toVersion: string): boolean {
    const fromIndex = SUPPORTED_VERSIONS.indexOf(fromVersion);
    const toIndex = SUPPORTED_VERSIONS.indexOf(toVersion);

    if (fromIndex === -1 || toIndex === -1) {
      return false;
    }

    return toIndex >= fromIndex;
  }

  static getMigrationPath(fromVersion: string, toVersion: string): string[] | null {
    if (!VersionCompatibility.canUpgrade(fromVersion, toVersion)) {
      return null;
    }

    const fromIndex = SUPPORTED_VERSIONS.indexOf(fromVersion);
    const toIndex = SUPPORTED_VERSIONS.indexOf(toVersion);

    return SUPPORTED_VERSIONS.slice(fromIndex + 1, toIndex + 1);
  }

  static isVersionSupported(version: string): boolean {
    return SUPPORTED_VERSIONS.includes(version);
  }

  static getAllVersions(): string[] {
    return [...SUPPORTED_VERSIONS];
  }

  static getLatestVersion(): string {
    return SUPPORTED_VERSIONS[SUPPORTED_VERSIONS.length - 1];
  }
}

/**
 * Version-specific request logging
 */
export function logVersionedRequest(req: Request, res: Response, next: NextFunction): void {
  const version = (req as any).apiVersion;
  const isDeprecated = (req as any).apiVersionInfo?.deprecated;

  console.log(`[API] ${req.method} ${req.path}`, {
    version,
    deprecated: isDeprecated,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  next();
}

/**
 * Custom error for version-related issues
 */
export class ApiVersionError extends Error {
  constructor(
    message: string,
    public code: string,
    public version?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiVersionError';
  }
}

/**
 * Version validation utility
 */
export function validateVersion(version: string, options: {
  allowDeprecated?: boolean;
  minVersion?: string;
  maxVersion?: string;
} = {}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if version is supported
  if (!VersionCompatibility.isVersionSupported(version)) {
    errors.push(`Version ${version} is not supported`);
    return { valid: false, errors };
  }

  // Check deprecation
  if (isVersionDeprecated(version) && !options.allowDeprecated) {
    errors.push(`Version ${version} is deprecated`);
  }

  // Check min version constraint
  if (options.minVersion && !VersionCompatibility.canUpgrade(options.minVersion, version)) {
    errors.push(`Version must be >= ${options.minVersion}`);
  }

  // Check max version constraint
  if (options.maxVersion && !VersionCompatibility.canUpgrade(version, options.maxVersion)) {
    errors.push(`Version must be <= ${options.maxVersion}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export types for TypeScript
export type ApiVersion = typeof SUPPORTED_VERSIONS[number];
export type VersionedHandlers<T = any> = Record<string, (req: Request, res: Response, next?: NextFunction) => T>;