// lib/utils.ts
import { createHash } from 'crypto';

export function generateETag(content: string): string {
  return createHash('sha1').update(content).digest('hex');
}
