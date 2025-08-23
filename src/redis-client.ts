import Redis, { RedisOptions } from "ioredis";
import { defaultLogger } from "./utils";
import { RedisClientWithStatus, RedisStatus } from "./types";

let redisClient: RedisClientWithStatus | null = null;

export const createRedisClient = (
  options: RedisOptions = {},
  logger = defaultLogger
): RedisClientWithStatus => {
  if (
    redisClient &&
    (redisClient.status === "ready" || redisClient.status === "connect")
  ) {
    return redisClient;
  }

  try {
    const client = new Redis(options) as RedisClientWithStatus;

    client.on("connect", () => {
      logger.info("Redis client connected");
    });

    client.on("ready", () => {
      logger.info("Redis client ready");
    });

    client.on("error", (err) => {
      logger.error("Redis client error:", err);
    });

    client.on("close", () => {
      logger.warn("Redis client connection closed");
    });

    client.on("reconnecting", () => {
      logger.info("Redis client reconnecting");
    });

    client.on("end", () => {
      logger.warn("Redis client connection ended");
    });

    redisClient = client;
    return client;
  } catch (error) {
    logger.error("Failed to create Redis client:", error);
    throw new Error("Redis connection failed");
  }
};

export const getRedisClient = (): RedisClientWithStatus | null => {
  return redisClient;
};

export const closeRedisClient = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

export const isRedisConnected = (): boolean => {
  return (
    redisClient !== null &&
    (redisClient.status === "ready" || redisClient.status === "connect")
  );
};
