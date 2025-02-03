import { ValidationError, ValidationResult } from '../types/validation';
import { z } from 'zod';

export function validateWithZod<T>(schema: z.ZodType<T>, data: unknown): ValidationResult {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationError[] = result.error.errors.map(err => ({
    message: err.message,
    path: err.path.join('.'),
    code: 'SCHEMA_VALIDATION_ERROR'
  }));

  return { valid: false, errors };
} 