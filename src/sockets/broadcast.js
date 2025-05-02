import WebSocket from "ws";

import logger from "@utils/logger.js";
import { getTweets } from "@utils/tweets.js";

import { isClientPaused } from "@sockets/clientState.js";

export const startBroadcastTweets = async ({
  isActive,
  ws,
  clientStates,
  twitterListId,
  twitterApiKey,
}) => {
  const broadcastTweets = async () => {
    if (!isActive || ws.readyState !== WebSocket.OPEN) return;

    try {
      if (isClientPaused(clientStates, ws))
        return setTimeout(broadcastTweets, 1000);
      logger.info("Fetching tweets for client", {
        twitterListId,
      });

      const tweets = await getTweets({
        listId: twitterListId,
        apiToken: twitterApiKey,
      });

      if (isClientPaused(clientStates, ws))
        return setTimeout(broadcastTweets, 1000);

      ws.send(JSON.stringify({ type: "tweet", data: tweets }));

      if (tweets.length === 0) setTimeout(broadcastTweets, 300);
      else setImmediate(broadcastTweets);
    } catch (error) {
      console.error("API call failed:", error.message);
      ws.send(JSON.stringify({ type: "tweet-error", data: error.message }));
    }
  };

  broadcastTweets();
};
