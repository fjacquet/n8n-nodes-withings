import type { IDataObject } from 'n8n-workflow';

export type Resource = 'activity' | 'measure' | 'sleep' | 'user';

/** Values of the node's "Additional Fields" collection. Dates arrive as ISO strings. */
export interface AdditionalFields {
	readonly startdate?: string;
	readonly enddate?: string;
	readonly lastupdate?: string;
	readonly offset?: number;
}

/** Resource-specific parameters read outside the collection. */
export interface RequestExtras {
	readonly meastype?: readonly number[];
	readonly dataFields?: readonly string[];
}

export type Form = Readonly<Record<string, string>>;

export interface RequestParams {
	readonly endpoint: string;
	readonly form: Form;
}

/** Resolved value of the legacy request helper with `resolveWithFullResponse` and `simple: false`. */
export interface FullResponse {
	readonly statusCode: number;
	readonly body: unknown;
}

export type FailureReason = 'http' | 'token' | 'api';

export interface WithingsFailure {
	readonly ok: false;
	readonly reason: FailureReason;
	readonly status: number;
	readonly message: string;
}

export interface WithingsSuccess {
	readonly ok: true;
	readonly body: IDataObject;
}

export type WithingsResult = WithingsSuccess | WithingsFailure;

export interface NodeErrorOptions {
	readonly message: string;
	readonly description: string;
	readonly httpCode?: string;
}
