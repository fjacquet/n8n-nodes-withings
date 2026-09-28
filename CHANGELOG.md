# Changelog

## 2.0.1

### Changed

- No change to the published node. Development dependencies bumped (`@n8n/node-cli` 0.49.1, `release-it` 21.1.0, `vitest` 5.0.2) to clear OSV security findings; the remaining dev-only findings pinned upstream by `@n8n/node-cli` are documented in `osv-scanner.toml` (#5).
- The Security workflow now runs on `master` pushes and pull requests.

## 2.0.0

### Breaking changes

- The credential is now a native n8n OAuth2 credential. Delete the old credential, create a new **Withings OAuth2 API** credential and click **Connect my account**. The old `accessToken`, `refreshToken` and `expiresAt` fields are gone.
- The **Withings Token Exchange** node has been removed. n8n performs the code exchange and the token refresh itself.
- The node parameters `authenticationMethod` and `manualAccessToken` have been removed. Existing nodes fall back to the credential automatically.
- Output items contain the Withings `body` only. The `success`, `resource` and `operation` wrapper fields are gone. Failed items under **Continue On Fail** are `{ "error": "<message>" }`.
- The custom retry and backoff logic has been removed. Use the node settings **Retry On Fail** and **Continue On Fail**.
- Requires n8n 2.40 or later.

### Fixed

- Access tokens refresh automatically before they expire, and the rotated refresh token is persisted by n8n (#1).

### Changed

- Build, lint and release through `@n8n/node-cli`; formatting and general linting through Biome; unit tests through Vitest.
- Node marked as usable by AI agents (`usableAsTool`).

## 1.4.0 and earlier

See the git history. 1.x used POST for all Withings calls (Withings answers 503 on GET) and a manually filled Bearer credential.
