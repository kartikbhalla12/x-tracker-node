import ws from "ws";

import logger from "@utils/logger.js";
import { getTweets } from "@utils/tweets.js";

import { isClientPaused } from "@sockets/clientState.js";

export const broadcastTweet = async (wss, clientStates) => {
  try {
    logger.info("Broadcasting tweets to clients");
    for (const client of wss.clients) {
      if (client.readyState === ws.OPEN) {
        logger.info("Client is open", {
          ip: client.upgradeReq.socket.remoteAddress,
        });

        if (isClientPaused(clientStates, client))
          return setTimeout(() => {
            broadcastTweet(wss, clientStates);
          }, 1000);

        const { twitterListId, twitterApiKey } = client.upgradeReq.query;
        logger.info("Fetching tweets for client", {
          twitterListId,
          ip: client.upgradeReq.socket.remoteAddress,
        });

        const tweets = await getTweets({
          listId: twitterListId,
          apiToken: twitterApiKey,
        });

        if (isClientPaused(clientStates, client))
          return setTimeout(() => {
            broadcastTweet(wss, clientStates);
          }, 1000);

        client.send(JSON.stringify({ type: "tweet", data: tweets }));

        setTimeout(() => {
          broadcastTweet(wss, clientStates);
        }, 0);
      }
    }
  } catch (error) {
    logger.error("Error broadcasting tweets", {
      error: error.message,
      stack: error.stack,
    });
  }
}; 