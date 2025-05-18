import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import axios from "axios";
import dotenv from "dotenv";

import logger from "@utils/logger.js";

dotenv.config();

const PUMP_API = process.env.PUMP_API;
const PUMP_PORTAL_API = process.env.PUMP_PORTAL_API;

export async function createTokenLightning({
  imageUrl,
  tokenName,
  tickerName,
  twitterUrl,
  buyAmount,
  tokenKey,
  apiKey,
}) {
  logger.info("Starting token creation process", {
    tokenName,
    tickerName,
    twitterUrl,
  });

  try {
    logger.info("Generating mint keypair");

    const tokenKeyArray = JSON.parse(tokenKey);
    const mintKeypair = Keypair.fromSecretKey(new Uint8Array(tokenKeyArray));

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
    const metadataResponseJSON = metadataResponse.data;
    logger.info("Metadata URI received", {
      uri: metadataResponseJSON.metadataUri,
    });

    logger.info("Creating token transaction");

    const resp = await axios.post(
      `${PUMP_PORTAL_API}/trade?api-key=${apiKey}`,
      {
        action: "create",
        tokenMetadata: {
          name: metadataResponseJSON.metadata.name,
          symbol: metadataResponseJSON.metadata.symbol,
          uri: metadataResponseJSON.metadataUri,
        },
        mint: mintKeypair.publicKey.toBase58(),
        denominatedInSol: "true",
        amount: buyAmount,
        slippage: 50,
        priorityFee: 0.0005,
        pool: "pump",
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (resp.status === 200) {
      const data = resp.data;
      logger.info("Transaction successful", {
        signature: data.signature,
        url: `https://solscan.io/tx/${data.signature}`,
      });
    } else {
      throw new Error(`Failed to generate transaction: ${resp.statusText}`);
    }
  } catch (error) {
    logger.error("Error in token creation", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
