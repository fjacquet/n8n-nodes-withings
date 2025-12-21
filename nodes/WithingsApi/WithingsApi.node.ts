import {
  INodeType,
  INodeTypeDescription,
  IExecuteFunctions,
  NodeConnectionType,
  IDataObject,
  INodeExecutionData,
  IHttpRequestOptions,
  NodeApiError,
  NodeOperationError,
  sleep,
} from 'n8n-workflow';

import {
  WITHINGS_API,
  ENDPOINTS,
  TOKEN_CONFIG,
} from '../../utils/constants';
import {
  refreshTokenForRetry,
  executeRefreshStrategies,
  isTokenError,
  calculateBackoffDelay,
  generateUniqueTimestamp,
  createRequestHeaders,
  createTokenErrorMessage,
} from '../../utils/tokenHelpers';
import { IWithingsResponse, IRetryContext } from '../../utils/types';

/**
 * Get the appropriate endpoint for a given resource and operation
 * @param resource - API resource (activity, measure, sleep, user)
 * @param operation - Operation to perform
 * @returns Endpoint path
 */
function getEndpointForResource(resource: string, operation: string): string {
  switch (resource) {
    case 'activity':
      return ENDPOINTS.MEASURE;
    case 'measure':
      return operation === 'getmeas' ? ENDPOINTS.MEASURE_V1 : ENDPOINTS.MEASURE;
    case 'sleep':
      return ENDPOINTS.SLEEP;
    case 'user':
      return ENDPOINTS.USER;
    default:
      return ENDPOINTS.USER;
  }
}

/**
 * Execute API request with comprehensive retry logic
 * @param context - n8n execution context
 * @param baseEndpoint - API endpoint
 * @param baseQs - Query string parameters
 * @param resource - Resource being accessed
 * @param operation - Operation being performed
 * @returns API response
 */
