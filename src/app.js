import { setupRoutes } from "@routes/index.js";

import { setupWebSocket } from "@sockets/index.js";

import { configureApp, port } from "@config/index.js";
import { app } from "@config/server.js";

import logger from "@utils/logger.js";

const initializeApp = () => {
  configureApp(app);
  setupRoutes(app);
  const { server } = setupWebSocket(app);

  server.listen(port, () => {
    logger.info("Server started", {
      port,
      environment: process.env.NODE_ENV || "development",
    });
  });
};

initializeApp();
