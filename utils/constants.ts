/**
 * Constants and configuration for Withings API integration
 */

/**
 * Withings API URLs
 */
export const WITHINGS_API = {
	BASE_URL: 'https://wbsapi.withings.net',
	AUTH_URL: 'https://account.withings.com/oauth2_user/authorize2',
	TOKEN_URL: 'https://wbsapi.withings.net/v2/oauth2',
	SIGNATURE_URL: 'https://wbsapi.withings.net/v2/signature',
} as const;

/**
 * API Endpoints
 */
export const ENDPOINTS = {
	USER: '/v2/user',
	MEASURE: '/v2/measure',
	MEASURE_V1: '/measure',
	SLEEP: '/v2/sleep',
	NOTIFY: '/notify',
} as const;

/**
 * Token refresh configuration
 * Withings tokens actually expire after 3600 seconds (1 hour), not 30 seconds as initially thought
 */
export const TOKEN_CONFIG = {
	/** Token expiration time in seconds - not used, we let the API response determine expiration */
	EXPIRES_IN: 3600,
	/** Maximum number of retry attempts for failed requests */
	MAX_RETRIES: 5,
	/** Base delay in milliseconds for exponential backoff */
	BASE_DELAY: 1000,
	/** Number of pre-validation attempts before main request */
	PRE_VALIDATION_ATTEMPTS: 7,
	/** Number of direct token refresh attempts */
	DIRECT_REFRESH_ATTEMPTS: 5,
	/** Initial delay before first request (ms) */
	INITIAL_DELAY: 1500,
	/** Delay after successful token refresh (ms) */
	TOKEN_REFRESH_DELAY: 2000,
	/** Delay after successful validation (ms) */
	VALIDATION_DELAY: 2000,
	/** Delay for sleep endpoint validation (ms) */
	SLEEP_VALIDATION_DELAY: 2500,
	/** Request timeout in milliseconds */
	REQUEST_TIMEOUT: 10000,
} as const;

/**
 * Jitter configuration for randomized delays
 */
export const JITTER = {
	/** Minimum jitter multiplier */
	MIN: 0.8,
	/** Maximum jitter multiplier */
	MAX: 1.2,
	/** Range for jitter calculation */
	RANGE: 0.4,
} as const;

/**
 * Default cache prevention headers
 */
export const CACHE_HEADERS = {
	'Cache-Control': 'no-cache, no-store, must-revalidate',
	'Pragma': 'no-cache',
	'Expires': '0',
} as const;

/**
 * Default scopes for Withings OAuth2
 */
export const DEFAULT_SCOPES = 'user.info,user.metrics,user.activity,user.sleepevents';

/**
 * Token error patterns for detection
 */
export const TOKEN_ERROR_PATTERNS = [
	'token',
	'sign',
	'auth',
	'unauthorized',
	'expired',
	'authentication',
	'credentials',
	'access',
	'permission',
	'invalid',
	'oauth',
	'401',
	'403',
	'denied',
	'reject',
	'login',
	'signature',
	'identity',
	'verify',
	'key',
	'secret',
] as const;

/**
 * Validation endpoints for token refresh
 */
export const VALIDATION_ENDPOINTS = [
	{ url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.USER}`, action: 'getdevice' },
	{ url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.MEASURE}`, action: 'getactivity' },
	{ url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.SLEEP}`, action: 'get' },
	{ url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.SLEEP}`, action: 'getsummary' },
] as const;

/**
 * Refresh strategies with different endpoints and wait times
 */
export const REFRESH_STRATEGIES = [
	{
		url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.USER}`,
		action: 'getdevice',
		waitTime: 1200,
		description: 'User endpoint with getdevice action (most reliable)',
	},
	{
		url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.MEASURE}`,
		action: 'getactivity',
		waitTime: 1500,
		description: 'Measure endpoint (different service)',
	},
	{
		url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.USER}`,
		action: 'get',
		waitTime: 1800,
		description: 'User endpoint with simpler action',
	},
	{
		url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.SLEEP}`,
		action: 'get',
		waitTime: 2000,
		description: 'Sleep endpoint (different service)',
	},
	{
		url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.NOTIFY}`,
		action: 'list',
		waitTime: 2500,
		description: 'Notification endpoint (completely different API area)',
	},
] as const;

/**
 * Fallback endpoints for direct token refresh
 */
export const FALLBACK_ENDPOINTS = [
	{
		url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.SLEEP}`,
		action: 'get',
		waitTime: 2000,
	},
	{
		url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.MEASURE}`,
		action: 'getactivity',
		waitTime: 2200,
	},
	{
		url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.USER}`,
		action: 'getdevice',
		waitTime: 2500,
	},
	{
		url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.NOTIFY}`,
		action: 'list',
		waitTime: 3000,
	},
] as const;

/**
 * Retry endpoints for the main request cycle
 */
export const RETRY_ENDPOINTS = [
	{ url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.USER}`, action: 'get' },
	{ url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.USER}`, action: 'getdevice' },
	{ url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.MEASURE}`, action: 'getactivity' },
	{ url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.SLEEP}`, action: 'get' },
] as const;
