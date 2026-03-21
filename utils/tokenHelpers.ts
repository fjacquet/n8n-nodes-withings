/**
 * Token refresh and validation helpers for Withings API
 */

import { IExecuteFunctions, IDataObject, sleep } from 'n8n-workflow';
import {
	TOKEN_CONFIG,
	JITTER,
	CACHE_HEADERS,
	TOKEN_ERROR_PATTERNS,
	RETRY_ENDPOINTS,
	REFRESH_STRATEGIES,
} from './constants';
import { ITokenRefreshResult } from './types';

/**
 * Calculate jitter value for randomized delays
 */
function calculateJitter(baseValue: number): number {
	const jitter = Math.random() * JITTER.RANGE + JITTER.MIN;
	return Math.floor(baseValue * jitter);
}

/**
 * Generate unique timestamp with randomization to prevent caching
 */
export function generateUniqueTimestamp(): number {
	return Date.now() + Math.floor(Math.random() * 1000);
}

/**
 * Create request headers with cache prevention
 */
export function createRequestHeaders(additionalHeaders: IDataObject = {}): IDataObject {
	return {
		'Accept': 'application/json',
		...CACHE_HEADERS,
		...additionalHeaders,
	};
}

/**
 * Check if an error is token-related
 */
export function isTokenError(error: any): boolean {
	const errorMsg = (error.message || '').toLowerCase();
	return TOKEN_ERROR_PATTERNS.some((pattern) => errorMsg.includes(pattern));
}

/**
 * Calculate exponential backoff delay with jitter
 */
export function calculateBackoffDelay(retries: number, baseDelay: number = TOKEN_CONFIG.BASE_DELAY): number {
	const exponentialDelay = baseDelay * Math.pow(2, retries - 1);
	return calculateJitter(exponentialDelay);
}

/**
 * Refresh token using retry endpoints
 */
export async function refreshTokenForRetry(
	context: IExecuteFunctions,
	retryCount: number,
): Promise<ITokenRefreshResult> {
	const endpoint = RETRY_ENDPOINTS[retryCount % RETRY_ENDPOINTS.length];

	try {
		const uniqueTimestamp = generateUniqueTimestamp();

		await context.helpers.requestWithAuthentication.call(context, 'withingsOAuth2Api', {
			method: 'POST',
			url: endpoint.url,
			body: `action=${endpoint.action}&_ts=${uniqueTimestamp}`,
			json: true,
			headers: {
				...createRequestHeaders(),
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			timeout: TOKEN_CONFIG.REQUEST_TIMEOUT,
		});

		await sleep(TOKEN_CONFIG.TOKEN_REFRESH_DELAY);
		return { success: true };
	} catch (error) {
		await sleep(1000);
		return { success: false, error };
	}
}

/**
 * Execute refresh strategies sequentially until one succeeds
 */
export async function executeRefreshStrategies(context: IExecuteFunctions): Promise<ITokenRefreshResult> {
	for (const strategy of REFRESH_STRATEGIES) {
		try {
			await sleep(strategy.waitTime);

			const uniqueTimestamp = generateUniqueTimestamp();

			await context.helpers.requestWithAuthentication.call(context, 'withingsOAuth2Api', {
				method: 'POST',
				url: strategy.url,
				body: `action=${strategy.action}&_ts=${uniqueTimestamp}`,
				json: true,
				headers: {
					...createRequestHeaders(),
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				timeout: TOKEN_CONFIG.REQUEST_TIMEOUT,
			});

			await sleep(TOKEN_CONFIG.TOKEN_REFRESH_DELAY);
			return { success: true };
		} catch (error) {
			continue;
		}
	}

	await sleep(3000);
	return { success: false };
}

/**
 * Create detailed error message for token errors
 */
export function createTokenErrorMessage(
	maxRetries: number,
	error: any,
	tokenRefreshed: boolean,
): string {
	return `Failed after ${maxRetries} attempts: ${error.message}.
Error type: ${error.name || 'Unknown'}, Status code: ${error.statusCode || 'N/A'}.
Token refresh status: ${tokenRefreshed ? 'Refreshed' : 'Not refreshed'}.

The token may be invalid or revoked. Please try the following:
1. Reconnect your Withings account in the credentials
2. Ensure your Withings Developer account is active
3. Check that your application has the required scopes
4. Verify that your Withings account is active and properly configured
5. Try again in a few minutes as Withings API may be experiencing temporary issues`;
}
