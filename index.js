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
import { analyzeTweet } from "./openai.js";
import { getMetadata } from "./metadata.js";

// Configuration
dotenv.config();
const port = process.env.PORT || 3000;
const allowedClients = process.env.ALLOWED_CLIENTS
  ? process.env.ALLOWED_CLIENTS.split(",").map((client) => client.trim())
  : [];

logger.info("Server configuration loaded", { port, allowedClients });

// Express setup
const app = express();
app.use(helmet());
app.use(express.json());
logger.info("Express middleware configured");

// CORS configuration
app.use(
  cors({
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
  })
);

// Logging middleware
const setupLogging = () => {
  // Success logs
  app.use(
    morgan("combined", {
      stream: logger.stream,
      skip: (req, res) => res.statusCode >= 400,
    })
  );

  // Error logs
  app.use(
    morgan("combined", {
      stream: {
        write: (message) => logger.error(message.trim()),
      },
      skip: (req, res) => res.statusCode < 400,
    })
  );
  logger.info("Request logging middleware configured");
};
setupLogging();

// Routes
const setupRoutes = () => {
  app.post("/launch", async (req, res) => {
    logger.info("Received launch request");
    const {
      publicKey,
      privateKey,
      tokenName,
      tickerName,
      twitterUrl,
      imageUrl,
      buyAmount,
      tokenKey,
    } = req.body || {};

    logger.info("Request data", {
      publicKey: publicKey ? "***" : undefined,
      privateKey: privateKey ? "***" : undefined,
      tokenName,
      tickerName,
      twitterUrl,
      imageUrl,
      buyAmount,
      tokenKey,
    });

    if (
      !publicKey ||
      !privateKey ||
      !tokenName ||
      !tickerName ||
      !imageUrl ||
      !twitterUrl ||
      !buyAmount ||
      !tokenKey
    ) {
      logger.warn("Validation failed - missing required fields");
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    try {
      await processLaunchRequest(req.body);
      logger.info("Launch request processed successfully");
      res.status(200).json({
        success: true,
        message: "Token created successfully",
        data: { publicKey, tokenName, tickerName, twitterUrl, imageUrl },
      });
    } catch (error) {
      handleLaunchError(error, res);
    }
  });

  app.post("/analyze", async (req, res) => {
    logger.info("Received analyze request");
    const { tweetText, tweetImageUrl, openAIKey } = req.body || {};
    
    if (!tweetText || !tweetImageUrl || !openAIKey) {
      logger.error("Validation failed - missing required fields");
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const analysis = await analyzeTweet(tweetText, tweetImageUrl, openAIKey);
    res.status(200).json({ success: true, analysis });
  });

  app.get("/metadata", async (req, res) => {
    logger.info("Received metadata request");
    const { url } = req.query || {};
    
    const metadata = await getMetadata(url);

    res.status(200).json({ success: true, metadata });
  });

  app.use((err, req, res, next) => {
    logger.error("Unhandled error", {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  });
  logger.info("Routes configured");
};

// Helper functions
const processLaunchRequest = async ({
  imageUrl,
  publicKey,
  privateKey,
  tokenName,
  tickerName,
  twitterUrl,
  buyAmount,
  tokenKey,
}) => {
  logger.info("Creating token...", { tokenName, tickerName });
  await createTokenLocal({
    imageUrl,
    publicKey,
    privateKey,
    tokenName,
    tickerName,
    twitterUrl,
    buyAmount,
    tokenKey,
  });
  logger.info("Token created successfully", { tokenName, tickerName });
};

const handleLaunchError = (error, res) => {
  logger.error("Error processing launch", {
    error: error.message,
    stack: error.stack,
    code: error.code,
  });
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
      const url = new URL(info.req.url, `ws://${info.req.headers.host}`);
      const requiredParams = [
        "twitter-list-id",
        "twitter-api-key",
        "openai-api-key",
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

      // Store the parameters in the request object for later use
      info.req.query = {
        twitterListId: url.searchParams.get("twitter-list-id"),
        twitterApiKey: url.searchParams.get("twitter-api-key"),
        openaiApiKey: url.searchParams.get("openai-api-key"),
      };

      logger.info("Client connection attempt", {
        params: info.req.query,
        ip: info.req.socket.remoteAddress,
      });
      callback(true);
    },
  });

  // Track pause state for each client
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

    // Clean up on disconnect
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

// Initialize application
const initializeApp = () => {
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
