import cors from "cors";
import helmet from "helmet";
import logger from "@utils/logger.js";

const allowedClients = process.env.ALLOWED_CLIENTS
  ? process.env.ALLOWED_CLIENTS.split(",").map((client) => client.trim())
  : [];

export const configureCors = () => {
  return cors({
    origin: (origin, callback) => {
      if (!origin || allowedClients.includes(origin)) {
        logger.info("CORS request allowed", { origin });
        callback(null, true);
      } else {
        logger.warn("CORS request blocked", { origin });
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
  });
};

export const configureHelmet = () => helmet(); 