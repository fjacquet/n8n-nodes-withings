/**
 * Type definitions for Withings API integration
 */

import { IDataObject } from 'n8n-workflow';

/**
 * Withings API response structure
 */
export interface IWithingsResponse {
	status: number;
	body?: IDataObject;
	error?: string;
}

/**
 * Endpoint configuration
 */
export interface IEndpointConfig {
	url: string;
	action: string;
	waitTime?: number;
	description?: string;
}

/**
 * Token refresh result
 */
export interface ITokenRefreshResult {
	success: boolean;
	error?: Error;
}

/**
 * Validation attempt result
 */
export interface IValidationAttemptResult {
	success: boolean;
	endpoint: string;
	error?: Error;
}

/**
 * Retry context for tracking retry state
 */
export interface IRetryContext {
	retries: number;
	maxRetries: number;
	tokenRefreshed: boolean;
	lastError?: Error;
}

/**
 * Formatted API response for n8n
 */
export interface IFormattedResponse extends IDataObject {
	success: boolean;
	resource: string;
	operation: string;
	error?: string;
	status?: number;
	errorCode?: string;
}
