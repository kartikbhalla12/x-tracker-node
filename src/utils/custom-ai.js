import axios from "axios";

import logger from "@utils/logger.js";

const CUSTOM_AI_PROMPT_DOC_ID = process.env.CUSTOM_AI_PROMPT_DOC_ID;
const OPENAI_ENDPOINT = process.env.OPENAI_ENDPOINT;

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
  openAIKey
) => {
  if (!systemPrompt) {
    logger.error("System prompt not loaded");
    return null;
  }

  const customPrompt = `
    ${systemPrompt}
    
    Analyze the following tweet and attached image URL carefully and return a JSON object with the token name and ticker.
    
    Tweet: ${tweetText || "[No tweet text provided]"}
    Image URL: ${tweetImageUrl || "[No image URL provided]"}
    `;

  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: customPrompt },
        ...(tweetImageUrl
          ? [
              {
                type: "image_url",
                image_url: { url: tweetImageUrl },
              },
            ]
          : []),
      ],
    },
  ];

  try {
    const { data } = await axios.post(
      OPENAI_ENDPOINT,
      {
        model: "gpt-4.1-mini",
        messages,
        temperature: 0.3,
        response_format: {
          type: "json_object",
        },
      },
      {
        headers: { Authorization: `Bearer ${openAIKey}` },
        timeout: 5000,
        signal: controller.signal,
      }
    );

    const response = data.choices[0]?.message?.content;
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
