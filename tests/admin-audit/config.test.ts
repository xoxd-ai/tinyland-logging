import { describe, it, expect, beforeEach } from 'vitest';
import {
  configureAdminAudit,
  getAdminAuditConfig,
  resetAdminAuditConfig,
  type Logger,
  type AdminAuditPackageConfig,
} from '../../src/admin-audit/config.js';

describe('config', () => {
  beforeEach(() => {
    resetAdminAuditConfig();
  });

  describe('configureAdminAudit', () => {
    it('should set createLogger', () => {
      const mockLogger: Logger = {
        info: () => {},
        warn: () => {},
        error: () => {},
      };
      configureAdminAudit({ createLogger: () => mockLogger });
      expect(getAdminAuditConfig().createLogger('test')).toBe(mockLogger);
    });

    it('should set hashIp', () => {
      const customHashIp = (ip: string) => `hashed_${ip}`;
      configureAdminAudit({ hashIp: customHashIp });
      expect(getAdminAuditConfig().hashIp('1.2.3.4')).toBe('hashed_1.2.3.4');
    });

    it('should set maskIp', () => {
      const customMaskIp = (ip: string) => `masked_${ip}`;
      configureAdminAudit({ maskIp: customMaskIp });
      expect(getAdminAuditConfig().maskIp('1.2.3.4')).toBe('masked_1.2.3.4');
    });

    it('should set detectDeviceType', () => {
      const customDetect = (ua: string) => (ua.includes('Mobile') ? 'mobile' : 'desktop');
      configureAdminAudit({ detectDeviceType: customDetect });
      expect(getAdminAuditConfig().detectDeviceType('Mozilla Mobile')).toBe('mobile');
      expect(getAdminAuditConfig().detectDeviceType('Mozilla Desktop')).toBe('desktop');
    });

    it('should set generateId', () => {
      const customId = () => 'custom-id-12345';
      configureAdminAudit({ generateId: customId });
      expect(getAdminAuditConfig().generateId()).toBe('custom-id-12345');
    });

    it('should merge with existing config', () => {
      const customHashIp = (ip: string) => `h_${ip}`;
      const customMaskIp = (ip: string) => `m_${ip}`;
      configureAdminAudit({ hashIp: customHashIp });
      configureAdminAudit({ maskIp: customMaskIp });
      const result = getAdminAuditConfig();
      expect(result.hashIp('1.2.3.4')).toBe('h_1.2.3.4');
      expect(result.maskIp('1.2.3.4')).toBe('m_1.2.3.4');
    });

    it('should override previously set values', () => {
      configureAdminAudit({ generateId: () => 'first' });
      configureAdminAudit({ generateId: () => 'second' });
      expect(getAdminAuditConfig().generateId()).toBe('second');
    });

    it('should accept empty overrides without error', () => {
      configureAdminAudit({});
      const result = getAdminAuditConfig();
      expect(result.createLogger).toBeDefined();
      expect(result.hashIp).toBeDefined();
      expect(result.maskIp).toBeDefined();
      expect(result.detectDeviceType).toBeDefined();
      expect(result.generateId).toBeDefined();
    });

    it('should accept full config at once', () => {
      const mockLogger: Logger = { info: () => {}, warn: () => {}, error: () => {} };
      const fullConfig: Partial<AdminAuditPackageConfig> = {
        createLogger: () => mockLogger,
        hashIp: (ip) => `h_${ip}`,
        maskIp: (ip) => `m_${ip}`,
        detectDeviceType: () => 'tablet',
        generateId: () => 'full-id',
      };
      configureAdminAudit(fullConfig);
      const result = getAdminAuditConfig();
      expect(result.createLogger('x')).toBe(mockLogger);
      expect(result.hashIp('ip')).toBe('h_ip');
      expect(result.maskIp('ip')).toBe('m_ip');
      expect(result.detectDeviceType('ua')).toBe('tablet');
      expect(result.generateId()).toBe('full-id');
    });

    it('should not affect previously unset fields when setting one field', () => {
      const original = getAdminAuditConfig();
      const originalHashIp = original.hashIp;
      configureAdminAudit({ generateId: () => 'new-id' });
      expect(getAdminAuditConfig().hashIp).toBe(originalHashIp);
    });
  });

  describe('getAdminAuditConfig', () => {
    it('should return all default fields when nothing configured', () => {
      const result = getAdminAuditConfig();
      expect(typeof result.createLogger).toBe('function');
      expect(typeof result.hashIp).toBe('function');
      expect(typeof result.maskIp).toBe('function');
      expect(typeof result.detectDeviceType).toBe('function');
      expect(typeof result.generateId).toBe('function');
    });

    it('should return a console-based logger by default', () => {
      const logger = getAdminAuditConfig().createLogger('test');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should return a default logger that does not throw when called', () => {
      const logger = getAdminAuditConfig().createLogger('test');
      expect(() => logger.info('test message')).not.toThrow();
      expect(() => logger.warn('test warning')).not.toThrow();
      expect(() => logger.error('test error')).not.toThrow();
    });

    it('should return a default logger that accepts metadata', () => {
      const logger = getAdminAuditConfig().createLogger('test');
      expect(() => logger.info('test', { key: 'value' })).not.toThrow();
      expect(() => logger.warn('test', { key: 'value' })).not.toThrow();
      expect(() => logger.error('test', { key: 'value' })).not.toThrow();
    });

    it('should have default hashIp that returns IP as-is', () => {
      const result = getAdminAuditConfig().hashIp('192.168.1.1');
      expect(result).toBe('192.168.1.1');
    });

    it('should have default maskIp that replaces last octet', () => {
      const result = getAdminAuditConfig().maskIp('192.168.1.100');
      expect(result).toBe('192.168.1.***');
    });

    it('should have default maskIp that handles single-digit last octet', () => {
      const result = getAdminAuditConfig().maskIp('10.0.0.1');
      expect(result).toBe('10.0.0.***');
    });

    it('should have default detectDeviceType that returns unknown', () => {
      const result = getAdminAuditConfig().detectDeviceType('any user agent');
      expect(result).toBe('unknown');
    });

    it('should have default generateId that returns a UUID-like string', () => {
      const id = getAdminAuditConfig().generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('should return a new config object reference each call', () => {
      const a = getAdminAuditConfig();
      const b = getAdminAuditConfig();
      
      
      expect(a.hashIp).toBe(b.hashIp);
    });

    it('should return configured values after partial config', () => {
      configureAdminAudit({ hashIp: (ip) => `custom_${ip}` });
      const result = getAdminAuditConfig();
      expect(result.hashIp('1.1.1.1')).toBe('custom_1.1.1.1');
      
      expect(result.detectDeviceType('ua')).toBe('unknown');
    });
  });

  describe('resetAdminAuditConfig', () => {
    it('should clear all configured values', () => {
      configureAdminAudit({
        createLogger: () => ({ info: () => {}, warn: () => {}, error: () => {} }),
        hashIp: () => 'custom',
        maskIp: () => 'custom',
        detectDeviceType: () => 'custom',
        generateId: () => 'custom',
      });
      resetAdminAuditConfig();
      const result = getAdminAuditConfig();
      expect(result.hashIp('1.2.3.4')).toBe('1.2.3.4'); 
      expect(result.detectDeviceType('ua')).toBe('unknown'); 
    });

    it('should restore default logger after reset', () => {
      const custom: Logger = { info: () => {}, warn: () => {}, error: () => {} };
      configureAdminAudit({ createLogger: () => custom });
      expect(getAdminAuditConfig().createLogger('x')).toBe(custom);
      resetAdminAuditConfig();
      const logger = getAdminAuditConfig().createLogger('x');
      expect(logger).not.toBe(custom);
    });

    it('should restore default hashIp after reset', () => {
      configureAdminAudit({ hashIp: () => 'custom' });
      resetAdminAuditConfig();
      expect(getAdminAuditConfig().hashIp('10.0.0.1')).toBe('10.0.0.1');
    });

    it('should restore default maskIp after reset', () => {
      configureAdminAudit({ maskIp: () => 'custom' });
      resetAdminAuditConfig();
      expect(getAdminAuditConfig().maskIp('10.0.0.1')).toBe('10.0.0.***');
    });

    it('should restore default detectDeviceType after reset', () => {
      configureAdminAudit({ detectDeviceType: () => 'mobile' });
      resetAdminAuditConfig();
      expect(getAdminAuditConfig().detectDeviceType('ua')).toBe('unknown');
    });

    it('should restore default generateId after reset', () => {
      configureAdminAudit({ generateId: () => 'static-id' });
      resetAdminAuditConfig();
      const id = getAdminAuditConfig().generateId();
      expect(id).not.toBe('static-id');
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('should allow reconfiguration after reset', () => {
      configureAdminAudit({ hashIp: () => 'first' });
      resetAdminAuditConfig();
      configureAdminAudit({ hashIp: () => 'second' });
      expect(getAdminAuditConfig().hashIp('ip')).toBe('second');
    });

    it('should be idempotent when called multiple times', () => {
      resetAdminAuditConfig();
      resetAdminAuditConfig();
      resetAdminAuditConfig();
      const result = getAdminAuditConfig();
      expect(result.hashIp('1.1.1.1')).toBe('1.1.1.1');
      expect(result.detectDeviceType('ua')).toBe('unknown');
    });
  });
});
