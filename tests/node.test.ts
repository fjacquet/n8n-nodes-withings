import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';
import { WithingsApi } from '../nodes/WithingsApi/WithingsApi.node';

const node: INode = {
	id: 'n1',
	name: 'Withings',
	type: 'withingsApi',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

interface FakeContextOptions {
	readonly parameters: Record<string, unknown>;
	readonly response: unknown;
	readonly continueOnFail?: boolean;
}

const fakeContext = ({ parameters, response, continueOnFail = false }: FakeContextOptions) => {
	const requestWithAuthentication = vi.fn().mockResolvedValue(response);
	const context = {
		getInputData: () => [{ json: {} }],
		getNodeParameter: (name: string, _index: number, fallback?: unknown) =>
			name in parameters ? parameters[name] : fallback,
		getNode: () => node,
		continueOnFail: () => continueOnFail,
		helpers: { requestWithAuthentication },
	} as unknown as IExecuteFunctions;
	return { context, requestWithAuthentication };
};

const okResponse = { statusCode: 200, body: { status: 0, body: { measuregrps: [{ grpid: 1 }] } } };

describe('WithingsApi.execute', () => {
	it('calls Withings through the OAuth2 credential with expiry-based refresh options', async () => {
		const { context, requestWithAuthentication } = fakeContext({
			parameters: {
				resource: 'measure',
				operation: 'getmeas',
				additionalFields: { startdate: '2024-03-01T00:00:00.000Z' },
				meastype: [1, 4],
			},
			response: okResponse,
		});

		const output = await new WithingsApi().execute.call(context);

		expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
		const [credentialName, options, authOptions] = requestWithAuthentication.mock.calls[0];
		expect(credentialName).toBe('withingsOAuth2Api');
		expect(options).toMatchObject({
			method: 'POST',
			url: 'https://wbsapi.withings.net/measure',
			form: { action: 'getmeas', startdate: '1709251200', meastype: '1,4' },
			json: true,
			resolveWithFullResponse: true,
			simple: false,
		});
		expect(authOptions).toEqual({
			oauth2: {
				property: 'body.access_token',
				tokenExpiredStatusCode: 200,
				skipRefreshWhileTokenIsFresh: true,
			},
		});
		expect(output).toEqual([[{ json: { measuregrps: [{ grpid: 1 }] }, pairedItem: { item: 0 } }]]);
	});

	it('throws a NodeApiError when Withings rejects the token', async () => {
		const { context } = fakeContext({
			parameters: { resource: 'user', operation: 'getdevice' },
			response: { statusCode: 200, body: { status: 401, body: {}, error: 'invalid_token' } },
		});

		await expect(new WithingsApi().execute.call(context)).rejects.toBeInstanceOf(NodeApiError);
	});

	it('emits an error item instead when Continue On Fail is enabled', async () => {
		const { context } = fakeContext({
			parameters: { resource: 'user', operation: 'getdevice' },
			response: { statusCode: 200, body: { status: 503, body: {}, error: 'Invalid Params' } },
			continueOnFail: true,
		});

		const output = await new WithingsApi().execute.call(context);

		expect(output).toEqual([
			[{ json: { error: expect.stringContaining('Withings error 503') }, pairedItem: { item: 0 } }],
		]);
	});
});
