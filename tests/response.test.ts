import type { INode } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import {
	asNodeError,
	describeWithingsError,
	errorMessage,
	errorPayload,
	parseWithingsResponse,
} from '../utils/request';

const node: INode = {
	id: 'n1',
	name: 'Withings',
	type: 'withingsApi',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('parseWithingsResponse', () => {
	it('returns the Withings body on status 0', () => {
		const result = parseWithingsResponse({
			statusCode: 200,
			body: { status: 0, body: { measuregrps: [] } },
		});

		expect(result).toEqual({ ok: true, body: { measuregrps: [] } });
	});

	it('returns an empty body when status 0 carries none', () => {
		expect(parseWithingsResponse({ statusCode: 200, body: { status: 0 } })).toEqual({
			ok: true,
			body: {},
		});
	});

	it('flags status 401 as a rejected token', () => {
		const result = parseWithingsResponse({
			statusCode: 200,
			body: { status: 401, body: {}, error: 'invalid_token: The access token provided is invalid' },
		});

		expect(result).toMatchObject({ ok: false, reason: 'token', status: 401 });
		expect(result.ok === false && result.message).toMatch(/reconnect/i);
	});

	it('reports other non-zero statuses with the Withings error text', () => {
		const result = parseWithingsResponse({
			statusCode: 200,
			body: { status: 503, body: {}, error: 'Invalid Params: invalid client id/secret' },
		});

		expect(result).toEqual({
			ok: false,
			reason: 'api',
			status: 503,
			message: 'Withings error 503: Invalid Params: invalid client id/secret',
		});
	});

	it('reports a non-2xx HTTP status', () => {
		const result = parseWithingsResponse({ statusCode: 502, body: '<html>Bad Gateway</html>' });

		expect(result).toMatchObject({ ok: false, reason: 'http', status: 502 });
	});

	it('reports an unexpected body shape', () => {
		const result = parseWithingsResponse({ statusCode: 200, body: 'not json' });

		expect(result).toMatchObject({ ok: false, reason: 'api', status: 200 });
		expect(result.ok === false && result.message).toMatch(/unexpected/i);
	});
});

describe('describeWithingsError', () => {
	it('turns a failure into NodeApiError options with the status as httpCode', () => {
		const options = describeWithingsError({
			ok: false,
			reason: 'token',
			status: 401,
			message: 'Withings rejected the access token. Reconnect the credential.',
		});

		expect(options.httpCode).toBeUndefined();
		expect(options.message).toMatch(/rejected/);
		expect(options.description).toMatch(/reconnect/i);
	});

	it('only reports a real HTTP status as httpCode', () => {
		const http = describeWithingsError({ ok: false, reason: 'http', status: 502, message: 'm' });
		const api = describeWithingsError({ ok: false, reason: 'api', status: 503, message: 'm' });

		expect(http.httpCode).toBe('502');
		expect(api.httpCode).toBeUndefined();
	});

	it('gives a distinct hint per failure reason', () => {
		const base = { ok: false as const, status: 500, message: 'm' };
		const hints = (['http', 'token', 'api'] as const).map(
			(reason) => describeWithingsError({ ...base, reason }).description,
		);

		expect(new Set(hints).size).toBe(3);
	});
});

describe('asNodeError', () => {
	it('passes n8n errors through untouched', () => {
		const apiError = new NodeApiError(node, { message: 'boom' });
		const opError = new NodeOperationError(node, 'reconnect');

		expect(asNodeError(node, apiError)).toBe(apiError);
		expect(asNodeError(node, opError)).toBe(opError);
	});

	it('wraps anything else in a NodeApiError with the original message', () => {
		const wrapped = asNodeError(node, new Error('socket hang up'));

		expect(wrapped).toBeInstanceOf(NodeApiError);
		expect(wrapped.message).toContain('socket hang up');
	});
});

describe('errorMessage', () => {
	it('extracts a message from errors and stringifies everything else', () => {
		expect(errorMessage(new Error('nope'))).toBe('nope');
		expect(errorMessage('plain')).toBe('plain');
		expect(errorMessage(42)).toBe('42');
	});
});

describe('errorPayload', () => {
	it('passes an object body through and wraps anything else', () => {
		expect(errorPayload({ statusCode: 200, body: { status: 503 } })).toEqual({ status: 503 });
		expect(errorPayload({ statusCode: 502, body: undefined })).toEqual({
			statusCode: 502,
			body: '',
		});
		expect(errorPayload({ statusCode: 502, body: '<html>' })).toEqual({
			statusCode: 502,
			body: '<html>',
		});
	});
});
