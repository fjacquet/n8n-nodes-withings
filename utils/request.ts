import type { INode, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { ENDPOINTS, RESOURCE_ENDPOINTS, WITHINGS_STATUS } from './constants';
import { isRecord } from './oauth';
import type {
	AdditionalFields,
	FailureReason,
	Form,
	FullResponse,
	NodeErrorOptions,
	RequestExtras,
	RequestParams,
	Resource,
	WithingsFailure,
	WithingsResult,
} from './types';

const unixSeconds = (iso: string): string => String(Math.floor(Date.parse(iso) / 1000));

/** Keep the calendar day the user wrote (with its own offset); fall back to the UTC day. */
const calendarDay = (iso: string): string =>
	/^\d{4}-\d{2}-\d{2}/.exec(iso)?.[0] ?? new Date(iso).toISOString().slice(0, 10);

/** Withings operations that take Unix-second `startdate`/`enddate`; all others take `*ymd` days. */
const UNIX_DATE_OPERATIONS: ReadonlySet<string> = new Set([
	'measure:getmeas',
	'measure:getintradayactivity',
	'sleep:get',
]);

const usesCalendarDays = (resource: Resource, operation: string): boolean =>
	!UNIX_DATE_OPERATIONS.has(`${resource}:${operation}`);

const endpointFor = (resource: Resource, operation: string): string =>
	resource === 'measure' && operation === 'getmeas'
		? ENDPOINTS.MEASURE_V1
		: RESOURCE_ENDPOINTS[resource];

const dateFields = (resource: Resource, operation: string, fields: AdditionalFields): Form => {
	const calendar = usesCalendarDays(resource, operation);
	const encode = calendar ? calendarDay : unixSeconds;
	const suffix = calendar ? 'ymd' : '';
	return {
		...(fields.startdate && { [`startdate${suffix}`]: encode(fields.startdate) }),
		...(fields.enddate && { [`enddate${suffix}`]: encode(fields.enddate) }),
	};
};

const listField = (key: string, values: readonly (string | number)[] | undefined): Form =>
	values && values.length > 0 ? { [key]: values.join(',') } : {};

/** Pure mapping from node parameters to a Withings endpoint and form body. */
export const buildRequestParams = (
	resource: Resource,
	operation: string,
	fields: AdditionalFields = {},
	extras: RequestExtras = {},
): RequestParams => ({
	endpoint: endpointFor(resource, operation),
	form: {
		action: operation,
		...dateFields(resource, operation, fields),
		...(fields.lastupdate && { lastupdate: unixSeconds(fields.lastupdate) }),
		...(fields.offset && { offset: String(fields.offset) }),
		...(resource === 'measure' &&
			operation === 'getmeas' &&
			listField('meastype', extras.meastype)),
		...(resource === 'sleep' && operation === 'get' && listField('data_fields', extras.dataFields)),
	},
});

const failure = (reason: FailureReason, status: number, message: string): WithingsFailure => ({
	ok: false,
	reason,
	status,
	message,
});

/** Interpret a full HTTP response from Withings. Withings signals errors in `body.status`, not HTTP. */
export const parseWithingsResponse = ({ statusCode, body }: FullResponse): WithingsResult => {
	if (statusCode < 200 || statusCode >= 300) {
		return failure('http', statusCode, `Withings responded with HTTP ${statusCode}`);
	}
	if (!isRecord(body) || typeof body.status !== 'number') {
		return failure('api', statusCode, 'Unexpected response body from Withings');
	}
	if (body.status === WITHINGS_STATUS.OK) {
		return { ok: true, body: isRecord(body.body) ? body.body : {} };
	}
	if (body.status === WITHINGS_STATUS.INVALID_TOKEN) {
		return failure(
			'token',
			body.status,
			'Withings rejected the access token. Reconnect the credential.',
		);
	}
	const detail = typeof body.error === 'string' ? body.error : 'unknown error';
	return failure('api', body.status, `Withings error ${body.status}: ${detail}`);
};

const HINTS: Readonly<Record<FailureReason, string>> = {
	http: 'Withings did not answer with HTTP 2xx. Retry later or enable "Retry On Fail" on the node.',
	token:
		'The stored token is no longer valid. Open the credential and reconnect it; tokens are refreshed automatically once a workflow runs.',
	api: 'Check the operation parameters and the Withings status code reference at https://developer.withings.com/api-reference/#section/Response-status',
};

/** Only a real HTTP status goes into `httpCode`; Withings' own codes would mislead n8n's hints. */
export const describeWithingsError = (error: WithingsFailure): NodeErrorOptions => ({
	message: error.message,
	description: HINTS[error.reason],
	...(error.reason === 'http' && { httpCode: String(error.status) }),
});

/** Body for NodeApiError: n8n dereferences it, so never hand it a non-object. */
export const errorPayload = ({ statusCode, body }: FullResponse): JsonObject =>
	isRecord(body)
		? (body as JsonObject)
		: { statusCode, body: body === undefined ? '' : String(body) };

export const errorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

/** Keep n8n's own errors (including its "reconnect credential" error) intact; wrap the rest. */
export const asNodeError = (node: INode, error: unknown): NodeApiError | NodeOperationError =>
	error instanceof NodeApiError || error instanceof NodeOperationError
		? error
		: new NodeApiError(node, { message: errorMessage(error) } as JsonObject);
