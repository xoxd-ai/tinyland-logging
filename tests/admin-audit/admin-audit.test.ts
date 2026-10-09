import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  configureAdminAudit,
  resetAdminAuditConfig,
  type AuditRequestEvent,
  type Logger,
} from '../../src/admin-audit/config.js';
import {
  extractClientContext,
  calculateChangedFields,
  logAdminAction,
  logAdminActionFailure,
  logUserManagement,
  logPermissionChange,
  logContentManagement,
} from '../../src/admin-audit/admin-audit.js';





function createMockLogger(): Logger & {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
} {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createMockEvent(overrides?: Partial<AuditRequestEvent>): AuditRequestEvent {
  return {
    getClientAddress: () => '192.168.1.1',
    request: {
      headers: {
        get: (name: string) => (name === 'user-agent' ? 'Mozilla/5.0' : null),
      },
      method: 'POST',
    },
    url: { pathname: '/admin/users' },
    locals: {
      user: {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@test.com',
        role: 'super_admin',
      },
      session: {
        id: 'session-1',
        browserFingerprint: 'fp-123',
      },
    },
    ...overrides,
  };
}





let mockLogger: ReturnType<typeof createMockLogger>;

beforeEach(() => {
  resetAdminAuditConfig();
  mockLogger = createMockLogger();
  configureAdminAudit({
    createLogger: () => mockLogger,
    hashIp: (ip) => `hashed_${ip}`,
    maskIp: (ip) => `masked_${ip}`,
    detectDeviceType: (ua) => (ua.includes('Mobile') ? 'mobile' : 'desktop'),
    generateId: () => 'test-uuid-1234',
  });
});





describe('extractClientContext', () => {
  it('should return hashed IP from config.hashIp', () => {
    const event = createMockEvent();
    const ctx = extractClientContext(event);
    expect(ctx.clientIpHash).toBe('hashed_192.168.1.1');
  });

  it('should return masked IP from config.maskIp', () => {
    const event = createMockEvent();
    const ctx = extractClientContext(event);
    expect(ctx.clientIpMasked).toBe('masked_192.168.1.1');
  });

  it('should return the raw client IP', () => {
    const event = createMockEvent();
    const ctx = extractClientContext(event);
    expect(ctx.clientIp).toBe('192.168.1.1');
  });

  it('should return device type from config.detectDeviceType', () => {
    const event = createMockEvent();
    const ctx = extractClientContext(event);
    expect(ctx.deviceType).toBe('desktop');
  });

  it('should detect mobile device type from user agent', () => {
    const event = createMockEvent({
      request: {
        headers: { get: (name: string) => (name === 'user-agent' ? 'Mozilla Mobile' : null) },
        method: 'GET',
      },
    });
    const ctx = extractClientContext(event);
    expect(ctx.deviceType).toBe('mobile');
  });

  it('should return user agent string', () => {
    const event = createMockEvent();
    const ctx = extractClientContext(event);
    expect(ctx.userAgent).toBe('Mozilla/5.0');
  });

  it('should default user agent to "unknown" when header is missing', () => {
    const event = createMockEvent({
      request: {
        headers: { get: () => null },
        method: 'GET',
      },
    });
    const ctx = extractClientContext(event);
    expect(ctx.userAgent).toBe('unknown');
  });

  it('should fallback to 127.0.0.1 when getClientAddress throws', () => {
    const event = createMockEvent({
      getClientAddress: () => {
        throw new Error('No client address available');
      },
    });
    const ctx = extractClientContext(event);
    expect(ctx.clientIp).toBe('127.0.0.1');
    expect(ctx.clientIpHash).toBe('hashed_127.0.0.1');
    expect(ctx.clientIpMasked).toBe('masked_127.0.0.1');
  });

  it('should handle IPv6 addresses', () => {
    const event = createMockEvent({
      getClientAddress: () => '::1',
    });
    const ctx = extractClientContext(event);
    expect(ctx.clientIp).toBe('::1');
    expect(ctx.clientIpHash).toBe('hashed_::1');
  });

  it('should handle empty string user agent', () => {
    const event = createMockEvent({
      request: {
        headers: { get: (name: string) => (name === 'user-agent' ? '' : null) },
        method: 'GET',
      },
    });
    const ctx = extractClientContext(event);
    
    expect(ctx.userAgent).toBe('unknown');
  });
});





describe('calculateChangedFields', () => {
  it('should return empty array when before is undefined', () => {
    expect(calculateChangedFields(undefined, { a: 1 })).toEqual([]);
  });

  it('should return empty array when after is undefined', () => {
    expect(calculateChangedFields({ a: 1 }, undefined)).toEqual([]);
  });

  it('should return empty array when both are undefined', () => {
    expect(calculateChangedFields(undefined, undefined)).toEqual([]);
  });

  it('should return empty array when before and after are identical', () => {
    const obj = { a: 1, b: 'hello' };
    expect(calculateChangedFields(obj, { ...obj })).toEqual([]);
  });

  it('should detect a single changed field', () => {
    const before = { role: 'user', name: 'Alice' };
    const after = { role: 'admin', name: 'Alice' };
    expect(calculateChangedFields(before, after)).toEqual(['role']);
  });

  it('should detect multiple changed fields', () => {
    const before = { role: 'user', name: 'Alice', status: 'active' };
    const after = { role: 'admin', name: 'Bob', status: 'active' };
    const result = calculateChangedFields(before, after);
    expect(result).toContain('role');
    expect(result).toContain('name');
    expect(result).toHaveLength(2);
  });

  it('should detect added fields', () => {
    const before = { a: 1 };
    const after = { a: 1, b: 2 };
    expect(calculateChangedFields(before, after)).toEqual(['b']);
  });

  it('should detect removed fields', () => {
    const before = { a: 1, b: 2 };
    const after = { a: 1 };
    expect(calculateChangedFields(before, after)).toEqual(['b']);
  });

  it('should detect nested object changes via JSON comparison', () => {
    const before = { config: { theme: 'dark' } };
    const after = { config: { theme: 'light' } };
    expect(calculateChangedFields(before, after)).toEqual(['config']);
  });

  it('should handle empty objects', () => {
    expect(calculateChangedFields({}, {})).toEqual([]);
  });

  it('should detect all fields changed when before is empty', () => {
    const after = { a: 1, b: 2 };
    expect(calculateChangedFields({}, after)).toEqual(['a', 'b']);
  });

  it('should detect all fields changed when after is empty', () => {
    const before = { a: 1, b: 2 };
    expect(calculateChangedFields(before, {})).toEqual(['a', 'b']);
  });

  it('should handle null values in fields', () => {
    const before = { a: null };
    const after = { a: 'value' };
    expect(calculateChangedFields(before, after)).toEqual(['a']);
  });

  it('should treat null and undefined as different', () => {
    const before = { a: null };
    const after = { a: undefined };
    expect(calculateChangedFields(before, after)).toEqual(['a']);
  });

  it('should handle array values', () => {
    const before = { tags: ['a', 'b'] };
    const after = { tags: ['a', 'c'] };
    expect(calculateChangedFields(before, after)).toEqual(['tags']);
  });

  it('should consider identical arrays as unchanged', () => {
    const before = { tags: [1, 2, 3] };
    const after = { tags: [1, 2, 3] };
    expect(calculateChangedFields(before, after)).toEqual([]);
  });

  it('should handle boolean changes', () => {
    const before = { active: true };
    const after = { active: false };
    expect(calculateChangedFields(before, after)).toEqual(['active']);
  });

  it('should handle numeric changes', () => {
    const before = { count: 0 };
    const after = { count: 42 };
    expect(calculateChangedFields(before, after)).toEqual(['count']);
  });
});





describe('logAdminAction', () => {
  it('should log with full context when user is authenticated', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'CREATE', 'user', {
      resourceId: 'u-1',
      resourceName: 'new-user',
    });
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    const [message, meta] = mockLogger.info.mock.calls[0];
    expect(message).toBe('Admin CREATE: user/u-1');
    expect(meta['admin.action']).toBe('CREATE');
    expect(meta['admin.user_id']).toBe('admin-1');
    expect(meta['admin.username']).toBe('admin');
    expect(meta['admin.role']).toBe('super_admin');
    expect(meta['resource.type']).toBe('user');
    expect(meta['resource.id']).toBe('u-1');
    expect(meta['resource.name']).toBe('new-user');
  });

  it('should warn and return when no user is authenticated', async () => {
    const event = createMockEvent({
      locals: { user: undefined, session: undefined },
    });
    await logAdminAction(event, 'DELETE', 'user');
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).not.toHaveBeenCalled();
    const [msg, meta] = mockLogger.warn.mock.calls[0];
    expect(msg).toContain('without authentication');
    expect(meta.action).toBe('DELETE');
    expect(meta.resource_type).toBe('user');
  });

  it('should include trace_id and span_id from config.generateId', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'VIEW', 'settings');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta.trace_id).toBe('test-uuid-1234');
    expect(meta.span_id).toBe('test-uuid-1234');
  });

  it('should include client IP hash from config.hashIp', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'VIEW', 'user');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['client.ip_hash']).toBe('hashed_192.168.1.1');
  });

  it('should include device type from config.detectDeviceType', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'VIEW', 'user');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['client.device_type']).toBe('desktop');
  });

  it('should include session ID', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'VIEW', 'user');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['session.id']).toBe('session-1');
  });

  it('should default session to "no-session" when missing', async () => {
    const event = createMockEvent({
      locals: {
        user: { id: 'u1', role: 'admin' },
        session: undefined,
      },
    });
    await logAdminAction(event, 'VIEW', 'user');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['session.id']).toBe('no-session');
  });

  it('should include HTTP method and path', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'CREATE', 'user');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['http.method']).toBe('POST');
    expect(meta['http.path']).toBe('/admin/users');
  });

  it('should include changes.fields_changed when before/after differ', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'UPDATE', 'user', {
      before: { role: 'user' },
      after: { role: 'admin' },
    });
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['changes.fields_changed']).toBe('role');
    expect(meta['changes.count']).toBe(1);
  });

  it('should not include changes.fields_changed when no changes', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'UPDATE', 'user', {
      before: { role: 'admin' },
      after: { role: 'admin' },
    });
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['changes.fields_changed']).toBeUndefined();
    expect(meta['changes.count']).toBeUndefined();
  });

  it('should include duration_ms when provided', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'EXPORT', 'file', { durationMs: 1500 });
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta.duration_ms).toBe(1500);
  });

  it('should not include duration_ms when not provided', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'VIEW', 'user');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta.duration_ms).toBeUndefined();
  });

  it('should format message without resource ID when not provided', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'VIEW', 'settings');
    const [message] = mockLogger.info.mock.calls[0];
    expect(message).toBe('Admin VIEW: settings');
  });

  it('should format message with resource ID when provided', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'DELETE', 'user', { resourceId: 'u-42' });
    const [message] = mockLogger.info.mock.calls[0];
    expect(message).toBe('Admin DELETE: user/u-42');
  });

  it('should use username as admin_username by preference', async () => {
    const event = createMockEvent({
      locals: {
        user: { id: 'u1', username: 'myname', email: 'e@e.com', handle: 'h', role: 'admin' },
        session: { id: 's1' },
      },
    });
    await logAdminAction(event, 'VIEW', 'user');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['admin.username']).toBe('myname');
  });

  it('should fallback to email when username is missing', async () => {
    const event = createMockEvent({
      locals: {
        user: { id: 'u1', email: 'fallback@email.com', role: 'admin' },
        session: { id: 's1' },
      },
    });
    await logAdminAction(event, 'VIEW', 'user');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['admin.username']).toBe('fallback@email.com');
  });

  it('should fallback to handle when username and email are missing', async () => {
    const event = createMockEvent({
      locals: {
        user: { id: 'u1', handle: 'myhandle', role: 'admin' },
        session: { id: 's1' },
      },
    });
    await logAdminAction(event, 'VIEW', 'user');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['admin.username']).toBe('myhandle');
  });

  it('should fallback to "unknown" when no username fields exist', async () => {
    const event = createMockEvent({
      locals: {
        user: { id: 'u1', role: 'admin' },
        session: { id: 's1' },
      },
    });
    await logAdminAction(event, 'VIEW', 'user');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['admin.username']).toBe('unknown');
  });

  it('should default admin_role to "unknown" when role is missing', async () => {
    const event = createMockEvent({
      locals: {
        user: { id: 'u1', username: 'noRole' },
        session: { id: 's1' },
      },
    });
    await logAdminAction(event, 'VIEW', 'user');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['admin.role']).toBe('unknown');
  });

  it('should handle empty options object', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'VIEW', 'settings', {});
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
  });

  it('should handle no options argument at all', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'VIEW', 'settings');
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
  });

  it('should include metadata when provided', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'UPDATE', 'user', {
      metadata: { reason: 'policy update' },
    });
    
    
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
  });

  it('should include changes object when only before is provided', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'DELETE', 'user', {
      before: { status: 'active' },
    });
    
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
  });

  it('should include changes object when only after is provided', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'CREATE', 'user', {
      after: { status: 'active' },
    });
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
  });

  it('should not include changes when neither before nor after is provided', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'VIEW', 'user');
    
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['changes.fields_changed']).toBeUndefined();
    expect(meta['changes.count']).toBeUndefined();
  });

  it('should handle multiple field changes', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'UPDATE', 'profile', {
      before: { name: 'Old', bio: 'Old bio', theme: 'dark' },
      after: { name: 'New', bio: 'New bio', theme: 'dark' },
    });
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['changes.fields_changed']).toContain('name');
    expect(meta['changes.fields_changed']).toContain('bio');
    expect(meta['changes.count']).toBe(2);
  });

  it('should work with all AdminAction types', async () => {
    const actions = [
      'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT',
      'IMPORT', 'LOGIN', 'LOGOUT', 'PERMISSION_CHANGE', 'INVITE', 'REVOKE',
    ] as const;
    const event = createMockEvent();
    for (const action of actions) {
      mockLogger.info.mockClear();
      await logAdminAction(event, action, 'user');
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      const [message] = mockLogger.info.mock.calls[0];
      expect(message).toContain(action);
    }
  });

  it('should work with all ResourceType types', async () => {
    const types = [
      'user', 'profile', 'post', 'event', 'video', 'product',
      'program', 'invitation', 'settings', 'permission', 'session', 'file',
    ] as const;
    const event = createMockEvent();
    for (const rt of types) {
      mockLogger.info.mockClear();
      await logAdminAction(event, 'VIEW', rt);
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      const [message] = mockLogger.info.mock.calls[0];
      expect(message).toContain(rt);
    }
  });
});





