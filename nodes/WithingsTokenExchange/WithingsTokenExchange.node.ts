import {
  INodeType,
  INodeTypeDescription,
  IExecuteFunctions,
  NodeConnectionType,
  INodeExecutionData,
  IHttpRequestOptions,
  NodeOperationError,
} from 'n8n-workflow';

import { WITHINGS_API } from '../../utils/constants';

export class WithingsTokenExchange implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Withings Token Exchange',
    name: 'withingsTokenExchange',
    group: ['transform'],
    version: 1,
    subtitle: 'Exchange authorization code for tokens',
    description: 'Manually exchange Withings authorization code for access and refresh tokens',
    icon: 'file:../WithingsApi/withings.svg',
    defaults: {
      name: 'Withings Token Exchange',
    },
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Exchange Authorization Code',
            value: 'exchangeCode',
            description: 'Exchange authorization code for access token',
            action: 'Exchange authorization code for access token',
          },
          {
            name: 'Refresh Access Token',
            value: 'refreshToken',
            description: 'Refresh an expired access token',
            action: 'Refresh access token',
          },
          {
            name: 'Get Authorization URL',
            value: 'getAuthUrl',
            description: 'Get the authorization URL to start OAuth flow',
            action: 'Get authorization URL',
          },
        ],
        default: 'getAuthUrl',
      },
      {
        displayName: 'Client ID',
        name: 'clientId',
        type: 'string',
        required: true,
        default: '',
        description: 'Your Withings Client ID',
      },
      {
        displayName: 'Client Secret',
        name: 'clientSecret',
        type: 'string',
        typeOptions: {
          password: true,
        },
        required: true,
        default: '',
        description: 'Your Withings Client Secret',
      },
      {
        displayName: 'Redirect URI',
        name: 'redirectUri',
        type: 'string',
        required: true,
        default: 'http://localhost:8080/callback',
        description: 'OAuth redirect URI (must match your Withings app settings)',
        displayOptions: {
          show: {
            operation: ['exchangeCode', 'getAuthUrl'],
          },
        },
      },
      {
        displayName: 'Scope',
        name: 'scope',
        type: 'string',
        default: 'user.info,user.metrics,user.activity,user.sleepevents',
        description: 'OAuth scopes (comma-separated)',
        displayOptions: {
          show: {
            operation: ['getAuthUrl'],
          },
        },
      },
      {
        displayName: 'Authorization Code',
        name: 'authorizationCode',
        type: 'string',
        required: true,
        default: '',
        description: 'The authorization code from the OAuth callback',
        displayOptions: {
          show: {
            operation: ['exchangeCode'],
          },
        },
      },
      {
        displayName: 'Refresh Token',
        name: 'refreshToken',
        type: 'string',
        typeOptions: {
          password: true,
        },
        required: true,
        default: '',
        description: 'The refresh token to use',
        displayOptions: {
          show: {
            operation: ['refreshToken'],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;
        const clientId = this.getNodeParameter('clientId', i) as string;
        const clientSecret = this.getNodeParameter('clientSecret', i) as string;

        if (operation === 'getAuthUrl') {
          // Generate authorization URL
          const redirectUri = this.getNodeParameter('redirectUri', i) as string;
          const scope = this.getNodeParameter('scope', i) as string;

          const params = new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: scope,
            state: `state_${Date.now()}`,
          });

          const authUrl = `${WITHINGS_API.AUTH_URL}?${params.toString()}`;

          returnData.push({
            json: {
              success: true,
              operation: 'getAuthUrl',
              authorizationUrl: authUrl,
              instructions: [
                '1. Open the authorization URL in your browser',
                '2. Log in to Withings and authorize the app',
                '3. Copy the "code" parameter from the redirect URL',
                '4. Use "Exchange Authorization Code" operation with that code',
              ],
            },
          });
        } else if (operation === 'exchangeCode') {
          // Exchange authorization code for tokens
          const authorizationCode = this.getNodeParameter('authorizationCode', i) as string;
          const redirectUri = this.getNodeParameter('redirectUri', i) as string;

          const requestOptions: IHttpRequestOptions = {
            method: 'POST',
            url: WITHINGS_API.TOKEN_URL,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              action: 'requesttoken',
              grant_type: 'authorization_code',
              client_id: clientId,
              client_secret: clientSecret,
              code: authorizationCode,
              redirect_uri: redirectUri,
            }).toString(),
            json: true,
          };

          const response = await this.helpers.httpRequest(requestOptions);

          if ((response as any).status === 0 && (response as any).body) {
            const body = (response as any).body;
            const expiresAt = Math.floor(Date.now() / 1000) + (body.expires_in || 3600);

            returnData.push({
              json: {
                success: true,
                operation: 'exchangeCode',
                accessToken: body.access_token,
                refreshToken: body.refresh_token,
                expiresIn: body.expires_in,
                expiresAt: expiresAt,
                expiresAtReadable: new Date(expiresAt * 1000).toISOString(),
                userId: body.userid,
                scope: body.scope,
              },
            });
          } else {
            throw new NodeOperationError(
              this.getNode(),
              `Token exchange failed: ${JSON.stringify(response)}`,
            );
          }
        } else if (operation === 'refreshToken') {
          // Refresh access token
          const refreshToken = this.getNodeParameter('refreshToken', i) as string;

          const requestOptions: IHttpRequestOptions = {
            method: 'POST',
            url: WITHINGS_API.TOKEN_URL,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              action: 'requesttoken',
              grant_type: 'refresh_token',
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: refreshToken,
            }).toString(),
            json: true,
          };

          const response = await this.helpers.httpRequest(requestOptions);

          if ((response as any).status === 0 && (response as any).body) {
            const body = (response as any).body;
            const expiresAt = Math.floor(Date.now() / 1000) + (body.expires_in || 3600);

            returnData.push({
              json: {
                success: true,
                operation: 'refreshToken',
                accessToken: body.access_token,
                refreshToken: body.refresh_token,
                expiresIn: body.expires_in,
                expiresAt: expiresAt,
                expiresAtReadable: new Date(expiresAt * 1000).toISOString(),
                userId: body.userid,
                scope: body.scope,
              },
            });
          } else {
            throw new NodeOperationError(
              this.getNode(),
              `Token refresh failed: ${JSON.stringify(response)}`,
            );
          }
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              success: false,
              error: error.message,
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
