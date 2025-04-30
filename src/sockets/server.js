import http from "http";
import ws from "ws";

import logger from "@utils/logger.js";

export const createWebSocketServer = (app) => {
  const server = http.createServer(app);
  const wss = new ws.Server({
    server,
    verifyClient: (info, callback) => {
      const url = new URL(info.req.url, `ws://${info.req.headers.host}`);
      const requiredParams = [
        "twitter-list-id",
        "twitter-api-key"
      ];
      const missingParams = requiredParams.filter(
        (param) => !url.searchParams.get(param)
      );

      if (missingParams.length > 0) {
        logger.warn("Client connection rejected - missing required parameters", {
          missingParams,
          ip: info.req.socket.remoteAddress,
        });
        callback(
          false,
          400,
          "Missing required parameters: " + missingParams.join(", ")
        );
        return;
      }

      info.req.query = {
        twitterListId: url.searchParams.get("twitter-list-id"),
        twitterApiKey: url.searchParams.get("twitter-api-key")
      };

      logger.info("Client connection attempt", {
        params: info.req.query,
        ip: info.req.socket.remoteAddress,
      });
      callback(true);
    },
  });

  return { server, wss };
}; 