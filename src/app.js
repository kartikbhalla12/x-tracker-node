import { setupRoutes } from "@routes/index.js";
import { setupWebSocket } from "@sockets/index.js";

import { configureApp } from "@config/index.js";
import { port } from "@config/server.js";

import logger from "@utils/logger.js";

const initializeApp = () => {
  configureApp();
  setupRoutes();
  const { server } = setupWebSocket();

  server.listen(port, () => {
    logger.info("Server started", {
      port,
      environment: process.env.NODE_ENV || "development",
    });
  });
};

initializeApp();
