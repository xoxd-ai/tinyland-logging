







import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  AdminActivityLogger,
  getAdminActivityLogger,
  resetAdminActivityLoggerInstance,
  logAdminAction,
} from '../../src/activity/activity-logger.js';
import {
  configureActivityLogger,
  resetActivityLoggerConfig,
} from '../../src/activity/config.js';
import type { ActivityLog, UserContext } from '../../src/activity/types.js';





let tmpDir: string;

function freshTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'activity-logger-test-'));
}


function readLogsFromDisk(): ActivityLog[] {
  const filePath = join(tmpDir, 'content/auth/logs/admin-activity.json');
  const raw = readFileSync(filePath, 'utf-8');
  return (JSON.parse(raw) as { logs: ActivityLog[] }).logs;
}


function seedLogFile(data: unknown): void {
  const dir = join(tmpDir, 'content/auth/logs');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'admin-activity.json'), JSON.stringify(data));
}


function makeRequest(headers: Record<string, string>): Request {
  return new Request('http://localhost', { headers });
}

let idCounter: number;





beforeEach(() => {
  tmpDir = freshTmpDir();
  idCounter = 0;
  resetActivityLoggerConfig();
  resetAdminActivityLoggerInstance();
  configureActivityLogger({
    baseDir: tmpDir,
    generateId: () => `test-id-${++idCounter}`,
  });
});

afterEach(() => {
  resetAdminActivityLoggerInstance();
  resetActivityLoggerConfig();
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    
  }
});





describe('AdminActivityLogger - constructor', () => {
  it('should create an empty logs array when no file exists', async () => {
    const logger = new AdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs).toEqual([]);
  });

  it('should load logs from an existing file in array format', async () => {
    const existing: ActivityLog[] = [
      {
        id: 'a1',
        timestamp: '2025-01-01T00:00:00.000Z',
        userId: 'u1',
        username: 'alice',
        action: 'login',
        resource: 'auth',
        success: true,
      },
    ];
    seedLogFile(existing);
    const logger = new AdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].id).toBe('a1');
  });

  it('should load logs from an existing file in object-with-logs format', async () => {
    const existing = {
      logs: [
        {
          id: 'b1',
          timestamp: '2025-01-01T00:00:00.000Z',
          userId: 'u2',
          username: 'bob',
          action: 'update',
          resource: 'profile',
          success: true,
        },
      ],
    };
    seedLogFile(existing);
    const logger = new AdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].id).toBe('b1');
  });

  it('should create the log directory if it does not exist', () => {
    
    new AdminActivityLogger();
    const dir = join(tmpDir, 'content/auth/logs');
    
    
    writeFileSync(join(dir, 'probe.txt'), 'ok');
    expect(readFileSync(join(dir, 'probe.txt'), 'utf-8')).toBe('ok');
  });

  it('should handle corrupt JSON gracefully and start with empty logs', async () => {
    const dir = join(tmpDir, 'content/auth/logs');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'admin-activity.json'), '{not valid json!!!');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new AdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle an empty file gracefully', async () => {
    const dir = join(tmpDir, 'content/auth/logs');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'admin-activity.json'), '');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new AdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('should handle a file containing a non-array, non-object-with-logs value', async () => {
    seedLogFile('just a string');
    const logger = new AdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs).toEqual([]);
  });

  it('should handle a file containing null', async () => {
    seedLogFile(null);
    const logger = new AdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs).toEqual([]);
  });

  it('should handle a file containing a number', async () => {
    seedLogFile(42);
    const logger = new AdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs).toEqual([]);
  });

  it('should handle an object with a non-array logs property', async () => {
    seedLogFile({ logs: 'not-an-array' });
    const logger = new AdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs).toEqual([]);
  });
});





