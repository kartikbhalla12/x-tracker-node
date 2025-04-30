import logger from "@utils/logger.js";

export const isClientPaused = (clientStates, client) => {
  const clientState = clientStates.get(client);
  if (clientState && clientState.isPaused) {
    logger.info("Skipping paused client");
    return true;
  }
  return false;
};

export const handleClientState = (clientStates, ws, req) => {
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
};