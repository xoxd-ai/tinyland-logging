








export type AdminAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'EXPORT'
  | 'IMPORT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PERMISSION_CHANGE'
  | 'INVITE'
  | 'REVOKE';




export type ResourceType =
  | 'user'
  | 'profile'
  | 'post'
  | 'event'
  | 'video'
  | 'product'
  | 'program'
  | 'invitation'
  | 'settings'
  | 'permission'
  | 'session'
  | 'file';




export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';




export interface AdminAuditLog {
  
  timestamp: string;
  trace_id: string;          
  span_id: string;

  
  admin_user_id: string;
  admin_username: string;
  admin_role: string;

  
  action: AdminAction;
  resource_type: ResourceType;
  resource_id?: string;
  resource_name?: string;

  
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
    fields_changed: string[];
  };

  
  client_ip_hash: string;          
  client_ip_masked?: string;       
  user_agent: string;
  device_type: DeviceType;

  
  session_id: string;
  browser_fingerprint?: string;

  
  request_path: string;
  request_method: string;

  
  success: boolean;
  error_message?: string;
  duration_ms?: number;

  
  metadata?: Record<string, any>;
}




export interface AdminAuditOptions {
  resourceId?: string;
  resourceName?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  metadata?: Record<string, any>;
  durationMs?: number;
}
