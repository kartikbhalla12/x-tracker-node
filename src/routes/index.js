import launchRoute from "@routes/launch.js";
import analyzeRoute from "@routes/analyze.js";
import metadataRoute from "@routes/metadata.js";

import logger from "@utils/logger.js";

export const setupRoutes = (app) => {
  app.use("/launch", launchRoute);
  app.use("/analyze", analyzeRoute);
  app.use("/metadata", metadataRoute);

  app.use((err, req, res) => {
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