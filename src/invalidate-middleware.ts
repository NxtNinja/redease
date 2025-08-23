import { Request, Response, NextFunction } from "express";
import { InvalidateOptions } from "./types";
import { getRedisClient } from "./redis-client";
import { generateCacheKey, defaultLogger } from "./utils";
import { CacheError } from "./errors";

export const invalidate = (options: InvalidateOptions) => {
  const logger = options.logger || defaultLogger;
  const redisClient = options.redisClient || getRedisClient();

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!redisClient || redisClient.status !== "ready") {
      logger.warn("Redis not available, skipping invalidation");
      return next();
    }

    try {
      if (options.pattern) {
        const keys = await redisClient.keys(options.pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
          logger.info(
            `Invalidated ${keys.length} keys matching pattern: ${options.pattern}`
          );
        }
      } else {
        const key = generateCacheKey(req, options);
        await redisClient.del(key);
        logger.info(`Invalidated cache for key: ${key}`);
      }

      next();
    } catch (error) {
      logger.error("Invalidation error:", error);
      next();
    }
  };
};

export const invalidateByKey = async (
  key: string,
  redisClient?: any
): Promise<void> => {
  const client = redisClient || getRedisClient();
  if (!client || client.status !== "ready") {
    throw new CacheError("Redis not available");
  }

  await client.del(key);
};

export const invalidateByPattern = async (
  pattern: string,
  redisClient?: any
): Promise<number> => {
  const client = redisClient || getRedisClient();
  if (!client || client.status !== "ready") {
    throw new CacheError("Redis not available");
  }

  const keys = await client.keys(pattern);
  if (keys.length > 0) {
    await client.del(...keys);
  }

  return keys.length;
};
