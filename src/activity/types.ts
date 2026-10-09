






export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}





export interface UserContext {
  user?: {
    id: string;
    username?: string;
    email?: string;
  };
}
