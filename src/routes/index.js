import { app } from "@config/server.js";
import logger from "@utils/logger.js";
import { createTokenLocal } from "@utils/createToken.js";
import { analyzeTweet } from "@utils/openai.js";
import { getMetadata } from "@utils/metadata.js";

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

export const setupRoutes = () => {
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

  logger.info("Routes configured successfully");
}; 