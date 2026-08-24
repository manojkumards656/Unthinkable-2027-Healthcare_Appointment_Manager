import { Redis } from '@upstash/redis';

let cachedRedis: Redis | null = null;

/**
 * Returns an Upstash Redis client safely.
 * Auto-corrects missing https:// protocol and prevents build/runtime crashes
 * if the URL is formatted unexpectedly.
 */
export function getRedisClient(): Redis | null {
  if (cachedRedis) return cachedRedis;

  let url = process.env.UPSTASH_REDIS_REST_URL;
  let token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  // Strip quotes and whitespace
  url = url.trim().replace(/^["']|["']$/g, '');
  token = token.trim().replace(/^["']|["']$/g, '');

  // Auto-prepend https:// if omitted
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    if (url.includes('.upstash.io') || !url.includes('://')) {
      url = `https://${url}`;
    } else {
      console.warn('UPSTASH_REDIS_REST_URL must start with https://, received:', url);
      return null;
    }
  }

  try {
    cachedRedis = new Redis({ url, token });
    return cachedRedis;
  } catch (err) {
    console.warn('Failed to initialize Upstash Redis:', err);
    return null;
  }
}
