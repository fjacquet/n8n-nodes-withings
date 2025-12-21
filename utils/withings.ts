/**
 * Utility functions for Withings API integration
 * Handles signature generation, nonce retrieval, and scope formatting
 */

import { IHttpRequestOptions } from 'n8n-workflow';
// Use Node.js built-in modules with type declarations
import * as crypto from 'crypto';
import * as process from 'process';

import { WITHINGS_API, TOKEN_CONFIG, CACHE_HEADERS } from './constants';

/**
 * Format scope for Withings OAuth2
 * Withings requires all scopes to have a "user." prefix
 * @param scope - Raw scope string (comma-separated)
 * @returns Formatted scope string with "user." prefix added to each scope
 * @example
 * formatScope('info,metrics') // returns 'user.info,user.metrics'
 */
export function formatScope(scope: string): string {
  return scope
    .split(',')
    .map((el) => 'user.' + el.trim())
    .join(',');
}

/**
 * Generate HMAC-SHA256 signature for Withings API requests
 * Required for enhanced security in OAuth2 authentication
 * @param action - Action type (e.g., 'getnonce', 'requesttoken')
 * @param clientId - Withings client ID from developer account
 * @param clientSecret - Withings client secret from developer account
 * @param baseValue - The signature influencer (timestamp or nonce)
 * @returns The generated HMAC-SHA256 signature in hexadecimal format
 * @example
 * generateSignature('getnonce', 'client123', 'secret456', 1234567890)
 * // returns 'a1b2c3d4e5f6...'
 */
export function generateSignature(
  action: string,
  clientId: string,
  clientSecret: string,
  baseValue: string | number,
): string {
  const signature = `${action},${clientId},${baseValue}`;
  const hmac = crypto.createHmac('sha256', clientSecret);
  const data = hmac.update(signature);
  return data.digest('hex');
}

/**
 * Retrieve a nonce from Withings API for request signing
 * A nonce is a one-time value required for secure authentication
 * @param clientId - Withings client ID from developer account
 * @param clientSecret - Withings client secret from developer account
 * @param makeRequest - Function to make HTTP requests
 * @returns Promise resolving to the generated nonce string
 * @throws Error if nonce retrieval fails or API returns invalid response
 */
export async function getNonce(
  clientId: string,
  clientSecret: string,
  makeRequest: (options: IHttpRequestOptions) => Promise<any>,
): Promise<string> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);

    const options: IHttpRequestOptions = {
      method: 'POST',
      url: WITHINGS_API.SIGNATURE_URL,
      body: {
        action: 'getnonce',
        client_id: clientId,
        timestamp,
        signature: generateSignature('getnonce', clientId, clientSecret, timestamp),
      },
      json: true,
      headers: {
        'Accept': 'application/json',
        ...CACHE_HEADERS,
      },
      timeout: TOKEN_CONFIG.REQUEST_TIMEOUT,
    };

    const response = await makeRequest(options);

    if (response.body && response.body.nonce) {
      return response.body.nonce;
    } else {
      throw new Error('Failed to retrieve nonce from Withings API');
    }
  } catch (error) {
    // Use a safer approach than console.error for TypeScript compatibility
    if (process && process.stderr && process.stderr.write) {
      process.stderr.write(`Error getting nonce: ${error}\n`);
    }
    throw error;
  }
}

/**
 * Normalize month value to two-digit format
 * Adds leading zero if needed and converts 0-based to 1-based month
 * @param month - Month value (0-11, JavaScript Date format)
 * @returns Two-digit month string (01-12)
 * @example
 * normalizeMonth(0) // returns '01' (January)
 * normalizeMonth(11) // returns '12' (December)
 */
export function normalizeMonth(month: number): string {
  return month < 10 ? '0' + (month + 1) : '' + (month + 1);
}

/**
 * Normalize day value to two-digit format
 * Adds leading zero if needed for single-digit days
 * @param day - Day of month (1-31)
 * @returns Two-digit day string (01-31)
 * @example
 * normalizeDay(1) // returns '01'
 * normalizeDay(15) // returns '15'
 */
export function normalizeDay(day: number): string {
  return day < 10 ? '0' + day : '' + day;
}
