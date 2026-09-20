import type { Resource } from './types';

export const WITHINGS = {
	BASE_URL: 'https://wbsapi.withings.net',
	AUTH_URL: 'https://account.withings.com/oauth2_user/authorize2',
	/**
	 * Withings requires `action=requesttoken` on every token request. n8n's OAuth2 client only
	 * injects extra body fields for the client-credentials grant, but Withings also reads the
	 * parameter from the query string, so it lives in the URL.
	 */
	TOKEN_URL: 'https://wbsapi.withings.net/v2/oauth2?action=requesttoken',
	DEFAULT_SCOPES: 'user.info,user.metrics,user.activity,user.sleepevents',
} as const;

export const ENDPOINTS = {
	USER: '/v2/user',
	MEASURE: '/v2/measure',
	MEASURE_V1: '/measure',
	SLEEP: '/v2/sleep',
} as const;

export const RESOURCE_ENDPOINTS: Readonly<Record<Resource, string>> = {
	activity: ENDPOINTS.MEASURE,
	measure: ENDPOINTS.MEASURE,
	sleep: ENDPOINTS.SLEEP,
	user: ENDPOINTS.USER,
};

/** Withings reports errors in the JSON body `status` field; the HTTP status is always 200. */
export const WITHINGS_STATUS = {
	OK: 0,
	INVALID_TOKEN: 401,
	INVALID_CLIENT: 503,
} as const;