describe('AdminActivityLogger - log()', () => {
  it('should create an entry with auto-generated id', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({
      userId: 'u1',
      username: 'alice',
      action: 'create',
      resource: 'post',
      success: true,
    });
    const logs = await logger.getRecentLogs();
    expect(logs[0].id).toBe('test-id-1');
  });

  it('should create an entry with auto-generated ISO timestamp', async () => {
    const logger = new AdminActivityLogger();
    const before = new Date().toISOString();
    await logger.log({
      userId: 'u1',
      username: 'alice',
      action: 'create',
      resource: 'post',
      success: true,
    });
    const after = new Date().toISOString();
    const logs = await logger.getRecentLogs();
    expect(logs[0].timestamp >= before).toBe(true);
    expect(logs[0].timestamp <= after).toBe(true);
  });

  it('should persist the entry to disk', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({
      userId: 'u1',
      username: 'alice',
      action: 'create',
      resource: 'post',
      success: true,
    });
    const disk = readLogsFromDisk();
    expect(disk).toHaveLength(1);
    expect(disk[0].userId).toBe('u1');
  });

  it('should respect maxLogs and truncate the oldest entries', async () => {
    configureActivityLogger({ maxLogs: 3 });
    const logger = new AdminActivityLogger();
    for (let i = 0; i < 5; i++) {
      await logger.log({
        userId: `u${i}`,
        username: `user${i}`,
        action: 'action',
        resource: 'res',
        success: true,
      });
    }
    const disk = readLogsFromDisk();
    expect(disk).toHaveLength(3);
    
    expect(disk[0].userId).toBe('u2');
    expect(disk[1].userId).toBe('u3');
    expect(disk[2].userId).toBe('u4');
  });

  it('should preserve optional fields like details and resourceId', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({
      userId: 'u1',
      username: 'alice',
      action: 'update',
      resource: 'profile',
      resourceId: 'p42',
      details: { field: 'avatar', oldValue: 'a.png', newValue: 'b.png' },
      success: true,
    });
    const logs = await logger.getRecentLogs();
    expect(logs[0].resourceId).toBe('p42');
    expect(logs[0].details).toEqual({ field: 'avatar', oldValue: 'a.png', newValue: 'b.png' });
  });

  it('should preserve ip and userAgent fields', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({
      userId: 'u1',
      username: 'alice',
      action: 'login',
      resource: 'auth',
      ip: '10.0.0.1',
      userAgent: 'TestAgent/1.0',
      success: true,
    });
    const logs = await logger.getRecentLogs();
    expect(logs[0].ip).toBe('10.0.0.1');
    expect(logs[0].userAgent).toBe('TestAgent/1.0');
  });

  it('should use custom generateId from config', async () => {
    configureActivityLogger({ generateId: () => 'custom-uuid-42' });
    const logger = new AdminActivityLogger();
    await logger.log({
      userId: 'u1',
      username: 'alice',
      action: 'test',
      resource: 'res',
      success: true,
    });
    const logs = await logger.getRecentLogs();
    expect(logs[0].id).toBe('custom-uuid-42');
  });

  it('should handle file write errors gracefully', async () => {
    const logger = new AdminActivityLogger();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    configureActivityLogger({ baseDir: '/dev/null/impossible' });
    
    await logger.log({
      userId: 'u1',
      username: 'alice',
      action: 'test',
      resource: 'res',
      success: true,
    });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});





