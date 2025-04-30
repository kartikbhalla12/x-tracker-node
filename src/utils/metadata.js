import axios from "axios";
import * as Cheerio from "cheerio";

const METADATA_SELECTORS = {
  description: 'meta[name="description"]',
  ogTitle: 'meta[property="og:title"]',
  ogDescription: 'meta[property="og:description"]',
  ogImage: 'meta[property="og:image"]',
  ogUrl: 'meta[property="og:url"]',
  twitterTitle: 'meta[name="twitter:title"]',
  twitterDescription: 'meta[name="twitter:description"]',
  twitterImage: 'meta[name="twitter:image"]',
};

const DEFAULT_HEADERS = {
  "User-Agent": "Metadata-Node/1.0",
};

const extractMetadata = ($) => {
  return Object.entries(METADATA_SELECTORS).reduce(
    (acc, [key, selector]) => {
      const value = $(selector).attr("content");
      return { ...acc, [key]: value };
    },
    {
      title: $(selector).text(),
      description: "",
      ogTitle: "",
      ogDescription: "",
      ogImage: "",
      ogUrl: "",
      twitterTitle: "",
    }
  );
};

const fetchPage = async (url) => {
  const response = await axios.get(url, {
    headers: DEFAULT_HEADERS,
    timeout: 5000,
  });
  return Cheerio.load(response.data);
};

const processUrl = async (url) => {
  try {
    const $ = await fetchPage(url);
    const metadata = extractMetadata($);
    return metadata;
  } catch (error) {
    throw new Error(`Failed to process URL ${url}: ${error.message}`);
  }
};

export const getMetadata = async (url) => {
  const metadata = await processUrl(url);
  return metadata;
};
