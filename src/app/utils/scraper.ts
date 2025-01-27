import axios from "axios"
import * as cheerio from "cheerio"
import puppeteer from 'puppeteer';
import { Logger } from "./logger"
import { Redis } from "@upstash/redis";

const logger = new Logger("scraper")

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  })

export const urlPattern = /https?:\/\/(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,256}\/?[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]*/

function cleanText(text:string): string {
    return text.replace(/\s+/g, ' ').trim()
}

export async function scrapeUrl(url: string) {
    try {
        const response = await axios.get(url)
        const $ = cheerio.load(response.data)
        const title = $('title').text()
        
        // Remove unwanted elements
        $('script, style, noscript, iframe').remove()
        const metaDescription = $('meta[name="description"]').attr('content') || ''
        const h1 = $('h1')
            .map((_, el) => $(el).text())
            .get()
            .join(' ');
        const h2 = $('h2')
            .map((_, el) => $(el).text())
            .get()
            .join(' ');
        const articleText = $('article')
            .map((_, el) => $(el).text())
            .get()
            .join(' ');
        const mainText = $('main')
            .map((_, el) => $(el).text())
            .get()
            .join(' ');
        const contentText = $('.content, #content, [class*="content"]')
            .map((_, el) => $(el).text())
            .get()
            .join(' ');
        const paragraphs = $('p')
            .map((_, el) => $(el).text())
            .get()
            .join(' ');
        const listItems = $('li')
            .map((_, el) => $(el).text())
            .get()
            .join(' ');
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
        ].join('\n');

        combinedContent = cleanText(combinedContent).slice(0, 10000)

        return {
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