describe('logAdminActionFailure', () => {
  it('should log error with context for Error objects', async () => {
    const event = createMockEvent();
    const error = new Error('Something broke');
    await logAdminActionFailure(event, 'DELETE', 'user', error, { resourceId: 'u-1' });
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    const [message, meta] = mockLogger.error.mock.calls[0];
    expect(message).toBe('Admin DELETE FAILED: user/u-1');
    expect(meta['error.message']).toBe('Something broke');
    expect(meta['error.type']).toBe('Error');
  });

  it('should log error with context for string errors', async () => {
    const event = createMockEvent();
    await logAdminActionFailure(event, 'UPDATE', 'settings', 'Permission denied');
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    const [, meta] = mockLogger.error.mock.calls[0];
    expect(meta['error.message']).toBe('Permission denied');
    expect(meta['error.type']).toBe('string');
  });

  it('should set level to error in metadata', async () => {
    const event = createMockEvent();
    await logAdminActionFailure(event, 'DELETE', 'user', 'fail');
    const [, meta] = mockLogger.error.mock.calls[0];
    expect(meta.level).toBe('error');
  });

  it('should return early when no user is authenticated', async () => {
    const event = createMockEvent({
      locals: { user: undefined },
    });
    await logAdminActionFailure(event, 'DELETE', 'user', 'fail');
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should include trace and span IDs', async () => {
    const event = createMockEvent();
    await logAdminActionFailure(event, 'CREATE', 'user', 'fail');
    const [, meta] = mockLogger.error.mock.calls[0];
    expect(meta.trace_id).toBe('test-uuid-1234');
    expect(meta.span_id).toBe('test-uuid-1234');
  });

  it('should include admin context', async () => {
    const event = createMockEvent();
    await logAdminActionFailure(event, 'UPDATE', 'user', 'fail');
    const [, meta] = mockLogger.error.mock.calls[0];
    expect(meta['admin.user_id']).toBe('admin-1');
    expect(meta['admin.username']).toBe('admin');
    expect(meta['admin.role']).toBe('super_admin');
  });

  it('should include resource context', async () => {
    const event = createMockEvent();
    await logAdminActionFailure(event, 'DELETE', 'post', 'fail', {
      resourceId: 'p-42',
      resourceName: 'My Post',
    });
    const [, meta] = mockLogger.error.mock.calls[0];
    expect(meta['resource.type']).toBe('post');
    expect(meta['resource.id']).toBe('p-42');
    expect(meta['resource.name']).toBe('My Post');
  });

  it('should include client context', async () => {
    const event = createMockEvent();
    await logAdminActionFailure(event, 'DELETE', 'user', 'fail');
    const [, meta] = mockLogger.error.mock.calls[0];
    expect(meta['client.ip_hash']).toBe('hashed_192.168.1.1');
    expect(meta['client.device_type']).toBe('desktop');
  });

  it('should include duration_ms when provided', async () => {
    const event = createMockEvent();
    await logAdminActionFailure(event, 'DELETE', 'user', 'fail', { durationMs: 500 });
    const [, meta] = mockLogger.error.mock.calls[0];
    expect(meta.duration_ms).toBe(500);
  });

  it('should format message without resource ID when not provided', async () => {
    const event = createMockEvent();
    await logAdminActionFailure(event, 'DELETE', 'user', 'fail');
    const [message] = mockLogger.error.mock.calls[0];
    expect(message).toBe('Admin DELETE FAILED: user');
  });

  it('should handle custom Error subclass', async () => {
    class CustomError extends TypeError {
      constructor(msg: string) {
        super(msg);
        this.name = 'CustomError';
      }
    }
    const event = createMockEvent();
    await logAdminActionFailure(event, 'UPDATE', 'user', new CustomError('type mismatch'));
    const [, meta] = mockLogger.error.mock.calls[0];
    expect(meta['error.message']).toBe('type mismatch');
    expect(meta['error.type']).toBe('CustomError');
  });

  it('should default browser_fingerprint to "no-fingerprint" when session has no fingerprint', async () => {
    const event = createMockEvent({
      locals: {
        user: { id: 'u1', role: 'admin' },
        session: { id: 's1' },
      },
    });
    await logAdminActionFailure(event, 'DELETE', 'user', 'fail');
    
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
  });

  it('should default session_id to "no-session" when session is missing', async () => {
    const event = createMockEvent({
      locals: {
        user: { id: 'u1', role: 'admin' },
        session: undefined,
      },
    });
    await logAdminActionFailure(event, 'DELETE', 'user', 'fail');
    const [, meta] = mockLogger.error.mock.calls[0];
    expect(meta['session.id']).toBe('no-session');
  });

  it('should include HTTP method and path', async () => {
    const event = createMockEvent();
    await logAdminActionFailure(event, 'DELETE', 'user', 'fail');
    const [, meta] = mockLogger.error.mock.calls[0];
    expect(meta['http.method']).toBe('POST');
    expect(meta['http.path']).toBe('/admin/users');
  });
});





