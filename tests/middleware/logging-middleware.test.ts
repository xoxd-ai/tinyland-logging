
















import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	configure,
	getConfig,
	resetConfig,
	getNoopLogger,
	loggingMiddleware,
	createLogger,
	createScopedLogger,
} from '../../src/middleware/index.js';
import type { Logger, LogContext, LogLevel, LoggingMiddlewareConfig } from '../../src/middleware/index.js';





function makeMockLogger(): Logger & {
	debug: ReturnType<typeof vi.fn>;
	info: ReturnType<typeof vi.fn>;
	warn: ReturnType<typeof vi.fn>;
	error: ReturnType<typeof vi.fn>;
} {
	return {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	};
}

function makeOpts(overrides: Record<string, unknown> = {}) {
	return {
		ctx: {
			session: { id: 'sess-1', userId: 'user-1' },
			client: {
				ipHash: 'abc123',
				deviceType: 'desktop',
				browser: { name: 'Chrome' },
			},
		},
		path: 'test.hello',
		type: 'query',
		next: vi.fn().mockResolvedValue({ ok: true }),
		...overrides,
	};
}





beforeEach(() => {
	resetConfig();
});

afterEach(() => {
	vi.restoreAllMocks();
	resetConfig();
});





describe('configure / getConfig / resetConfig', () => {
	it('should return noop logger by default', () => {
		const cfg = getConfig();
		expect(cfg.logger).toBeDefined();
		
		cfg.logger.debug('test');
		cfg.logger.info('test');
		cfg.logger.warn('test');
		cfg.logger.error('test');
	});

	it('should store the provided logger via configure()', () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		expect(getConfig().logger).toBe(mock);
	});

	it('should reset to noop logger via resetConfig()', () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		resetConfig();
		expect(getConfig().logger).not.toBe(mock);
	});

	it('should return the noop logger instance via getNoopLogger()', () => {
		const noop = getNoopLogger();
		expect(noop.debug).toBeTypeOf('function');
		expect(noop.info).toBeTypeOf('function');
		expect(noop.warn).toBeTypeOf('function');
		expect(noop.error).toBeTypeOf('function');
	});

	it('should allow reconfiguration with a different logger', () => {
		const first = makeMockLogger();
		const second = makeMockLogger();
		configure({ logger: first });
		configure({ logger: second });
		expect(getConfig().logger).toBe(second);
	});
});





describe('loggingMiddleware — basic logging', () => {
	it('should call logger.info on procedure start', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts();
		await loggingMiddleware(opts);
		expect(mock.info).toHaveBeenCalledWith(
			'tRPC procedure called',
			expect.objectContaining({ procedure: 'test.hello' }),
		);
	});

	it('should log the procedure type on start', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({ type: 'mutation' });
		await loggingMiddleware(opts);
		expect(mock.info).toHaveBeenCalledWith(
			'tRPC procedure called',
			expect.objectContaining({ procedureType: 'mutation' }),
		);
	});

	it('should log the component as trpc-middleware', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		expect(mock.info).toHaveBeenCalledWith(
			'tRPC procedure called',
			expect.objectContaining({ component: 'trpc-middleware' }),
		);
	});

	it('should call logger.info on successful completion', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		expect(mock.info).toHaveBeenCalledWith(
			'tRPC procedure completed',
			expect.objectContaining({ success: true }),
		);
	});

	it('should return the result from next() on success', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts();
		opts.next.mockResolvedValue({ data: 42 });
		const result = await loggingMiddleware(opts);
		expect(result).toEqual({ data: 42 });
	});

	it('should call logger.error on procedure failure', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts();
		opts.next.mockRejectedValue(new Error('boom'));
		await expect(loggingMiddleware(opts)).rejects.toThrow('boom');
		expect(mock.error).toHaveBeenCalledWith(
			'tRPC procedure failed',
			expect.objectContaining({ success: false }),
		);
	});

	it('should include duration string in success log', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		const completionCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure completed',
		);
		expect(completionCall).toBeDefined();
		expect((completionCall![1] as LogContext).duration).toMatch(/^\d+ms$/);
	});

	it('should include duration string in error log', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts();
		opts.next.mockRejectedValue(new Error('fail'));
		await expect(loggingMiddleware(opts)).rejects.toThrow();
		const errorCall = mock.error.mock.calls[0];
		expect((errorCall[1] as LogContext).duration).toMatch(/^\d+ms$/);
	});

	it('should log procedure path in both start and completion', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		for (const call of mock.info.mock.calls) {
			expect((call[1] as LogContext).procedure).toBe('test.hello');
		}
	});

	it('should log procedureType in both start and completion', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		for (const call of mock.info.mock.calls) {
			expect((call[1] as LogContext).procedureType).toBe('query');
		}
	});

	it('should produce exactly two info calls on success', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		expect(mock.info).toHaveBeenCalledTimes(2);
	});

	it('should produce one info and one error call on failure', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts();
		opts.next.mockRejectedValue(new Error('x'));
		await expect(loggingMiddleware(opts)).rejects.toThrow();
		expect(mock.info).toHaveBeenCalledTimes(1);
		expect(mock.error).toHaveBeenCalledTimes(1);
	});

	it('should log success: true in the completion entry', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		const completionCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure completed',
		);
		expect((completionCall![1] as LogContext).success).toBe(true);
	});

	it('should log success: false in the error entry', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts();
		opts.next.mockRejectedValue(new Error('nope'));
		await expect(loggingMiddleware(opts)).rejects.toThrow();
		expect((mock.error.mock.calls[0][1] as LogContext).success).toBe(false);
	});

	it('should log component trpc-middleware in the completion entry', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		const completionCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure completed',
		);
		expect((completionCall![1] as LogContext).component).toBe('trpc-middleware');
	});
});





