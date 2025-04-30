import express from "express";
import dotenv from "dotenv";

import { configureCors, configureHelmet } from "@config/security.js";
import { configureMorgan } from "@config/middleware.js";

import logger from "@utils/logger.js";

dotenv.config();

export const configureApp = (app) => {
  app.use(configureHelmet());
  app.use(express.json());
  app.use(configureCors());
  
  const morganMiddlewares = configureMorgan();
  morganMiddlewares.forEach(middleware => app.use(middleware));

  logger.info("Middleware configured successfully");
};

export const port = process.env.PORT || 3000;