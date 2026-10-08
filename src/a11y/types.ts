








export interface A11yLogEntry {
	level: 'info' | 'warn' | 'error';
	message: string;
	timestamp: string;
	sessionId?: string;
	labels: Record<string, string | number>;
}




export interface ContrastLabels {
	sessionId?: string;
	selector?: string;
	ratio?: number;
	requiredRatio?: number;
	foreground?: string;
	background?: string;
	wcagLevel?: string;
	elementInfo?: {
		tagName: string;
		text?: string;
	};
	page?: string;
	theme?: string;
}




export interface WcagLabels {
	sessionId?: string;
	selector?: string;
	rule?: string;
	wcagLevel?: string;
	severity?: string;
}




export interface EvaluationLabels {
	sessionId?: string;
	resultsCount?: number;
	issuesCount?: number;
	criticalCount?: number;
	evaluationTimeMs?: number;
}




export interface SessionLabels {
	sessionId?: string;
	action?: string;
	userId?: string;
	userAgent?: string;
}




export interface ErrorLabels {
	sessionId?: string;
	error?: string;
	stack?: string;
}




export interface SummaryData {
	totalElements: number;
	evaluatedElements: number;
	issues: number;
	criticalIssues: number;
	evaluationTimeMs: number;
	sessionId?: string;
}




export interface AriaLabels {
	sessionId?: string;
	selector?: string;
	issue?: string;
	elementInfo?: {
		tagName: string;
		html?: string;
	};
	fix?: string;
	page?: string;
}




export interface A11yLoggerApi {
	contrast(message: string, labels: ContrastLabels): void;
	wcag(message: string, labels: WcagLabels): void;
	evaluation(message: string, labels: EvaluationLabels): void;
	session(message: string, labels: SessionLabels): void;
	error(message: string, labels: ErrorLabels): void;
	summary(data: SummaryData): void;
	aria(message: string, labels: AriaLabels): void;
	flush(): Promise<void>;
}