describe('AdminActivityLogger - logUserAction()', () => {
  it('should set success to true', async () => {
    const logger = new AdminActivityLogger();
    await logger.logUserAction('u1', 'alice', 'login', 'auth');
    const logs = await logger.getRecentLogs();
    expect(logs[0].success).toBe(true);
  });

  it('should extract IP from x-forwarded-for header', async () => {
    const logger = new AdminActivityLogger();
    const req = makeRequest({ 'x-forwarded-for': '1.2.3.4' });
    await logger.logUserAction('u1', 'alice', 'login', 'auth', undefined, undefined, req);
    const logs = await logger.getRecentLogs();
    expect(logs[0].ip).toBe('1.2.3.4');
  });

  it('should extract IP from x-real-ip as fallback', async () => {
    const logger = new AdminActivityLogger();
    const req = makeRequest({ 'x-real-ip': '5.6.7.8' });
    await logger.logUserAction('u1', 'alice', 'login', 'auth', undefined, undefined, req);
    const logs = await logger.getRecentLogs();
    expect(logs[0].ip).toBe('5.6.7.8');
  });

  it('should prefer x-forwarded-for over x-real-ip', async () => {
    const logger = new AdminActivityLogger();
    const req = makeRequest({ 'x-forwarded-for': '1.1.1.1', 'x-real-ip': '2.2.2.2' });
    await logger.logUserAction('u1', 'alice', 'login', 'auth', undefined, undefined, req);
    const logs = await logger.getRecentLogs();
    expect(logs[0].ip).toBe('1.1.1.1');
  });

  it('should use "unknown" when no request is provided', async () => {
    const logger = new AdminActivityLogger();
    await logger.logUserAction('u1', 'alice', 'login', 'auth');
    const logs = await logger.getRecentLogs();
    expect(logs[0].ip).toBe('unknown');
    expect(logs[0].userAgent).toBe('unknown');
  });

  it('should use "unknown" when request has no IP headers', async () => {
    const logger = new AdminActivityLogger();
    const req = makeRequest({});
    await logger.logUserAction('u1', 'alice', 'login', 'auth', undefined, undefined, req);
    const logs = await logger.getRecentLogs();
    expect(logs[0].ip).toBe('unknown');
  });

  it('should extract user-agent header', async () => {
    const logger = new AdminActivityLogger();
    const req = makeRequest({ 'user-agent': 'Mozilla/5.0 Test' });
    await logger.logUserAction('u1', 'alice', 'login', 'auth', undefined, undefined, req);
    const logs = await logger.getRecentLogs();
    expect(logs[0].userAgent).toBe('Mozilla/5.0 Test');
  });

  it('should pass through resourceId', async () => {
    const logger = new AdminActivityLogger();
    await logger.logUserAction('u1', 'alice', 'delete', 'post', 'post-99');
    const logs = await logger.getRecentLogs();
    expect(logs[0].resourceId).toBe('post-99');
  });

  it('should pass through details object', async () => {
    const logger = new AdminActivityLogger();
    await logger.logUserAction('u1', 'alice', 'update', 'settings', undefined, { theme: 'dark' });
    const logs = await logger.getRecentLogs();
    expect(logs[0].details).toEqual({ theme: 'dark' });
  });

  it('should correctly set all basic fields', async () => {
    const logger = new AdminActivityLogger();
    await logger.logUserAction('uid-42', 'bob', 'archive', 'document', 'doc-7');
    const logs = await logger.getRecentLogs();
    expect(logs[0].userId).toBe('uid-42');
    expect(logs[0].username).toBe('bob');
    expect(logs[0].action).toBe('archive');
    expect(logs[0].resource).toBe('document');
  });
});





describe('AdminActivityLogger - logFailedAction()', () => {
  it('should set success to false', async () => {
    const logger = new AdminActivityLogger();
    await logger.logFailedAction('u1', 'alice', 'delete', 'post', 'Not found');
    const logs = await logger.getRecentLogs();
    expect(logs[0].success).toBe(false);
  });

  it('should include errorMessage', async () => {
    const logger = new AdminActivityLogger();
    await logger.logFailedAction('u1', 'alice', 'delete', 'post', 'Permission denied');
    const logs = await logger.getRecentLogs();
    expect(logs[0].errorMessage).toBe('Permission denied');
  });

  it('should extract IP from request', async () => {
    const logger = new AdminActivityLogger();
    const req = makeRequest({ 'x-forwarded-for': '9.8.7.6' });
    await logger.logFailedAction('u1', 'alice', 'delete', 'post', 'Error', req);
    const logs = await logger.getRecentLogs();
    expect(logs[0].ip).toBe('9.8.7.6');
  });

  it('should extract user-agent from request', async () => {
    const logger = new AdminActivityLogger();
    const req = makeRequest({ 'user-agent': 'FailBot/1.0' });
    await logger.logFailedAction('u1', 'alice', 'delete', 'post', 'Error', req);
    const logs = await logger.getRecentLogs();
    expect(logs[0].userAgent).toBe('FailBot/1.0');
  });

  it('should use "unknown" IP and userAgent when no request provided', async () => {
    const logger = new AdminActivityLogger();
    await logger.logFailedAction('u1', 'alice', 'delete', 'post', 'Error');
    const logs = await logger.getRecentLogs();
    expect(logs[0].ip).toBe('unknown');
    expect(logs[0].userAgent).toBe('unknown');
  });

  it('should correctly set userId, username, action, and resource', async () => {
    const logger = new AdminActivityLogger();
    await logger.logFailedAction('uid-99', 'carol', 'ban', 'user', 'Timeout');
    const logs = await logger.getRecentLogs();
    expect(logs[0].userId).toBe('uid-99');
    expect(logs[0].username).toBe('carol');
    expect(logs[0].action).toBe('ban');
    expect(logs[0].resource).toBe('user');
  });
});





