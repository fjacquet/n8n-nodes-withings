# n8n-nodes-withings

This is an n8n community node for integrating with the [Withings](https://www.withings.com/) API. It provides nodes to access health and fitness data from your Withings account.

## Features

- Complete integration with Withings API resources:
  - Activity data (getactivity, getsummary, getworkouts)
  - Measurements (getmeas, getactivity, getintradayactivity)
  - Sleep data (get, getsummary)
  - User information (getdevice, getgoals, get)
- Customizable parameters for all API operations
- Proper error handling and response formatting
- Automatic token refresh

## Prerequisites

- [n8n](https://n8n.io/) (version 1.0.0 or later)
- Withings developer account and API credentials
- **[n8n-nodes-withings-oauth2-credential](https://github.com/schimmmi/n8n-nodes-withings-oauth2-credential)** package (required for OAuth2 authentication)

## Installation

**IMPORTANT:** This package requires the separate credential package to handle Withings' non-standard OAuth2 implementation.

Install both packages:

```bash
# 1. Install the OAuth2 credential package first
npm install n8n-nodes-withings-oauth2-credential

# 2. Then install this node package
npm install n8n-nodes-withings
```

For Docker-based n8n installations:

```bash
# Add both packages to your docker-compose.yml or Dockerfile
npm install n8n-nodes-withings-oauth2-credential n8n-nodes-withings
```

Or use the [n8n-docker-custom](https://github.com/n8n-io/n8n-docker-custom) approach.

## Configuration

1. Create a developer account at [Withings Developer](https://developer.withings.com/)
2. Register a new application to get your Client ID and Client Secret
3. Set the callback URL to: `https://your-n8n-domain.com/rest/oauth2-credential/callback`
4. In n8n, create a new credential of type "Withings OAuth2 API" (provided by the credential package)
5. Enter your Client ID and Client Secret
6. Configure the scopes as needed (default: user.info,user.metrics,user.activity,user.sleepevents)
7. Click "Connect my account" and complete the OAuth2 flow

### Why Two Packages?

Withings uses a non-standard OAuth2 implementation that requires an additional `action=requesttoken` parameter in the token request body. N8n's standard OAuth2 doesn't support modifying the token request body, so we need a separate credential package that uses `genericOAuth2Api` with a custom `authenticate()` method to inject this parameter.

## Usage

Once installed and configured, you can use the Withings API node in your workflows:

1. Add a "Withings API" node to your workflow
2. Select your Withings OAuth2 credential
3. Choose the resource (Activity, Measure, Sleep, or User)
4. Choose the operation (e.g., "Get" for sleep data)
5. Configure any additional parameters (date ranges, data fields, etc.)

## Example Workflows

### Get Sleep Data

```
Manual Trigger → Withings API (Sleep / Get) → Process Data
```

Configure the node:
- Resource: Sleep
- Operation: Get
- Additional Fields:
  - Start Date: 2025-01-01
  - End Date: 2025-01-31
  - Data Fields: hr, rr, snoring

### Get Daily Activity Summary

```
Schedule Trigger → Withings API (Activity / Get Summary) → Store in Database
```

## API Resources

### Activity
- **Get Activity**: Retrieve user activity data
- **Get Summary**: Get activity summary
- **Get Workouts**: Fetch workout data

### Measure
- **Get Measurements**: Get measurement data (weight, height, blood pressure, etc.)
- **Get Activity**: Get user intraday activity
- **Get Intradayactivity**: Get detailed intraday activity

### Sleep
- **Get**: Get sleep data (with optional HR, RR, snoring data)
- **Get Summary**: Get sleep summary

### User
- **Get Device**: Get user devices
- **Get Goals**: Get user goals
- **Get**: Get user information

## Troubleshooting

### "Unable to sign without access token" Error

This usually means the OAuth2 flow didn't complete successfully. Try:
1. Make sure you installed **both** packages (credential + node)
2. Delete and recreate your Withings OAuth2 credential
3. Click "Connect my account" again
4. Check the n8n logs for detailed error messages

### Token Expired

Tokens automatically refresh. If you see token errors:
1. Reconnect your account in the credentials settings
2. Check that your Withings app credentials are still valid

## Development

```bash
# Clone the repository
git clone https://github.com/schimmmi/n8n-nodes-withings.git

# Install dependencies
npm install

# Build
npm run build

# Watch mode for development
npm run dev
```

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

### Latest: v1.0.0
- **BREAKING CHANGE**: Removed built-in OAuth2 credentials
- Now requires separate `n8n-nodes-withings-oauth2-credential` package
- Cleaner separation of concerns between node logic and OAuth2 authentication
- Simplified maintenance and updates

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE)

## Links

- [Withings Developer Documentation](https://developer.withings.com/)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
- [OAuth2 Credential Package](https://github.com/schimmmi/n8n-nodes-withings-oauth2-credential)

## Support

For issues, questions, or feature requests, please open an issue on GitHub.
