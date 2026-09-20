import type { INodeProperties } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { WithingsOAuth2Api } from '../credentials/WithingsOAuth2Api.credentials';
import { WITHINGS } from '../utils/constants';
import { normalizeTokenData } from '../utils/oauth';

const credential = new WithingsOAuth2Api();
const property = (name: string): INodeProperties | undefined =>
	credential.properties.find((p) => p.name === name);

const rawTokenData = {
	status: 0,
	body: { access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 10800 },
};

describe('WithingsOAuth2Api credential', () => {
	it('extends the built-in oAuth2Api credential', () => {
		expect(credential.extends).toContain('oAuth2Api');
	});

	it('uses the authorization code grant against the Withings endpoints', () => {
		expect(property('grantType')?.default).toBe('authorizationCode');
		expect(property('authUrl')?.default).toBe(WITHINGS.AUTH_URL);
		expect(property('accessTokenUrl')?.default).toBe(WITHINGS.TOKEN_URL);
		expect(String(property('accessTokenUrl')?.default)).toMatch(/\?action=requesttoken$/);
	});

	it('sends client credentials in the body and defaults to the documented scopes', () => {
		expect(property('authentication')?.default).toBe('body');
		expect(property('scope')?.default).toBe(WITHINGS.DEFAULT_SCOPES);
	});

	it('hides every OAuth plumbing field from the user', () => {
		for (const name of [
			'grantType',
			'authUrl',
			'accessTokenUrl',
			'authentication',
			'authQueryParameters',
		]) {
			expect(property(name)?.type, name).toBe('hidden');
		}
	});

	it('normalizes nested Withings token data in preAuthentication', async () => {
		const result = await credential.preAuthentication({ oauthTokenData: rawTokenData });

		expect(result).toEqual({ oauthTokenData: normalizeTokenData(rawTokenData) });
	});

	it('returns an empty patch when there is no token data yet', async () => {
		await expect(credential.preAuthentication({})).resolves.toEqual({});
	});

	it('tests the credential against the user endpoint and flags a rejected token', () => {
		expect(credential.test.request).toMatchObject({
			baseURL: WITHINGS.BASE_URL,
			url: '/v2/user',
			method: 'POST',
			body: 'action=getdevice',
		});
		expect(credential.test.rules?.[0]).toMatchObject({
			type: 'responseSuccessBody',
			properties: { key: 'status', value: 401 },
		});
	});
});
