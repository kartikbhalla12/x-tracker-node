import axios from "axios";
import logger from "./logger.js";
import { getMetadata } from "./metadata/metadata.js";

const TWITTER_API = process.env.TWITTER_API;

const mapTweet = async (tweet) => {
  const getFirstUrl = (urls) => urls?.length > 0 ? urls[0].expanded_url : null;

  return {
    id: tweet.id,
    text: tweet.text,
    url: tweet.url,
    attachedUrl: getFirstUrl(tweet.entities?.urls),
    attachedMedia: tweet.extendedEntities?.media?.map(m => m.media_url_https),
    author: {
      name: tweet.author?.name,
      username: tweet.author?.userName,
      profilePicture: tweet.author?.profilePicture,
    },
    createdAt: tweet.createdAt,
  };
};

const mapParentTweets = async({tweets, apiToken}) => {
  return Promise.all(tweets.map(async (tweet) => {
    const isRepliedToTweet = tweet.isReply;
    
    if (isRepliedToTweet) {
      const inReplyToTweet = await getTweetReply({ tweetId: tweet.inReplyToId, apiToken });
      const mappedReplyTweet = inReplyToTweet ? await mapTweet(inReplyToTweet) : null;
      
      return {
        ...await mapTweet(inReplyToTweet),
        inReplyToTweet: mappedReplyTweet,
        quotedTweet: null,
      };
    }

    const mappedQuotedTweet = tweet.quoted_tweet ? await mapTweet(tweet.quoted_tweet) : null;
    return {
      ...await mapTweet(tweet),
      quotedTweet: mappedQuotedTweet,
      inReplyToTweet: null,
    };
  }));
};

const fetchTweets = async ({ listId, apiToken }) => {
  const response = await axios.get(
    `${TWITTER_API}/tweet/advanced_search?query="list:${listId} within_time:10m"`,
    { headers: { "X-API-Key": apiToken } }
  );
  return response.data?.tweets;
};

const enrichTweetsWithMetadata = async (tweets) => {
  const metadataPromises = tweets.map(t => 
    t.attachedUrl ? getMetadata(t.attachedUrl) : null
  );
  
  const metadataResults = await Promise.all(metadataPromises);
  
  return tweets.map((tweet, index) => {
    if (!tweet.attachedUrl) return tweet;
    
    const metadata = metadataResults[index];
    return {
      ...tweet,
      attachedUrlMetadata: {
        title: metadata?.ogTitle || "",
        description: metadata?.ogDescription || "",
        image: metadata?.ogImage || "",
      }
    };
  });
};

export const getTweets = async ({ listId, apiToken }) => {
  try {
    const tweets = await fetchTweets({ listId, apiToken });
    const mappedTweets = await mapParentTweets({ tweets, apiToken });
    return await enrichTweetsWithMetadata(mappedTweets);
  } catch (error) {
    logger.error(error);
    return [];
  }
};

export const getTweetReply = async ({ tweetId, apiToken }) => {
  try {
    const response = await axios.get(
      `${TWITTER_API}/tweets?tweet_ids=${[tweetId]}`,
      { headers: { "X-API-Key": apiToken } }
    );
    return response.data?.tweets?.[0];
  } catch (error) {
    logger.error(error);
    return null;
  }
};
