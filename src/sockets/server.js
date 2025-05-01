import http from "http";
import ws from "ws";

import logger from "@utils/logger.js";

export const createWebSocketServer = (app) => {
  const server = http.createServer(app);
  const wss = new ws.Server({
    server,
    path: "/ws",
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
        });
        callback(
          false,
          400,
          "Missing required parameters: " + missingParams.join(", ")
        );
        return;
      }

      const twitterListId = url.searchParams.get("twitter-list-id");
      const twitterApiKey = url.searchParams.get("twitter-api-key");

      info.req.query = {
        twitterListId,
        twitterApiKey
      };

      callback(true);
    },
  });

  return { server, wss };
}; 