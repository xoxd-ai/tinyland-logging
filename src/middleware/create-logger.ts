








import { getConfig } from './config.js';
import type { Logger, LogContext } from './types.js';








export const createLogger = (component: string): Logger => {
	const { logger } = getConfig();
	return {
		debug: (message: string, context?: LogContext) =>
			logger.debug(message, { component, ...context }),
		info: (message: string, context?: LogContext) =>
			logger.info(message, { component, ...context }),
		warn: (message: string, context?: LogContext) =>
			logger.warn(message, { component, ...context }),
		error: (message: string, context?: LogContext) =>
			logger.error(message, { component, ...context }),
	};
};







export const createScopedLogger = createLogger;
