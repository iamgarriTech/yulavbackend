"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = require("ioredis");
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
exports.redis = new ioredis_1.Redis(redisClient(), {
    maxRetriesPerRequest: maxRetries
});
