import {
  ICredentialType,
  INodeProperties,
  Icon,
  IHttpRequestOptions,
  ICredentialDataDecryptedObject,
} from 'n8n-workflow';

import {
  WITHINGS_API,
  DEFAULT_SCOPES,
} from '../utils/constants';

export class WithingsOAuth2Api implements ICredentialType {
  name = 'withingsOAuth2Api';
  displayName = 'Withings OAuth2 API';
  description = 'OAuth2 authentication for Withings API with custom token exchange';
  documentationUrl = 'https://developer.withings.com/api-reference/#section/Authentication';
  icon: Icon = 'file:../nodes/WithingsApi/withings.svg';
  extends = ['oAuth2Api'];

  properties: INodeProperties[] = [
    {
      displayName: 'Grant Type',
      name: 'grantType',
      type: 'hidden',
      default: 'authorizationCode',
    },
    {
      displayName: 'Authorization URL',
      name: 'authUrl',
      type: 'hidden',
      default: WITHINGS_API.AUTH_URL,
    },
    {
      displayName: 'Access Token URL',
      name: 'accessTokenUrl',
      type: 'hidden',
      default: WITHINGS_API.TOKEN_URL,
    },
    {
      displayName: 'Client ID',
      name: 'clientId',
      type: 'string',
      required: true,
      default: '',
      description: 'The Client ID from your Withings Developer Account',
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
      description: 'The Client Secret from your Withings Developer Account',
    },
    {
      displayName: 'Scope',
      name: 'scope',
      type: 'string',
      default: DEFAULT_SCOPES,
      description: 'Comma-separated list of scopes. Common scopes: user.info, user.metrics, user.activity, user.sleepevents',
    },
  ];

  async authenticate(
    credentials: ICredentialDataDecryptedObject,
    requestOptions: IHttpRequestOptions,
  ): Promise<IHttpRequestOptions> {
    console.log('=== WITHINGS DEBUG: authenticate() called ===');
    console.log('Request URL:', requestOptions.url);
    console.log('Request method:', requestOptions.method);
    console.log('Request body type:', typeof requestOptions.body);

    // For token exchange requests to Withings OAuth2 endpoint
    if (requestOptions.url?.includes('/oauth2') && requestOptions.method === 'POST') {
      console.log('=== Intercepting OAuth2 token request ===');

      // Parse existing body to get the authorization code and other params
      const bodyString = requestOptions.body as string;
      const params = new Map<string, string>();

      // Parse URL-encoded body manually
      if (bodyString) {
        bodyString.split('&').forEach((pair) => {
          const [key, value] = pair.split('=');
          if (key && value) {
            params.set(key, decodeURIComponent(value));
          }
        });
      }

      console.log('Original body params:', Array.from(params.keys()));

      // Determine grant type (authorization_code or refresh_token)
      const grantType = params.get('grant_type') || 'authorization_code';

      // Create new body with Withings-specific action parameter
      const newBodyParts = [
        'action=requesttoken', // REQUIRED by Withings!
        `grant_type=${encodeURIComponent(grantType)}`,
        `client_id=${encodeURIComponent(params.get('client_id') || (credentials.clientId as string))}`,
        `client_secret=${encodeURIComponent(params.get('client_secret') || (credentials.clientSecret as string))}`,
      ];

      // Add grant-type specific parameters
      if (grantType === 'authorization_code') {
        newBodyParts.push(`code=${encodeURIComponent(params.get('code') || '')}`);
        newBodyParts.push(`redirect_uri=${encodeURIComponent(params.get('redirect_uri') || '')}`);
      } else if (grantType === 'refresh_token') {
        newBodyParts.push(`refresh_token=${encodeURIComponent(params.get('refresh_token') || '')}`);
      }

      requestOptions.body = newBodyParts.join('&');
      requestOptions.headers = {
        ...requestOptions.headers,
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      console.log('Modified body params:', newBodyParts.map(p => p.split('=')[0]));
      console.log('=========================================');
    }

    return requestOptions;
  }
}
