









export type LogLevel = 'debug' | 'info' | 'warn' | 'error';


export interface LogContext {
	component?: string;
	[key: string]: unknown;
}


export interface Logger {
	debug(message: string, context?: LogContext): void;
	info(message: string, context?: LogContext): void;
	warn(message: string, context?: LogContext): void;
	error(message: string, context?: LogContext): void;
}





export interface LoggingMiddlewareConfig {
	logger: Logger;
}
