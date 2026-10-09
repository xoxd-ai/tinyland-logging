






import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

import type { ActivityLog, UserContext } from './types.js';
import { getActivityLoggerConfig } from './config.js';




function resolveLogFilePath(): string {
  const config = getActivityLoggerConfig();
  return join(config.baseDir, config.logSubPath);
}

export class AdminActivityLogger {
  private logs: ActivityLog[] = [];

  constructor() {
    this.ensureLogDirectory();
    this.loadLogs();
  }

  private ensureLogDirectory(): void {
    try {
      const dir = dirname(resolveLogFilePath());
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    } catch {
      console.error('Failed to create activity log directory');
    }
  }

  private loadLogs(): void {
    try {
      const filePath = resolveLogFilePath();
      if (existsSync(filePath)) {
        const data = readFileSync(filePath, 'utf-8');
        const parsed: unknown = JSON.parse(data);
        if (Array.isArray(parsed)) {
          this.logs = parsed as ActivityLog[];
        } else if (
          parsed !== null &&
          typeof parsed === 'object' &&
          'logs' in parsed &&
          Array.isArray((parsed as Record<string, unknown>).logs)
        ) {
          this.logs = (parsed as { logs: ActivityLog[] }).logs;
        } else {
          this.logs = [];
        }
      }
    } catch {
      console.error('Failed to load activity logs');
      this.logs = [];
    }
  }

  private saveLogs(): void {
    try {
      const config = getActivityLoggerConfig();
      if (this.logs.length > config.maxLogs) {
        this.logs = this.logs.slice(-config.maxLogs);
      }
      const filePath = resolveLogFilePath();
      writeFileSync(filePath, JSON.stringify({ logs: this.logs }, null, 2));
    } catch {
      console.error('Failed to save activity logs');
    }
  }

  async log(entry: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
    const config = getActivityLoggerConfig();
    const log: ActivityLog = {
      ...entry,
      id: config.generateId(),
      timestamp: new Date().toISOString(),
    };
    this.logs.push(log);
    this.saveLogs();
  }

  async logUserAction(
    userId: string,
    username: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, unknown>,
    request?: Request,
  ): Promise<void> {
    const ip =
      request?.headers.get('x-forwarded-for') ||
      request?.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request?.headers.get('user-agent') || 'unknown';
    await this.log({
      userId,
      username,
      action,
      resource,
      resourceId,
      details,
      ip: ip.toString(),
      userAgent,
      success: true,
    });
  }

  async logFailedAction(
    userId: string,
    username: string,
    action: string,
    resource: string,
    errorMessage: string,
    request?: Request,
  ): Promise<void> {
    const ip =
      request?.headers.get('x-forwarded-for') ||
      request?.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request?.headers.get('user-agent') || 'unknown';
    await this.log({
      userId,
      username,
      action,
      resource,
      ip: ip.toString(),
      userAgent,
      success: false,
      errorMessage,
    });
  }

  async getRecentLogs(limit: number = 100): Promise<ActivityLog[]> {
    this.loadLogs();
    return this.logs.slice(-limit).reverse();
  }

  async getLogsByUser(userId: string, limit: number = 100): Promise<ActivityLog[]> {
    this.loadLogs();
    return this.logs.filter((log) => log.userId === userId).slice(-limit).reverse();
  }

  async getLogsByAction(action: string, limit: number = 100): Promise<ActivityLog[]> {
    this.loadLogs();
    return this.logs.filter((log) => log.action === action).slice(-limit).reverse();
  }

  async getLogsByResource(
    resource: string,
    resourceId?: string,
    limit: number = 100,
  ): Promise<ActivityLog[]> {
    this.loadLogs();
    return this.logs
      .filter((log) => {
        if (resourceId) {
          return log.resource === resource && log.resourceId === resourceId;
        }
        return log.resource === resource;
      })
      .slice(-limit)
      .reverse();
  }

  async getLogsByDateRange(startDate: Date, endDate: Date): Promise<ActivityLog[]> {
    this.loadLogs();
    const start = startDate.getTime();
    const end = endDate.getTime();
    return this.logs
      .filter((log) => {
        const logTime = new Date(log.timestamp).getTime();
        return logTime >= start && logTime <= end;
      })
      .reverse();
  }

  async getFailedActions(limit: number = 100): Promise<ActivityLog[]> {
    this.loadLogs();
    return this.logs.filter((log) => !log.success).slice(-limit).reverse();
  }

  async clearOldLogs(daysToKeep: number = 90): Promise<number> {
    this.loadLogs();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const originalCount = this.logs.length;
    this.logs = this.logs.filter((log) => new Date(log.timestamp) > cutoffDate);
    this.saveLogs();
    return originalCount - this.logs.length;
  }
}






let _instance: AdminActivityLogger | null = null;




export function getAdminActivityLogger(): AdminActivityLogger {
  if (!_instance) {
    _instance = new AdminActivityLogger();
  }
  return _instance;
}





export function resetAdminActivityLoggerInstance(): void {
  _instance = null;
}









export async function logAdminAction(
  locals: UserContext,
  action: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  request?: Request,
): Promise<void> {
  if (!locals.user) return;
  const logger = getAdminActivityLogger();
  await logger.logUserAction(
    locals.user.id,
    locals.user.username || locals.user.email || locals.user.id || 'unknown',
    action,
    resource,
    resourceId,
    details,
    request,
  );
}