describe('loggingMiddleware — session context', () => {
	it('should include sessionId when present', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		expect(mock.info).toHaveBeenCalledWith(
			'tRPC procedure called',
			expect.objectContaining({ sessionId: 'sess-1' }),
		);
	});

	it('should include userId when present', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		expect(mock.info).toHaveBeenCalledWith(
			'tRPC procedure called',
			expect.objectContaining({ userId: 'user-1' }),
		);
	});

	it('should exclude sessionId when session.id is null', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({
			ctx: { session: { id: null, userId: null }, client: {} },
		});
		await loggingMiddleware(opts);
		const startCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure called',
		);
		expect(startCall![1]).not.toHaveProperty('sessionId');
	});

	it('should exclude userId when session.userId is null', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({
			ctx: { session: { id: null, userId: null }, client: {} },
		});
		await loggingMiddleware(opts);
		const startCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure called',
		);
		expect(startCall![1]).not.toHaveProperty('userId');
	});

	it('should handle missing session gracefully', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({ ctx: {} });
		await loggingMiddleware(opts);
		const startCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure called',
		);
		expect(startCall![1]).not.toHaveProperty('sessionId');
		expect(startCall![1]).not.toHaveProperty('userId');
	});

	it('should handle session with only id set', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({
			ctx: { session: { id: 'only-id', userId: null }, client: {} },
		});
		await loggingMiddleware(opts);
		expect(mock.info).toHaveBeenCalledWith(
			'tRPC procedure called',
			expect.objectContaining({ sessionId: 'only-id' }),
		);
	});

	it('should handle session with only userId set', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({
			ctx: { session: { id: null, userId: 'only-user' }, client: {} },
		});
		await loggingMiddleware(opts);
		expect(mock.info).toHaveBeenCalledWith(
			'tRPC procedure called',
			expect.objectContaining({ userId: 'only-user' }),
		);
	});

	it('should not include session fields in the completion log', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		const completionCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure completed',
		);
		expect(completionCall![1]).not.toHaveProperty('sessionId');
		expect(completionCall![1]).not.toHaveProperty('userId');
	});
});





