import { Request } from "express";
import { CacheOptions, InvalidateOptions } from "./types";

export const defaultLogger = {
  info: (...args: any[]) => console.info("[express-redis-cache]", ...args),
  warn: (...args: any[]) => console.warn("[express-redis-cache]", ...args),
  error: (...args: any[]) => console.error("[express-redis-cache]", ...args),
  debug: (...args: any[]) => console.debug("[express-redis-cache]", ...args),
};

export const generateCacheKey = (
  req: Request,
  options: CacheOptions | InvalidateOptions
): string => {
  const prefix = options.prefix || "cache";
  let key: string;

  if (typeof options.key === "function") {
    key = options.key(req);
  } else if (options.key) {
    key = options.key;
  } else {
    key = `${req.method}:${req.originalUrl}`;
  }

  return `${prefix}:${key}`;
};

export const healthCheck = async (
  redisClient: any
): Promise<{ status: string; latency?: number }> => {
  if (!redisClient || redisClient.status !== "ready") {
    return { status: "disconnected" };
  }

  const start = Date.now();
  try {
    await redisClient.ping();
    const latency = Date.now() - start;
    return { status: "connected", latency };
  } catch (error) {
    return { status: "error" };
  }
};
