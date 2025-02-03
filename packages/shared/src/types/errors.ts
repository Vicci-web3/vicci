export interface ErrorMessage {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
} 