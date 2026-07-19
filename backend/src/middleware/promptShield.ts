import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import prisma from '../config/db';

const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?previous\s+instructions/i,
  /system\s+override/i,
  /you\s+are\s+now\s+a/i,
  /disregard\s+prior\s+rules/i,
  /reveal\s+your\s+system\s+prompt/i,
  /reveal\s+instructions/i,
  /forget\s+everything/i,
  /execute\s+command/i,
  /hack/i,
  /sudo\s+/i,
  /delete\s+database/i,
];

export const sanitizeString = (input: string): string => {
  if (!input) return '';
  // Strip HTML / script tags
  let cleaned = input.replace(/<[^>]*>?/gm, '');
  // Escape potential SQL injections (simple regex replace for quotes/semicolons)
  cleaned = cleaned.replace(/['";\-]/g, '\\$&');
  return cleaned.trim();
};

export const promptShieldMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const textToCheck: string[] = [];

    // Gather text from body / query parameters
    if (req.body) {
      for (const key of Object.keys(req.body)) {
        if (typeof req.body[key] === 'string') {
          textToCheck.push(req.body[key]);
          req.body[key] = sanitizeString(req.body[key]);
        }
      }
    }

    if (req.query) {
      for (const key of Object.keys(req.query)) {
        if (typeof req.query[key] === 'string') {
          textToCheck.push(req.query[key] as string);
          req.query[key] = sanitizeString(req.query[key] as string);
        }
      }
    }

    // Check for prompt injection patterns
    for (const text of textToCheck) {
      for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(text)) {
          logger.warn(`Security Warning: Prompt Injection Pattern Detected! Pattern: ${pattern} - Text snippet: ${text.substring(0, 100)}`);
          
          // Log security event to AuditLog database
          await prisma.auditLog.create({
            data: {
              userId: req.user?.userId || null,
              action: 'PROMPT_INJECTION_BLOCKED',
              details: {
                pattern: pattern.toString(),
                textSnippet: text.substring(0, 200),
                ip: req.ip,
              },
              ipAddress: req.ip,
            },
          });

          return res.status(400).json({
            status: 'security_block',
            message: 'Input contains prohibited operational instructions or script syntax. Request rejected.',
          });
        }
      }
    }

    next();
  } catch (error: any) {
    logger.error(`Error executing Prompt Shield middleware: ${error.message}`);
    next(error);
  }
};