describe('AdminActivityLogger - getRecentLogs()', () => {
  it('should return logs in reverse chronological order', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({ userId: 'u1', username: 'a', action: 'first', resource: 'r', success: true });
    await logger.log({ userId: 'u2', username: 'b', action: 'second', resource: 'r', success: true });
    await logger.log({ userId: 'u3', username: 'c', action: 'third', resource: 'r', success: true });
    const logs = await logger.getRecentLogs();
    expect(logs[0].action).toBe('third');
    expect(logs[1].action).toBe('second');
    expect(logs[2].action).toBe('first');
  });

  it('should respect the limit parameter', async () => {
    const logger = new AdminActivityLogger();
    for (let i = 0; i < 10; i++) {
      await logger.log({ userId: `u${i}`, username: `user${i}`, action: 'a', resource: 'r', success: true });
    }
    const logs = await logger.getRecentLogs(3);
    expect(logs).toHaveLength(3);
    
    expect(logs[0].userId).toBe('u9');
    expect(logs[1].userId).toBe('u8');
    expect(logs[2].userId).toBe('u7');
  });

  it('should refresh from disk (picks up external writes)', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({ userId: 'u1', username: 'a', action: 'a', resource: 'r', success: true });

    
    const filePath = join(tmpDir, 'content/auth/logs/admin-activity.json');
    const current = JSON.parse(readFileSync(filePath, 'utf-8')) as { logs: ActivityLog[] };
    current.logs.push({
      id: 'external-1',
      timestamp: new Date().toISOString(),
      userId: 'u-ext',
      username: 'external',
      action: 'external-action',
      resource: 'r',
      success: true,
    });
    writeFileSync(filePath, JSON.stringify(current));

    const logs = await logger.getRecentLogs();
    expect(logs.some((l) => l.id === 'external-1')).toBe(true);
  });

  it('should return an empty array when there are no logs', async () => {
    const logger = new AdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs).toEqual([]);
  });

  it('should default limit to 100', async () => {
    const logger = new AdminActivityLogger();
    for (let i = 0; i < 150; i++) {
      await logger.log({ userId: `u${i}`, username: `user${i}`, action: 'a', resource: 'r', success: true });
    }
    const logs = await logger.getRecentLogs();
    expect(logs).toHaveLength(100);
  });
});





describe('AdminActivityLogger - getLogsByUser()', () => {
  it('should filter by userId', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({ userId: 'u1', username: 'a', action: 'x', resource: 'r', success: true });
    await logger.log({ userId: 'u2', username: 'b', action: 'y', resource: 'r', success: true });
    await logger.log({ userId: 'u1', username: 'a', action: 'z', resource: 'r', success: true });
    const logs = await logger.getLogsByUser('u1');
    expect(logs).toHaveLength(2);
    expect(logs.every((l) => l.userId === 'u1')).toBe(true);
  });

  it('should return empty array for unknown user', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({ userId: 'u1', username: 'a', action: 'x', resource: 'r', success: true });
    const logs = await logger.getLogsByUser('nonexistent');
    expect(logs).toEqual([]);
  });

  it('should respect the limit parameter', async () => {
    const logger = new AdminActivityLogger();
    for (let i = 0; i < 10; i++) {
      await logger.log({ userId: 'target', username: 'a', action: `a${i}`, resource: 'r', success: true });
    }
    const logs = await logger.getLogsByUser('target', 3);
    expect(logs).toHaveLength(3);
  });

  it('should return results in reverse chronological order', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({ userId: 'u1', username: 'a', action: 'first', resource: 'r', success: true });
    await logger.log({ userId: 'u1', username: 'a', action: 'second', resource: 'r', success: true });
    const logs = await logger.getLogsByUser('u1');
    expect(logs[0].action).toBe('second');
    expect(logs[1].action).toBe('first');
  });
});





