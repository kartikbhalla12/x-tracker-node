import express from "express";

// import { createTokenLocal } from "@utils/createToken.js";
import { createTokenLightning } from "@utils/createTokenLightning.js";

import logger from "@utils/logger.js";

const router = express.Router();

router.post("/", async (req, res) => {
  logger.info("Received launch request");
  const {
    // publicKey,
    // privateKey,
    tokenName,
    tickerName,
    twitterUrl,
    imageUrl,
    buyAmount,
    tokenKey,
    apiKey,
  } = req.body || {};

  logger.info("Request data", {
    // publicKey: publicKey ? "***" : undefined,
    // privateKey: privateKey ? "***" : undefined,
    tokenName,
    tickerName,
    twitterUrl,
    imageUrl,
    buyAmount,
    tokenKey,
    apiKey: apiKey ? "***" : undefined,
  });

  if (
    // !publicKey ||
    // !privateKey ||
    !tokenName ||
    !tickerName ||
    !imageUrl ||
    !twitterUrl ||
    !buyAmount ||
    !tokenKey ||
    !apiKey
  ) {
    logger.warn("Validation failed - missing required fields");
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  try {
    logger.info("Creating token...", { tokenName, tickerName });
    // await createTokenLocal({
    //   imageUrl,
    //   publicKey,
    //   privateKey,
    //   tokenName,
    //   tickerName,
    //   twitterUrl,
    //   buyAmount,
    //   tokenKey,
    // });

    await createTokenLightning({
      imageUrl,
      tokenName,
      tickerName,
      twitterUrl,
      buyAmount,
      tokenKey,
      apiKey,
    });

    logger.info("Token created successfully", { tokenName, tickerName });

    logger.info("Launch request processed successfully");
    res.status(200).json({
      success: true,
      message: "Token created successfully",
      data: { tokenName, tickerName, twitterUrl, imageUrl },
    });
  } catch (error) {
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
  }
});

export default router;
