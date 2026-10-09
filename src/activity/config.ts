






export interface ActivityLoggerConfig {
  
  baseDir: string;
  
  logSubPath: string;
  
  maxLogs: number;
  
  generateId: () => string;
}

const DEFAULT_LOG_SUB_PATH = 'content/auth/logs/admin-activity.json';
const DEFAULT_MAX_LOGS = 10000;

function createDefaultConfig(): ActivityLoggerConfig {
  return {
    baseDir: process.cwd(),
    logSubPath: DEFAULT_LOG_SUB_PATH,
    maxLogs: DEFAULT_MAX_LOGS,
    generateId: () => crypto.randomUUID(),
  };
}

let _config: ActivityLoggerConfig = createDefaultConfig();





export function configureActivityLogger(config: Partial<ActivityLoggerConfig>): void {
  _config = { ..._config, ...config };
}




export function getActivityLoggerConfig(): Readonly<ActivityLoggerConfig> {
  return { ..._config };
}




export function resetActivityLoggerConfig(): void {
  _config = createDefaultConfig();
}