describe('loggingMiddleware — client context', () => {
	it('should include clientIpHash when present', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		expect(mock.info).toHaveBeenCalledWith(
			'tRPC procedure called',
			expect.objectContaining({ clientIpHash: 'abc123' }),
		);
	});

	it('should include deviceType when present', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		expect(mock.info).toHaveBeenCalledWith(
			'tRPC procedure called',
			expect.objectContaining({ deviceType: 'desktop' }),
		);
	});

	it('should include browser name when present', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		expect(mock.info).toHaveBeenCalledWith(
			'tRPC procedure called',
			expect.objectContaining({ browser: 'Chrome' }),
		);
	});

	it('should handle missing client context gracefully', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({ ctx: { session: null } });
		await loggingMiddleware(opts);
		const startCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure called',
		);
		expect(startCall![1]).not.toHaveProperty('clientIpHash');
		expect(startCall![1]).not.toHaveProperty('deviceType');
		expect(startCall![1]).not.toHaveProperty('browser');
	});

	it('should handle client with null browser', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({
			ctx: {
				session: null,
				client: { ipHash: 'hash', deviceType: 'mobile', browser: null },
			},
		});
		await loggingMiddleware(opts);
		const startCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure called',
		);
		expect(startCall![1]).not.toHaveProperty('browser');
		expect((startCall![1] as LogContext).clientIpHash).toBe('hash');
	});

	it('should handle client with empty browser object', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({
			ctx: {
				session: null,
				client: { ipHash: 'hash', deviceType: 'tablet', browser: {} },
			},
		});
		await loggingMiddleware(opts);
		const startCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure called',
		);
		expect(startCall![1]).not.toHaveProperty('browser');
	});

	it('should not include client fields in the completion log', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		const completionCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure completed',
		);
		expect(completionCall![1]).not.toHaveProperty('clientIpHash');
		expect(completionCall![1]).not.toHaveProperty('deviceType');
		expect(completionCall![1]).not.toHaveProperty('browser');
	});

	it('should log mobile deviceType correctly', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({
			ctx: {
				session: null,
				client: {
					ipHash: 'xyz',
					deviceType: 'mobile',
					browser: { name: 'Safari' },
				},
			},
		});
		await loggingMiddleware(opts);
		expect(mock.info).toHaveBeenCalledWith(
			'tRPC procedure called',
			expect.objectContaining({ deviceType: 'mobile', browser: 'Safari' }),
		);
	});
});





describe('loggingMiddleware — error handling', () => {
	it('should re-throw the original Error after logging', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const err = new Error('original');
		const opts = makeOpts();
		opts.next.mockRejectedValue(err);
		await expect(loggingMiddleware(opts)).rejects.toBe(err);
	});

	it('should log the error message', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts();
		opts.next.mockRejectedValue(new Error('something broke'));
		await expect(loggingMiddleware(opts)).rejects.toThrow();
		expect(mock.error).toHaveBeenCalledWith(
			'tRPC procedure failed',
			expect.objectContaining({ error: 'something broke' }),
		);
	});

	it('should log the error type for Error instances', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts();
		opts.next.mockRejectedValue(new TypeError('type issue'));
		await expect(loggingMiddleware(opts)).rejects.toThrow();
		expect(mock.error).toHaveBeenCalledWith(
			'tRPC procedure failed',
			expect.objectContaining({ errorType: 'TypeError' }),
		);
	});

	it('should handle string errors', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts();
		opts.next.mockRejectedValue('string error');
		await expect(loggingMiddleware(opts)).rejects.toBe('string error');
		expect(mock.error).toHaveBeenCalledWith(
			'tRPC procedure failed',
			expect.objectContaining({
				error: 'string error',
				errorType: 'string',
			}),
		);
	});

	it('should handle number errors', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts();
		opts.next.mockRejectedValue(404);
		await expect(loggingMiddleware(opts)).rejects.toBe(404);
		expect(mock.error).toHaveBeenCalledWith(
			'tRPC procedure failed',
			expect.objectContaining({
				error: '404',
				errorType: 'number',
			}),
		);
	});

	it('should handle null errors', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts();
		opts.next.mockRejectedValue(null);
		await expect(loggingMiddleware(opts)).rejects.toBeNull();
		expect(mock.error).toHaveBeenCalledWith(
			'tRPC procedure failed',
			expect.objectContaining({
				error: 'null',
				errorType: 'object',
			}),
		);
	});

	it('should log before re-throwing', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts();
		opts.next.mockRejectedValue(new Error('check order'));
		try {
			await loggingMiddleware(opts);
		} catch {
			
		}
		
		expect(mock.error).toHaveBeenCalledTimes(1);
	});

	it('should include procedure path in error log context', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({ path: 'user.delete' });
		opts.next.mockRejectedValue(new Error('forbidden'));
		await expect(loggingMiddleware(opts)).rejects.toThrow();
		expect(mock.error).toHaveBeenCalledWith(
			'tRPC procedure failed',
			expect.objectContaining({ procedure: 'user.delete' }),
		);
	});
});





