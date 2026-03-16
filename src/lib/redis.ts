import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

export const redis = globalForRedis.redis ?? new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
})

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

// Cache key prefixes
export const CACHE_KEYS = {
  campaign: (slug: string) => `campaign:${slug}`,
  grid: (slug: string) => `campaign:${slug}:grid`,
  stats: (slug: string) => `campaign:${slug}:stats`,
  lock: (lockToken: string) => `lock:${lockToken}`,
} as const

// Cache TTLs (in seconds)
export const CACHE_TTL = {
  campaign: 300, // 5 minutes
  grid: 60, // 1 minute
  stats: 120, // 2 minutes
  lock: 300, // 5 minutes
} as const
