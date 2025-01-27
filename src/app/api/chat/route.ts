// TODO: Implement the chat API with Groq and web scraping with Cheerio and Puppeteer
// Refer to the Next.js Docs on how to read the Request body: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
// Refer to the Groq SDK here on how to use an LLM: https://www.npmjs.com/package/groq-sdk
// Refer to the Cheerio docs here on how to parse HTML: https://cheerio.js.org/docs/basics/loading
// Refer to Puppeteer docs here: https://pptr.dev/guides/what-is-puppeteer

import { NextResponse } from "next/server"
import { GetGroqResponse } from "@/app/utils/groqUtils"
import { scrapeUrl, urlPattern } from "@/app/utils/scraper"


export async function POST(req: Request) {
  try {
    const { message } = await req.json()
    console.log("message received: ", message)

    const url = message.match(urlPattern)
    let scrapedContent = "";
    if (url) {
      console.log("URL found", url)
      const scrapedResponse = await scrapeUrl(url);
      scrapedContent = scrapedResponse.content;
      console.log("Scraped content:", scrapedContent);
    }

    const userQuery = message.replace(url ? url[0] : '', '').trim()

    const prompt = `
    Answer my question: "${userQuery}"

    Based on the following content:
    <content>
      ${scrapedContent}
    </content>

    Present the response in a readable format
    `
    console.log("PROMPT:", prompt)
    const response = await GetGroqResponse(prompt)

    return NextResponse.json({ message: response })

  } catch (error) {

    return NextResponse.json({ message: "Error" })
  }
}
