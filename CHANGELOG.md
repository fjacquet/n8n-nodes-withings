# Changelog

## Unreleased

### Changed

- README documents n8n 3.0: the node works unchanged (checked against the 3.0.1 release candidate), but n8n 3.0 disables unverified community packages by default, so `N8N_UNVERIFIED_PACKAGES_ENABLED=true` must be set on the n8n container.
- No change to the published node. TypeScript now compiles with `module: node20` instead of `commonjs` with `moduleResolution: bundler`, matching how n8n loads the package; the emitted JavaScript is unchanged. The stale `braces` waiver is removed from `osv-scanner.toml` (its advisory is fixed in 3.0.3, the version in use).

## 2.0.2

### Changed

- No change to the published node. Development dependencies bumped (`@n8n/node-cli` 0.53.4, `release-it` 21.1.1, `vitest` 5.0.5, `@biomejs/biome` 2.6.2, `typescript` 6.0.3) (#7, #10). The dev-only findings pinned upstream (`axios`, `zod` via `n8n-workflow`, `handlebars` via `@n8n/node-cli`, `basic-ftp`, `undici` via `release-it`, `braces`) are waived until 2026-12-31 in `osv-scanner.toml`. `moduleResolution` moved from the deprecated `node` to `bundler`.

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