describe('AdminActivityLogger - getLogsByAction()', () => {
  it('should filter by action string', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({ userId: 'u1', username: 'a', action: 'login', resource: 'auth', success: true });
    await logger.log({ userId: 'u2', username: 'b', action: 'logout', resource: 'auth', success: true });
    await logger.log({ userId: 'u3', username: 'c', action: 'login', resource: 'auth', success: true });
    const logs = await logger.getLogsByAction('login');
    expect(logs).toHaveLength(2);
    expect(logs.every((l) => l.action === 'login')).toBe(true);
  });

  it('should return empty for non-matching action', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({ userId: 'u1', username: 'a', action: 'login', resource: 'auth', success: true });
    const logs = await logger.getLogsByAction('nonexistent');
    expect(logs).toEqual([]);
  });

  it('should respect the limit parameter', async () => {
    const logger = new AdminActivityLogger();
    for (let i = 0; i < 10; i++) {
      await logger.log({ userId: `u${i}`, username: 'a', action: 'repeated', resource: 'r', success: true });
    }
    const logs = await logger.getLogsByAction('repeated', 5);
    expect(logs).toHaveLength(5);
  });

  it('should return results in reverse chronological order', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({ userId: 'u1', username: 'a', action: 'deploy', resource: 'r', success: true });
    await logger.log({ userId: 'u2', username: 'b', action: 'deploy', resource: 'r', success: true });
    const logs = await logger.getLogsByAction('deploy');
    expect(logs[0].userId).toBe('u2');
    expect(logs[1].userId).toBe('u1');
  });
});





describe('AdminActivityLogger - getLogsByResource()', () => {
  it('should filter by resource', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({ userId: 'u1', username: 'a', action: 'x', resource: 'post', success: true });
    await logger.log({ userId: 'u2', username: 'b', action: 'y', resource: 'comment', success: true });
    await logger.log({ userId: 'u3', username: 'c', action: 'z', resource: 'post', success: true });
    const logs = await logger.getLogsByResource('post');
    expect(logs).toHaveLength(2);
    expect(logs.every((l) => l.resource === 'post')).toBe(true);
  });

  it('should filter by resource AND resourceId when both provided', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({ userId: 'u1', username: 'a', action: 'x', resource: 'post', resourceId: 'p1', success: true });
    await logger.log({ userId: 'u2', username: 'b', action: 'y', resource: 'post', resourceId: 'p2', success: true });
    await logger.log({ userId: 'u3', username: 'c', action: 'z', resource: 'post', resourceId: 'p1', success: true });
    const logs = await logger.getLogsByResource('post', 'p1');
    expect(logs).toHaveLength(2);
    expect(logs.every((l) => l.resourceId === 'p1')).toBe(true);
  });

  it('should return empty for non-matching resource', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({ userId: 'u1', username: 'a', action: 'x', resource: 'post', success: true });
    const logs = await logger.getLogsByResource('nonexistent');
    expect(logs).toEqual([]);
  });

  it('should respect the limit parameter', async () => {
    const logger = new AdminActivityLogger();
    for (let i = 0; i < 10; i++) {
      await logger.log({ userId: `u${i}`, username: 'a', action: 'a', resource: 'target', success: true });
    }
    const logs = await logger.getLogsByResource('target', undefined, 4);
    expect(logs).toHaveLength(4);
  });

  it('should return results in reverse chronological order', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({ userId: 'u1', username: 'a', action: 'first', resource: 'event', success: true });
    await logger.log({ userId: 'u2', username: 'b', action: 'second', resource: 'event', success: true });
    const logs = await logger.getLogsByResource('event');
    expect(logs[0].action).toBe('second');
  });
});





