import http from "http";
import ws from "ws";



import logger from "@utils/logger.js";
import { getTweets } from "@utils/tweets.js";

const isClientPaused = (clientStates, client) => {
  const clientState = clientStates.get(client);
  if (clientState && clientState.isPaused) {
    logger.info("Skipping paused client");
    return true;
  }
  return false;
};

const broadcastTweet = async (wss, clientStates) => {
  try {
    logger.info("Broadcasting tweets to clients");
    for (const client of wss.clients) {
      if (client.readyState === ws.OPEN) {
        logger.info("Client is open", {
          ip: client.upgradeReq.socket.remoteAddress,
        });

        if (isClientPaused(clientStates, client))
          return setTimeout(() => {
            broadcastTweet(wss, clientStates);
          }, 1000);

        const { twitterListId, twitterApiKey } = client.upgradeReq.query;
        logger.info("Fetching tweets for client", {
          twitterListId,
          ip: client.upgradeReq.socket.remoteAddress,
        });

        const tweets = await getTweets({
          listId: twitterListId,
          apiToken: twitterApiKey,
        });

        if (isClientPaused(clientStates, client))
          return setTimeout(() => {
            broadcastTweet(wss, clientStates);
          }, 1000);

        client.send(JSON.stringify({ type: "tweet", data: tweets }));

        setTimeout(() => {
          broadcastTweet(wss, clientStates);
        }, 0);
      }
    }
  } catch (error) {
    logger.error("Error broadcasting tweets", {
      error: error.message,
      stack: error.stack,
    });
  }
};

export const setupWebSocket = (app) => {
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

  const clientStates = new Map();

  wss.on("connection", (ws, req) => {
    ws.upgradeReq = req;
    logger.info("Client connected", {
      params: req.query,
      ip: req.socket.remoteAddress,
    });

    clientStates.set(ws, { isPaused: false });
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);

        if (data.type === "pause") {
          clientStates.set(ws, { ...clientStates.get(ws), isPaused: true });
          logger.info("Client paused broadcasting", {
            params: req.query,
            ip: req.socket.remoteAddress,
          });
          ws.send(JSON.stringify({ status: "paused" }));
        } else if (data.type === "resume") {
          clientStates.set(ws, { ...clientStates.get(ws), isPaused: false });
          logger.info("Client resumed broadcasting", {
            params: req.query,
            ip: req.socket.remoteAddress,
          });
          ws.send(JSON.stringify({ status: "resumed" }));
        }
      } catch (error) {
        logger.error("Error processing WebSocket message", {
          error: error.message,
          ip: req.socket.remoteAddress,
        });
      }
    });

    ws.on("close", () => {
      clientStates.delete(ws);
      logger.info("Client disconnected", {
        params: req.query,
        ip: req.socket.remoteAddress,
      });
    });

    broadcastTweet(wss, clientStates);
  });

  logger.info("WebSocket server configured");
  return { server, wss };
}; 