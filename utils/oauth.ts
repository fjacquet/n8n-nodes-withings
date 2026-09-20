import type { IDataObject } from 'n8n-workflow';

export const isRecord = (value: unknown): value is IDataObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Withings token responses look like `{ status, body: { access_token, refresh_token, expires_in, ... } }`
 * while n8n's OAuth2 client reads those keys at the top level. Lift `body` up, keep everything else
 * (notably `n8n_expires_at` and `body` itself). Idempotent, never mutates its input.
 */
export const normalizeTokenData = (data: unknown): IDataObject | undefined => {
	if (!isRecord(data)) return undefined;
	return isRecord(data.body) ? { ...data, ...data.body } : data;
};

/**
 * Withings answers a failed token request with HTTP 200 and a non-zero `status`, which n8n would
 * otherwise accept and persist. Returns a human-readable reason when the stored token data is such
 * a failure, `undefined` when it looks healthy.
 */
export const tokenResponseError = (data: unknown): string | undefined => {
	if (!isRecord(data) || typeof data.status !== 'number' || data.status === 0) return undefined;
	const detail = typeof data.error === 'string' ? data.error : 'unknown error';
	return `Withings token request failed (status ${data.status}): ${detail}. Reconnect the credential.`;
};

/** Mirrors n8n's own one-minute safety buffer. Unknown or unparsable expiry counts as stale. */
const EXPIRY_BUFFER_MS = 60_000;

export const isTokenFresh = (expiresAt: unknown, now: number): boolean => {
	const expiry = Number(expiresAt);
	return Number.isFinite(expiry) && now + EXPIRY_BUFFER_MS < expiry;
};
