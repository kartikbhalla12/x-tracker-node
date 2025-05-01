import { createWebSocketServer } from "@sockets/server.js";
import { handleClientState } from "@sockets/clientState.js";
import { startBroadcastTweets } from "@sockets/broadcast.js";

import logger from "@utils/logger.js";

export const setupWebSocket = (app) => {
  const { server, wss } = createWebSocketServer(app);
  const clientStates = new Map();

  wss.on("connection", (ws, req) => {
    logger.info("Client connected", {
      params: req.query
    });

    let isActive = true;
    handleClientState(clientStates, ws);

    const { twitterListId, twitterApiKey } = req.query;
    startBroadcastTweets({
      isActive,
      ws,
      clientStates,
      twitterListId,
      twitterApiKey,
    });

    ws.on("close", () => {
      logger.info("Client disconnected");
      isActive = false;
      clientStates.delete(ws);
    });
  });

  logger.info("WebSocket server configured");
  return { server, wss };
};
