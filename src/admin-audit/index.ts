// Merged from @tummycrypt/tinyland-admin-audit 0.2.2 (xoxd-ai/tinyland-admin-audit 7ed3101; registry 0.2.3), now @tummycrypt/tinyland-logging/admin-audit.


































export {
  configureAdminAudit,
  getAdminAuditConfig,
  resetAdminAuditConfig,
} from './config.js';

export type {
  Logger,
  AuditRequestEvent,
  AdminAuditPackageConfig,
} from './config.js';


export type {
  AdminAction,
  ResourceType,
  DeviceType,
  AdminAuditLog,
  AdminAuditOptions,
} from './types.js';


export {
  extractClientContext,
  calculateChangedFields,
  logAdminAction,
  logAdminActionFailure,
  logUserManagement,
  logPermissionChange,
  logContentManagement,
} from './admin-audit.js';
