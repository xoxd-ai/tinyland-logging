



import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
	a11yLogger,
	_getLogBuffer,
	_resetInternalState,
	_hasFlushTimer,
} from '../../src/a11y/a11y-logger.js';
import {
	configureA11yLogger,
	resetA11yLoggerConfig,
} from '../../src/a11y/config.js';


const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal('fetch', mockFetch);

describe('Buffer behavior', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		_resetInternalState();
		resetA11yLoggerConfig();
		configureA11yLogger({ registerShutdownHook: false });
		mockFetch.mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	
	
	
	describe('accumulation', () => {
		it('should start with an empty buffer', () => {
			expect(_getLogBuffer()).toHaveLength(0);
		});

		it('should accumulate a single entry', () => {
			a11yLogger.contrast('C1', {});
			expect(_getLogBuffer()).toHaveLength(1);
		});

		it('should accumulate multiple entries', () => {
			for (let i = 0; i < 10; i++) {
				a11yLogger.contrast(`C${i}`, {});
			}
			expect(_getLogBuffer()).toHaveLength(10);
		});

		it('should accumulate up to maxBufferSize - 1 without immediate flush', () => {
			configureA11yLogger({ maxBufferSize: 5 });
			for (let i = 0; i < 4; i++) {
				a11yLogger.contrast(`C${i}`, {});
			}
			expect(_getLogBuffer()).toHaveLength(4);
		});

		it('should keep entries in order', () => {
			a11yLogger.contrast('first', {});
			a11yLogger.wcag('second', {});
			a11yLogger.error('third', {});
			const buf = _getLogBuffer();
			expect(buf[0].message).toBe('first');
			expect(buf[1].message).toBe('second');
			expect(buf[2].message).toBe('third');
		});
	});

	
	
	
	describe('auto-flush at maxBufferSize', () => {
		it('should trigger flush when buffer reaches maxBufferSize (default 100)', () => {
			for (let i = 0; i < 100; i++) {
				a11yLogger.contrast(`C${i}`, {});
			}
			
			
			
			expect(_getLogBuffer()).toHaveLength(0);
		});

		it('should trigger flush with custom maxBufferSize', () => {
			configureA11yLogger({ maxBufferSize: 3 });
			a11yLogger.contrast('C1', {});
			a11yLogger.contrast('C2', {});
			expect(_getLogBuffer()).toHaveLength(2);
			a11yLogger.contrast('C3', {}); 
			expect(_getLogBuffer()).toHaveLength(0);
		});

		it('should trigger flush with maxBufferSize of 1', () => {
			configureA11yLogger({ maxBufferSize: 1 });
			a11yLogger.contrast('C1', {});
			expect(_getLogBuffer()).toHaveLength(0);
		});

		it('should clear the flush timer on immediate flush', () => {
			configureA11yLogger({ maxBufferSize: 3 });
			a11yLogger.contrast('C1', {});
			expect(_hasFlushTimer()).toBe(true);
			a11yLogger.contrast('C2', {});
			a11yLogger.contrast('C3', {}); 
			expect(_hasFlushTimer()).toBe(false);
		});

		it('should allow new entries after an auto-flush', () => {
			configureA11yLogger({ maxBufferSize: 2 });
			a11yLogger.contrast('C1', {});
			a11yLogger.contrast('C2', {}); 
			a11yLogger.contrast('C3', {}); 
			expect(_getLogBuffer()).toHaveLength(1);
			expect(_getLogBuffer()[0].message).toBe('C3');
		});
	});

	
	
	
	describe('timed flush', () => {
		it('should schedule a flush timer after adding a log', () => {
			a11yLogger.contrast('Test', {});
			expect(_hasFlushTimer()).toBe(true);
		});

		it('should not schedule multiple timers for multiple entries', () => {
			a11yLogger.contrast('C1', {});
			a11yLogger.contrast('C2', {});
			
			expect(_hasFlushTimer()).toBe(true);
		});

		it('should flush buffer after FLUSH_INTERVAL', async () => {
			a11yLogger.contrast('Test', {});
			expect(_getLogBuffer()).toHaveLength(1);
			vi.advanceTimersByTime(1000);
			
			await vi.runAllTimersAsync();
			expect(_getLogBuffer()).toHaveLength(0);
		});

		it('should flush buffer with custom flushInterval', async () => {
			configureA11yLogger({ flushInterval: 500 });
			a11yLogger.contrast('Test', {});
			expect(_getLogBuffer()).toHaveLength(1);
			vi.advanceTimersByTime(499);
			expect(_getLogBuffer()).toHaveLength(1);
			vi.advanceTimersByTime(1);
			await vi.runAllTimersAsync();
			expect(_getLogBuffer()).toHaveLength(0);
		});

		it('should clear timer after timed flush', async () => {
			a11yLogger.contrast('Test', {});
			expect(_hasFlushTimer()).toBe(true);
			vi.advanceTimersByTime(1000);
			await vi.runAllTimersAsync();
			expect(_hasFlushTimer()).toBe(false);
		});

		it('should not flush before interval elapses', () => {
			a11yLogger.contrast('Test', {});
			vi.advanceTimersByTime(999);
			expect(_getLogBuffer()).toHaveLength(1);
		});

		it('should schedule a new timer after timed flush completes', async () => {
			a11yLogger.contrast('C1', {});
			vi.advanceTimersByTime(1000);
			await vi.runAllTimersAsync();
			expect(_getLogBuffer()).toHaveLength(0);
			a11yLogger.contrast('C2', {});
			expect(_hasFlushTimer()).toBe(true);
			expect(_getLogBuffer()).toHaveLength(1);
		});
	});

	
	
	
	describe('manual flush()', () => {
		it('should flush all buffered entries', async () => {
			a11yLogger.contrast('C1', {});
			a11yLogger.contrast('C2', {});
			a11yLogger.contrast('C3', {});
			expect(_getLogBuffer()).toHaveLength(3);
			await a11yLogger.flush();
			expect(_getLogBuffer()).toHaveLength(0);
		});

		it('should clear the pending timer on manual flush', async () => {
			a11yLogger.contrast('Test', {});
			expect(_hasFlushTimer()).toBe(true);
			await a11yLogger.flush();
			expect(_hasFlushTimer()).toBe(false);
		});

		it('should be a no-op when buffer is empty', async () => {
			await a11yLogger.flush();
			expect(_getLogBuffer()).toHaveLength(0);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should not call fetch when Loki is disabled and not development', async () => {
			configureA11yLogger({ lokiEnabled: false, isDevelopment: false });
			a11yLogger.contrast('Test', {});
			await a11yLogger.flush();
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should allow new entries after manual flush', async () => {
			a11yLogger.contrast('C1', {});
			await a11yLogger.flush();
			a11yLogger.contrast('C2', {});
			expect(_getLogBuffer()).toHaveLength(1);
			expect(_getLogBuffer()[0].message).toBe('C2');
		});

		it('should handle multiple consecutive flushes', async () => {
			a11yLogger.contrast('C1', {});
			await a11yLogger.flush();
			await a11yLogger.flush();
			await a11yLogger.flush();
			expect(_getLogBuffer()).toHaveLength(0);
		});
	});

	
	
	
	describe('timer management', () => {
		it('should not have a timer initially', () => {
			expect(_hasFlushTimer()).toBe(false);
		});

		it('should have a timer after first entry', () => {
			a11yLogger.contrast('Test', {});
			expect(_hasFlushTimer()).toBe(true);
		});

		it('should clear timer on _resetInternalState', () => {
			a11yLogger.contrast('Test', {});
			expect(_hasFlushTimer()).toBe(true);
			_resetInternalState();
			expect(_hasFlushTimer()).toBe(false);
		});

		it('should clear buffer on _resetInternalState', () => {
			a11yLogger.contrast('C1', {});
			a11yLogger.contrast('C2', {});
			_resetInternalState();
			expect(_getLogBuffer()).toHaveLength(0);
		});

		it('should start fresh after _resetInternalState', () => {
			a11yLogger.contrast('C1', {});
			_resetInternalState();
			a11yLogger.contrast('C2', {});
			expect(_getLogBuffer()).toHaveLength(1);
			expect(_getLogBuffer()[0].message).toBe('C2');
		});
	});

	
	
	
	describe('edge cases', () => {
		it('should handle large number of entries without crash', () => {
			configureA11yLogger({ maxBufferSize: 10000 });
			for (let i = 0; i < 500; i++) {
				a11yLogger.contrast(`Entry ${i}`, {});
			}
			expect(_getLogBuffer()).toHaveLength(500);
		});

		it('should handle rapid add-flush cycles', async () => {
			for (let i = 0; i < 10; i++) {
				a11yLogger.contrast(`C${i}`, {});
				await a11yLogger.flush();
			}
			expect(_getLogBuffer()).toHaveLength(0);
		});

		it('should handle maxBufferSize of 2 with interleaved methods', () => {
			configureA11yLogger({ maxBufferSize: 2 });
			a11yLogger.contrast('C1', {});
			a11yLogger.wcag('W1', {}); 
			expect(_getLogBuffer()).toHaveLength(0);
			a11yLogger.error('E1', {});
			expect(_getLogBuffer()).toHaveLength(1);
		});
	});
});
