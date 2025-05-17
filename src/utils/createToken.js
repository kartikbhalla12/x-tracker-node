import { VersionedTransaction, Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import axios from "axios";
import dotenv from "dotenv";

import logger from "@utils/logger.js";

dotenv.config();

const RPC_ENDPOINT = process.env.RPC_ENDPOINT;
const PUMP_API = process.env.PUMP_API;
const PUMP_PORTAL_API = process.env.PUMP_PORTAL_API;

logger.info("Initializing Solana connection", { endpoint: RPC_ENDPOINT });
const web3Connection = new Connection(RPC_ENDPOINT, "confirmed");

export async function createTokenLocal({
  imageUrl,
  publicKey,
  privateKey,
  tokenName,
  tickerName,
  twitterUrl,
  buyAmount,
  tokenKey,
}) {
  logger.info("Starting token creation process", {
    tokenName,
    tickerName,
    twitterUrl,
  });

  try {
    logger.info("Creating signer keypair from private key");
    const signerKeyPair = Keypair.fromSecretKey(bs58.decode(privateKey));
    logger.info("Signer public key created", {
      publicKey: signerKeyPair.publicKey.toBase58(),
    });

    logger.info("Generating mint keypair");

    const tokenKeyArray = JSON.parse(tokenKey);
    const mintKeypair = Keypair.fromSecretKey(
      new Uint8Array(tokenKeyArray)
    );

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
      `${PUMP_PORTAL_API}/trade-local`,
      {
        publicKey: publicKey,
        action: "create",
        tokenMetadata: {
          name: metadataResponseJSON.metadata.name,
          symbol: metadataResponseJSON.metadata.symbol,
          uri: metadataResponseJSON.metadataUri,
        },
        mint: mintKeypair.publicKey.toBase58(),
        denominatedInSol: "true",
        amount: buyAmount,
        slippage: 10,
        priorityFee: 0.0005,
        pool: "pump",
      },
      {
        headers: { "Content-Type": "application/json" },
        responseType: "arraybuffer",
      }
    );

    if (resp.status === 200) {
      logger.info("Transaction generated successfully");
      const data = resp.data;
      logger.info("Raw transaction data received", { dataLength: data.length });

      try {
        const transactionData = new Uint8Array(data);

        logger.info("Transaction data prepared", {
          length: transactionData.length,
        });

        logger.info("Deserializing transaction");
        const tx = VersionedTransaction.deserialize(transactionData);

        logger.info("Signing transaction");
        tx.sign([mintKeypair, signerKeyPair]);

        logger.info("Sending transaction to network");
        const signature = await web3Connection.sendTransaction(tx);
        logger.info("Transaction successful", {
          signature,
          url: `https://solscan.io/tx/${signature}`,
        });

        return {
          success: true,
          signature,
          transactionUrl: `https://solscan.io/tx/${signature}`,
        };
      } catch (deserializeError) {
        logger.error("Error deserializing transaction", {
          error: deserializeError.message,
          dataType: typeof data,
          dataLength: data?.length,
        });
        throw new Error(
          `Failed to deserialize transaction: ${deserializeError.message}`
        );
      }
    } else {
      logger.error("Failed to generate transaction", {
        statusText: resp.statusText,
      });
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