describe('logUserManagement', () => {
  it('should delegate to logAdminAction with "user" resource type', async () => {
    const event = createMockEvent();
    await logUserManagement(event, 'CREATE', 'u-new', 'newuser@test.com');
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    const [message, meta] = mockLogger.info.mock.calls[0];
    expect(message).toBe('Admin CREATE: user/u-new');
    expect(meta['resource.type']).toBe('user');
    expect(meta['resource.id']).toBe('u-new');
    expect(meta['resource.name']).toBe('newuser@test.com');
  });

  it('should pass before/after state for UPDATE', async () => {
    const event = createMockEvent();
    await logUserManagement(
      event,
      'UPDATE',
      'u-1',
      'user@test.com',
      { status: 'active' },
      { status: 'suspended' },
    );
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['changes.fields_changed']).toBe('status');
    expect(meta['changes.count']).toBe(1);
  });

  it('should handle CREATE action', async () => {
    const event = createMockEvent();
    await logUserManagement(event, 'CREATE', 'u-2', 'alice');
    const [message] = mockLogger.info.mock.calls[0];
    expect(message).toContain('CREATE');
  });

  it('should handle DELETE action', async () => {
    const event = createMockEvent();
    await logUserManagement(event, 'DELETE', 'u-3', 'bob');
    const [message] = mockLogger.info.mock.calls[0];
    expect(message).toContain('DELETE');
  });

  it('should handle INVITE action', async () => {
    const event = createMockEvent();
    await logUserManagement(event, 'INVITE', 'u-4', 'charlie@test.com');
    const [message] = mockLogger.info.mock.calls[0];
    expect(message).toContain('INVITE');
  });

  it('should work without before/after args', async () => {
    const event = createMockEvent();
    await logUserManagement(event, 'DELETE', 'u-5', 'deleteduser');
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
  });

  it('should return early when no user is authenticated', async () => {
    const event = createMockEvent({ locals: { user: undefined } });
    await logUserManagement(event, 'CREATE', 'u-1', 'test');
    expect(mockLogger.info).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });
});





