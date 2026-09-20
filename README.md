# n8n-nodes-withings

[![npm version](https://img.shields.io/npm/v/@fjacquet/n8n-nodes-withings)](https://www.npmjs.com/package/@fjacquet/n8n-nodes-withings)
[![npm downloads](https://img.shields.io/npm/dm/@fjacquet/n8n-nodes-withings)](https://www.npmjs.com/package/@fjacquet/n8n-nodes-withings)
[![CI](https://github.com/fjacquet/n8n-nodes-withings/actions/workflows/ci.yml/badge.svg)](https://github.com/fjacquet/n8n-nodes-withings/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@fjacquet/n8n-nodes-withings)](./LICENSE.md)
[![node](https://img.shields.io/node/v/@fjacquet/n8n-nodes-withings)](https://nodejs.org)
[![n8n community node](https://img.shields.io/badge/n8n-community%20node-ff6d5a)](https://docs.n8n.io/integrations/community-nodes/)

An [n8n](https://n8n.io) community node for the [Withings Health API](https://developer.withings.com): body measurements, activity, workouts, sleep, devices and goals.

Authentication is a native n8n OAuth2 credential. You click **Connect my account** once; n8n stores the tokens, refreshes them before they expire and keeps the rotated refresh token. No second package, no token-exchange node, no external cron.

## Requirements

- n8n **2.40 or later**. Older versions cannot refresh Withings tokens: Withings answers HTTP 200 even when a token is expired, and the hook this package uses to work around that shipped in n8n 2.40.
- A [Withings developer account](https://developer.withings.com) with an application (Client ID and Client Secret).

## Installation

In n8n open **Settings → Community Nodes → Install** and enter:

```
@fjacquet/n8n-nodes-withings
```

Or, for a self-managed custom-nodes directory:

```bash
npm install @fjacquet/n8n-nodes-withings
```

## Withings application setup

1. Sign in at <https://developer.withings.com> and create an application (or open an existing one).
2. Set the **Callback URL** to your n8n OAuth callback, exactly:

   ```
   https://<your-n8n-host>/rest/oauth2-credential/callback
   ```

   n8n shows this URL in the credential form as **OAuth Redirect URL**.
3. Copy the **Client ID** and **Client Secret**.

## Credential setup

1. In n8n create a credential of type **Withings OAuth2 API**.
2. Paste the Client ID and Client Secret.
3. Adjust the **Scope** if needed. It is a comma-separated list. Default:

   ```
   user.info,user.metrics,user.activity,user.sleepevents
   ```

   `user.info` is required for the **User** resource.
4. Click **Connect my account**, sign in to Withings and approve the request.

The credential **Test** button only checks the stored token. It cannot refresh a token that has already expired, so after a few idle hours the test may report a rejected token even though workflows still run fine. Run a workflow instead of trusting the test after idle time.

## Node usage

Add the **Withings** node, pick the credential, then a resource and an operation.

| Resource | Operation | Withings endpoint | Date parameters |
|---|---|---|---|
| Activity | Get Activity, Get Summary, Get Workouts | `POST /v2/measure` | `startdateymd`, `enddateymd` (calendar day, `YYYY-MM-DD`) |
| Measure | Get Measurements | `POST /measure` | `startdate`, `enddate` (Unix seconds) |
| Measure | Get Activity, Get Intraday Activity | `POST /v2/measure` | `startdate`, `enddate` (Unix seconds) |
| Sleep | Get, Get Summary | `POST /v2/sleep` | `startdateymd`, `enddateymd` (calendar day) |
| User | Get, Get Device, Get Goals | `POST /v2/user` | none |

Additional fields:

- **Start Date** and **End Date** are converted per resource as shown above.
- **Last Update** is always sent as Unix seconds (`lastupdate`).
- **Offset** is sent when non-zero.
- **Measure Type** (Measure → Get Measurements) filters by Withings measurement type codes.
- **Data Fields** (Sleep → Get) selects the heart-rate, respiration-rate and snoring series.

Each output item is the Withings response `body` spread as-is, for example `measuregrps` for measurements or `series` for sleep data.

The node can be used as a tool by AI Agent nodes.

## How token refresh works

Withings access tokens live three hours and every refresh rotates the refresh token. This package tells n8n to refresh whenever the stored expiry has passed, before sending the request, and n8n serialises refreshes across workers so the rotated refresh token is never lost. The first run after connecting always refreshes once (n8n has no expiry for the freshly connected token yet); after that, roughly once every three hours of use.

Because Withings reports errors in the JSON body rather than in the HTTP status, the node uses n8n's legacy request helper, which is the only one able to evaluate a `200` response for refresh purposes. This is deliberate and documented in the source.

## Error handling

Withings errors surface as n8n API errors with the Withings status code and message. Use the node settings **Retry On Fail** for transient failures and **Continue On Fail** to receive `{ "error": "<message>" }` items instead of stopping the workflow.

| Symptom | Cause | Fix |
|---|---|---|
| `Withings rejected the access token. Reconnect the credential.` | The user revoked access, or a refresh failed | Open the credential and click **Reconnect** |
| `Withings error 503: Invalid Params: invalid client id/secret` | Wrong Client ID or Secret, or the Withings app's callback URL differs from n8n's | Check the Withings application settings |
| `Withings error 601: Too Many Requests` | Withings rate limit | Enable **Retry On Fail** with a wait |
| Credential test fails after idle time | The test cannot refresh tokens | Run a workflow; see [Credential setup](#credential-setup) |

## Migrating from 1.x

Version 2 is a breaking change.

1. Delete the old **Withings OAuth2 API** credential and create a new one as described above. The old `accessToken`, `refreshToken` and `expiresAt` fields no longer exist.
2. Remove any **Withings Token Exchange** nodes from your workflows. The node type no longer exists.
3. The node parameters `authenticationMethod` and `manualAccessToken` were removed. Existing nodes fall back to the credential automatically.
4. Output items now contain only the Withings `body`. The `success`, `resource` and `operation` wrapper fields are gone; error items under **Continue On Fail** are `{ "error": "<message>" }`.
5. The built-in retry loop was removed in favour of n8n's **Retry On Fail** node setting.

## Development

```bash
npm install
npm test            # vitest
npm run lint        # biome + n8n-node lint
npm run typecheck   # tsc, sources and tests
npm run build       # n8n-node build → dist/
npm run dev         # local n8n with this node loaded (needs Docker or Podman)
```

Formatting and general linting are handled by [Biome](https://biomejs.dev); n8n-specific rules by `n8n-node lint` from [`@n8n/node-cli`](https://www.npmjs.com/package/@n8n/node-cli). Releases go through `npm run release`.

## License

[MIT](./LICENSE.md)

## Links

- [Withings API reference](https://developer.withings.com/api-reference/)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Issues](https://github.com/fjacquet/n8n-nodes-withings/issues)
