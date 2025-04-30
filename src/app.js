import dotenv from "dotenv";

import { setupRoutes } from "@routes/index.js";

import { setupWebSocket } from "@sockets/index.js";

import { configureApp } from "@config/index.js";
import { app, port } from "@config/server.js";

import logger from "@utils/logger.js";

dotenv.config();

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
