











import { getConfig } from './config.js';
import type { LogContext } from './types.js';











export const loggingMiddleware = async (opts: {
	ctx: Record<string, unknown>;
	path?: string;
	type?: string;
	next: () => Promise<unknown>;
}): Promise<unknown> => {
	const { ctx, next } = opts;
	const { logger } = getConfig();
	const startTime = Date.now();

	const session = ctx.session as
		| { id?: string | null; userId?: string | null }
		| null
		| undefined;

	const client = ctx.client as
		| {
				ipHash?: string;
				deviceType?: string;
				browser?: { name?: string } | null;
		  }
		| null
		| undefined;

	
	const startContext: LogContext = {
		component: 'trpc-middleware',
		procedure: opts.path || 'unknown',
		procedureType: opts.type || 'unknown',
	};

	if (session?.id !== undefined && session.id !== null) {
		startContext.sessionId = session.id;
	}
	if (session?.userId !== undefined && session.userId !== null) {
		startContext.userId = session.userId;
	}
	if (client?.ipHash !== undefined) {
		startContext.clientIpHash = client.ipHash;
	}
	if (client?.deviceType !== undefined) {
		startContext.deviceType = client.deviceType;
	}
	if (client?.browser?.name !== undefined) {
		startContext.browser = client.browser.name;
	}

	logger.info('tRPC procedure called', startContext);

	try {
		const result = await next();

		const duration = Date.now() - startTime;
		logger.info('tRPC procedure completed', {
			component: 'trpc-middleware',
			procedure: opts.path || 'unknown',
			procedureType: opts.type || 'unknown',
			duration: `${duration}ms`,
			success: true,
		} as LogContext);

		return result;
	} catch (error: unknown) {
		const duration = Date.now() - startTime;
		logger.error('tRPC procedure failed', {
			component: 'trpc-middleware',
			procedure: opts.path || 'unknown',
			procedureType: opts.type || 'unknown',
			duration: `${duration}ms`,
			success: false,
			error: error instanceof Error ? error.message : String(error),
			errorType: error instanceof Error ? error.constructor.name : typeof error,
		} as LogContext);

		throw error;
	}
};