describe('AdminActivityLogger - getLogsByDateRange()', () => {
  it('should return logs within the specified date range', async () => {
    seedLogFile({
      logs: [
        { id: '1', timestamp: '2025-01-15T00:00:00.000Z', userId: 'u1', username: 'a', action: 'a', resource: 'r', success: true },
        { id: '2', timestamp: '2025-02-15T00:00:00.000Z', userId: 'u2', username: 'b', action: 'b', resource: 'r', success: true },
        { id: '3', timestamp: '2025-03-15T00:00:00.000Z', userId: 'u3', username: 'c', action: 'c', resource: 'r', success: true },
      ],
    });
    const logger = new AdminActivityLogger();
    const logs = await logger.getLogsByDateRange(
      new Date('2025-02-01T00:00:00.000Z'),
      new Date('2025-03-01T00:00:00.000Z'),
    );
    expect(logs).toHaveLength(1);
    expect(logs[0].id).toBe('2');
  });

  it('should exclude logs outside the range', async () => {
    seedLogFile({
      logs: [
        { id: '1', timestamp: '2024-01-01T00:00:00.000Z', userId: 'u1', username: 'a', action: 'a', resource: 'r', success: true },
        { id: '2', timestamp: '2026-01-01T00:00:00.000Z', userId: 'u2', username: 'b', action: 'b', resource: 'r', success: true },
      ],
    });
    const logger = new AdminActivityLogger();
    const logs = await logger.getLogsByDateRange(
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-12-31T23:59:59.999Z'),
    );
    expect(logs).toHaveLength(0);
  });

  it('should include logs exactly at the boundaries', async () => {
    const exactTime = '2025-06-15T12:00:00.000Z';
    seedLogFile({
      logs: [
        { id: '1', timestamp: exactTime, userId: 'u1', username: 'a', action: 'a', resource: 'r', success: true },
      ],
    });
    const logger = new AdminActivityLogger();
    const logs = await logger.getLogsByDateRange(
      new Date(exactTime),
      new Date(exactTime),
    );
    expect(logs).toHaveLength(1);
  });

  it('should return results in reverse chronological order', async () => {
    seedLogFile({
      logs: [
        { id: '1', timestamp: '2025-06-01T00:00:00.000Z', userId: 'u1', username: 'a', action: 'first', resource: 'r', success: true },
        { id: '2', timestamp: '2025-06-15T00:00:00.000Z', userId: 'u2', username: 'b', action: 'second', resource: 'r', success: true },
      ],
    });
    const logger = new AdminActivityLogger();
    const logs = await logger.getLogsByDateRange(
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-12-31T23:59:59.999Z'),
    );
    expect(logs[0].action).toBe('second');
    expect(logs[1].action).toBe('first');
  });

  it('should return empty array when no logs match', async () => {
    const logger = new AdminActivityLogger();
    const logs = await logger.getLogsByDateRange(
      new Date('2020-01-01'),
      new Date('2020-12-31'),
    );
    expect(logs).toEqual([]);
  });
});





describe('AdminActivityLogger - getFailedActions()', () => {
  it('should return only logs with success=false', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({ userId: 'u1', username: 'a', action: 'ok', resource: 'r', success: true });
    await logger.log({ userId: 'u2', username: 'b', action: 'fail', resource: 'r', success: false, errorMessage: 'err' });
    await logger.log({ userId: 'u3', username: 'c', action: 'ok2', resource: 'r', success: true });
    await logger.log({ userId: 'u4', username: 'd', action: 'fail2', resource: 'r', success: false, errorMessage: 'err2' });
    const logs = await logger.getFailedActions();
    expect(logs).toHaveLength(2);
    expect(logs.every((l) => l.success === false)).toBe(true);
  });

  it('should respect the limit parameter', async () => {
    const logger = new AdminActivityLogger();
    for (let i = 0; i < 10; i++) {
      await logger.log({ userId: `u${i}`, username: 'a', action: 'fail', resource: 'r', success: false, errorMessage: 'e' });
    }
    const logs = await logger.getFailedActions(3);
    expect(logs).toHaveLength(3);
  });

  it('should return empty when all actions succeeded', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({ userId: 'u1', username: 'a', action: 'ok', resource: 'r', success: true });
    const logs = await logger.getFailedActions();
    expect(logs).toEqual([]);
  });

  it('should return results in reverse chronological order', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({ userId: 'u1', username: 'a', action: 'fail1', resource: 'r', success: false, errorMessage: 'e1' });
    await logger.log({ userId: 'u2', username: 'b', action: 'fail2', resource: 'r', success: false, errorMessage: 'e2' });
    const logs = await logger.getFailedActions();
    expect(logs[0].action).toBe('fail2');
    expect(logs[1].action).toBe('fail1');
  });
});





