/**
 * Encryption utilities for sensitive data
 * Implements AES-256-GCM encryption for API keys and sensitive information
 */

// Browser-compatible encryption using Web Crypto API
class EncryptionService {
  private algorithm = 'AES-GCM';
  private keyLength = 256;

  /**
   * Generate encryption key from password
   */
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: this.algorithm, length: this.keyLength },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data
   */
  async encrypt(data: string, masterPassword: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const key = await this.deriveKey(masterPassword, salt);
      
      const encrypted = await crypto.subtle.encrypt(
        { name: this.algorithm, iv },
        key,
        encoder.encode(data)
      );

      // Combine salt + iv + encrypted data
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData: string, masterPassword: string): Promise<string> {
    try {
      // Convert from base64
      const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      
      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const encrypted = combined.slice(28);

      const key = await this.deriveKey(masterPassword, salt);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: this.algorithm, iv },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data. Invalid password or corrupted data.');
    }
  }

  /**
   * Encrypt API key for storage
   */
  async encryptApiKey(apiKey: string, userId: string): Promise<string> {
    // Use user ID as part of master password for additional security
    const masterPassword = await this.generateMasterPassword(userId);
    return this.encrypt(apiKey, masterPassword);
  }

  /**
   * Decrypt API key from storage
   */
  async decryptApiKey(encryptedKey: string, userId: string): Promise<string> {
    const masterPassword = await this.generateMasterPassword(userId);
    return this.decrypt(encryptedKey, masterPassword);
  }

  /**
   * Generate master password from user ID and app secret
   */
  private async generateMasterPassword(userId: string): Promise<string> {
    // In production, use environment variable for APP_SECRET
    const APP_SECRET = import.meta.env.VITE_ENCRYPTION_SECRET || 'default-secret-change-in-production';
    
    const encoder = new TextEncoder();
    const data = encoder.encode(userId + APP_SECRET);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }

  /**
   * Hash sensitive data (one-way)
   */
  async hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify hash
   */
  async verifyHash(data: string, hash: string): Promise<boolean> {
    const newHash = await this.hash(data);
    return newHash === hash;
  }

  /**
   * Mask sensitive data for display
   */
  maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) return '****';
    
    // Show first 4 and last 4 characters
    const start = apiKey.substring(0, 4);
    const end = apiKey.substring(apiKey.length - 4);
    const masked = '*'.repeat(Math.max(4, apiKey.length - 8));
    
    return `${start}${masked}${end}`;
  }

  /**
   * Validate API key format
   */
  validateApiKeyFormat(apiKey: string): boolean {
    // OpenAI API key format: sk-...
    const openAIPattern = /^sk-[A-Za-z0-9]{48}$/;
    
    return openAIPattern.test(apiKey);
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();

/**
 * Secure storage wrapper
 * Automatically encrypts/decrypts data
 */
export class SecureStorage {
  private prefix = 'encrypted_';

  /**
   * Set encrypted item
   */
  async setItem(key: string, value: string, userId: string): Promise<void> {
    try {
      const encrypted = await encryptionService.encrypt(value, userId);
      localStorage.setItem(this.prefix + key, encrypted);
    } catch (error) {
      console.error('Failed to store encrypted item:', error);
      throw error;
    }
  }

  /**
   * Get decrypted item
   */
  async getItem(key: string, userId: string): Promise<string | null> {
    try {
      const encrypted = localStorage.getItem(this.prefix + key);
      if (!encrypted) return null;
      
      return await encryptionService.decrypt(encrypted, userId);
    } catch (error) {
      console.error('Failed to retrieve encrypted item:', error);
      // Clear corrupted data
      this.removeItem(key);
      return null;
    }
  }

  /**
   * Remove item
   */
  removeItem(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  /**
   * Clear all encrypted items
   */
  clear(): void {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Export singleton
export const secureStorage = new SecureStorage();

/**
 * API Key Manager
 * Handles secure storage and retrieval of API keys
 */
export class ApiKeyManager {
  /**
   * Store API key securely
   */
  async storeApiKey(apiKey: string, userId: string, provider: string = 'openai'): Promise<void> {
    // Validate format
    if (!encryptionService.validateApiKeyFormat(apiKey)) {
      throw new Error('Invalid API key format');
    }

    // Encrypt and store
    await secureStorage.setItem(`api_key_${provider}`, apiKey, userId);
    
    // Store metadata (non-sensitive)
    localStorage.setItem(`api_key_${provider}_metadata`, JSON.stringify({
      provider,
      storedAt: new Date().toISOString(),
      masked: encryptionService.maskApiKey(apiKey)
    }));
  }

  /**
   * Retrieve API key
   */
  async getApiKey(userId: string, provider: string = 'openai'): Promise<string | null> {
    return await secureStorage.getItem(`api_key_${provider}`, userId);
  }

  /**
   * Remove API key
   */
  removeApiKey(provider: string = 'openai'): void {
    secureStorage.removeItem(`api_key_${provider}`);
    localStorage.removeItem(`api_key_${provider}_metadata`);
  }

  /**
   * Check if API key exists
   */
  hasApiKey(provider: string = 'openai'): boolean {
    return localStorage.getItem(`api_key_${provider}_metadata`) !== null;
  }

  /**
   * Get masked API key for display
   */
  getMaskedApiKey(provider: string = 'openai'): string | null {
    const metadata = localStorage.getItem(`api_key_${provider}_metadata`);
    if (!metadata) return null;
    
    try {
      const parsed = JSON.parse(metadata);
      return parsed.masked;
    } catch {
      return null;
    }
  }
}

// Export singleton
export const apiKeyManager = new ApiKeyManager();
