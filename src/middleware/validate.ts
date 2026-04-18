import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, z } from 'zod';

/**
 * Validates req.body against a Zod schema.
 * On failure, returns 400 with field-level error details.
 * On success, replaces req.body with the parsed (coerced) data.
 */
export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid email or password',
        details: formatErrors(result.error),
      });
      return;
    }
    req.body = result.data;
    next();
  };

/**
 * Validates req.params against a Zod schema.
 */
export const validateParams =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid path parameters',
        details: formatErrors(result.error),
      });
      return;
    }
    next();
  };

function formatErrors(error: ZodError): Record<string, string[]> {
  return z.treeifyError(error);
}
