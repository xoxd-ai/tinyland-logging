








import crypto from 'crypto';


export interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
}







export interface AuditRequestEvent {
  getClientAddress(): string;
  request: {
    headers: {
      get(name: string): string | null;
    };
    method: string;
  };
  url: {
    pathname: string;
  };
  locals: {
    user?: {
      id: string;
      username?: string;
      email?: string;
      handle?: string;
      role?: string;
    };
    session?: {
      id?: string;
      browserFingerprint?: string;
    };
  };
}


export interface AdminAuditPackageConfig {
  
  createLogger: (name: string) => Logger;
  
  hashIp: (ip: string) => string;
  
  maskIp: (ip: string) => string;
  
  detectDeviceType: (userAgent: string) => string;
  
  generateId: () => string;
}

const defaultConfig: AdminAuditPackageConfig = {
  createLogger: () => ({
    info: console.log,
    warn: console.warn,
    error: console.error,
  }),
  hashIp: (ip: string) => ip,
  maskIp: (ip: string) => ip.replace(/\d+$/, '***'),
  detectDeviceType: () => 'unknown',
  generateId: () => crypto.randomUUID(),
};

let config: AdminAuditPackageConfig = { ...defaultConfig };


export function configureAdminAudit(overrides: Partial<AdminAuditPackageConfig>): void {
  config = { ...config, ...overrides };
}


export function getAdminAuditConfig(): AdminAuditPackageConfig {
  return config;
}


export function resetAdminAuditConfig(): void {
  config = { ...defaultConfig };
}
