import Redis from "ioredis";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import { z } from "zod";

const filePath = path.resolve("config.yaml");

let config = {};
let redisClient = null;

try {
  if (fs.existsSync(filePath)) {
    const file = fs.readFileSync(filePath, "utf8");
    const parsed = yaml.load(file);
    const ConfigSchema = z.record(z.string(), z.any());
    config = ConfigSchema.parse(parsed);

    if (config.redis) {
      redisClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        db: config.redis.db || 0,
      });

      redisClient.on("connect", () => console.log("🧠 Redis connected"));
      redisClient.on("error", (err) => console.error("Redis error:", err));
    } else {
      console.warn("⚠️ Tidak ada konfigurasi Redis di config.yaml");
    }
  } else {
    console.warn("⚠️ File config.yaml tidak ditemukan!");
  }
} catch (err) {
  console.error("❌ Gagal memuat konfigurasi:", err);
}

export { config, redisClient };