describe('createLogger', () => {
	it('should return an object with debug method', () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const log = createLogger('my-component');
		expect(log.debug).toBeTypeOf('function');
	});

	it('should return an object with info method', () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const log = createLogger('my-component');
		expect(log.info).toBeTypeOf('function');
	});

	it('should return an object with warn method', () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const log = createLogger('my-component');
		expect(log.warn).toBeTypeOf('function');
	});

	it('should return an object with error method', () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const log = createLogger('my-component');
		expect(log.error).toBeTypeOf('function');
	});

	it('should include component in debug context', () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const log = createLogger('auth');
		log.debug('test msg');
		expect(mock.debug).toHaveBeenCalledWith(
			'test msg',
			expect.objectContaining({ component: 'auth' }),
		);
	});

	it('should include component in info context', () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const log = createLogger('auth');
		log.info('test msg');
		expect(mock.info).toHaveBeenCalledWith(
			'test msg',
			expect.objectContaining({ component: 'auth' }),
		);
	});

	it('should include component in warn context', () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const log = createLogger('auth');
		log.warn('test msg');
		expect(mock.warn).toHaveBeenCalledWith(
			'test msg',
			expect.objectContaining({ component: 'auth' }),
		);
	});

	it('should include component in error context', () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const log = createLogger('auth');
		log.error('test msg');
		expect(mock.error).toHaveBeenCalledWith(
			'test msg',
			expect.objectContaining({ component: 'auth' }),
		);
	});

	it('should merge additional context with component', () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const log = createLogger('db');
		log.info('query executed', { table: 'users', rows: 5 });
		expect(mock.info).toHaveBeenCalledWith(
			'query executed',
			expect.objectContaining({ component: 'db', table: 'users', rows: 5 }),
		);
	});

	it('should work with empty string component', () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const log = createLogger('');
		log.info('msg');
		expect(mock.info).toHaveBeenCalledWith(
			'msg',
			expect.objectContaining({ component: '' }),
		);
	});
});





describe('createScopedLogger', () => {
	it('should be the same function as createLogger', () => {
		expect(createScopedLogger).toBe(createLogger);
	});

	it('should produce a logger with all four methods', () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const log = createScopedLogger('scoped');
		expect(log.debug).toBeTypeOf('function');
		expect(log.info).toBeTypeOf('function');
		expect(log.warn).toBeTypeOf('function');
		expect(log.error).toBeTypeOf('function');
	});

	it('should include component from createScopedLogger', () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const log = createScopedLogger('scoped-comp');
		log.info('hello');
		expect(mock.info).toHaveBeenCalledWith(
			'hello',
			expect.objectContaining({ component: 'scoped-comp' }),
		);
	});
});





describe('loggingMiddleware — duration measurement', () => {
	it('should include a duration field in the success log', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		const completionCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure completed',
		);
		expect(completionCall![1]).toHaveProperty('duration');
	});

	it('should include a duration field in the error log', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts();
		opts.next.mockRejectedValue(new Error('err'));
		await expect(loggingMiddleware(opts)).rejects.toThrow();
		expect((mock.error.mock.calls[0][1] as LogContext).duration).toBeDefined();
	});

	it('should format duration as "<number>ms"', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		const completionCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure completed',
		);
		expect(completionCall![1].duration).toMatch(/^\d+ms$/);
	});

	it('should record non-negative duration on success', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		await loggingMiddleware(makeOpts());
		const completionCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure completed',
		);
		const ms = parseInt((completionCall![1].duration as string).replace('ms', ''), 10);
		expect(ms).toBeGreaterThanOrEqual(0);
	});

	it('should record measurable duration for slow procedures', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });

		
		let callCount = 0;
		const originalDateNow = Date.now;
		vi.spyOn(Date, 'now').mockImplementation(() => {
			callCount++;
			
			return callCount === 1 ? 1000 : 1050;
		});

		await loggingMiddleware(makeOpts());

		const completionCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure completed',
		);
		expect(completionCall![1].duration).toBe('50ms');

		Date.now = originalDateNow;
	});
});





