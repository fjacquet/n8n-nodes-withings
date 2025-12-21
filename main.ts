import { WithingsApi } from './nodes/WithingsApi/WithingsApi.node';
import { WithingsTokenExchange } from './nodes/WithingsTokenExchange/WithingsTokenExchange.node';
import { WithingsOAuth2Api } from './credentials/WithingsOAuth2Api.credentials';

export const nodes = [
  WithingsApi,
  WithingsTokenExchange,
];

export const credentials = [
  WithingsOAuth2Api,
];
