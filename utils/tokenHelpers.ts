/**
 * Token refresh and validation helpers for Withings API
 */

import { IExecuteFunctions, IDataObject, sleep } from 'n8n-workflow';
import {
	TOKEN_CONFIG,
	JITTER,
	CACHE_HEADERS,
	TOKEN_ERROR_PATTERNS,
	VALIDATION_ENDPOINTS,
	FALLBACK_ENDPOINTS,
	RETRY_ENDPOINTS,
	REFRESH_STRATEGIES,
} from './constants';
import { IEndpointConfig, ITokenRefreshResult, IValidationAttemptResult } from './types';

/**
 * Calculate jitter value for randomized delays
 * @param baseValue - Base value to apply jitter to
 * @returns Jittered value
 */
export function calculateJitter(baseValue: number): number {
	const jitter = Math.random() * JITTER.RANGE + JITTER.MIN;
	return Math.floor(baseValue * jitter);
}

/**
 * Generate unique timestamp with randomization to prevent caching
 * @returns Unique timestamp
 */
export function generateUniqueTimestamp(): number {
	return Date.now() + Math.floor(Math.random() * 1000);
}

/**
 * Create request headers with cache prevention
 * @param additionalHeaders - Additional headers to include
 * @returns Headers object
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
 * @param error - Error to check
 * @returns True if error is token-related
 */
export function isTokenError(error: any): boolean {
	const errorMsg = (error.message || '').toLowerCase();
	return TOKEN_ERROR_PATTERNS.some((pattern) => errorMsg.includes(pattern));
}

/**
 * Calculate exponential backoff delay with jitter
 * @param retries - Current retry count
 * @param baseDelay - Base delay in milliseconds
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(retries: number, baseDelay: number = TOKEN_CONFIG.BASE_DELAY): number {
	const exponentialDelay = baseDelay * Math.pow(2, retries - 1);
	return calculateJitter(exponentialDelay);
}

/**
 * Make a validation request to check token validity
 * @param context - n8n execution context
 * @param endpoint - Endpoint configuration
 * @returns Validation result
 */
export async function makeValidationRequest(
	context: IExecuteFunctions,
	endpoint: IEndpointConfig,
): Promise<IValidationAttemptResult> {
	try {
		const uniqueTimestamp = generateUniqueTimestamp();

		await context.helpers.requestWithAuthentication.call(context, 'withingsOAuth2Api', {
			method: 'GET',
			url: endpoint.url,
			qs: {
				action: endpoint.action,
				_ts: uniqueTimestamp,
			},
			json: true,
			headers: {
				...createRequestHeaders(),
				'X-Request-ID': `validation-${uniqueTimestamp}`,
			},
			timeout: TOKEN_CONFIG.REQUEST_TIMEOUT,
		});

		return { success: true, endpoint: endpoint.url };
	} catch (error) {
		return { success: false, endpoint: endpoint.url, error };
	}
}

/**
 * Perform pre-validation to ensure token is valid
 * This makes multiple validation attempts with different endpoints
 * @param context - n8n execution context
 */
export async function performPreValidation(context: IExecuteFunctions): Promise<void> {
	for (let attempt = 0; attempt < TOKEN_CONFIG.PRE_VALIDATION_ATTEMPTS; attempt++) {
		const result = await makeValidationRequest(context, VALIDATION_ENDPOINTS[0]);

		if (result.success) {
			await sleep(TOKEN_CONFIG.VALIDATION_DELAY);
			break;
		}

		// If this is the last attempt, wait longer before continuing
		if (attempt === TOKEN_CONFIG.PRE_VALIDATION_ATTEMPTS - 1) {
			await sleep(4000);
			continue;
		}

		// Wait between validation attempts with exponential backoff
		const delay = calculateJitter(1800 * Math.pow(1.5, attempt));
		await sleep(delay);

		// Try alternate endpoints
		const alternateEndpointIndex = (attempt % (VALIDATION_ENDPOINTS.length - 1)) + 1;
		const alternateResult = await makeValidationRequest(
			context,
			VALIDATION_ENDPOINTS[alternateEndpointIndex],
		);

		if (alternateResult.success) {
			await sleep(TOKEN_CONFIG.VALIDATION_DELAY);
			break;
		}

		await sleep(2500);
	}
}

/**
 * Perform direct token refresh attempts
 * @param context - n8n execution context
 * @returns Token refresh result
 */