describe('loggingMiddleware — edge cases', () => {
	it('should default to "unknown" when path is undefined', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({ path: undefined });
		await loggingMiddleware(opts);
		expect(mock.info).toHaveBeenCalledWith(
			'tRPC procedure called',
			expect.objectContaining({ procedure: 'unknown' }),
		);
	});

	it('should default to "unknown" when type is undefined', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({ type: undefined });
		await loggingMiddleware(opts);
		expect(mock.info).toHaveBeenCalledWith(
			'tRPC procedure called',
			expect.objectContaining({ procedureType: 'unknown' }),
		);
	});

	it('should default to "unknown" when path is empty string', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({ path: '' });
		await loggingMiddleware(opts);
		expect(mock.info).toHaveBeenCalledWith(
			'tRPC procedure called',
			expect.objectContaining({ procedure: 'unknown' }),
		);
	});

	it('should default to "unknown" when type is empty string', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({ type: '' });
		await loggingMiddleware(opts);
		expect(mock.info).toHaveBeenCalledWith(
			'tRPC procedure called',
			expect.objectContaining({ procedureType: 'unknown' }),
		);
	});

	it('should handle completely empty ctx', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({ ctx: {} });
		await loggingMiddleware(opts);
		expect(mock.info).toHaveBeenCalledTimes(2);
	});

	it('should handle null session in ctx', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({ ctx: { session: null, client: null } });
		await loggingMiddleware(opts);
		const startCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure called',
		);
		expect(startCall![1]).not.toHaveProperty('sessionId');
		expect(startCall![1]).not.toHaveProperty('userId');
	});

	it('should work with noop logger (no configure call)', async () => {
		
		const opts = makeOpts();
		const result = await loggingMiddleware(opts);
		expect(result).toEqual({ ok: true });
	});

	it('should handle next() returning undefined', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts();
		opts.next.mockResolvedValue(undefined);
		const result = await loggingMiddleware(opts);
		expect(result).toBeUndefined();
	});

	it('should handle next() returning null', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts();
		opts.next.mockResolvedValue(null);
		const result = await loggingMiddleware(opts);
		expect(result).toBeNull();
	});

	it('should handle deeply nested procedure paths', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });
		const opts = makeOpts({ path: 'admin.users.permissions.update' });
		await loggingMiddleware(opts);
		expect(mock.info).toHaveBeenCalledWith(
			'tRPC procedure called',
			expect.objectContaining({ procedure: 'admin.users.permissions.update' }),
		);
	});
});





describe('re-exports and public API surface', () => {
	it('should export LogContext type (usable at runtime via type check)', () => {
		const ctx: LogContext = { component: 'test', extra: 42 };
		expect(ctx.component).toBe('test');
	});

	it('should export LogLevel type', () => {
		const level: LogLevel = 'debug';
		expect(level).toBe('debug');
	});

	it('should export LoggingMiddlewareConfig type', () => {
		const config: LoggingMiddlewareConfig = {
			logger: getNoopLogger(),
		};
		expect(config.logger).toBeDefined();
	});

	it('should export configure function', () => {
		expect(configure).toBeTypeOf('function');
	});

	it('should export getConfig function', () => {
		expect(getConfig).toBeTypeOf('function');
	});

	it('should export resetConfig function', () => {
		expect(resetConfig).toBeTypeOf('function');
	});

	it('should export loggingMiddleware function', () => {
		expect(loggingMiddleware).toBeTypeOf('function');
	});

	it('should export getNoopLogger function', () => {
		expect(getNoopLogger).toBeTypeOf('function');
	});
});





describe('loggingMiddleware — mocked Date.now durations', () => {
	it('should record exact duration on error path via mocked Date.now', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });

		let callCount = 0;
		vi.spyOn(Date, 'now').mockImplementation(() => {
			callCount++;
			return callCount === 1 ? 5000 : 5123;
		});

		const opts = makeOpts();
		opts.next.mockRejectedValue(new Error('timed'));
		await expect(loggingMiddleware(opts)).rejects.toThrow('timed');

		expect((mock.error.mock.calls[0][1] as LogContext).duration).toBe('123ms');
	});

	it('should record 0ms duration when Date.now returns same value', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });

		vi.spyOn(Date, 'now').mockReturnValue(9999);

		await loggingMiddleware(makeOpts());

		const completionCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure completed',
		);
		expect(completionCall![1].duration).toBe('0ms');
	});

	it('should record large duration correctly', async () => {
		const mock = makeMockLogger();
		configure({ logger: mock });

		let callCount = 0;
		vi.spyOn(Date, 'now').mockImplementation(() => {
			callCount++;
			return callCount === 1 ? 0 : 30000;
		});

		await loggingMiddleware(makeOpts());

		const completionCall = mock.info.mock.calls.find(
			(c: unknown[]) => c[0] === 'tRPC procedure completed',
		);
		expect(completionCall![1].duration).toBe('30000ms');
	});
});
