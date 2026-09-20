import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	IDataObject,
	INodeProperties,
} from 'n8n-workflow';
import { WITHINGS } from '../utils/constants';
import { normalizeTokenData } from '../utils/oauth';

export class WithingsOAuth2Api implements ICredentialType {
	name = 'withingsOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Withings OAuth2 API';

	documentationUrl = 'https://developer.withings.com/api-reference/#section/Authentication';

	icon: Icon = 'file:../nodes/WithingsApi/withings.svg';

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
			default: WITHINGS.AUTH_URL,
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: WITHINGS.TOKEN_URL,
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: WITHINGS.DEFAULT_SCOPES,
			description:
				'Comma-separated Withings scopes. The user.info scope is required for the User resource.',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];

	/**
	 * n8n calls this before every request (in memory) and after every token refresh (persisted).
	 * Withings nests the tokens under `body`; n8n expects them at the top level. Pure transform.
	 */
	async preAuthentication(credentials: ICredentialDataDecryptedObject): Promise<IDataObject> {
		const oauthTokenData = normalizeTokenData(credentials.oauthTokenData);
		return oauthTokenData ? { oauthTokenData } : {};
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: WITHINGS.BASE_URL,
			url: '/v2/user',
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: 'action=getdevice',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'status',
					value: 401,
					message:
						'Withings rejected the stored access token. Reconnect the credential. Tokens refresh automatically when a workflow runs, but not during this test.',
				},
			},
		],
	};
}
