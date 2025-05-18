import express from "express";

import { analyzeCustomTweet } from "@utils/custom-ai.js";

import logger from "@utils/logger.js";

const router = express.Router();

router.post("/", async (req, res) => {
  logger.info("Received analyze request");
  const { tweetText, tweetImageUrl, openAIKey } = req.body || {};

  if (!openAIKey) {
    logger.error("Validation failed - missing required fields");
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  try {
    const analysis = await analyzeCustomTweet(tweetText, tweetImageUrl, openAIKey);
    res.status(200).json({ success: true, analysis });
  } catch (error) {
    logger.error("Error analyzing tweet", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error analyzing tweet",
      error: error.message,
    });
  }
});

export default router;