describe('logPermissionChange', () => {
  it('should log role change with before/after', async () => {
    const event = createMockEvent();
    await logPermissionChange(event, 'u-1', 'alice', 'member', 'admin');
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    const [message, meta] = mockLogger.info.mock.calls[0];
    expect(message).toContain('PERMISSION_CHANGE');
    expect(meta['changes.fields_changed']).toBe('role');
    expect(meta['changes.count']).toBe(1);
  });

  it('should use "permission" as resource type', async () => {
    const event = createMockEvent();
    await logPermissionChange(event, 'u-1', 'alice', 'member', 'admin');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['resource.type']).toBe('permission');
  });

  it('should include userId as resource ID', async () => {
    const event = createMockEvent();
    await logPermissionChange(event, 'u-42', 'bob', 'viewer', 'editor');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['resource.id']).toBe('u-42');
  });

  it('should include userName as resource name', async () => {
    const event = createMockEvent();
    await logPermissionChange(event, 'u-42', 'bob', 'viewer', 'editor');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['resource.name']).toBe('bob');
  });

  it('should detect no change when old and new role are the same', async () => {
    const event = createMockEvent();
    await logPermissionChange(event, 'u-1', 'alice', 'admin', 'admin');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['changes.fields_changed']).toBeUndefined();
    expect(meta['changes.count']).toBeUndefined();
  });

  it('should return early when no user is authenticated', async () => {
    const event = createMockEvent({ locals: { user: undefined } });
    await logPermissionChange(event, 'u-1', 'alice', 'member', 'admin');
    expect(mockLogger.info).not.toHaveBeenCalled();
  });
});