describe('AdminActivityLogger - clearOldLogs()', () => {
  it('should remove logs older than daysToKeep', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 10);

    seedLogFile({
      logs: [
        { id: '1', timestamp: oldDate.toISOString(), userId: 'u1', username: 'a', action: 'old', resource: 'r', success: true },
        { id: '2', timestamp: recentDate.toISOString(), userId: 'u2', username: 'b', action: 'recent', resource: 'r', success: true },
      ],
    });
    const logger = new AdminActivityLogger();
    const removed = await logger.clearOldLogs(90);
    expect(removed).toBe(1);
    const remaining = await logger.getRecentLogs();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].action).toBe('recent');
  });

  it('should return the count of removed logs', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 200);
    seedLogFile({
      logs: [
        { id: '1', timestamp: oldDate.toISOString(), userId: 'u1', username: 'a', action: 'a', resource: 'r', success: true },
        { id: '2', timestamp: oldDate.toISOString(), userId: 'u2', username: 'b', action: 'b', resource: 'r', success: true },
        { id: '3', timestamp: oldDate.toISOString(), userId: 'u3', username: 'c', action: 'c', resource: 'r', success: true },
      ],
    });
    const logger = new AdminActivityLogger();
    const removed = await logger.clearOldLogs(90);
    expect(removed).toBe(3);
  });

  it('should persist after clearing', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 200);
    seedLogFile({
      logs: [
        { id: '1', timestamp: oldDate.toISOString(), userId: 'u1', username: 'a', action: 'old', resource: 'r', success: true },
        { id: '2', timestamp: new Date().toISOString(), userId: 'u2', username: 'b', action: 'new', resource: 'r', success: true },
      ],
    });
    const logger = new AdminActivityLogger();
    await logger.clearOldLogs(90);
    const disk = readLogsFromDisk();
    expect(disk).toHaveLength(1);
    expect(disk[0].action).toBe('new');
  });

  it('should return 0 when no logs are old enough to remove', async () => {
    const logger = new AdminActivityLogger();
    await logger.log({ userId: 'u1', username: 'a', action: 'a', resource: 'r', success: true });
    const removed = await logger.clearOldLogs(90);
    expect(removed).toBe(0);
  });

  it('should default to 90 days when daysToKeep is not provided', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);
    seedLogFile({
      logs: [
        { id: '1', timestamp: oldDate.toISOString(), userId: 'u1', username: 'a', action: 'a', resource: 'r', success: true },
      ],
    });
    const logger = new AdminActivityLogger();
    const removed = await logger.clearOldLogs();
    expect(removed).toBe(1);
  });

  it('should handle clearing when no logs exist', async () => {
    const logger = new AdminActivityLogger();
    const removed = await logger.clearOldLogs(1);
    expect(removed).toBe(0);
  });
});





describe('getAdminActivityLogger (lazy singleton)', () => {
  it('should return the same instance on repeated calls', () => {
    const a = getAdminActivityLogger();
    const b = getAdminActivityLogger();
    expect(a).toBe(b);
  });

  it('should return a new instance after resetAdminActivityLoggerInstance()', () => {
    const a = getAdminActivityLogger();
    resetAdminActivityLoggerInstance();
    const b = getAdminActivityLogger();
    expect(a).not.toBe(b);
  });

  it('should use config set before first access', async () => {
    
    const logger = getAdminActivityLogger();
    await logger.log({ userId: 'u1', username: 'a', action: 'test', resource: 'r', success: true });
    const disk = readLogsFromDisk();
    expect(disk).toHaveLength(1);
  });

  it('should be an instance of AdminActivityLogger', () => {
    const logger = getAdminActivityLogger();
    expect(logger).toBeInstanceOf(AdminActivityLogger);
  });
});





describe('logAdminAction()', () => {
  it('should use UserContext to extract user info', async () => {
    const ctx: UserContext = { user: { id: 'uid-1', username: 'admin' } };
    await logAdminAction(ctx, 'create', 'post', 'p1');
    const logger = getAdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs[0].userId).toBe('uid-1');
    expect(logs[0].username).toBe('admin');
  });

  it('should do nothing if no user in context', async () => {
    const ctx: UserContext = {};
    await logAdminAction(ctx, 'create', 'post');
    const logger = getAdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs).toHaveLength(0);
  });

  it('should do nothing if user is undefined', async () => {
    const ctx: UserContext = { user: undefined };
    await logAdminAction(ctx, 'create', 'post');
    const logger = getAdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs).toHaveLength(0);
  });

  it('should fall back to email when username is not set', async () => {
    const ctx: UserContext = { user: { id: 'uid-2', email: 'bob@test.com' } };
    await logAdminAction(ctx, 'update', 'profile');
    const logger = getAdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs[0].username).toBe('bob@test.com');
  });

  it('should fall back to id when neither username nor email is set', async () => {
    const ctx: UserContext = { user: { id: 'uid-3' } };
    await logAdminAction(ctx, 'delete', 'comment');
    const logger = getAdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs[0].username).toBe('uid-3');
  });

  it('should prefer username over email', async () => {
    const ctx: UserContext = { user: { id: 'uid-4', username: 'alice', email: 'alice@test.com' } };
    await logAdminAction(ctx, 'view', 'dashboard');
    const logger = getAdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs[0].username).toBe('alice');
  });

  it('should pass through resourceId', async () => {
    const ctx: UserContext = { user: { id: 'uid-5', username: 'admin' } };
    await logAdminAction(ctx, 'archive', 'post', 'post-42');
    const logger = getAdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs[0].resourceId).toBe('post-42');
  });

  it('should pass through details', async () => {
    const ctx: UserContext = { user: { id: 'uid-6', username: 'admin' } };
    await logAdminAction(ctx, 'update', 'settings', undefined, { theme: 'dark' });
    const logger = getAdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs[0].details).toEqual({ theme: 'dark' });
  });

  it('should pass through request for IP extraction', async () => {
    const ctx: UserContext = { user: { id: 'uid-7', username: 'admin' } };
    const req = makeRequest({ 'x-forwarded-for': '10.0.0.5' });
    await logAdminAction(ctx, 'login', 'auth', undefined, undefined, req);
    const logger = getAdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs[0].ip).toBe('10.0.0.5');
  });

  it('should set action and resource correctly', async () => {
    const ctx: UserContext = { user: { id: 'uid-8', username: 'mod' } };
    await logAdminAction(ctx, 'moderate', 'comment');
    const logger = getAdminActivityLogger();
    const logs = await logger.getRecentLogs();
    expect(logs[0].action).toBe('moderate');
    expect(logs[0].resource).toBe('comment');
  });
});





