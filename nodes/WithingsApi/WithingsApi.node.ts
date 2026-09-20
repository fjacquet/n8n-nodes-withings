import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';
import { WITHINGS } from '../../utils/constants';
import {
	asNodeError,
	buildRequestParams,
	describeWithingsError,
	errorMessage,
	parseWithingsResponse,
} from '../../utils/request';
import type { AdditionalFields, FullResponse, Resource } from '../../utils/types';
import { withingsProperties } from './descriptions';

export class WithingsApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Withings',
		name: 'withingsApi',
		icon: 'file:withings.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Read health data from the Withings API',
		defaults: { name: 'Withings' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'withingsOAuth2Api', required: true }],
		properties: withingsProperties,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const results: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const { endpoint, form } = buildRequestParams(
					this.getNodeParameter('resource', i) as Resource,
					this.getNodeParameter('operation', i) as string,
					this.getNodeParameter('additionalFields', i, {}) as AdditionalFields,
					{
						meastype: this.getNodeParameter('meastype', i, []) as number[],
						dataFields: this.getNodeParameter('dataFields', i, []) as string[],
					},
				);

				// Withings answers HTTP 200 even for an expired token (the error lives in body.status).
				// n8n only refreshes on an HTTP status match. With tokenExpiredStatusCode 200 plus
				// skipRefreshWhileTokenIsFresh it refreshes exactly when the stored n8n_expires_at has
				// passed (or is unknown), under n8n's cross-process lock, then retries. Only the legacy
				// helper evaluates a *resolved* response (resolveWithFullResponse + simple:false), so the
				// deprecated helper is used on purpose here.
				// eslint-disable-next-line @n8n/community-nodes/no-deprecated-workflow-functions
				const response = (await this.helpers.requestWithAuthentication.call(
					this,
					'withingsOAuth2Api',
					{
						method: 'POST',
						url: `${WITHINGS.BASE_URL}${endpoint}`,
						form,
						json: true,
						resolveWithFullResponse: true,
						simple: false,
						headers: { 'Cache-Control': 'no-cache' },
					},
					{
						oauth2: {
							property: 'body.access_token',
							tokenExpiredStatusCode: 200,
							skipRefreshWhileTokenIsFresh: true,
						},
					},
				)) as FullResponse;

				const result = parseWithingsResponse(response);
				if (!result.ok) {
					throw new NodeApiError(
						this.getNode(),
						response.body as JsonObject,
						describeWithingsError(result),
					);
				}
				results.push({ json: result.body, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					results.push({ json: { error: errorMessage(error) }, pairedItem: { item: i } });
					continue;
				}
				throw asNodeError(this.getNode(), error);
			}
		}

		return [results];
	}
}
