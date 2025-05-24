import axios from "axios";
import dotenv from "dotenv";

import logger from "@utils/logger.js";

dotenv.config();

const PUMP_API = process.env.PUMP_API;

export async function uploadImageToIPFS({
  imageUrl,
  tokenName,
  tickerName,
  twitterUrl,
}) {
  logger.info("Starting IPFS upload process", {
    imageUrl,
    tokenName,
    tickerName,
    twitterUrl,
  });

  try {
    logger.info("Getting image from URL");

    const formData = new FormData();
    const response = await axios({
      method: "get",
      url: imageUrl,
      responseType: "arraybuffer",
    });
    logger.info("Image fetched successfully");

    const blob = new Blob([response.data]);
    logger.info("Created blob from image data");

    formData.append("file", blob);
    formData.append("name", tokenName);
    formData.append("symbol", tickerName);
    formData.append("twitter", twitterUrl);
    formData.append("website", twitterUrl);
    formData.append("showName", "true");
    formData.append("description", "");

    logger.info("Uploading metadata to IPFS");
    const metadataResponse = await axios.post(`${PUMP_API}/ipfs`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    logger.info("IPFS upload successful");

    const metadataUri = metadataResponse.data.metadataUri;
    logger.info("Metadata URI received", {
      uri: metadataUri,
    });

    return metadataUri;
  } catch (error) {
    logger.error("Error uploading image to IPFS", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
