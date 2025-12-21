/**
 * OAuth2 helper functions for Withings API
 * Handles token exchange and refresh with Withings-specific parameters
 */

import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { WITHINGS_API } from './constants';

export interface IWithingsTokenResponse {
  status: number;
  body?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    userid: string;
    scope: string;
  };
  error?: string;
}

/**
 * Exchange authorization code for access token
 * @param context - n8n execution context
 * @param clientId - Withings client ID
 * @param clientSecret - Withings client secret
 * @param authorizationCode - Authorization code from OAuth flow
 * @param redirectUri - OAuth redirect URI
 * @returns Token response
 */
export async function exchangeAuthorizationCode(
  context: IExecuteFunctions,
  clientId: string,
  clientSecret: string,
  authorizationCode: string,
  redirectUri: string,
): Promise<IWithingsTokenResponse> {
  const requestOptions: IHttpRequestOptions = {
    method: 'POST',
    url: WITHINGS_API.TOKEN_URL,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: {
      action: 'requesttoken',
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: authorizationCode,
      redirect_uri: redirectUri,
    },
    json: true,
  };

  console.log('=== WITHINGS DEBUG: Exchanging authorization code ===');
  console.log('Request URL:', requestOptions.url);
  console.log('Request body keys:', Object.keys(requestOptions.body as object));

  const response = await context.helpers.httpRequest(requestOptions);

  console.log('=== WITHINGS DEBUG: Token exchange response ===');
  console.log('Response:', JSON.stringify(response, null, 2));
  console.log('===============================================');

  return response as IWithingsTokenResponse;
}

/**
 * Refresh access token using refresh token
 * @param context - n8n execution context
 * @param clientId - Withings client ID
 * @param clientSecret - Withings client secret
 * @param refreshToken - Current refresh token
 * @returns Token response
 */
export async function refreshAccessToken(
  context: IExecuteFunctions,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<IWithingsTokenResponse> {
  const requestOptions: IHttpRequestOptions = {
    method: 'POST',
    url: WITHINGS_API.TOKEN_URL,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: {
      action: 'requesttoken',
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    },
    json: true,
  };

  console.log('=== WITHINGS DEBUG: Refreshing access token ===');
  console.log('Request URL:', requestOptions.url);

  const response = await context.helpers.httpRequest(requestOptions);

  console.log('=== WITHINGS DEBUG: Token refresh response ===');
  console.log('Response status:', (response as any).status);
  console.log('Has access_token:', !!(response as any).body?.access_token);
  console.log('===========================================');

  return response as IWithingsTokenResponse;
}

/**
 * Check if token is expired or about to expire
 * @param expiresAt - Unix timestamp when token expires
 * @param bufferSeconds - Refresh buffer time in seconds (default 300 = 5 minutes)
 * @returns True if token needs refresh
 */
export function isTokenExpired(expiresAt: number, bufferSeconds: number = 300): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now >= (expiresAt - bufferSeconds);
}

/**
 * Update credentials with new token data
 * @param context - n8n execution context
 * @param credentialId - Credential ID to update
 * @param tokenData - New token data
 */
export async function updateCredentialTokens(
  context: IExecuteFunctions,
  tokenData: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  },
): Promise<void> {
  // Note: n8n doesn't provide a direct API to update credentials from within a node
  // Users will need to manually update the credential fields or we use a different approach
  console.log('=== WITHINGS DEBUG: Token data ready for credential update ===');
  console.log('Access token length:', tokenData.accessToken.length);
  console.log('Refresh token length:', tokenData.refreshToken.length);
  console.log('Expires at:', new Date(tokenData.expiresAt * 1000).toISOString());
  console.log('============================================================');
}
