









import type { Logger, LoggingMiddlewareConfig } from './types.js';


const noopLogger: Logger = {
	debug: () => {},
	info: () => {},
	warn: () => {},
	error: () => {},
};

let currentConfig: LoggingMiddlewareConfig = {
	logger: noopLogger,
};






export function configure(config: LoggingMiddlewareConfig): void {
	currentConfig = { ...config };
}






export function getConfig(): LoggingMiddlewareConfig {
	return currentConfig;
}





export function resetConfig(): void {
	currentConfig = { logger: noopLogger };
}





export function getNoopLogger(): Logger {
	return noopLogger;
}