describe('logContentManagement', () => {
  it('should delegate to logAdminAction with correct content type', async () => {
    const event = createMockEvent();
    await logContentManagement(event, 'CREATE', 'post', 'p-1', 'My Post');
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    const [message, meta] = mockLogger.info.mock.calls[0];
    expect(message).toBe('Admin CREATE: post/p-1');
    expect(meta['resource.type']).toBe('post');
    expect(meta['resource.id']).toBe('p-1');
    expect(meta['resource.name']).toBe('My Post');
  });

  it('should handle "event" content type', async () => {
    const event = createMockEvent();
    await logContentManagement(event, 'CREATE', 'event', 'e-1', 'Pride Parade');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['resource.type']).toBe('event');
  });

  it('should handle "profile" content type', async () => {
    const event = createMockEvent();
    await logContentManagement(event, 'UPDATE', 'profile', 'pr-1', 'User Profile');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['resource.type']).toBe('profile');
  });

  it('should handle "video" content type', async () => {
    const event = createMockEvent();
    await logContentManagement(event, 'DELETE', 'video', 'v-1', 'Tutorial');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['resource.type']).toBe('video');
  });

  it('should handle "product" content type', async () => {
    const event = createMockEvent();
    await logContentManagement(event, 'CREATE', 'product', 'prod-1', 'T-Shirt');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['resource.type']).toBe('product');
  });

  it('should handle "program" content type', async () => {
    const event = createMockEvent();
    await logContentManagement(event, 'UPDATE', 'program', 'prog-1', 'Mentorship');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['resource.type']).toBe('program');
  });

  it('should pass before/after state for UPDATE', async () => {
    const event = createMockEvent();
    await logContentManagement(
      event,
      'UPDATE',
      'post',
      'p-1',
      'My Post',
      { title: 'Old Title' },
      { title: 'New Title' },
    );
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['changes.fields_changed']).toBe('title');
    expect(meta['changes.count']).toBe(1);
  });

  it('should work without before/after args', async () => {
    const event = createMockEvent();
    await logContentManagement(event, 'DELETE', 'post', 'p-1', 'Deleted Post');
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
  });

  it('should return early when no user is authenticated', async () => {
    const event = createMockEvent({ locals: { user: undefined } });
    await logContentManagement(event, 'CREATE', 'post', 'p-1', 'Post');
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('should handle CREATE action correctly', async () => {
    const event = createMockEvent();
    await logContentManagement(event, 'CREATE', 'video', 'v-2', 'New Video');
    const [message] = mockLogger.info.mock.calls[0];
    expect(message).toContain('CREATE');
  });

  it('should handle DELETE action correctly', async () => {
    const event = createMockEvent();
    await logContentManagement(event, 'DELETE', 'product', 'prod-2', 'Old Product');
    const [message] = mockLogger.info.mock.calls[0];
    expect(message).toContain('DELETE');
  });
});





