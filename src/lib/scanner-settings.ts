import { z } from 'zod';
export const settingsSchema = z.object({
  pages: z.coerce.number().int('Use a whole number.').min(1, 'Use at least 1 page.').max(100, 'Use no more than 100 pages.'),
  timeout: z.coerce.number().int('Use whole seconds.').min(5, 'Use at least 5 seconds.').max(30, 'Use no more than 30 seconds.'),
  concurrency: z.coerce.number().int('Use a whole number.').min(1, 'Use at least 1 request.').max(3, 'Use no more than 3 concurrent requests.'),
  requests: z.coerce.number().int('Use a whole number.').min(1).max(5, 'Use no more than 5 requests per second.'),
  maximum: z.coerce.number().int('Use a whole number.').min(10).max(500, 'Use no more than 500 total requests.'),
  queryParameters: z.boolean(), profile: z.enum(['Basic', 'Standard']), retention: z.enum(['7', '14', '30']),
});
export const defaultSettings = { pages: '25', timeout: '10', concurrency: '1', requests: '1', maximum: '100', queryParameters: false, profile: 'Basic' as 'Basic' | 'Standard', retention: '7' };