import express from "express";

import { uploadImageToIPFS } from "@utils/ipfs.js";
import logger from "@utils/logger.js";

import { cacheMiddleware } from "@config/middleware.js";

const router = express.Router();

router.get("/", cacheMiddleware, async (req, res) => {
  logger.info("Received IPFS upload request");
  const { imageUrl, tokenName, tickerName, twitterUrl } = req.query || {};

  if (!imageUrl || !tokenName || !tickerName || !twitterUrl) {
    logger.error("Validation failed - missing parameters");
    return res.status(400).json({
      success: false,
      message: "Missing parameters",
    });
  }

  try {
    const metadataUri = await uploadImageToIPFS({
      imageUrl,
      tokenName,
      tickerName,
      twitterUrl,
    });
    res.status(200).json({ success: true, metadataUri });
  } catch (error) {
    logger.error("Error uploading image to IPFS", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error uploading image to IPFS",
      error: error.message,
    });
  }
});

export default router;
