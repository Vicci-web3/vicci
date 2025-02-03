import { ValidationError, ValidationResult } from '../types/validation';
import { validateWithZod } from './schemaValidation';
import { BusinessRuleValidator } from './businessRules';
import { z } from 'zod';

export function validateMessage<T>(
  schema: z.ZodType<T>,
  data: unknown,
  businessRules?: Array<(data: T) => ValidationError | null>
): ValidationResult {
  // First validate schema
  const schemaResult = validateWithZod(schema, data);
  if (!schemaResult.valid) {
    return schemaResult;
  }

  // Then validate business rules if provided
  if (businessRules) {
    const businessValidator = new BusinessRuleValidator(businessRules);
    const businessResult = businessValidator.validate(data as T);
    if (!businessResult.valid) {
      return businessResult;
    }
  }

  return { valid: true, errors: [] };
} 