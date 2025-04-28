import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import http from "http";
import ws from "ws";

import { createTokenLocal } from "./createToken.js";
import logger from "./logger.js";
import { getTweets } from "./tweets.js";

// Configuration
dotenv.config();
const port = process.env.PORT || 3000;
const allowedClients = process.env.ALLOWED_CLIENTS
  ? process.env.ALLOWED_CLIENTS.split(",").map((client) => client.trim())
  : [];

// Express setup
const app = express();
app.use(helmet());
app.use(express.json());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedClients.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
  })
);

// Logging middleware
const setupLogging = () => {
  // Success logs
  app.use(morgan('combined', {
    stream: logger.stream,
    skip: (req, res) => res.statusCode >= 400
  }));

  // Error logs
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.error(message.trim())
    },
    skip: (req, res) => res.statusCode < 400
  }));
};
setupLogging();

// Routes
const setupRoutes = () => {
  app.post("/launch", async (req, res) => {
    logger.info("Received launch request");
    const { publicKey, privateKey, tokenName, tickerName, twitterUrl, imageUrl, buyAmount } = req.body || {};

    logger.info("Request data", {
      publicKey: publicKey ? "***" : undefined,
      privateKey: privateKey ? "***" : undefined,
      tokenName,
      tickerName,
      twitterUrl,
      imageUrl,
      buyAmount
    });

    if (!publicKey || !privateKey || !tokenName || !tickerName || !imageUrl || !twitterUrl || !buyAmount) {
      logger.warn("Validation failed - missing required fields");
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    try {
      await processLaunchRequest(req.body);
      res.status(200).json({
        success: true,
        message: "Token created successfully",
        data: { publicKey, tokenName, tickerName, twitterUrl, imageUrl },
      });
    } catch (error) {
      handleLaunchError(error, res);
    }
  });

  app.use((err, req, res, next) => {
    logger.error("Unhandled error", { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  });
};

// Helper functions
const processLaunchRequest = async ({ imageUrl, publicKey, privateKey, tokenName, tickerName, twitterUrl, buyAmount }) => {
  logger.info("Creating token...");
  await createTokenLocal({
    imageUrl,
    publicKey,
    privateKey,
    tokenName,
    tickerName,
    twitterUrl,
    buyAmount
  });
  logger.info("Token created successfully");
};

const handleLaunchError = (error, res) => {
  logger.error("Error processing launch", { error: error.message, stack: error.stack });
  res.status(500).json({
    success: false,
    message: "Error processing launch data",
    error: error.message,
  });
};

// WebSocket setup
const setupWebSocket = () => {
  const server = http.createServer(app);
  const wss = new ws.Server({ 
    server,
    verifyClient: (info, callback) => {
      const requiredHeaders = ['twitter-list-id', 'twitter-api-key', 'openai-api-key'];
      const missingHeaders = requiredHeaders.filter(header => !info.req.headers[header]);

      if (missingHeaders.length > 0) {
        logger.warn("Client connection rejected - missing required headers", { missingHeaders });
        callback(false, 400, 'Missing required headers: ' + missingHeaders.join(', '));
        return;
      }

      logger.info("Client connection attempt", { headers: info.req.headers });
      callback(true);
    }
  });

  wss.on("connection", (ws, req) => {
    ws.upgradeReq = req;
    logger.info("Client connected", { headers: req.headers });

    console.log("broadcastTweet");

    // setTimeout(broadcastTweet, 0);
  });

  return { server, wss };
};

// Tweet broadcasting
// const setupTweetBroadcasting = (wss) => {
  const broadcastTweet = async () => {
    try {
      for (const client of wss.clients) {
        if (client.readyState === ws.OPEN) {
          const { 'twitter-list-id': twitterListId, 'twitter-api-key': twitterApiKey } = client.upgradeReq.headers;
          const tweets = await getTweets({ listId: twitterListId, apiToken: twitterApiKey });
          client.send(JSON.stringify({ type: 'tweet', data: tweets }));

          setTimeout(broadcastTweet, 0);
        }
      }
    } catch (error) {
      logger.error("Error broadcasting tweets", { error: error });
    }
      // } finally {
    //   logger.info("Scheduling next broadcast");
    //   // Schedule next broadcast after current one completes
    //   // setTimeout(broadcastTweet, 0);
    // }
  };

  // return broadcastTweet;
// };

// Initialize application
const initializeApp = () => {
  setupRoutes();
  const { server, wss } = setupWebSocket();
  // const broadcastTweet = setupTweetBroadcasting(wss);

  // Start initial broadcast
  // broadcastTweet();

  server.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
    logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
};

initializeApp();