// demo/server.ts
import express from "express";
import { cache, invalidate, createRedisClient } from "../dist";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const redisClient = createRedisClient(process.env.UPSTASH_REDIS_URI!);

app.get("/users", cache({ ttl: 60, redisClient }), (req, res) => {
  res.json({
    users: ["Alice", "Bob"],
    timestamp: Date.now(),
  });
});

app.post(
  "/users",
  invalidate({ key: "GET:/users", redisClient }),
  (req, res) => {
    res.json({ success: true, message: "Cache invalidated" });
  }
);

app.listen(3000, () => {
  console.log("Demo server running at http://localhost:3000");
});