describe('edge cases', () => {
  it('should handle event with GET method', async () => {
    const event = createMockEvent({
      request: {
        headers: { get: (name: string) => (name === 'user-agent' ? 'TestBot' : null) },
        method: 'GET',
      },
    });
    await logAdminAction(event, 'VIEW', 'user');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['http.method']).toBe('GET');
  });

  it('should handle event with DELETE method', async () => {
    const event = createMockEvent({
      request: {
        headers: { get: (name: string) => (name === 'user-agent' ? 'TestBot' : null) },
        method: 'DELETE',
      },
    });
    await logAdminAction(event, 'DELETE', 'user');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['http.method']).toBe('DELETE');
  });

  it('should handle event with PATCH method', async () => {
    const event = createMockEvent({
      request: {
        headers: { get: (name: string) => (name === 'user-agent' ? 'TestBot' : null) },
        method: 'PATCH',
      },
    });
    await logAdminAction(event, 'UPDATE', 'user');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['http.method']).toBe('PATCH');
  });

  it('should handle deeply nested pathname', async () => {
    const event = createMockEvent({
      url: { pathname: '/admin/v2/users/u-123/permissions/roles' },
    });
    await logAdminAction(event, 'UPDATE', 'permission');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['http.path']).toBe('/admin/v2/users/u-123/permissions/roles');
  });

  it('should handle session with id but no fingerprint', async () => {
    const event = createMockEvent({
      locals: {
        user: { id: 'u1', role: 'admin' },
        session: { id: 'sess-no-fp' },
      },
    });
    await logAdminAction(event, 'VIEW', 'user');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['session.id']).toBe('sess-no-fp');
  });

  it('should handle empty metadata object', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'VIEW', 'user', { metadata: {} });
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
  });

  it('should handle resource name with special characters', async () => {
    const event = createMockEvent();
    await logAdminAction(event, 'CREATE', 'post', {
      resourceId: 'p-1',
      resourceName: 'Post with <script> & "quotes"',
    });
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['resource.name']).toBe('Post with <script> & "quotes"');
  });

  it('should handle very long user agent string', async () => {
    const longUA = 'Mozilla/5.0 ' + 'x'.repeat(500);
    const event = createMockEvent({
      request: {
        headers: { get: (name: string) => (name === 'user-agent' ? longUA : null) },
        method: 'GET',
      },
    });
    const ctx = extractClientContext(event);
    expect(ctx.userAgent).toBe(longUA);
  });

  it('should handle concurrent logAdminAction calls', async () => {
    const event = createMockEvent();
    await Promise.all([
      logAdminAction(event, 'CREATE', 'user', { resourceId: 'u1' }),
      logAdminAction(event, 'UPDATE', 'profile', { resourceId: 'p1' }),
      logAdminAction(event, 'DELETE', 'post', { resourceId: 'po1' }),
    ]);
    expect(mockLogger.info).toHaveBeenCalledTimes(3);
  });

  it('should handle session with empty string id', async () => {
    const event = createMockEvent({
      locals: {
        user: { id: 'u1', role: 'admin' },
        session: { id: '' },
      },
    });
    await logAdminAction(event, 'VIEW', 'user');
    const [, meta] = mockLogger.info.mock.calls[0];
    
    expect(meta['session.id']).toBe('no-session');
  });

  it('should handle user with all fields populated', async () => {
    const event = createMockEvent({
      locals: {
        user: {
          id: 'u-full',
          username: 'fulluser',
          email: 'full@test.com',
          handle: '@full',
          role: 'super_admin',
        },
        session: { id: 's-full', browserFingerprint: 'fp-full' },
      },
    });
    await logAdminAction(event, 'VIEW', 'settings');
    const [, meta] = mockLogger.info.mock.calls[0];
    expect(meta['admin.user_id']).toBe('u-full');
    expect(meta['admin.username']).toBe('fulluser'); 
    expect(meta['admin.role']).toBe('super_admin');
  });
});
