import { ValidationError, ValidationResult, Validator } from '../types/validation';

export class BusinessRuleValidator<T> implements Validator<T> {
  private rules: Array<(data: T) => ValidationError | null>;

  constructor(rules: Array<(data: T) => ValidationError | null>) {
    this.rules = rules;
  }

  validate(data: T): ValidationResult {
    const errors: ValidationError[] = [];

    for (const rule of this.rules) {
      const error = rule(data);
      if (error) {
        errors.push(error);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
} 