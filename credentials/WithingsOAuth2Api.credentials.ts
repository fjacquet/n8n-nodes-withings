import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
  Icon,
} from 'n8n-workflow';

import {
  WITHINGS_API,
  DEFAULT_SCOPES,
} from '../utils/constants';

export class WithingsOAuth2Api implements ICredentialType {
  name = 'withingsOAuth2Api';
  displayName = 'Withings OAuth2 API';
  description = 'OAuth2 authentication for Withings API';
  documentationUrl = 'https://developer.withings.com/api-reference/#section/Authentication';
  icon: Icon = 'file:../nodes/WithingsApi/withings.svg';

  properties: INodeProperties[] = [
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
      displayName: 'Access Token',
      name: 'accessToken',
      type: 'string',
      typeOptions: {
        password: true,
      },
      required: false,
      default: '',
      description: 'Access token (will be automatically filled by Token Exchange node)',
    },
    {
      displayName: 'Refresh Token',
      name: 'refreshToken',
      type: 'string',
      typeOptions: {
        password: true,
      },
      required: false,
      default: '',
      description: 'Refresh token (will be automatically filled by Token Exchange node)',
    },
    {
      displayName: 'Expires At',
      name: 'expiresAt',
      type: 'number',
      required: false,
      default: 0,
      description: 'Unix timestamp when the token expires',
    },
    {
      displayName: 'Scope',
      name: 'scope',
      type: 'string',
      default: DEFAULT_SCOPES,
      description: 'Comma-separated list of scopes. Common scopes: user.info, user.metrics, user.activity, user.sleepevents',
    },
  ];

  // Use generic authentication with Bearer token
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.accessToken}}',
      },
    },
  };

  // Test the credentials by making a simple API call
  // Withings API requires POST with form-urlencoded body
  test: ICredentialTestRequest = {
    request: {
      baseURL: WITHINGS_API.BASE_URL,
      url: '/measure',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'action=getmeas',
    },
  };
}
