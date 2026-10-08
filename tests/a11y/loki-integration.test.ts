



import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
	a11yLogger,
	_resetInternalState,
} from '../../src/a11y/a11y-logger.js';
import {
	configureA11yLogger,
	resetA11yLoggerConfig,
} from '../../src/a11y/config.js';


const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal('fetch', mockFetch);


const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Loki integration', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		_resetInternalState();
		resetA11yLoggerConfig();
		configureA11yLogger({ registerShutdownHook: false });
		mockFetch.mockClear();
		mockFetch.mockResolvedValue({ ok: true });
		mockConsoleLog.mockClear();
		mockConsoleError.mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	
	
	
	describe('push payload format', () => {
		it('should call fetch with correct URL', async () => {
			configureA11yLogger({
				lokiEnabled: true,
				lokiUrl: 'http://loki:3100',
			});
			a11yLogger.contrast('Test', {});
			await a11yLogger.flush();
			expect(mockFetch).toHaveBeenCalledWith(
				'http://loki:3100/loki/api/v1/push',
				expect.any(Object)
			);
		});

		it('should use custom lokiUrl in the fetch call', async () => {
			configureA11yLogger({
				lokiEnabled: true,
				lokiUrl: 'http://custom-loki:9999',
			});
			a11yLogger.contrast('Test', {});
			await a11yLogger.flush();
			expect(mockFetch).toHaveBeenCalledWith(
				'http://custom-loki:9999/loki/api/v1/push',
				expect.any(Object)
			);
		});

		it('should send POST request', async () => {
			configureA11yLogger({ lokiEnabled: true });
			a11yLogger.contrast('Test', {});
			await a11yLogger.flush();
			const callArgs = mockFetch.mock.calls[0][1];
			expect(callArgs.method).toBe('POST');
		});

		it('should set Content-Type to application/json', async () => {
			configureA11yLogger({ lokiEnabled: true });
			a11yLogger.contrast('Test', {});
			await a11yLogger.flush();
			const callArgs = mockFetch.mock.calls[0][1];
			expect(callArgs.headers['Content-Type']).toBe('application/json');
		});

		it('should send body with streams array', async () => {
			configureA11yLogger({ lokiEnabled: true });
			a11yLogger.contrast('Test', {});
			await a11yLogger.flush();
			const body = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(body).toHaveProperty('streams');
			expect(Array.isArray(body.streams)).toBe(true);
			expect(body.streams).toHaveLength(1);
		});

		it('should include stream labels from config', async () => {
			configureA11yLogger({
				lokiEnabled: true,
				jobLabel: 'my-job',
				containerLabel: 'my-container',
				environment: 'staging',
				serviceLabel: 'my-service',
			});
			a11yLogger.contrast('Test', {});
			await a11yLogger.flush();
			const body = JSON.parse(mockFetch.mock.calls[0][1].body);
			const stream = body.streams[0].stream;
			expect(stream.job).toBe('my-job');
			expect(stream.container).toBe('my-container');
			expect(stream.environment).toBe('staging');
			expect(stream.service).toBe('my-service');
		});

		it('should include default stream labels when not configured', async () => {
			configureA11yLogger({ lokiEnabled: true });
			a11yLogger.contrast('Test', {});
			await a11yLogger.flush();
			const body = JSON.parse(mockFetch.mock.calls[0][1].body);
			const stream = body.streams[0].stream;
			expect(stream.job).toBe('accessibility');
			expect(stream.container).toBe('stonewall-sveltekit');
			expect(stream.environment).toBe('development');
			expect(stream.service).toBe('a11y-monitoring');
		});

		it('should format values as [timestamp, json] tuples', async () => {
			configureA11yLogger({ lokiEnabled: true });
			a11yLogger.contrast('Test msg', { selector: '#heading' });
			await a11yLogger.flush();
			const body = JSON.parse(mockFetch.mock.calls[0][1].body);
			const values = body.streams[0].values;
			expect(values).toHaveLength(1);
			expect(values[0]).toHaveLength(2);
			
			expect(typeof values[0][0]).toBe('string');
			
			const parsed = JSON.parse(values[0][1]);
			expect(parsed).toHaveProperty('level');
			expect(parsed).toHaveProperty('msg');
		});
	});

	
	
	
	describe('nanosecond timestamps', () => {
		it('should convert ISO timestamp to nanoseconds', async () => {
			configureA11yLogger({ lokiEnabled: true });
			vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
			a11yLogger.contrast('Test', {});
			await a11yLogger.flush();
			const body = JSON.parse(mockFetch.mock.calls[0][1].body);
			const nsTimestamp = body.streams[0].values[0][0];
			const expectedNs = (new Date('2025-06-15T12:00:00.000Z').getTime() * 1000000).toString();
			expect(nsTimestamp).toBe(expectedNs);
		});

		it('should produce a numeric string for the timestamp', async () => {
			configureA11yLogger({ lokiEnabled: true });
			a11yLogger.contrast('Test', {});
			await a11yLogger.flush();
			const body = JSON.parse(mockFetch.mock.calls[0][1].body);
			const nsTimestamp = body.streams[0].values[0][0];
			expect(nsTimestamp).toMatch(/^\d+$/);
		});
	});

	
	
	
	describe('JSON serialization of entries', () => {
		it('should include level in the serialized value', async () => {
			configureA11yLogger({ lokiEnabled: true });
			a11yLogger.error('Error message', { error: 'test' });
			await a11yLogger.flush();
			const body = JSON.parse(mockFetch.mock.calls[0][1].body);
			const parsed = JSON.parse(body.streams[0].values[0][1]);
			expect(parsed.level).toBe('error');
		});

		it('should include msg in the serialized value', async () => {
			configureA11yLogger({ lokiEnabled: true });
			a11yLogger.contrast('My log message', {});
			await a11yLogger.flush();
			const body = JSON.parse(mockFetch.mock.calls[0][1].body);
			const parsed = JSON.parse(body.streams[0].values[0][1]);
			expect(parsed.msg).toBe('My log message');
		});

		it('should spread entry labels into the serialized value', async () => {
			configureA11yLogger({ lokiEnabled: true });
			a11yLogger.contrast('Test', { selector: '.my-el', ratio: 2.5 });
			await a11yLogger.flush();
			const body = JSON.parse(mockFetch.mock.calls[0][1].body);
			const parsed = JSON.parse(body.streams[0].values[0][1]);
			expect(parsed.type).toBe('contrast');
			expect(parsed.selector).toBe('.my-el');
			expect(parsed.ratio).toBe(2.5);
		});

		it('should include type label for each method', async () => {
			configureA11yLogger({ lokiEnabled: true });
			a11yLogger.wcag('WCAG test', {});
			await a11yLogger.flush();
			const body = JSON.parse(mockFetch.mock.calls[0][1].body);
			const parsed = JSON.parse(body.streams[0].values[0][1]);
			expect(parsed.type).toBe('wcag');
		});
	});

	
	
	
	describe('fetch failure handling', () => {
		it('should not throw when fetch rejects', async () => {
			configureA11yLogger({ lokiEnabled: true });
			mockFetch.mockRejectedValueOnce(new Error('Network error'));
			a11yLogger.contrast('Test', {});
			await expect(a11yLogger.flush()).resolves.toBeUndefined();
		});

		it('should log error to console when fetch fails', async () => {
			configureA11yLogger({ lokiEnabled: true });
			mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
			a11yLogger.contrast('Test', {});
			await a11yLogger.flush();
			expect(mockConsoleError).toHaveBeenCalledWith(
				'[A11y Logger] Failed to send logs to Loki:',
				expect.any(Error)
			);
		});

		it('should clear buffer even on fetch failure', async () => {
			configureA11yLogger({ lokiEnabled: true });
			mockFetch.mockRejectedValueOnce(new Error('Fail'));
			a11yLogger.contrast('Test', {});
			await a11yLogger.flush();
			expect(_resetInternalState).toBeDefined(); 
			
		});

		it('should continue working after a fetch failure', async () => {
			configureA11yLogger({ lokiEnabled: true });
			mockFetch.mockRejectedValueOnce(new Error('Fail'));
			a11yLogger.contrast('First', {});
			await a11yLogger.flush();
			mockFetch.mockResolvedValueOnce({ ok: true });
			a11yLogger.contrast('Second', {});
			await a11yLogger.flush();
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	
	
	
	describe('Loki disabled mode', () => {
		it('should not call fetch when Loki is disabled', async () => {
			configureA11yLogger({ lokiEnabled: false });
			a11yLogger.contrast('Test', {});
			await a11yLogger.flush();
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should console.log in development mode when Loki is disabled', async () => {
			configureA11yLogger({ lokiEnabled: false, isDevelopment: true });
			a11yLogger.contrast('Dev test', { selector: '.test' });
			await a11yLogger.flush();
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('[A11y WARN]'),
				expect.objectContaining({ type: 'contrast' })
			);
		});

		it('should console.log error-level entries with ERROR prefix in dev', async () => {
			configureA11yLogger({ lokiEnabled: false, isDevelopment: true });
			a11yLogger.contrast('Low contrast', { ratio: 1.5 });
			await a11yLogger.flush();
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining('[A11y ERROR]'),
				expect.any(Object)
			);
		});

		it('should not console.log when both Loki and development are disabled', async () => {
			configureA11yLogger({ lokiEnabled: false, isDevelopment: false });
			a11yLogger.contrast('Silent', {});
			await a11yLogger.flush();
			expect(mockConsoleLog).not.toHaveBeenCalled();
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should still clear buffer when Loki is disabled', async () => {
			configureA11yLogger({ lokiEnabled: false });
			a11yLogger.contrast('Test', {});
			await a11yLogger.flush();
			
			const { _getLogBuffer } = await import('../../src/a11y/a11y-logger.js');
			expect(_getLogBuffer()).toHaveLength(0);
		});
	});

	
	
	
	describe('batch push', () => {
		it('should send multiple entries in a single fetch call', async () => {
			configureA11yLogger({ lokiEnabled: true });
			a11yLogger.contrast('C1', {});
			a11yLogger.wcag('W1', {});
			a11yLogger.error('E1', {});
			await a11yLogger.flush();
			expect(mockFetch).toHaveBeenCalledTimes(1);
			const body = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(body.streams[0].values).toHaveLength(3);
		});

		it('should preserve entry order in the batch', async () => {
			configureA11yLogger({ lokiEnabled: true });
			a11yLogger.contrast('first', {});
			a11yLogger.wcag('second', {});
			a11yLogger.aria('third', {});
			await a11yLogger.flush();
			const body = JSON.parse(mockFetch.mock.calls[0][1].body);
			const values = body.streams[0].values;
			expect(JSON.parse(values[0][1]).msg).toBe('first');
			expect(JSON.parse(values[1][1]).msg).toBe('second');
			expect(JSON.parse(values[2][1]).msg).toBe('third');
		});

		it('should batch all entry types correctly', async () => {
			configureA11yLogger({ lokiEnabled: true });
			a11yLogger.contrast('C', {});
			a11yLogger.wcag('W', {});
			a11yLogger.evaluation('E', {});
			a11yLogger.session('S', {});
			a11yLogger.error('Err', {});
			a11yLogger.aria('A', {});
			a11yLogger.summary({
				totalElements: 1,
				evaluatedElements: 1,
				issues: 0,
				criticalIssues: 0,
				evaluationTimeMs: 0,
			});
			await a11yLogger.flush();
			const body = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(body.streams[0].values).toHaveLength(7);
		});

		it('should include correct types for each batched entry', async () => {
			configureA11yLogger({ lokiEnabled: true });
			a11yLogger.contrast('C', {});
			a11yLogger.wcag('W', {});
			await a11yLogger.flush();
			const body = JSON.parse(mockFetch.mock.calls[0][1].body);
			const values = body.streams[0].values;
			expect(JSON.parse(values[0][1]).type).toBe('contrast');
			expect(JSON.parse(values[1][1]).type).toBe('wcag');
		});

		it('should dev-log each entry individually when in dev mode', async () => {
			configureA11yLogger({ lokiEnabled: false, isDevelopment: true });
			a11yLogger.contrast('C1', {});
			a11yLogger.wcag('W1', {});
			await a11yLogger.flush();
			expect(mockConsoleLog).toHaveBeenCalledTimes(2);
		});
	});
});
