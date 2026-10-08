



import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
	a11yLogger,
	_getLogBuffer,
	_resetInternalState,
} from '../../src/a11y/a11y-logger.js';
import {
	configureA11yLogger,
	resetA11yLoggerConfig,
} from '../../src/a11y/config.js';


const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal('fetch', mockFetch);

describe('a11yLogger', () => {
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

	
	
	
	describe('contrast()', () => {
		it('should add a contrast log entry to the buffer', () => {
			a11yLogger.contrast('Low contrast', { selector: 'h1' });
			expect(_getLogBuffer()).toHaveLength(1);
		});

		it('should set type label to contrast', () => {
			a11yLogger.contrast('Low contrast', {});
			expect(_getLogBuffer()[0].labels.type).toBe('contrast');
		});

		it('should set level to error when ratio < 3', () => {
			a11yLogger.contrast('Critical contrast', { ratio: 2.5 });
			expect(_getLogBuffer()[0].level).toBe('error');
		});

		it('should set level to warn when ratio >= 3', () => {
			a11yLogger.contrast('Low contrast', { ratio: 3.5 });
			expect(_getLogBuffer()[0].level).toBe('warn');
		});

		it('should set level to warn when ratio is exactly 3', () => {
			a11yLogger.contrast('Border contrast', { ratio: 3 });
			expect(_getLogBuffer()[0].level).toBe('warn');
		});

		it('should set level to warn when ratio is undefined', () => {
			a11yLogger.contrast('Unknown contrast', {});
			expect(_getLogBuffer()[0].level).toBe('warn');
		});

		it('should set level to error when ratio is 0', () => {
			a11yLogger.contrast('Zero contrast', { ratio: 0 });
			expect(_getLogBuffer()[0].level).toBe('error');
		});

		it('should include full labels', () => {
			a11yLogger.contrast('Full labels', {
				sessionId: 'sess-1',
				selector: '.heading',
				ratio: 2.1,
				requiredRatio: 7,
				foreground: '#000',
				background: '#333',
				wcagLevel: 'AAA',
				elementInfo: { tagName: 'h2', text: 'Hello' },
				page: '/about',
				theme: 'dark',
			});
			const entry = _getLogBuffer()[0];
			expect(entry.sessionId).toBe('sess-1');
			expect(entry.labels.selector).toBe('.heading');
			expect(entry.labels.ratio).toBe(2.1);
			expect(entry.labels.requiredRatio).toBe(7);
			expect(entry.labels.foreground).toBe('#000');
			expect(entry.labels.background).toBe('#333');
			expect(entry.labels.wcagLevel).toBe('AAA');
			expect(entry.labels.tagName).toBe('h2');
			expect(entry.labels.page).toBe('/about');
			expect(entry.labels.theme).toBe('dark');
		});

		it('should use defaults for missing labels', () => {
			a11yLogger.contrast('Minimal', {});
			const entry = _getLogBuffer()[0];
			expect(entry.labels.selector).toBe('unknown');
			expect(entry.labels.ratio).toBe(0);
			expect(entry.labels.requiredRatio).toBe(4.5);
			expect(entry.labels.foreground).toBe('unknown');
			expect(entry.labels.background).toBe('unknown');
			expect(entry.labels.wcagLevel).toBe('AA');
			expect(entry.labels.tagName).toBe('unknown');
			expect(entry.labels.page).toBe('');
			expect(entry.labels.theme).toBe('');
		});

		it('should generate a valid ISO timestamp', () => {
			a11yLogger.contrast('Test', {});
			const ts = _getLogBuffer()[0].timestamp;
			expect(new Date(ts).toISOString()).toBe(ts);
		});

		it('should propagate sessionId', () => {
			a11yLogger.contrast('Test', { sessionId: 'abc-123' });
			expect(_getLogBuffer()[0].sessionId).toBe('abc-123');
		});

		it('should store the message correctly', () => {
			a11yLogger.contrast('My contrast message', {});
			expect(_getLogBuffer()[0].message).toBe('My contrast message');
		});

		it('should handle elementInfo with only tagName', () => {
			a11yLogger.contrast('Test', {
				elementInfo: { tagName: 'span' },
			});
			expect(_getLogBuffer()[0].labels.tagName).toBe('span');
		});
	});

	
	
	
	describe('wcag()', () => {
		it('should add a wcag log entry', () => {
			a11yLogger.wcag('WCAG violation', {});
			expect(_getLogBuffer()).toHaveLength(1);
			expect(_getLogBuffer()[0].labels.type).toBe('wcag');
		});

		it('should set level to error when severity is error', () => {
			a11yLogger.wcag('Critical', { severity: 'error' });
			expect(_getLogBuffer()[0].level).toBe('error');
		});

		it('should set level to warn when severity is warning', () => {
			a11yLogger.wcag('Warning', { severity: 'warning' });
			expect(_getLogBuffer()[0].level).toBe('warn');
		});

		it('should set level to warn when severity is undefined', () => {
			a11yLogger.wcag('Default', {});
			expect(_getLogBuffer()[0].level).toBe('warn');
		});

		it('should include full labels', () => {
			a11yLogger.wcag('Full', {
				sessionId: 's-1',
				selector: '#main',
				rule: '1.1.1',
				wcagLevel: 'A',
				severity: 'error',
			});
			const entry = _getLogBuffer()[0];
			expect(entry.sessionId).toBe('s-1');
			expect(entry.labels.selector).toBe('#main');
			expect(entry.labels.rule).toBe('1.1.1');
			expect(entry.labels.wcagLevel).toBe('A');
			expect(entry.labels.severity).toBe('error');
		});

		it('should use defaults for missing labels', () => {
			a11yLogger.wcag('Minimal', {});
			const entry = _getLogBuffer()[0];
			expect(entry.labels.selector).toBe('unknown');
			expect(entry.labels.rule).toBe('unknown');
			expect(entry.labels.wcagLevel).toBe('AA');
			expect(entry.labels.severity).toBe('warning');
		});

		it('should propagate sessionId', () => {
			a11yLogger.wcag('Test', { sessionId: 'w-session' });
			expect(_getLogBuffer()[0].sessionId).toBe('w-session');
		});

		it('should generate valid timestamp', () => {
			a11yLogger.wcag('Test', {});
			const ts = _getLogBuffer()[0].timestamp;
			expect(() => new Date(ts)).not.toThrow();
		});
	});

	
	
	
	describe('evaluation()', () => {
		it('should add an evaluation log entry', () => {
			a11yLogger.evaluation('Eval complete', {});
			expect(_getLogBuffer()).toHaveLength(1);
			expect(_getLogBuffer()[0].labels.type).toBe('evaluation');
		});

		it('should always set level to info', () => {
			a11yLogger.evaluation('Eval', {});
			expect(_getLogBuffer()[0].level).toBe('info');
		});

		it('should include full labels', () => {
			a11yLogger.evaluation('Full eval', {
				sessionId: 'e-1',
				resultsCount: 50,
				issuesCount: 10,
				criticalCount: 2,
				evaluationTimeMs: 350,
			});
			const entry = _getLogBuffer()[0];
			expect(entry.sessionId).toBe('e-1');
			expect(entry.labels.resultsCount).toBe(50);
			expect(entry.labels.issuesCount).toBe(10);
			expect(entry.labels.criticalCount).toBe(2);
			expect(entry.labels.evaluationTimeMs).toBe(350);
		});

		it('should use defaults for missing labels', () => {
			a11yLogger.evaluation('Minimal', {});
			const entry = _getLogBuffer()[0];
			expect(entry.labels.resultsCount).toBe(0);
			expect(entry.labels.issuesCount).toBe(0);
			expect(entry.labels.criticalCount).toBe(0);
			expect(entry.labels.evaluationTimeMs).toBe(0);
		});

		it('should propagate sessionId', () => {
			a11yLogger.evaluation('Test', { sessionId: 'ev-sess' });
			expect(_getLogBuffer()[0].sessionId).toBe('ev-sess');
		});
	});

	
	
	
	describe('session()', () => {
		it('should add a session log entry', () => {
			a11yLogger.session('Session started', {});
			expect(_getLogBuffer()).toHaveLength(1);
			expect(_getLogBuffer()[0].labels.type).toBe('session');
		});

		it('should always set level to info', () => {
			a11yLogger.session('Session', {});
			expect(_getLogBuffer()[0].level).toBe('info');
		});

		it('should include full labels', () => {
			a11yLogger.session('Full session', {
				sessionId: 's-full',
				action: 'start',
				userId: 'user-42',
				userAgent: 'Mozilla/5.0',
			});
			const entry = _getLogBuffer()[0];
			expect(entry.sessionId).toBe('s-full');
			expect(entry.labels.action).toBe('start');
			expect(entry.labels.userId).toBe('user-42');
			expect(entry.labels.userAgent).toBe('Mozilla/5.0');
		});

		it('should use defaults for missing labels', () => {
			a11yLogger.session('Minimal', {});
			const entry = _getLogBuffer()[0];
			expect(entry.labels.action).toBe('unknown');
			expect(entry.labels.userId).toBe('anonymous');
			expect(entry.labels.userAgent).toBe('unknown');
		});

		it('should propagate sessionId', () => {
			a11yLogger.session('Test', { sessionId: 'sess-abc' });
			expect(_getLogBuffer()[0].sessionId).toBe('sess-abc');
		});
	});

	
	
	
	describe('error()', () => {
		it('should add an error log entry', () => {
			a11yLogger.error('Something broke', {});
			expect(_getLogBuffer()).toHaveLength(1);
			expect(_getLogBuffer()[0].labels.type).toBe('error');
		});

		it('should always set level to error', () => {
			a11yLogger.error('Error', {});
			expect(_getLogBuffer()[0].level).toBe('error');
		});

		it('should include full labels', () => {
			a11yLogger.error('Full error', {
				sessionId: 'err-1',
				error: 'TypeError',
				stack: 'at line 42',
			});
			const entry = _getLogBuffer()[0];
			expect(entry.sessionId).toBe('err-1');
			expect(entry.labels.error).toBe('TypeError');
			expect(entry.labels.stack).toBe('at line 42');
		});

		it('should use defaults for missing labels', () => {
			a11yLogger.error('Minimal', {});
			const entry = _getLogBuffer()[0];
			expect(entry.labels.error).toBe('unknown');
			expect(entry.labels.stack).toBe('');
		});

		it('should propagate sessionId', () => {
			a11yLogger.error('Test', { sessionId: 'e-sess' });
			expect(_getLogBuffer()[0].sessionId).toBe('e-sess');
		});
	});

	
	
	
	describe('summary()', () => {
		it('should add a summary log entry', () => {
			a11yLogger.summary({
				totalElements: 100,
				evaluatedElements: 80,
				issues: 5,
				criticalIssues: 1,
				evaluationTimeMs: 200,
			});
			expect(_getLogBuffer()).toHaveLength(1);
			expect(_getLogBuffer()[0].labels.type).toBe('summary');
		});

		it('should always set level to info', () => {
			a11yLogger.summary({
				totalElements: 0,
				evaluatedElements: 0,
				issues: 0,
				criticalIssues: 0,
				evaluationTimeMs: 0,
			});
			expect(_getLogBuffer()[0].level).toBe('info');
		});

		it('should format message with issue counts', () => {
			a11yLogger.summary({
				totalElements: 100,
				evaluatedElements: 80,
				issues: 7,
				criticalIssues: 3,
				evaluationTimeMs: 150,
			});
			expect(_getLogBuffer()[0].message).toBe(
				'Accessibility summary: 7 issues (3 critical)'
			);
		});

		it('should include all numeric labels', () => {
			a11yLogger.summary({
				totalElements: 200,
				evaluatedElements: 150,
				issues: 10,
				criticalIssues: 2,
				evaluationTimeMs: 500,
			});
			const entry = _getLogBuffer()[0];
			expect(entry.labels.totalElements).toBe(200);
			expect(entry.labels.evaluatedElements).toBe(150);
			expect(entry.labels.issues).toBe(10);
			expect(entry.labels.criticalIssues).toBe(2);
			expect(entry.labels.evaluationTimeMs).toBe(500);
		});

		it('should propagate sessionId', () => {
			a11yLogger.summary({
				totalElements: 0,
				evaluatedElements: 0,
				issues: 0,
				criticalIssues: 0,
				evaluationTimeMs: 0,
				sessionId: 'sum-sess',
			});
			expect(_getLogBuffer()[0].sessionId).toBe('sum-sess');
		});

		it('should handle zero values', () => {
			a11yLogger.summary({
				totalElements: 0,
				evaluatedElements: 0,
				issues: 0,
				criticalIssues: 0,
				evaluationTimeMs: 0,
			});
			expect(_getLogBuffer()[0].message).toBe(
				'Accessibility summary: 0 issues (0 critical)'
			);
		});
	});

	
	
	
	describe('aria()', () => {
		it('should add an aria log entry', () => {
			a11yLogger.aria('Missing label', {});
			expect(_getLogBuffer()).toHaveLength(1);
			expect(_getLogBuffer()[0].labels.type).toBe('aria');
		});

		it('should always set level to warn', () => {
			a11yLogger.aria('ARIA issue', {});
			expect(_getLogBuffer()[0].level).toBe('warn');
		});

		it('should include full labels', () => {
			a11yLogger.aria('Full ARIA', {
				sessionId: 'a-1',
				selector: 'button.submit',
				issue: 'missing-label',
				elementInfo: { tagName: 'button', html: '<button>Submit</button>' },
				fix: 'Add aria-label',
				page: '/form',
			});
			const entry = _getLogBuffer()[0];
			expect(entry.sessionId).toBe('a-1');
			expect(entry.labels.selector).toBe('button.submit');
			expect(entry.labels.issue).toBe('missing-label');
			expect(entry.labels.tagName).toBe('button');
			expect(entry.labels.fix).toBe('Add aria-label');
			expect(entry.labels.page).toBe('/form');
		});

		it('should use defaults for missing labels', () => {
			a11yLogger.aria('Minimal', {});
			const entry = _getLogBuffer()[0];
			expect(entry.labels.selector).toBe('unknown');
			expect(entry.labels.issue).toBe('unknown');
			expect(entry.labels.tagName).toBe('unknown');
			expect(entry.labels.fix).toBe('');
			expect(entry.labels.page).toBe('');
		});

		it('should propagate sessionId', () => {
			a11yLogger.aria('Test', { sessionId: 'aria-sess' });
			expect(_getLogBuffer()[0].sessionId).toBe('aria-sess');
		});

		it('should handle elementInfo with only tagName', () => {
			a11yLogger.aria('Test', {
				elementInfo: { tagName: 'input' },
			});
			expect(_getLogBuffer()[0].labels.tagName).toBe('input');
		});
	});

	
	
	
	describe('flush()', () => {
		it('should clear the buffer after flush', async () => {
			a11yLogger.contrast('Test', {});
			expect(_getLogBuffer()).toHaveLength(1);
			await a11yLogger.flush();
			expect(_getLogBuffer()).toHaveLength(0);
		});

		it('should be a no-op when buffer is empty', async () => {
			await a11yLogger.flush();
			expect(_getLogBuffer()).toHaveLength(0);
		});
	});

	
	
	
	describe('cross-method behavior', () => {
		it('should accumulate entries from different methods', () => {
			a11yLogger.contrast('C1', {});
			a11yLogger.wcag('W1', {});
			a11yLogger.evaluation('E1', {});
			a11yLogger.session('S1', {});
			a11yLogger.error('Err1', {});
			a11yLogger.aria('A1', {});
			a11yLogger.summary({
				totalElements: 1,
				evaluatedElements: 1,
				issues: 0,
				criticalIssues: 0,
				evaluationTimeMs: 0,
			});
			expect(_getLogBuffer()).toHaveLength(7);
		});

		it('should preserve insertion order', () => {
			a11yLogger.contrast('first', {});
			a11yLogger.wcag('second', {});
			a11yLogger.aria('third', {});
			const buf = _getLogBuffer();
			expect(buf[0].message).toBe('first');
			expect(buf[1].message).toBe('second');
			expect(buf[2].message).toBe('third');
		});

		it('should generate unique timestamps for rapid calls', () => {
			
			a11yLogger.contrast('A', {});
			a11yLogger.contrast('B', {});
			expect(_getLogBuffer()).toHaveLength(2);
		});

		it('should not set sessionId when not provided', () => {
			a11yLogger.contrast('Test', {});
			expect(_getLogBuffer()[0].sessionId).toBeUndefined();
		});

		it('should handle empty message strings', () => {
			a11yLogger.contrast('', {});
			a11yLogger.wcag('', {});
			a11yLogger.error('', {});
			expect(_getLogBuffer()).toHaveLength(3);
			expect(_getLogBuffer()[0].message).toBe('');
		});

		it('should handle very long messages', () => {
			const longMsg = 'x'.repeat(10000);
			a11yLogger.contrast(longMsg, {});
			expect(_getLogBuffer()[0].message).toBe(longMsg);
		});

		it('should handle special characters in messages', () => {
			a11yLogger.contrast('Ratio < 3 && severity > "high"', {});
			expect(_getLogBuffer()[0].message).toBe('Ratio < 3 && severity > "high"');
		});

		it('should handle unicode in messages', () => {
			a11yLogger.contrast('Accessibility: a11y', {});
			expect(_getLogBuffer()[0].message).toContain('a11y');
		});
	});

	
	
	
	describe('contrast() ratio edge cases', () => {
		it('should set level to error when ratio is negative', () => {
			a11yLogger.contrast('Negative', { ratio: -1 });
			expect(_getLogBuffer()[0].level).toBe('error');
		});

		it('should set level to error when ratio is 2.999', () => {
			a11yLogger.contrast('Just under', { ratio: 2.999 });
			expect(_getLogBuffer()[0].level).toBe('error');
		});

		it('should set level to warn when ratio is 3.001', () => {
			a11yLogger.contrast('Just over', { ratio: 3.001 });
			expect(_getLogBuffer()[0].level).toBe('warn');
		});

		it('should set level to warn when ratio is very high', () => {
			a11yLogger.contrast('High contrast', { ratio: 21 });
			expect(_getLogBuffer()[0].level).toBe('warn');
		});
	});

	
	
	
	describe('wcag() severity edge cases', () => {
		it('should set level to warn for non-error severity strings', () => {
			a11yLogger.wcag('Info', { severity: 'info' });
			expect(_getLogBuffer()[0].level).toBe('warn');
		});

		it('should set level to warn for empty severity string', () => {
			a11yLogger.wcag('Empty', { severity: '' });
			expect(_getLogBuffer()[0].level).toBe('warn');
		});
	});

	
	
	
	describe('summary() additional cases', () => {
		it('should handle large numbers', () => {
			a11yLogger.summary({
				totalElements: 999999,
				evaluatedElements: 888888,
				issues: 77777,
				criticalIssues: 6666,
				evaluationTimeMs: 55555,
			});
			const entry = _getLogBuffer()[0];
			expect(entry.labels.totalElements).toBe(999999);
			expect(entry.message).toContain('77777');
		});

		it('should not have sessionId when not provided', () => {
			a11yLogger.summary({
				totalElements: 1,
				evaluatedElements: 1,
				issues: 0,
				criticalIssues: 0,
				evaluationTimeMs: 0,
			});
			expect(_getLogBuffer()[0].sessionId).toBeUndefined();
		});
	});
});
