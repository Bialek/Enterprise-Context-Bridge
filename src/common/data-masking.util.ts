/**
 * Data Masking Utility
 * 
 * Provides functions to mask sensitive information like IP addresses,
 * API keys, and credentials in JSON objects or strings.
 */

const SENSITIVE_PATTERNS = [
  // IPv4 Pattern
  { regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, mask: '***.***.***.***' },
  // Likely API Keys or Secrets (simple heuristic)
  { regex: /(api_key|secret|token|password|auth|admin_key)["']?\s*[:=]\s*["']([^"']+)["']/gi, mask: '$1: "***MASKED***"' },
];

/**
 * Recursively masks sensitive fields in an object
 */
export function maskSensitiveData(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    if (typeof data === 'string') {
      let masked = data;
      for (const pattern of SENSITIVE_PATTERNS) {
        masked = masked.replace(pattern.regex, pattern.mask);
      }
      return masked;
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }

  const maskedObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    // Check if the key itself suggests sensitivity
    if (/key|secret|token|password|auth/i.test(key) && typeof value === 'string') {
      maskedObj[key] = '***MASKED***';
    } else {
      maskedObj[key] = maskSensitiveData(value);
    }
  }
  return maskedObj;
}
