import { describe, expect, it } from 'vitest';
import { normalizeTokenData } from '../utils/oauth';

const rawTokenResponse = {
	status: 0,
	body: {
		userid: 12345,
		access_token: 'access-1',
		refresh_token: 'refresh-1',
		expires_in: 10800,
		scope: 'user.info,user.metrics',
		token_type: 'Bearer',
	},
};

describe('normalizeTokenData', () => {
	it('lifts the nested Withings body to the top level and keeps status and body', () => {
		const result = normalizeTokenData(rawTokenResponse);

		expect(result).toMatchObject({
			status: 0,
			access_token: 'access-1',
			refresh_token: 'refresh-1',
			expires_in: 10800,
			scope: 'user.info,user.metrics',
			token_type: 'Bearer',
			userid: 12345,
		});
		expect(result?.body).toEqual(rawTokenResponse.body);
	});

	it('preserves n8n_expires_at set by n8n', () => {
		const result = normalizeTokenData({ ...rawTokenResponse, n8n_expires_at: '1700000000000' });

		expect(result?.n8n_expires_at).toBe('1700000000000');
	});

	it('lets the nested body win over stale top-level tokens after a refresh', () => {
		const afterRefresh = {
			...rawTokenResponse,
			access_token: 'stale',
			refresh_token: 'stale',
			body: { ...rawTokenResponse.body, access_token: 'access-2', refresh_token: 'refresh-2' },
		};

		const result = normalizeTokenData(afterRefresh);

		expect(result?.access_token).toBe('access-2');
		expect(result?.refresh_token).toBe('refresh-2');
	});

	it('is idempotent', () => {
		const once = normalizeTokenData(rawTokenResponse);

		expect(normalizeTokenData(once)).toEqual(once);
	});

	it('returns data without a body object unchanged', () => {
		const flat = { access_token: 'access-1', refresh_token: 'refresh-1' };

		expect(normalizeTokenData(flat)).toBe(flat);
	});

	it('returns undefined for non-object input', () => {
		expect(normalizeTokenData(undefined)).toBeUndefined();
		expect(normalizeTokenData('token')).toBeUndefined();
		expect(normalizeTokenData(['token'])).toBeUndefined();
		expect(normalizeTokenData(null)).toBeUndefined();
	});

	it('does not mutate its input', () => {
		const frozen = Object.freeze({
			...rawTokenResponse,
			body: Object.freeze({ ...rawTokenResponse.body }),
		});

		const result = normalizeTokenData(frozen);

		expect(result).not.toBe(frozen);
		expect(frozen).toEqual(rawTokenResponse);
	});
});
