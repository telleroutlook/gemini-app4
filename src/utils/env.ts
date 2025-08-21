// Environment variable utilities for API key management
// ⚠️ Security Note: API keys should NOT be stored in environment variables in production

export interface EnvConfig {
  DEFAULT_MODEL?: string;
  REQUEST_TIMEOUT?: string;
  MAX_RETRIES?: string;
}

/**
 * Parse API keys from environment variable or comma-separated string
 * Automatically removes all whitespace (including spaces, tabs, newlines)
 */
export function parseApiKeys(keysString: string): string[] {
  if (!keysString) return [];
  
  return keysString
    .split(',')
    .map(key => key.replace(/\s+/g, '')) // Remove ALL whitespace characters
    .filter(key => key !== '');
}

/**
 * Load API keys from environment variables (DEPRECATED for security)
 * This function is deprecated and should not be used in production.
 * API keys should only be managed through user settings.
 * @deprecated Use user settings instead for security reasons
 */
export function loadApiKeysFromEnv(): string[] {
  console.warn('⚠️ loadApiKeysFromEnv is deprecated for security reasons. Use user settings instead.');
  return [];
}

/**
 * Load default model from environment variables
 */
export function loadDefaultModelFromEnv(): string {
  return import.meta.env.VITE_DEFAULT_MODEL || 'gemini-2.5-flash';
}

/**
 * Load request timeout from environment variables
 */
export function loadRequestTimeoutFromEnv(): number {
  const timeout = import.meta.env.VITE_REQUEST_TIMEOUT;
  return timeout ? parseInt(timeout, 10) : 30000;
}

/**
 * Load max retries from environment variables
 */
export function loadMaxRetriesFromEnv(): number {
  const retries = import.meta.env.VITE_MAX_RETRIES;
  return retries ? parseInt(retries, 10) : 3;
}

/**
 * Load all environment configuration
 */
export function loadEnvConfig(): {
  defaultModel: string;
  requestTimeout: number;
  maxRetries: number;
} {
  return {
    defaultModel: loadDefaultModelFromEnv(),
    requestTimeout: loadRequestTimeoutFromEnv(),
    maxRetries: loadMaxRetriesFromEnv(),
  };
}

/**
 * Validate API key format (basic validation)
 */
export function validateApiKey(key: string): boolean {
  // Basic validation for Gemini API keys
  // They typically start with "AI" and are around 40 characters long
  return key.length > 20 && key.length < 100;
}

/**
 * Get masked version of API key for display
 * Shows only the last 6 characters with asterisks for the rest
 */
export function maskApiKey(key: string): string {
  if (key.length <= 6) return '*'.repeat(key.length);
  return '*'.repeat(key.length - 6) + key.slice(-6);
} 