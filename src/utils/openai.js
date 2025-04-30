import axios from "axios";
import OpenAI from "openai";

import logger from "@utils/logger.js";

const OPENAI_PROMPT_DOC_ID = process.env.OPENAI_PROMPT_DOC_ID;

let systemPrompt = null;
const loadPromptFromGoogleDocs = async () => {
  try {
    const response = await axios.get(
      `https://docs.google.com/document/d/${OPENAI_PROMPT_DOC_ID}/export?format=txt`
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

export const analyzeTweet = async (tweetText, tweetImageUrl, openAIKey) => {
  const openai = new OpenAI({
    apiKey: openAIKey,
    dangerouslyAllowBrowser: true,
  });

  const customPrompt = `
  ${systemPrompt}
  
  Analyze the following tweet and attached image URL carefully and return a JSON object with the token name and ticker.
    Tweet: ${tweetText || "[No tweet text provided]"}
    Image URL: ${tweetImageUrl || "[No image URL provided]"}
  `;

  if (!systemPrompt) {
    logger.error("System prompt not loaded");
    return null;
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: customPrompt,
            },
            {
              type: "image_url",
              image_url: { url: tweetImageUrl },
            },
          ],
        },
      ],
      model: "gpt-4o",
      temperature: 0.3,
      response_format: {
        type: "json_object",
      },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    return JSON.parse(response);
  } catch (error) {
    logger.error("Error analyzing tweet", {
      error: error.message,
      stack: error.stack,
    });

    return null;
  }
};
