import type { IDataObject } from 'n8n-workflow';

const isRecord = (value: unknown): value is IDataObject =>
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
