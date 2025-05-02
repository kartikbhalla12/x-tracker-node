import axios from "axios";

import logger from "@utils/logger.js";

const TWITTER_API = process.env.TWITTER_API;

const mapTweet = (tweet) => {
  const getFirstUrl = (urls) =>
    urls?.length > 0 ? urls[0].expanded_url : null;

  return {
    id: tweet.id,
    text: tweet.text,
    url: tweet.url,
    attachedUrl: getFirstUrl(tweet.entities?.urls),
    attachedMedia: tweet.extendedEntities?.media?.map((m) => m.media_url_https),
    author: {
      name: tweet.author.name,
      username: tweet.author.userName,
      profilePicture: tweet.author?.profilePicture,
    },
    createdAt: tweet.createdAt,
  };
};

const mapParentTweets = async ({ tweets, apiToken }) => {
  return Promise.all(
    tweets.map(async (tweet) => {
      const isRepliedToTweet = tweet.isReply;
      const mappedTweet = mapTweet(tweet);

      if (isRepliedToTweet) {
        const inReplyToTweet = await getTweetReply({
          tweetId: tweet.inReplyToId,
          apiToken,
        });

        const mappedReplyTweet = inReplyToTweet
          ? mapTweet(inReplyToTweet)
          : null;

        return {
          ...mappedTweet,
          inReplyToTweet: mappedReplyTweet,
          quotedTweet: null,
        };
      }

      const mappedQuotedTweet = tweet.quoted_tweet
        ? mapTweet(tweet.quoted_tweet)
        : null;

      return {
        ...mappedTweet,
        quotedTweet: mappedQuotedTweet,
        inReplyToTweet: null,
      };
    })
  );
};

const fetchTweets = async ({ listId, apiToken }) => {
  const response = await axios.get(
    `${TWITTER_API}/tweet/advanced_search?query="list:${listId} within_time:10s"`,
    { headers: { "X-API-Key": apiToken } }
  );
  return response.data?.tweets;
};

export const getTweets = async ({ listId, apiToken }) => {
  const tweets = await fetchTweets({ listId, apiToken });
  const mappedTweets = await mapParentTweets({ tweets, apiToken });

  return mappedTweets;
};

export const getTweetReply = async ({ tweetId, apiToken }) => {
  try {
    const response = await axios.get(
      `${TWITTER_API}/tweets?tweet_ids=${[tweetId]}`,
      { headers: { "X-API-Key": apiToken } }
    );
    return response.data?.tweets?.[0] || null;
  } catch (error) {
    logger.error(error);
    return null;
  }
};
