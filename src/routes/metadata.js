import express from "express";

import { getMetadata } from "@utils/metadata.js";

import logger from "@utils/logger.js";

const router = express.Router();

router.get("/", async (req, res) => {
  logger.info("Received metadata request");
  const { url } = req.query || {};

  if (!url) {
    logger.error("Validation failed - missing url parameter");
    return res.status(400).json({
      success: false,
      message: "Missing url parameter",
    });
  }

  try {
    const metadata = await getMetadata(url);
    res.status(200).json({ success: true, metadata });
  } catch (error) {
    logger.error("Error fetching metadata", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error fetching metadata",
      error: error.message,
    });
  }
});

export default router;
