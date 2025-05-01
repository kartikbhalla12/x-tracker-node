import morgan from "morgan";
import NodeCache from "node-cache";

import logger from "@utils/logger.js";

const cache = new NodeCache({ stdTTL: 120 });

export const configureMorgan = () => {
  return [
    morgan("combined", {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
      skip: (_req, res) => res.statusCode >= 400,
    }),
    morgan("combined", {
      stream: {
        write: (message) => logger.error(message.trim()),
      },
      skip: (_req, res) => res.statusCode < 400,
    }),
  ];
}; 

export const cacheMiddleware = (req, res, next) => {
  const key = req.originalUrl;
  const cachedData = cache.get(key);

  if (cachedData) {
    return res.json(cachedData);
  }

  // Override res.json to cache response
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    cache.set(key, data);
    return originalJson(data);
  };

  next();
}