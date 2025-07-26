// Security utilities for client-side validation and protection

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class SecurityValidator {
  private static readonly MAX_INPUT_LENGTH = 1000;
  private static readonly MAX_EMAIL_LENGTH = 254;
  private static readonly MAX_NAME_LENGTH = 100;

  // Input sanitization patterns
  private static readonly SQL_INJECTION_PATTERNS = [
    /(\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|UNION|SELECT)\b)/gi,
    /(--|\/\*|\*\/|;)/g,
    /(\b(AND|OR)\b.*=)/gi
  ];

  private static readonly XSS_PATTERNS = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /data:\s*text\/html/gi,
    /vbscript:/gi
  ];

  // Password strength validation
  static validatePasswordStrength(password: string): ValidationResult {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};:"\\|,.<>\?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a stronger password');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Email validation with security checks
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email || email.trim().length === 0) {
      errors.push('Email is required');
      return { isValid: false, errors };
    }

    if (email.length > this.MAX_EMAIL_LENGTH) {
      errors.push(`Email must be less than ${this.MAX_EMAIL_LENGTH} characters`);
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    // Check for security patterns
    if (this.containsSQLInjection(email) || this.containsXSS(email)) {
      errors.push('Email contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // General input validation
  static validateInput(input: string, fieldName: string, maxLength: number = this.MAX_INPUT_LENGTH): ValidationResult {
    const errors: string[] = [];

    if (!input || input.trim().length === 0) {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors };
    }

    if (input.length > maxLength) {
      errors.push(`${fieldName} must be less than ${maxLength} characters`);
    }

    if (this.containsSQLInjection(input)) {
      errors.push(`${fieldName} contains invalid SQL characters`);
    }

    if (this.containsXSS(input)) {
      errors.push(`${fieldName} contains invalid script characters`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Name-specific validation
  static validateName(name: string, fieldName: string = 'Name'): ValidationResult {
    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors };
    }

    if (name.length > this.MAX_NAME_LENGTH) {
      errors.push(`${fieldName} must be less than ${this.MAX_NAME_LENGTH} characters`);
    }

    // Names should only contain letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(name)) {
      errors.push(`${fieldName} can only contain letters, spaces, hyphens, and apostrophes`);
    }

    if (this.containsSQLInjection(name) || this.containsXSS(name)) {
      errors.push(`${fieldName} contains invalid characters`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Check for SQL injection patterns
  private static containsSQLInjection(input: string): boolean {
    return this.SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
  }

  // Check for XSS patterns
  private static containsXSS(input: string): boolean {
    return this.XSS_PATTERNS.some(pattern => pattern.test(input));
  }

  // Sanitize input by removing potentially dangerous characters
  static sanitizeInput(input: string): string {
    if (!input) return '';

    let sanitized = input;

    // Remove SQL injection patterns
    this.SQL_INJECTION_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove XSS patterns
    this.XSS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove potentially dangerous HTML entities
    sanitized = sanitized.replace(/&[#\w]+;/g, '');

    return sanitized.trim();
  }

  // Generate secure session token (for client-side use)
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  // Validate file upload security
  static validateFileUpload(file: File): ValidationResult {
    const errors: string[] = [];
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push('File type not allowed');
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      errors.push('File size must be less than 10MB');
    }

    // Check filename for security issues
    const filename = file.name;
    if (this.containsSQLInjection(filename) || this.containsXSS(filename)) {
      errors.push('Filename contains invalid characters');
    }

    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      errors.push('Filename contains invalid path characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Rate limiting utility for client-side
export class ClientRateLimit {
  private static attempts: Map<string, { count: number; resetTime: number }> = new Map();

  static checkRateLimit(key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(key);

    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (attempt.count >= maxAttempts) {
      return false;
    }

    attempt.count++;
    this.attempts.set(key, attempt);
    return true;
  }

  static getRemainingAttempts(key: string, maxAttempts: number = 5): number {
    const attempt = this.attempts.get(key);
    if (!attempt || Date.now() > attempt.resetTime) {
      return maxAttempts;
    }
    return Math.max(0, maxAttempts - attempt.count);
  }

  static getResetTime(key: string): number {
    const attempt = this.attempts.get(key);
    return attempt?.resetTime || 0;
  }
}