import logger from "@utils/logger.js";

import { createWebSocketServer } from "@sockets/server.js";
import { broadcastTweet } from "@sockets/broadcast.js";
import { handleClientState } from "@sockets/clientState.js";

export const setupWebSocket = (app) => {
  const { server, wss } = createWebSocketServer(app);
  const clientStates = new Map();

  wss.on("connection", (ws, req) => {
    ws.upgradeReq = req;
    logger.info("Client connected", {
      params: req.query,
      ip: req.socket.remoteAddress,
    });

    handleClientState(clientStates, ws, req);
    broadcastTweet(wss, clientStates);
  });

  logger.info("WebSocket server configured");
  return { server, wss };
};
