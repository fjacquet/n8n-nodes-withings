# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

```bash
npm test             # Vitest unit tests (tests/**/*.test.ts)
npm run lint         # biome check . && n8n-node lint
npm run format       # biome check --write .
npm run typecheck    # tsc -p tsconfig.typecheck.json (sources + tests)
npm run build        # n8n-node build: rimraf dist, tsc, copy svg/png
npm run dev          # n8n-node dev: local n8n container with this node loaded
npm run release      # n8n-node release (release-it, needs npm login)
```

Requires Node >= 24 (n8n 2.x requirement). Package targets n8n >= 2.40.

## Architecture

`@fjacquet/n8n-nodes-withings` is an n8n community node package. One node, one credential, pure helpers.

- `credentials/WithingsOAuth2Api.credentials.ts` — `extends: ['oAuth2Api']`. Hidden fields set the Withings authorize URL, the token URL (`/v2/oauth2?action=requesttoken`), body authentication and the default scopes. `preAuthentication` is a pure normalizer that lifts Withings' nested `body` token fields to the top level; n8n calls it before every request and after every refresh.
- `nodes/WithingsApi/WithingsApi.node.ts` — thin `execute()`: builds params, calls Withings through the credential, parses the response, throws `NodeApiError` on failure.
- `nodes/WithingsApi/descriptions.ts` — `INodeProperties` arrays (resource, per-resource operation lists, additional fields, meastype, dataFields). Option lists must stay alphabetical for `n8n-node lint`.
- `utils/request.ts` — `buildRequestParams`, `parseWithingsResponse`, `describeWithingsError`, `asNodeError`, `errorMessage`. All pure.
- `utils/oauth.ts` — `normalizeTokenData`.
- `utils/constants.ts`, `utils/types.ts`.

## Why the node uses the deprecated `requestWithAuthentication`

Withings returns HTTP 200 for everything and reports errors in `body.status`. n8n only refreshes OAuth2 tokens on an HTTP status match. The node therefore passes `oauth2: { property: 'body.access_token', tokenExpiredStatusCode: 200, skipRefreshWhileTokenIsFresh: true }`, which makes n8n refresh exactly when the stored `n8n_expires_at` has passed (or is unknown). Only the legacy helper with `resolveWithFullResponse: true, simple: false` re-evaluates a resolved 200 response; `httpRequestWithAuthentication` checks only in its error path. `property` is mandatory: without it n8n compares an undefined stored token and signs with `undefined`. Do not "modernize" this call; the one `eslint-disable-next-line` is intentional.

## Key patterns

- All Withings calls are POST with a form body; the `action` form field is the operation name.
- Activity/sleep use `startdateymd`/`enddateymd` (YYYY-MM-DD); measure uses `startdate`/`enddate` (Unix seconds); `lastupdate` is Unix seconds everywhere. `measure` + `getmeas` hits `/measure` (v1); everything else is v2.
- No custom retry logic; users rely on n8n's Retry On Fail / Continue On Fail.
- No `console.*` (Biome and n8n lint both forbid it).

## Code style

- Tabs (width 2), semicolons, trailing commas, single quotes, LF, print width 100. Enforced by Biome (`biome.json`).
- `eslint.config.mjs` must stay exactly the `@n8n/node-cli/eslint` default (`n8n.strict: true`).
- TDD: tests in `tests/` (Vitest); write the failing test first.
- Functional style: pure functions in `utils/`, side effects only in `execute()`.
