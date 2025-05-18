import axios from "axios";

import logger from "@utils/logger.js";

const CUSTOM_AI_PROMPT_DOC_ID = process.env.CUSTOM_AI_PROMPT_DOC_ID;
const CUSTOM_AI_PARTIAL_ENDPOINT = process.env.CUSTOM_AI_PARTIAL_ENDPOINT;

//todo
let systemPrompt = null;
const loadPromptFromGoogleDocs = async () => {
  try {
    const response = await axios.get(
      `https://docs.google.com/document/d/${CUSTOM_AI_PROMPT_DOC_ID}/export?format=txt`
    );

    systemPrompt = response.data;
  } catch (error) {
    logger.error("Error loading prompt from Google Docs", {
      error: error.message,
      stack: error.stack,
    });
  }
};
loadPromptFromGoogleDocs();

const controller = new AbortController();

export const analyzeCustomTweet = async (
  tweetText,
  tweetImageUrl,
  podId,
  modelName
) => {
  if (!systemPrompt) {
    logger.error("System prompt not loaded");
    return null;
  }

  const customPrompt = `
    ${systemPrompt}
    
    Analyze the following tweet and attached image carefully and return a JSON object with the token name and ticker.
    
    Tweet: ${tweetText || "[No tweet text provided]"}
    `;

  try {
    let imageBase64 = null;

    if (tweetImageUrl) {
      const response = await axios.get(tweetImageUrl, {
        responseType: "arraybuffer",
      });
      imageBase64 = Buffer.from(response.data).toString("base64");
    }

    const { data } = await axios.post(
      `https://${podId}-${CUSTOM_AI_PARTIAL_ENDPOINT}/api/generate`,
      {
        model: modelName,
        prompt: customPrompt,
        ...(imageBase64 ? { images: [imageBase64] } : {}),
      },
      {
        timeout: 5000,
        signal: controller.signal,
        responseType: "stream",
      }
    );

    return new Promise((resolve, reject) => {
      let fullResponse = "";

      data.on("data", (chunk) => {
        const lines = chunk
          .toString()
          .split("\n")
          .filter((line) => line.trim() !== "");

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.response) {
              fullResponse += json.response;
              process.stdout.write(json.response); // optional: live output
            }
          } catch (e) {
            console.error("Failed to parse line:", line);
          }
        }
      });

      data.on("end", () => {
        fullResponse = fullResponse.replace(/```json\n|\n```/g, "").trim();

        try {
          const parsedResponse = JSON.parse(fullResponse);
          resolve(parsedResponse);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });

      data.on("error", (err) => {
        console.error("Stream Error:", err);
        reject(err);
      });
    });
  } catch (error) {
    logger.error("Error analyzing tweet", {
      error: error.message,
      stack: error.stack,
    });

    return null;
  }
};
