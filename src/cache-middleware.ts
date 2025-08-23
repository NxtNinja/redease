import { Request, Response, NextFunction } from "express";
import Redis from "ioredis";
import {
  CacheOptions,
  CacheResponse,
  CacheStatus,
  RedisClientWithStatus,
} from "./types";
import { getRedisClient, createRedisClient } from "./redis-client";
import { generateCacheKey, defaultLogger } from "./utils";
import { CacheError } from "./errors";

declare global {
  namespace Express {
    interface Response {
      locals: {
        cacheStatus?: CacheStatus;
      };
    }
  }
}

export const cache = (options: CacheOptions = {}) => {
  // Fix: Add logger property to CacheOptions or handle it separately
  const logger = (options as any).logger || defaultLogger;
  const ttl = options.ttl || 60;
  const timeout = options.timeout || 5000;

  let redisClient: Redis | RedisClientWithStatus | null;
  if (options.redisClient) {
    redisClient = options.redisClient;
  } else {
    try {
      redisClient = createRedisClient(options.redisOptions, logger);
    } catch (error) {
      logger.error("Failed to initialize Redis client:", error);
      return (req: Request, res: Response, next: NextFunction) => next();
    }
  }

  return async (req: Request, res: CacheResponse, next: NextFunction) => {
    if (req.method !== "GET") {
      return next();
    }

    res.locals.cacheStatus = {
      hit: false,
      key: "",
    };

    let cacheable = true;
    if (options.isCacheable) {
      try {
        cacheable = await Promise.resolve(options.isCacheable(req, res));
      } catch (error) {
        logger.warn("Error in isCacheable function:", error);
        cacheable = false;
      }
    }

    if (!cacheable) {
      return next();
    }

    const cacheKey = generateCacheKey(req, options);
    res.locals.cacheStatus.key = cacheKey;

    // Fix: Check if redisClient exists and has a status property
    if (
      !redisClient ||
      (redisClient as RedisClientWithStatus).status !== "ready"
    ) {
      logger.warn("Redis not available, skipping cache");
      return next();
    }

    try {
      const cachedData = await Promise.race([
        redisClient.get(cacheKey),
        new Promise<null>((_, reject) =>
          setTimeout(
            () => reject(new CacheError("Redis operation timeout")),
            timeout
          )
        ),
      ]);

      if (cachedData) {
        logger.info(`Cache HIT for key: ${cacheKey}`);
        res.locals.cacheStatus.hit = true;
        const data = JSON.parse(cachedData);
        return res.json(data);
      }

      logger.info(`Cache MISS for key: ${cacheKey}`);

      const originalJson = res.json.bind(res);
      const originalEnd = res.end.bind(res);

      res.json = function (body: any): Response {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheResponse(redisClient!, cacheKey, body, ttl).catch((error) =>
            logger.error("Error caching response:", error)
          );
        }
        return originalJson(body);
      };

      res.end = function (chunk?: any, encoding?: any): Response {
        if (res.statusCode >= 200 && res.statusCode < 300 && chunk) {
          // Fix: Properly handle the content-type header check
          const contentType = res.getHeader("content-type");
          if (
            typeof contentType === "string" &&
            contentType.includes("application/json")
          ) {
            try {
              const body = JSON.parse(chunk.toString());
              cacheResponse(redisClient!, cacheKey, body, ttl).catch((error) =>
                logger.error("Error caching response:", error)
              );
            } catch (error) {
              // Not JSON, don't cache
            }
          }
        }
        return originalEnd(chunk, encoding);
      };

      next();
    } catch (error) {
      if (error instanceof CacheError) {
        logger.warn("Cache operation failed:", error.message);
      } else {
        logger.error("Unexpected cache error:", error);
      }
      next();
    }
  };
};

async function cacheResponse(
  redisClient: Redis | RedisClientWithStatus,
  key: string,
  data: any,
  ttl: number
): Promise<void> {
  const value = JSON.stringify(data);
  await redisClient.setex(key, ttl, value);
}
