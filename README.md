# redease 🚀

> **Lightning-fast Redis caching middleware for Express.js** — The simplest way to add Redis caching to your Express APIs.

[![npm version](https://img.shields.io/npm/v/redease.svg?style=flat-square)](https://www.npmjs.com/package/redease)
[![npm downloads](https://img.shields.io/npm/dm/redease.svg?style=flat-square)](https://www.npmjs.com/package/redease)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/npm/l/redease.svg?style=flat-square)](LICENSE)

---

## 🎯 Why Redease?

Redease makes Redis caching for Express.js applications incredibly simple. Add powerful caching to any route with a single line of code, with built-in invalidation, TypeScript support, and production-ready error handling.

### ✨ Features

- ⚡ **One-line caching** - Add caching to any route with `cache()`
- 🎯 **Smart invalidation** - Automatic and programmatic cache control
- 🛡️ **Production ready** - Built-in error handling and connection management
- 📦 **TypeScript native** - Full type safety and IntelliSense
- 🔌 **Any Redis provider** - Works with Redis Cloud, Upstash, Railway, or self-hosted
- 🪶 **Lightweight** - Zero dependencies, minimal footprint

---

## 📦 Installation

```bash
npm install redease express ioredis
```

**Peer Dependencies:**

- `express` ^4.18.0
- `ioredis` ^5.7.0

---

## 🚀 60-Second Quick Start

### 1. Basic Setup

```typescript
import express from "express";
import { cache, createRedisClient } from "redease";

const app = express();
const redisClient = createRedisClient("redis://localhost:6379");

// Cache any route with one line
app.get("/api/users", cache({ ttl: 300, redisClient }), (req, res) => {
  const users = getUsersFromDB(); // This only runs once every 5 minutes!
  res.json(users);
});

app.listen(3000);
```

### 2. Environment Setup (.env)

```bash
# For local development
REDIS_URL=redis://localhost:6379

# For production (Upstash, Redis Cloud, Railway)
REDIS_URL=redis://:password@host:port
```

---

## 📖 Complete API Reference

### Core Functions

#### `createRedisClient(options: string | RedisOptions): Redis`

Creates and manages a Redis connection with automatic reconnection.

```typescript
// From URL string
const redisClient = createRedisClient("redis://localhost:6379");

// From options object
const redisClient = createRedisClient({
  host: "localhost",
  port: 6379,
  password: "your-password",
});

// From environment variable (recommended)
const redisClient = createRedisClient(process.env.REDIS_URL!);
```

#### `cache(options: CacheOptions): ExpressMiddleware`

The main caching middleware.

```typescript
interface CacheOptions {
  ttl: number; // Time to live in seconds (required)
  redisClient: Redis; // Redis client instance (required)
  key?: string | ((req: Request) => string); // Custom cache key
  isCacheable?: (req: Request) => boolean; // Conditional caching
  prefix?: string; // Cache key prefix
  timeout?: number; // Redis operation timeout (ms)
}
```

#### `invalidate(options: InvalidateOptions): ExpressMiddleware`

Middleware for automatic cache invalidation.

```typescript
interface InvalidateOptions {
  key: string | string[] | ((req: Request) => string); // Key(s) to invalidate
  redisClient: Redis; // Redis client instance (required)
  pattern?: string; // Pattern for bulk invalidation
}
```

### Programmatic Control Functions

#### `invalidateByKey(key: string, redisClient?: Redis): Promise<void>`

Programmatically delete a specific cache entry.

```typescript
// After updating a user
await invalidateByKey(`user:${userId}`, redisClient);
```

#### `invalidateByPattern(pattern: string, redisClient?: Redis): Promise<number>`

Delete multiple cache entries using Redis pattern matching.

```typescript
// Clear all user cache
const cleared = await invalidateByPattern("user:*", redisClient);
console.log(`Cleared ${cleared} cache entries`);

// Common patterns:
await invalidateByPattern("user:*", redisClient); // All users
await invalidateByPattern("post:123*", redisClient); // Posts starting with 123
await invalidateByPattern("*:latest", redisClient); // All ":latest" entries
```

### Utility Functions

#### `getRedisClient(): Redis | null`

Get the current Redis client instance.

#### `closeRedisClient(): Promise<void>`

Gracefully close the Redis connection.

#### `isRedisConnected(): boolean`

Check if Redis is currently connected.

#### `healthCheck(redisClient?: Redis): Promise<HealthCheckResult>`

Get connection health status.

```typescript
const health = await healthCheck(redisClient);
// Returns: { status: 'connected' | 'disconnected' | 'error', latency?: number }
```

---

## 🎯 Complete Examples

### 1. Basic Users API with Full Caching

```typescript
import express from "express";
import { pool } from "./db";
import { cache, invalidate, createRedisClient, invalidateByKey } from "redease";

const router = express.Router();
const redisClient = createRedisClient(process.env.REDIS_URL!);

// GET /api/users - Cached for 5 minutes
router.get("/", cache({ ttl: 300, redisClient }), async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users ORDER BY id ASC");
  res.json({ data: rows, count: rows.length });
});

// GET /api/users/:id - Cached for 10 minutes with custom key
router.get(
  "/:id",
  cache({
    ttl: 600,
    redisClient,
    key: (req) => `user:${req.params.id}`,
  }),
  async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ data: rows[0] });
  }
);

// POST /api/users - Create user with automatic cache invalidation
router.post(
  "/",
  invalidate({
    key: "GET:/api/users", // Clear the users list cache
    redisClient,
  }),
  async (req, res) => {
    const { rows } = await pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
      [req.body.name, req.body.email]
    );
    res.status(201).json({ data: rows[0] });
  }
);

// PUT /api/users/:id - Update user with precise cache control
router.put(
  "/:id",
  invalidate({
    key: "GET:/api/users", // Clear users list
    redisClient,
  }),
  async (req, res) => {
    const { rows } = await pool.query(
      "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *",
      [req.body.name, req.body.email, req.params.id]
    );

    // Programmatically clear this specific user's cache
    await invalidateByKey(`user:${req.params.id}`, redisClient);

    res.json({ data: rows[0] });
  }
);

export default router;
```

### 2. Advanced Caching Patterns

```typescript
// Conditional caching based on request headers
app.get(
  "/api/sensitive-data",
  cache({
    ttl: 300,
    redisClient,
    isCacheable: (req) => !req.headers["authorization"], // Don't cache authenticated requests
    key: (req) => `sensitive:${req.query.page}`,
  }),
  handler
);

// Custom cache key with query parameters
app.get(
  "/api/search",
  cache({
    ttl: 600,
    redisClient,
    key: (req) => `search:${JSON.stringify(req.query)}`, // Include all query params
  }),
  searchHandler
);

// User-specific caching
app.get(
  "/api/profile",
  cache({
    ttl: 3600,
    redisClient,
    key: (req) => `profile:${req.user.id}`, // User-specific cache
    prefix: "app-v1", // Namespace cache keys
  }),
  profileHandler
);
```

### 3. Admin & Maintenance Endpoints

```typescript
// Clear all cache
app.post("/admin/cache/clear", async (req, res) => {
  const cleared = await invalidateByPattern("*", redisClient);
  res.json({ cleared, message: "All cache cleared" });
});

// Clear cache for specific pattern
app.post("/admin/cache/clear-pattern", async (req, res) => {
  const { pattern } = req.body;
  const cleared = await invalidateByPattern(pattern, redisClient);
  res.json({ cleared, pattern });
});

// Health check endpoint
app.get("/health", async (req, res) => {
  const redisHealth = await healthCheck(redisClient);
  res.json({
    status: "ok",
    redis: redisHealth,
    timestamp: new Date().toISOString(),
  });
});
```

---

## 🔧 Configuration Options

### Redis Connection Options

```typescript
const redisClient = createRedisClient({
  // Connection details
  host: "localhost",
  port: 6379,
  password: "your-password",

  // Connection management
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,

  // TLS/SSL (for production)
  tls: process.env.NODE_ENV === "production" ? {} : undefined,
});
```

### Cache Options Deep Dive

```typescript
app.get(
  "/api/data",
  cache({
    // Required options
    ttl: 300, // Cache for 5 minutes (in seconds)
    redisClient: redis, // Redis client instance

    // Optional options
    key: "custom-key", // Custom cache key
    // or dynamic key:
    key: (req) => `data:${req.params.id}:${req.query.version}`,

    // Conditional caching
    isCacheable: (req) => {
      // Don't cache if certain conditions are met
      return req.method === "GET" && !req.headers["x-no-cache"];
    },

    // Advanced options
    prefix: "app-v1", // Key prefix for namespacing
    timeout: 5000, // Redis operation timeout (ms)
  }),
  handler
);
```

---

## 🛡️ Error Handling & Production Ready

### Graceful Degradation

```typescript
// If Redis is unavailable, the cache middleware will:
// 1. Log the error
// 2. Continue to your route handler (serving fresh data)
// 3. Not break your application

app.get("/api/users", cache({ ttl: 300, redisClient }), (req, res) => {
  // This will always work, even if Redis is down
});
```

### Custom Error Handling

```typescript
// Add global error handler for cache-related errors
app.use((err, req, res, next) => {
  if (err.name === "RedisConnectionError") {
    console.warn("Redis unavailable - serving fresh data without caching");
    next(); // Continue without caching
  } else if (err.name === "CacheTimeoutError") {
    console.warn("Cache operation timed out - serving fresh data");
    next();
  } else {
    next(err);
  }
});
```

### Health Monitoring

```typescript
// Regular health checks
setInterval(async () => {
  const health = await healthCheck(redisClient);
  if (health.status !== "connected") {
    console.warn("Redis connection issues:", health);
  }
}, 30000); // Every 30 seconds
```

---

## 🌍 Environment Setup

### Development (Local Redis)

```bash
# Install Redis locally
# On macOS:
brew install redis

# On Ubuntu:
sudo apt-get install redis-server

# Start Redis
redis-server

# Test connection
redis-cli ping
```

### Production (Cloud Providers)

```bash
# Upstash (free tier available)
REDIS_URL=redis://:password@host:port

# Redis Cloud
REDIS_URL=redis://:password@host:port

# Railway
REDIS_URL=redis://:password@host:port

# Heroku Redis
REDIS_URL=redis://:password@host:port
```

### Docker Compose

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

---

## 📊 Performance Optimization

### Cache Key Strategies

```typescript
// Good: Descriptive and specific
`user:123:profile``posts:recent:page:2``search:term:javascript:sort:newest`// Avoid: Too generic or too broad
`data` // ❌ Too generic
`user:*`; // ❌ Too broad (for keys, okay for patterns)
```

### TTL Guidelines

```typescript
// Static data: Long TTL (hours/days)
cache({ ttl: 86400, redisClient }); // 24 hours

// Dynamic data: Medium TTL (minutes)
cache({ ttl: 300, redisClient }); // 5 minutes

// Highly dynamic: Short TTL (seconds)
cache({ ttl: 30, redisClient }); // 30 seconds

// User-specific: Session-based TTL
cache({ ttl: 3600, redisClient }); // 1 hour
```

### Memory Management

```typescript
// Monitor cache size
const memoryInfo = await redisClient.info("memory");
console.log("Redis memory usage:", memoryInfo);

// Set max memory policy (in redis.conf or via CLI)
// maxmemory 100mb
// maxmemory-policy allkeys-lru
```

---

## 🐛 Troubleshooting Guide

### Common Issues

1. **"Redis connection failed"**

   ```bash
   # Check if Redis is running
   redis-cli ping
   # Should return "PONG"

   # Check connection URL
   echo $REDIS_URL
   ```

2. **"Cache not working"**

   ```typescript
   // Verify middleware order
   app.get("/api/data", cache({ ttl: 300, redisClient }), handler);
   // NOT: app.get('/api/data', handler, cache({...}));
   ```

3. **"Memory usage high"**

   ```bash
   # Check Redis memory
   redis-cli info memory

   # Clear all cache (development only)
   redis-cli flushall
   ```

### Debug Mode

```typescript
// Enable debug logging
const redisClient = createRedisClient({
  url: process.env.REDIS_URL,
  lazyConnect: true,
});

redisClient.on("connect", () => console.log("Redis connecting..."));
redisClient.on("ready", () => console.log("Redis ready"));
redisClient.on("error", (err) => console.error("Redis error:", err));
```

---

## 📚 Best Practices

### 1. Cache Strategy

```typescript
// Cache at the right level
app.get("/api/users", cache({ ttl: 300, redisClient }), getUsers); // ✅ Good
app.use(cache({ ttl: 300, redisClient })); // ❌ Avoid - too broad
```

### 2. Key Design

```typescript
// Use consistent key patterns
`resource:id:subresource` // ✅ Good
`random_key_123`; // ❌ Avoid - hard to manage
```

### 3. Invalidation Strategy

```typescript
// Invalidate precisely
await invalidateByKey(`user:${id}`, redisClient); // ✅ Good
await invalidateByPattern("*", redisClient); // ❌ Avoid - too aggressive
```

### 4. Monitoring

```typescript
// Add cache metrics
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const cacheStatus = res.locals.cacheStatus;
    logMetrics({ duration, cacheStatus, path: req.path });
  });
  next();
});
```

---

## 🆘 Getting Help

### Common Questions

**Q: My cache isn't working?**
A: Check: 1) Redis connection, 2) Middleware order, 3) Cache key conflicts

**Q: How to clear all cache?**
A: Use `await invalidateByPattern('*', redisClient)` (carefully!)

**Q: How to monitor cache performance?**
A: Use `res.locals.cacheStatus` and Redis `INFO` command

### Support

1. **Check the docs** - This README covers 95% of use cases
2. **Enable debug logs** - See what's happening internally
3. **Check Redis connection** - `redis-cli ping`
4. **Create an issue** - Include your code and error logs

---

## 📄 License

MIT License - free for commercial and personal use.

---

<div align="center">

**Happy caching! 🚀**

[Report an Issue](https://github.com/your-username/redease/issues) ·
[Request a Feature](https://github.com/your-username/redease/issues) ·
[⭐ Star on GitHub](https://github.com/your-username/redease)

</div>
