export class CacheError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CacheError";
  }
}

export class RedisConnectionError extends CacheError {
  constructor(message: string = "Redis connection failed") {
    super(message);
    this.name = "RedisConnectionError";
  }
}

export class CacheTimeoutError extends CacheError {
  constructor(message: string = "Cache operation timed out") {
    super(message);
    this.name = "CacheTimeoutError";
  }
}
