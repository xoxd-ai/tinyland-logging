



import { describe, it, expect, beforeEach } from 'vitest';
import {
	configureA11yLogger,
	getA11yLoggerConfig,
	resetA11yLoggerConfig,
} from '../../src/a11y/config.js';
import type { A11yLoggerConfig } from '../../src/a11y/config.js';

describe('A11yLogger Config', () => {
	beforeEach(() => {
		resetA11yLoggerConfig();
	});

	
	
	
	describe('getA11yLoggerConfig() defaults', () => {
		it('should return default lokiUrl', () => {
			expect(getA11yLoggerConfig().lokiUrl).toBe('http://localhost:3100');
		});

		it('should return default lokiEnabled as false', () => {
			expect(getA11yLoggerConfig().lokiEnabled).toBe(false);
		});

		it('should return default isDevelopment as false', () => {
			expect(getA11yLoggerConfig().isDevelopment).toBe(false);
		});

		it('should return default flushInterval as 1000', () => {
			expect(getA11yLoggerConfig().flushInterval).toBe(1000);
		});

		it('should return default maxBufferSize as 100', () => {
			expect(getA11yLoggerConfig().maxBufferSize).toBe(100);
		});

		it('should return default jobLabel as accessibility', () => {
			expect(getA11yLoggerConfig().jobLabel).toBe('accessibility');
		});

		it('should return default containerLabel as stonewall-sveltekit', () => {
			expect(getA11yLoggerConfig().containerLabel).toBe('stonewall-sveltekit');
		});

		it('should return default environment as development', () => {
			expect(getA11yLoggerConfig().environment).toBe('development');
		});

		it('should return default serviceLabel as a11y-monitoring', () => {
			expect(getA11yLoggerConfig().serviceLabel).toBe('a11y-monitoring');
		});

		it('should return default registerShutdownHook as true', () => {
			expect(getA11yLoggerConfig().registerShutdownHook).toBe(true);
		});

		it('should return a fully resolved config with all keys defined', () => {
			const cfg = getA11yLoggerConfig();
			const keys: (keyof A11yLoggerConfig)[] = [
				'lokiUrl',
				'lokiEnabled',
				'isDevelopment',
				'flushInterval',
				'maxBufferSize',
				'jobLabel',
				'containerLabel',
				'environment',
				'serviceLabel',
				'registerShutdownHook',
			];
			for (const key of keys) {
				expect(cfg[key]).toBeDefined();
			}
		});
	});

	
	
	
	describe('configureA11yLogger()', () => {
		it('should override lokiUrl', () => {
			configureA11yLogger({ lokiUrl: 'http://loki:3100' });
			expect(getA11yLoggerConfig().lokiUrl).toBe('http://loki:3100');
		});

		it('should override lokiEnabled', () => {
			configureA11yLogger({ lokiEnabled: true });
			expect(getA11yLoggerConfig().lokiEnabled).toBe(true);
		});

		it('should override isDevelopment', () => {
			configureA11yLogger({ isDevelopment: true });
			expect(getA11yLoggerConfig().isDevelopment).toBe(true);
		});

		it('should override flushInterval', () => {
			configureA11yLogger({ flushInterval: 5000 });
			expect(getA11yLoggerConfig().flushInterval).toBe(5000);
		});

		it('should override maxBufferSize', () => {
			configureA11yLogger({ maxBufferSize: 50 });
			expect(getA11yLoggerConfig().maxBufferSize).toBe(50);
		});

		it('should override jobLabel', () => {
			configureA11yLogger({ jobLabel: 'custom-job' });
			expect(getA11yLoggerConfig().jobLabel).toBe('custom-job');
		});

		it('should override containerLabel', () => {
			configureA11yLogger({ containerLabel: 'my-container' });
			expect(getA11yLoggerConfig().containerLabel).toBe('my-container');
		});

		it('should override environment', () => {
			configureA11yLogger({ environment: 'production' });
			expect(getA11yLoggerConfig().environment).toBe('production');
		});

		it('should override serviceLabel', () => {
			configureA11yLogger({ serviceLabel: 'custom-svc' });
			expect(getA11yLoggerConfig().serviceLabel).toBe('custom-svc');
		});

		it('should override registerShutdownHook', () => {
			configureA11yLogger({ registerShutdownHook: false });
			expect(getA11yLoggerConfig().registerShutdownHook).toBe(false);
		});

		it('should merge partial config with existing values', () => {
			configureA11yLogger({ lokiUrl: 'http://custom:3100' });
			configureA11yLogger({ lokiEnabled: true });
			const cfg = getA11yLoggerConfig();
			expect(cfg.lokiUrl).toBe('http://custom:3100');
			expect(cfg.lokiEnabled).toBe(true);
		});

		it('should allow later calls to overwrite earlier values', () => {
			configureA11yLogger({ lokiUrl: 'http://first:3100' });
			configureA11yLogger({ lokiUrl: 'http://second:3100' });
			expect(getA11yLoggerConfig().lokiUrl).toBe('http://second:3100');
		});

		it('should not affect unset keys when setting a single key', () => {
			configureA11yLogger({ flushInterval: 2000 });
			expect(getA11yLoggerConfig().maxBufferSize).toBe(100);
			expect(getA11yLoggerConfig().lokiUrl).toBe('http://localhost:3100');
		});
	});

	
	
	
	describe('resetA11yLoggerConfig()', () => {
		it('should reset lokiUrl to default', () => {
			configureA11yLogger({ lokiUrl: 'http://custom:3100' });
			resetA11yLoggerConfig();
			expect(getA11yLoggerConfig().lokiUrl).toBe('http://localhost:3100');
		});

		it('should reset lokiEnabled to default', () => {
			configureA11yLogger({ lokiEnabled: true });
			resetA11yLoggerConfig();
			expect(getA11yLoggerConfig().lokiEnabled).toBe(false);
		});

		it('should reset all overrides at once', () => {
			configureA11yLogger({
				lokiUrl: 'http://x:3100',
				lokiEnabled: true,
				isDevelopment: true,
				flushInterval: 9999,
				maxBufferSize: 1,
				jobLabel: 'x',
				containerLabel: 'x',
				environment: 'x',
				serviceLabel: 'x',
				registerShutdownHook: false,
			});
			resetA11yLoggerConfig();
			const cfg = getA11yLoggerConfig();
			expect(cfg.lokiUrl).toBe('http://localhost:3100');
			expect(cfg.lokiEnabled).toBe(false);
			expect(cfg.isDevelopment).toBe(false);
			expect(cfg.flushInterval).toBe(1000);
			expect(cfg.maxBufferSize).toBe(100);
			expect(cfg.jobLabel).toBe('accessibility');
			expect(cfg.containerLabel).toBe('stonewall-sveltekit');
			expect(cfg.environment).toBe('development');
			expect(cfg.serviceLabel).toBe('a11y-monitoring');
			expect(cfg.registerShutdownHook).toBe(true);
		});

		it('should allow re-configuration after reset', () => {
			configureA11yLogger({ lokiUrl: 'http://first:3100' });
			resetA11yLoggerConfig();
			configureA11yLogger({ lokiUrl: 'http://second:3100' });
			expect(getA11yLoggerConfig().lokiUrl).toBe('http://second:3100');
		});
	});
});
