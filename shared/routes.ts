import { z } from 'zod';
import { analyzeRequestSchema, analyzeResponseSchema, recommendRequestSchema, recommendResponseSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  analyze: {
    create: {
      method: 'POST' as const,
      path: '/api/analyze' as const,
      input: analyzeRequestSchema,
      responses: {
        200: analyzeResponseSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
  },
  recommend: {
    create: {
      method: 'POST' as const,
      path: '/api/recommend' as const,
      input: recommendRequestSchema,
      responses: {
        200: recommendResponseSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
