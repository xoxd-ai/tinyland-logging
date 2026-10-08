// Merged from @tummycrypt/tinyland-a11y-logger 0.2.2 (xoxd-ai/tinyland-a11y-logger a151b67), now @tummycrypt/tinyland-logging/a11y.




































export {
	configureA11yLogger,
	getA11yLoggerConfig,
	resetA11yLoggerConfig,
} from './config.js';

export type { A11yLoggerConfig } from './config.js';


export {
	a11yLogger,
	_getLogBuffer,
	_resetInternalState,
	_hasFlushTimer,
} from './a11y-logger.js';


export type {
	A11yLogEntry,
	A11yLoggerApi,
	ContrastLabels,
	WcagLabels,
	EvaluationLabels,
	SessionLabels,
	ErrorLabels,
	SummaryData,
	AriaLabels,
} from './types.js';
