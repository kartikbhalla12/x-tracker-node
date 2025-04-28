import axios from "axios";
import * as Cheerio from "cheerio";
import { parentPort, workerData } from 'worker_threads';

const METADATA_SELECTORS = {
  title: "title",
  description: 'meta[name="description"]',
  ogTitle: 'meta[property="og:title"]',
  ogDescription: 'meta[property="og:description"]',
  ogImage: 'meta[property="og:image"]',
  ogUrl: 'meta[property="og:url"]',
  twitterTitle: 'meta[name="twitter:title"]',
  twitterDescription: 'meta[name="twitter:description"]',
  twitterImage: 'meta[name="twitter:image"]'
};

const DEFAULT_HEADERS = {
  "User-Agent": "Metadata-Node/1.0"
};

const extractMetadata = ($) => {
  return Object.entries(METADATA_SELECTORS).reduce((acc, [key, selector]) => {
    const value = selector === "title" 
      ? $(selector).text()
      : $(selector).attr("content");
    return { ...acc, [key]: value };
  }, {});
}

const fetchPage = async (url) => {
  const response = await axios.get(url, { headers: DEFAULT_HEADERS });
  return Cheerio.load(response.data);
}

const processUrl = async (url) => {
  try {
    const $ = await fetchPage(url);
    const metadata = await extractMetadata($);
    return metadata;
  } catch (error) {
    throw new Error(`Failed to process URL ${url}: ${error.message}`);
  }
}

(async () => {
  try {
    const metadata = await processUrl(workerData.url);
    parentPort.postMessage(metadata);
  } catch (error) {
    parentPort.postMessage({ 
      url: workerData.url, 
      error: error.message 
    });
  }
})();