describe('Integration scenarios', () => {
  it('should maintain state across multiple sequential operations', async () => {
    const logger = new AdminActivityLogger();
    await logger.logUserAction('u1', 'alice', 'login', 'auth');
    await logger.logUserAction('u2', 'bob', 'create', 'post', 'p1');
    await logger.logFailedAction('u1', 'alice', 'delete', 'post', 'Forbidden');
    await logger.logUserAction('u1', 'alice', 'logout', 'auth');

    const all = await logger.getRecentLogs();
    expect(all).toHaveLength(4);

    const aliceLogs = await logger.getLogsByUser('u1');
    expect(aliceLogs).toHaveLength(3);

    const failed = await logger.getFailedActions();
    expect(failed).toHaveLength(1);
    expect(failed[0].errorMessage).toBe('Forbidden');

    const postLogs = await logger.getLogsByResource('post');
    expect(postLogs).toHaveLength(2);
  });

  it('should handle concurrent-like rapid writes correctly', async () => {
    const logger = new AdminActivityLogger();
    const promises = Array.from({ length: 20 }, (_, i) =>
      logger.log({
        userId: `u${i}`,
        username: `user${i}`,
        action: 'rapid',
        resource: 'stress',
        success: true,
      }),
    );
    await Promise.all(promises);
    const logs = await logger.getRecentLogs(20);
    expect(logs).toHaveLength(20);
  });

  it('should survive a construct-log-query cycle with custom config', async () => {
    configureActivityLogger({
      logSubPath: 'custom/path/audit.json',
      maxLogs: 5,
    });
    const logger = new AdminActivityLogger();
    for (let i = 0; i < 8; i++) {
      await logger.log({
        userId: `u${i}`,
        username: `user${i}`,
        action: 'action',
        resource: 'res',
        success: true,
      });
    }
    const logs = await logger.getRecentLogs();
    expect(logs).toHaveLength(5);

    
    const customFile = join(tmpDir, 'custom/path/audit.json');
    const raw = readFileSync(customFile, 'utf-8');
    const parsed = JSON.parse(raw) as { logs: ActivityLog[] };
    expect(parsed.logs).toHaveLength(5);
  });

  it('should work with a fresh logger reading logs written by another instance', async () => {
    const logger1 = new AdminActivityLogger();
    await logger1.log({ userId: 'u1', username: 'writer', action: 'write', resource: 'r', success: true });

    const logger2 = new AdminActivityLogger();
    const logs = await logger2.getRecentLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].username).toBe('writer');
  });

  it('should handle empty username gracefully in logAdminAction fallback chain', async () => {
    const ctx: UserContext = { user: { id: 'uid-empty', username: '', email: '' } };
    await logAdminAction(ctx, 'test', 'res');
    const logger = getAdminActivityLogger();
    const logs = await logger.getRecentLogs();
    
    expect(logs[0].username).toBe('uid-empty');
  });
});
