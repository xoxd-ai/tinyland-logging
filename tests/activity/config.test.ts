



import { describe, it, expect, beforeEach } from 'vitest';
import {
  configureActivityLogger,
  getActivityLoggerConfig,
  resetActivityLoggerConfig,
} from '../../src/activity/config.js';

describe('ActivityLoggerConfig', () => {
  beforeEach(() => {
    resetActivityLoggerConfig();
  });

  

  it('should have baseDir defaulting to process.cwd()', () => {
    const config = getActivityLoggerConfig();
    expect(config.baseDir).toBe(process.cwd());
  });

  it('should have logSubPath defaulting to content/auth/logs/admin-activity.json', () => {
    const config = getActivityLoggerConfig();
    expect(config.logSubPath).toBe('content/auth/logs/admin-activity.json');
  });

  it('should have maxLogs defaulting to 10000', () => {
    const config = getActivityLoggerConfig();
    expect(config.maxLogs).toBe(10000);
  });

  it('should have generateId defaulting to a function that returns a UUID', () => {
    const config = getActivityLoggerConfig();
    expect(typeof config.generateId).toBe('function');
    const id = config.generateId();
    
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should return unique IDs on successive calls to default generateId', () => {
    const config = getActivityLoggerConfig();
    const id1 = config.generateId();
    const id2 = config.generateId();
    expect(id1).not.toBe(id2);
  });

  

  it('should merge partial config: baseDir only', () => {
    configureActivityLogger({ baseDir: '/tmp/test' });
    const config = getActivityLoggerConfig();
    expect(config.baseDir).toBe('/tmp/test');
    
    expect(config.logSubPath).toBe('content/auth/logs/admin-activity.json');
    expect(config.maxLogs).toBe(10000);
  });

  it('should merge partial config: logSubPath only', () => {
    configureActivityLogger({ logSubPath: 'logs/custom.json' });
    const config = getActivityLoggerConfig();
    expect(config.logSubPath).toBe('logs/custom.json');
    expect(config.baseDir).toBe(process.cwd());
  });

  it('should merge partial config: maxLogs only', () => {
    configureActivityLogger({ maxLogs: 500 });
    const config = getActivityLoggerConfig();
    expect(config.maxLogs).toBe(500);
  });

  it('should merge partial config: generateId only', () => {
    let counter = 0;
    configureActivityLogger({ generateId: () => `custom-${++counter}` });
    const config = getActivityLoggerConfig();
    expect(config.generateId()).toBe('custom-1');
    expect(config.generateId()).toBe('custom-2');
  });

  it('should merge multiple fields at once', () => {
    configureActivityLogger({
      baseDir: '/opt/data',
      maxLogs: 42,
      logSubPath: 'audit.json',
    });
    const config = getActivityLoggerConfig();
    expect(config.baseDir).toBe('/opt/data');
    expect(config.maxLogs).toBe(42);
    expect(config.logSubPath).toBe('audit.json');
  });

  it('should apply successive partial configurations cumulatively', () => {
    configureActivityLogger({ baseDir: '/a' });
    configureActivityLogger({ maxLogs: 1 });
    const config = getActivityLoggerConfig();
    expect(config.baseDir).toBe('/a');
    expect(config.maxLogs).toBe(1);
  });

  it('should overwrite previously set values on second call', () => {
    configureActivityLogger({ baseDir: '/first' });
    configureActivityLogger({ baseDir: '/second' });
    expect(getActivityLoggerConfig().baseDir).toBe('/second');
  });

  it('should accept an empty partial config as a no-op', () => {
    const before = getActivityLoggerConfig();
    configureActivityLogger({});
    const after = getActivityLoggerConfig();
    expect(after.baseDir).toBe(before.baseDir);
    expect(after.maxLogs).toBe(before.maxLogs);
    expect(after.logSubPath).toBe(before.logSubPath);
  });

  

  it('should return a snapshot, not a live reference', () => {
    const a = getActivityLoggerConfig();
    configureActivityLogger({ maxLogs: 999 });
    
    expect(a.maxLogs).toBe(10000);
    expect(getActivityLoggerConfig().maxLogs).toBe(999);
  });

  

  it('should restore all defaults after reset', () => {
    configureActivityLogger({
      baseDir: '/custom',
      logSubPath: 'x.json',
      maxLogs: 1,
      generateId: () => 'fixed',
    });
    resetActivityLoggerConfig();
    const config = getActivityLoggerConfig();
    expect(config.baseDir).toBe(process.cwd());
    expect(config.logSubPath).toBe('content/auth/logs/admin-activity.json');
    expect(config.maxLogs).toBe(10000);
    
    expect(config.generateId()).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('should allow reconfiguration after reset', () => {
    configureActivityLogger({ maxLogs: 5 });
    resetActivityLoggerConfig();
    configureActivityLogger({ maxLogs: 7 });
    expect(getActivityLoggerConfig().maxLogs).toBe(7);
  });

  it('should be idempotent when called multiple times', () => {
    resetActivityLoggerConfig();
    resetActivityLoggerConfig();
    const config = getActivityLoggerConfig();
    expect(config.baseDir).toBe(process.cwd());
  });
});
