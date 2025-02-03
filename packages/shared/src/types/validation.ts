export interface ValidationError {
  message: string;
  path?: string;
  code?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface Validator<T> {
  validate(data: T): ValidationResult;
} 