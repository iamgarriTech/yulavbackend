import { Redis } from "ioredis";

require("dotenv").config();

const redisClient = () => {
    if (process.env.REDIS_URL) {
        console.log("Redis client is connected");
        return process.env.REDIS_URL;
    }
    throw new Error("Redis client is not connected");
};

// Define your maxRetriesPerRequest value (e.g., 5)
const maxRetries = 5;

export const redis = new Redis(redisClient(), {
    maxRetriesPerRequest: maxRetries
});