async function executeWithRetry(
  context: IExecuteFunctions,
  baseEndpoint: string,
  baseQs: IDataObject,
  resource: string,
  operation: string,
): Promise<IWithingsResponse> {
  const retryContext: IRetryContext = {
    retries: 0,
    maxRetries: TOKEN_CONFIG.MAX_RETRIES,
    tokenRefreshed: false,
  };

  // Simplified token preparation - reduce pre-validation to minimize time before actual request
  // Withings tokens only last 30 seconds, so we need to minimize delays

  // Quick single validation attempt instead of multiple attempts
  try {
    const uniqueTimestamp = generateUniqueTimestamp();
    await context.helpers.requestWithAuthentication.call(context, 'withingsOAuth2Api', {
      method: 'GET',
      url: `${WITHINGS_API.BASE_URL}${ENDPOINTS.USER}`,
      qs: {
        action: 'getdevice',
        _ts: uniqueTimestamp,
      },
      json: true,
      headers: {
        ...createRequestHeaders(),
        'X-Request-ID': `quick-validation-${uniqueTimestamp}`,
      },
      timeout: TOKEN_CONFIG.REQUEST_TIMEOUT,
    });

    retryContext.tokenRefreshed = true;
    // Minimal delay after validation
    await sleep(500);
  } catch (validationError) {
    // If quick validation fails, continue anyway - the retry logic will handle it
    retryContext.tokenRefreshed = false;
    await sleep(1000);
  }

  // Create a fresh copy of the options for each attempt
  const createFreshOptions = (): IHttpRequestOptions => {
    return {
      method: 'GET',
      url: `${WITHINGS_API.BASE_URL}${baseEndpoint}`,
      qs: {
        ...baseQs,
        _ts: generateUniqueTimestamp(),
      },
      json: true,
      headers: {
        ...createRequestHeaders(),
        'Content-Type': 'application/json',
        'X-Request-Attempt': `${retryContext.retries + 1}`,
      },
    };
  };

  // Main request loop with retry logic
  while (retryContext.retries < retryContext.maxRetries) {
    try {
      // Handle delays before request
      if (retryContext.retries > 0) {
        // Exponential backoff with jitter for retries
        const delay = calculateBackoffDelay(retryContext.retries);
        await sleep(delay);

        // Force token refresh before each retry
        const refreshResult = await refreshTokenForRetry(context, retryContext.retries);
        retryContext.tokenRefreshed = refreshResult.success;
      } else {
        // Shorter initial delay to minimize time between token refresh and actual request
        // Sleep endpoints are particularly sensitive to timing
        await sleep(resource === 'sleep' ? 500 : TOKEN_CONFIG.INITIAL_DELAY);
      }

      // Create fresh options for this attempt
      const freshOptions = createFreshOptions();

      // Make the main API request
      const response = await context.helpers.requestWithAuthentication.call(
        context,
        'withingsOAuth2Api',
        freshOptions,
      );

      // Success - wait a moment to ensure side effects are complete
      await sleep(500);
      return response as IWithingsResponse;
    } catch (error) {
      // Check if this is a token-related error
      if (isTokenError(error)) {
        retryContext.retries++;
        retryContext.lastError = error;

        if (retryContext.retries >= retryContext.maxRetries) {
          // Max retries reached - throw detailed error
          const errorMessage = createTokenErrorMessage(
            retryContext.maxRetries,
            error,
            retryContext.tokenRefreshed,
          );

          throw new NodeApiError(context.getNode(), error, { message: errorMessage });
        }

        // Execute comprehensive refresh strategies
        const delay = calculateBackoffDelay(retryContext.retries, 1500);
        await sleep(delay);

        retryContext.tokenRefreshed = false;
        const refreshResult = await executeRefreshStrategies(context);
        retryContext.tokenRefreshed = refreshResult.success;

        // Continue to next retry attempt
        continue;
      } else {
        // Not a token error - rethrow immediately
        throw error;
      }
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new NodeOperationError(
    context.getNode(),
    'Max retries exceeded without throwing error',
  );
}

export class WithingsApi implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Withings API',
    name: 'withingsApi',
    group: ['transform'],
    version: 1,
    subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
    description: 'Withings API Integration',
    icon: 'file:withings.svg',
    defaults: {
      name: 'Withings API',
    },
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
    credentials: [
      {
        name: 'withingsOAuth2Api',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Activity',
            value: 'activity',
          },
          {
            name: 'Measure',
            value: 'measure',
          },
          {
            name: 'Sleep',
            value: 'sleep',
          },
          {
            name: 'User',
            value: 'user',
          },
        ],
        default: 'measure',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: [
              'activity',
            ],
          },
        },
        options: [
          {
            name: 'Get Activity',
            value: 'getactivity',
            description: 'Get user activity data',
            action: 'Get activity data',
          },
          {
            name: 'Get Summary',
            value: 'getsummary',
            description: 'Get user activity summary',
            action: 'Get activity summary',
          },
          {
            name: 'Get Workouts',
            value: 'getworkouts',
            description: 'Get user workout data',
            action: 'Get workout data',
          },
        ],
        default: 'getactivity',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: [
              'measure',
            ],
          },
        },
        options: [
          {
            name: 'Get Measurements',
            value: 'getmeas',
            description: 'Get measurements data',
            action: 'Get measurements from measure',
          },
          {
            name: 'Get Activity',
            value: 'getactivity',
            description: 'Get user intraday activity',
            action: 'Get intraday activity',
          },
          {
            name: 'Get Intradayactivity',
            value: 'getintradayactivity',
            description: 'Get user intraday activity',
            action: 'Get intraday activity',
          },
        ],
        default: 'getmeas',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: [
              'sleep',
            ],
          },
        },
        options: [
          {
            name: 'Get',
            value: 'get',
            description: 'Get sleep data',
            action: 'Get sleep data',
          },
          {
            name: 'Get Summary',
            value: 'getsummary',
            description: 'Get sleep summary',
            action: 'Get sleep summary',
          },
        ],
        default: 'get',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: [
              'user',
            ],
          },
        },
        options: [
          {
            name: 'Get Device',
            value: 'getdevice',
            description: 'Get user devices',
            action: 'Get device from user',
          },
          {
            name: 'Get Goals',
            value: 'getgoals',
            description: 'Get user goals',
            action: 'Get user goals',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get user information',
            action: 'Get user information',
          },
        ],
        default: 'getdevice',
      },

      // Common parameters
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        options: [
          {
            displayName: 'Start Date',
            name: 'startdate',
            type: 'dateTime',
            default: '',
            description: 'Start date for data retrieval (timestamp)',
          },
          {
            displayName: 'End Date',
            name: 'enddate',
            type: 'dateTime',
            default: '',
            description: 'End date for data retrieval (timestamp)',
          },
          {
            displayName: 'Last Update',
            name: 'lastupdate',
            type: 'dateTime',
            default: '',
            description: 'Get only data that was updated after this date (timestamp)',
          },
          {
            displayName: 'Offset',
            name: 'offset',
            type: 'number',
            default: 0,
            description: 'Skip this many records',
          },
        ],
      },

      // Measure specific parameters
      {
        displayName: 'Measure Type',
        name: 'meastype',
        type: 'multiOptions',
        displayOptions: {
          show: {
            resource: [
              'measure',
            ],
            operation: [
              'getmeas',
            ],
          },
        },
        options: [
          {
            name: 'Weight',
            value: 1,
          },
          {
            name: 'Height',
            value: 4,
          },
          {
            name: 'Fat Free Mass',
            value: 5,
          },
          {
            name: 'Fat Ratio',
            value: 6,
          },
          {
            name: 'Fat Mass Weight',
            value: 8,
          },
          {
            name: 'Diastolic Blood Pressure',
            value: 9,
          },
          {
            name: 'Systolic Blood Pressure',
            value: 10,
          },
          {
            name: 'Heart Pulse',
            value: 11,
          },
          {
            name: 'Temperature',
            value: 12,
          },
          {
            name: 'SpO2',
            value: 54,
          },
          {
            name: 'Body Temperature',
            value: 71,
          },
          {
            name: 'Skin Temperature',
            value: 73,
          },
          {
            name: 'Muscle Mass',
            value: 76,
          },
          {
            name: 'Hydration',
            value: 77,
          },
          {
            name: 'Bone Mass',
            value: 88,
          },
          {
            name: 'Pulse Wave Velocity',
            value: 91,
          },
        ],
        default: [],
        description: 'Types of measurements to retrieve',
      },

      // Sleep specific parameters
      {
        displayName: 'Data Fields',
        name: 'dataFields',
        type: 'multiOptions',
        displayOptions: {
          show: {
            resource: [
              'sleep',
            ],
          },
        },
        options: [
          {
            name: 'HR',
            value: 'hr',
            description: 'Heart rate data',
          },
          {
            name: 'RR',
            value: 'rr',
            description: 'Respiration rate data',
          },
          {
            name: 'SNORING',
            value: 'snoring',
            description: 'Snoring data',
          },
        ],
        default: [],
        description: 'Types of sleep data to retrieve',
      },
    ],
  };


  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // For each item
    for (let i = 0; i < items.length; i++) {
      let resource = '';
      let operation = '';

      try {
        resource = this.getNodeParameter('resource', i) as string;
        operation = this.getNodeParameter('operation', i) as string;

        let endpoint = '';
        const qs: IDataObject = {};

        // Process common parameters
        const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

        if (additionalFields.startdate) {
          qs.startdate = Math.floor(new Date(additionalFields.startdate as string).getTime() / 1000);
        }

        if (additionalFields.enddate) {
          qs.enddate = Math.floor(new Date(additionalFields.enddate as string).getTime() / 1000);
        }

        if (additionalFields.lastupdate) {
          qs.lastupdate = Math.floor(new Date(additionalFields.lastupdate as string).getTime() / 1000);
        }

        if (additionalFields.offset) {
          qs.offset = additionalFields.offset;
        }

        // Determine endpoint and action based on resource and operation
        endpoint = getEndpointForResource(resource, operation);
        qs.action = operation;

        // Handle resource-specific parameters
        if (resource === 'measure' && operation === 'getmeas') {
          // Process measure-specific parameters
          const measTypes = this.getNodeParameter('meastype', i, []) as number[];
          if (measTypes.length > 0) {
            qs.meastype = measTypes.join(',');
          }
        } else if (resource === 'sleep' && operation === 'get') {
          // Process sleep-specific parameters
          const dataFields = this.getNodeParameter('dataFields', i, []) as string[];
          if (dataFields.length > 0) {
            qs.data_fields = dataFields.join(',');
          }
        }

        // Execute API request with retry logic
        const response = await executeWithRetry(this, endpoint, qs, resource, operation);
        // Check if the response contains an error
        if (response.status !== 0) {
          const errorMessage = `Withings API Error: ${response.status} - ${response.error || 'Unknown error'}`;

          if (this.continueOnFail()) {
            returnData.push({
              json: {
                success: false,
                error: errorMessage,
                status: response.status,
                errorCode: response.error,
                resource,
                operation,
              },
            });
            continue;
          }

          throw new NodeApiError(this.getNode(), { message: errorMessage } as any);
        }

        // Format the response data
        let formattedResponse: IDataObject = {};

        if (response.body) {
          formattedResponse = {
            success: true,
            resource,
            operation,
            ...response.body,
          };
        } else {
          formattedResponse = {
            success: true,
            resource,
            operation,
            data: response,
          };
        }

        returnData.push({
          json: formattedResponse,
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              success: false,
              error: error.message,
              resource,
              operation,
            },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
