import { defineConfig } from 'vitest/config';

export default defineConfig({
	// Hides Vite's noise about n8n-workflow's dist sourcemaps pointing to missing sources.
	logLevel: 'error',
	test: {
		include: ['tests/**/*.test.ts'],
		environment: 'node',
	},
});
