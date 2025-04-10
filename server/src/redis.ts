import Redis from 'ioredis';

export const redis = new Redis();

export const CACHE_EXPIRATION = 3600; // 1 hour

export const fetchFromCacheOrDb = async <T>(
  cacheKey: string,
  dbFetchFunction: () => Promise<T>,
  expirationTime: number = CACHE_EXPIRATION
): Promise<T> => {
  // Check if data is in cache
  const cachedData = await redis.get(cacheKey);
  if (cachedData !== null) {
    return JSON.parse(cachedData);
  }

  // If not in cache, fetch data from the database
  const data = await dbFetchFunction();

  // Cache the fetched data
  await redis.set(cacheKey, JSON.stringify(data), 'EX', expirationTime);

  return data;
};

export const deleteKeysByPattern = async (pattern: string): Promise<void> => {
  let cursor = '0';
  do {
    // Use SCAN to get keys that match the pattern
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern);
    cursor = newCursor;

    if (keys.length > 0) {
      // Delete the matching keys
      await redis.del(...keys);
    }
  } while (cursor !== '0'); // Continue scanning until the cursor is back to '0'
};
