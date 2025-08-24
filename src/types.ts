import { Request, Response, NextFunction } from "express";
import Redis, { RedisOptions } from "ioredis";

// Add Logger interface
export interface Logger {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

export interface CacheOptions {
  key?: string | ((req: Request) => string);
  ttl?: number;
  prefix?: string;
  redisClient?: Redis;
  redisOptions?: RedisOptions;
  isCacheable?: (req: Request, res: Response) => boolean | Promise<boolean>;
  shouldInvalidate?: (
    req: Request,
    res: Response
  ) => boolean | Promise<boolean>;
  timeout?: number;
  logger?: Logger;
}

export interface InvalidateOptions {
  key?: string | ((req: Request) => string);
  prefix?: string;
  redisClient?: Redis;
  pattern?: string;
  logger?: Logger;
}

export interface CacheResponse extends Response {
  _json?: Response["json"];
  _end?: Response["end"];
  cache?: (data: any) => void;
}

// Use the actual RedisStatus type from ioredis
export type RedisStatus = Redis["status"];

export interface RedisClientWithStatus extends Redis {
  // Use the same status type as the original Redis interface
  status: Redis["status"];
}

export interface CacheStatus {
  hit: boolean;
  key: string;
  ttl?: number;
}
