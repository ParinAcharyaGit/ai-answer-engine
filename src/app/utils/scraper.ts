import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import { Logger } from "./logger";
import { Redis } from "@upstash/redis";

const logger = new Logger("scraper");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const CACHE_TTL = 7 * (24 * 60 * 60); // in seconds, for 7 days
const MAX_CACHE_SIZE = 1024000; //1MB limit

export const urlPattern =
  /https?:\/\/(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,256}\/?[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]*/;

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export async function scrapeUrl(url: string) {
  try {
    // Check if content is cached
    logger.info(`Starting scrape process for: ${url}`);
    const cached = await getCachedContent(url);
    if (cached) {
      logger.info(`Using cached content for: ${url}`);
      return cached;
    }
    logger.info(`Cache miss - proceeding with fresh scrape for: ${url}`);

    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const title = $("title").text();

    // Remove unwanted elements
    $("script, style, noscript, iframe").remove();
    const metaDescription = $('meta[name="description"]').attr("content") || "";
    const h1 = $("h1")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");
    const h2 = $("h2")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");
    const articleText = $("article")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");
    const mainText = $("main")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");
    const contentText = $('.content, #content, [class*="content"]')
      .map((_, el) => $(el).text())
      .get()
      .join(" ");
    const paragraphs = $("p")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");
    const listItems = $("li")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");
    let combinedContent = [
      title,
      metaDescription,
      h1,
      h2,
      articleText,
      mainText,
      contentText,
      paragraphs,
      listItems,
    ].join("\n");

    combinedContent = cleanText(combinedContent).slice(0, 10000);

    const finalResponse = {
      url,
      title: cleanText(title),
      headings: {
        h1: cleanText(h1),
        h2: cleanText(h2),
      },
      metaDescription: cleanText(metaDescription),
      content: combinedContent,
      error: null,
    };

    await cacheContent(url, finalResponse);
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return {
      url,
      title: "",
      headings: {
        h1: "",
        h2: "",
      },
      metaDescription: "",
      content: "",
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export interface scrapedContent {
  url: string;
  title: string;
  headings: {
    h1: string;
    h2: string;
  };
  metaDescription: string;
  content: string;
  error: string | null;
  cachedAt?: number;
}

function isValidScrapedContent(data: any): data is scrapedContent {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.url === "string" &&
    typeof data.title === "string" &&
    typeof data.headings === "object" &&
    typeof data.headings.h1 === "string" &&
    typeof data.headings.h2 === "string" &&
    typeof data.metaDescription === "string" &&
    typeof data.content === "string" &&
    (data.error === null || typeof data.error === "string")
  );
}

//TO DO:Implement function to get the cache key for a URL with sanitization
function getCacheKey(url: string): string {
  const sanitizedUrl = url.substring(0, 200);
  return `scrape:${sanitizedUrl}`;
}
// Function to get cached content with error handling
async function getCachedContent(url: string): Promise<scrapedContent | null> {
  try {
    const cacheKey = getCacheKey(url);
    logger.info(`Checking cache for key: ${cacheKey}`);
    let cached = await redis.get(cacheKey);

    if (!cached) {
      logger.info(`Cache miss - No cached content found for: ${url}`);
      return null;
    }

    logger.info(`Cache hit - Found cached content for: ${url}`);

    // Handle both string and object responses from Redis
    let parsed: any;
    if (typeof cached === "string") {
      try {
        parsed = JSON.parse(cached);
      } catch (parseError) {
        logger.error(`JSON parse error for cached content: ${parseError}`);
        await redis.del(cacheKey);
        return null;
      }
    } else {
      parsed = cached;
    }

    if (isValidScrapedContent(parsed)) {
      const age = Date.now() - (parsed.cachedAt || 0);
      logger.info(`Cache content age: ${Math.round(age / 1000 / 60)} minutes`);
      return parsed;
    }

    logger.warn(`Invalid cached content format for URL: ${url}`);
    await redis.del(cacheKey);
    return null;
  } catch (error) {
    logger.error(`Cache retrieval error: ${error}`);
    return null;
  }
}

// Function to cache scraped content with error handling
async function cacheContent(
  url: string,
  content: scrapedContent
): Promise<void> {
  try {
    const cacheKey = getCacheKey(url);
    content.cachedAt = Date.now();

    // Validate content before caching
    if (!isValidScrapedContent(content)) {
      logger.error(`Attempted to cache invalid content format for URL: ${url}`);
      return;
    }

    const serialized = JSON.stringify(content);

    if (serialized.length > MAX_CACHE_SIZE) {
      logger.warn(
        `Content too large to cache for URL: ${url} (${serialized.length} bytes)`
      );
      return;
    }

    await redis.set(cacheKey, serialized, { ex: CACHE_TTL });
    logger.info(
      `Successfully cached content for: ${url} (${serialized.length} bytes, TTL: ${CACHE_TTL}s)`
    );
  } catch (error) {
    logger.error(`Cache storage error: ${error}`);
  }
}
