// TODO: Implement the code here to add rate limiting with Redis
// Refer to the Next.js Docs: https://nextjs.org/docs/app/building-your-application/routing/middleware
// Refer to Redis docs on Rate Limiting: https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
});

export async function middleware(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1"; //obtain user's IP address from the header
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    // Response with limit headers
    const response = success
      ? NextResponse.next() // Forward the request successfully
      : NextResponse.json({ error: "Too many requests" }, { status: 429 });

    // Rate limit info for response headers
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", reset.toString());

    return response;
  } catch (error) {
    console.error("Too many requests. Check Rate Limits");
    return NextResponse.next();
  }
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