export async function performDirectTokenRefresh(context: IExecuteFunctions): Promise<ITokenRefreshResult> {
	for (let attempt = 0; attempt < TOKEN_CONFIG.DIRECT_REFRESH_ATTEMPTS; attempt++) {
		// Try the primary endpoint first
		const result = await makeValidationRequest(context, {
			url: VALIDATION_ENDPOINTS[0].url,
			action: 'get',
		});

		if (result.success) {
			await sleep(2500);
			return { success: true };
		}

		// Try fallback endpoints
		if (attempt < FALLBACK_ENDPOINTS.length) {
			const fallback = FALLBACK_ENDPOINTS[attempt];
			const fallbackResult = await makeValidationRequest(context, fallback);

			if (fallbackResult.success) {
				await sleep(fallback.waitTime || 2000);
				return { success: true };
			}

			// Wait between attempts with exponential backoff
			const delay = calculateJitter(1200 * Math.pow(1.5, attempt));
			await sleep(delay);
		}
	}

	await sleep(3000);
	return { success: false };
}

/**
 * Refresh token using retry endpoints
 * @param context - n8n execution context
 * @param retryCount - Current retry count
 * @returns Token refresh result
 */
export async function refreshTokenForRetry(
	context: IExecuteFunctions,
	retryCount: number,
): Promise<ITokenRefreshResult> {
	const endpoint = RETRY_ENDPOINTS[retryCount % RETRY_ENDPOINTS.length];

	try {
		const uniqueTimestamp = generateUniqueTimestamp();

		await context.helpers.requestWithAuthentication.call(context, 'withingsOAuth2Api', {
			method: 'GET',
			url: endpoint.url,
			qs: {
				action: endpoint.action,
				_ts: uniqueTimestamp,
			},
			json: true,
			headers: createRequestHeaders(),
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
 * @param context - n8n execution context
 * @returns Token refresh result
 */
export async function executeRefreshStrategies(context: IExecuteFunctions): Promise<ITokenRefreshResult> {
	for (const strategy of REFRESH_STRATEGIES) {
		try {
			await sleep(strategy.waitTime);

			const uniqueTimestamp = generateUniqueTimestamp();

			await context.helpers.requestWithAuthentication.call(context, 'withingsOAuth2Api', {
				method: 'GET',
				url: strategy.url,
				qs: {
					action: strategy.action,
					_ts: uniqueTimestamp,
				},
				json: true,
				headers: createRequestHeaders(),
				timeout: TOKEN_CONFIG.REQUEST_TIMEOUT,
			});

			await sleep(TOKEN_CONFIG.TOKEN_REFRESH_DELAY);
			return { success: true };
		} catch (error) {
			// Continue to next strategy
			continue;
		}
	}

	await sleep(3000);
	return { success: false };
}

/**
 * Validate token for sleep-related requests
 * Special handling required for sleep endpoints
 * Uses a different endpoint (user/getdevice) for validation to avoid recursive token errors
 * @param context - n8n execution context
 * @param operation - Operation being performed
 */
export async function validateSleepToken(context: IExecuteFunctions, operation: string): Promise<void> {
	try {
		const uniqueTimestamp = generateUniqueTimestamp();

		// Use user endpoint for validation instead of sleep endpoint to avoid recursive errors
		await context.helpers.requestWithAuthentication.call(context, 'withingsOAuth2Api', {
			method: 'GET',
			url: VALIDATION_ENDPOINTS[0].url, // User endpoint instead of sleep
			qs: {
				action: 'getdevice', // Simple action that always works
				_ts: uniqueTimestamp,
			},
			json: true,
			headers: {
				...createRequestHeaders(),
				'X-Request-ID': `sleep-validation-${uniqueTimestamp}`,
			},
			timeout: TOKEN_CONFIG.REQUEST_TIMEOUT,
		});

		// Extra delay for sleep endpoints to ensure token is fully synchronized
		await sleep(TOKEN_CONFIG.SLEEP_VALIDATION_DELAY);
	} catch (error) {
		// If validation fails, try one more time with a longer delay
		try {
			await sleep(2000);
			const uniqueTimestamp = generateUniqueTimestamp();

			await context.helpers.requestWithAuthentication.call(context, 'withingsOAuth2Api', {
				method: 'GET',
				url: VALIDATION_ENDPOINTS[0].url,
				qs: {
					action: 'get', // Even simpler action
					_ts: uniqueTimestamp,
				},
				json: true,
				headers: createRequestHeaders(),
				timeout: TOKEN_CONFIG.REQUEST_TIMEOUT,
			});

			await sleep(TOKEN_CONFIG.SLEEP_VALIDATION_DELAY);
		} catch (retryError) {
			// If both validation attempts fail, wait but continue anyway
			await sleep(3000);
		}
	}
}

/**
 * Create detailed error message for token errors
 * @param maxRetries - Maximum retry attempts
 * @param error - Original error
 * @param tokenRefreshed - Whether token was refreshed
 * @returns Formatted error message
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
