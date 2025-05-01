import axios from "axios";
import * as Cheerio from "cheerio";
import puppeteer from "puppeteer";

const METADATA_SELECTORS = {
  ogTitle: 'meta[property="og:title"]',
  ogDescription: 'meta[property="og:description"]',
  ogImage: 'meta[property="og:image"]',
  ogUrl: 'meta[property="og:url"]',
  twitterTitle: 'meta[name="twitter:title"]',
  twitterDescription: 'meta[name="twitter:description"]',
  twitterImage: 'meta[name="twitter:image"]',
};

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

const extractMetadata = ($) => {
  return Object.entries(METADATA_SELECTORS).reduce(
    (acc, [key, selector]) => {
      const value = $(selector).attr("content");
      return { ...acc, [key]: value };
    },
    {
      ogTitle: "",
      ogDescription: "",
      ogImage: "",
      ogUrl: "",
      twitterTitle: "",
    }
  );
};

const fetchPageWithAxios = async (url) => {
  const response = await axios.get(url, {
    headers: DEFAULT_HEADERS,
    timeout: 5000,
  });
  return Cheerio.load(response.data);
};

const fetchPageWithPuppeteer = async (url) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(DEFAULT_HEADERS["User-Agent"]);
    await page.goto(url, { waitUntil: "networkidle0", timeout: 10000 });
    const content = await page.content();
    await browser.close();
    return Cheerio.load(content);
  } catch (error) {
    await browser.close();
    throw error;
  }
};

const fetchPage = async (url) => {
  try {
    return await fetchPageWithAxios(url);
  } catch (error) {
    console.log(`Axios failed for ${url}, falling back to Puppeteer: ${error.message}`);
    return await fetchPageWithPuppeteer(url);
  }
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
