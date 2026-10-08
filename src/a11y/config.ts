

























export interface A11yLoggerConfig {
	
	lokiUrl?: string;
	
	lokiEnabled?: boolean;
	
	isDevelopment?: boolean;
	
	flushInterval?: number;
	
	maxBufferSize?: number;
	
	jobLabel?: string;
	
	containerLabel?: string;
	
	environment?: string;
	
	serviceLabel?: string;
	
	registerShutdownHook?: boolean;
}


const DEFAULTS: Required<A11yLoggerConfig> = {
	lokiUrl: 'http://localhost:3100',
	lokiEnabled: false,
	isDevelopment: false,
	flushInterval: 1000,
	maxBufferSize: 100,
	jobLabel: 'accessibility',
	containerLabel: 'stonewall-sveltekit',
	environment: 'development',
	serviceLabel: 'a11y-monitoring',
	registerShutdownHook: true,
};

let config: A11yLoggerConfig = {};









export function configureA11yLogger(c: A11yLoggerConfig): void {
	config = { ...config, ...c };
}






export function getA11yLoggerConfig(): Required<A11yLoggerConfig> {
	return {
		lokiUrl: config.lokiUrl ?? DEFAULTS.lokiUrl,
		lokiEnabled: config.lokiEnabled ?? DEFAULTS.lokiEnabled,
		isDevelopment: config.isDevelopment ?? DEFAULTS.isDevelopment,
		flushInterval: config.flushInterval ?? DEFAULTS.flushInterval,
		maxBufferSize: config.maxBufferSize ?? DEFAULTS.maxBufferSize,
		jobLabel: config.jobLabel ?? DEFAULTS.jobLabel,
		containerLabel: config.containerLabel ?? DEFAULTS.containerLabel,
		environment: config.environment ?? DEFAULTS.environment,
		serviceLabel: config.serviceLabel ?? DEFAULTS.serviceLabel,
		registerShutdownHook: config.registerShutdownHook ?? DEFAULTS.registerShutdownHook,
	};
}





export function resetA11yLoggerConfig(): void {
	config = {};
}
