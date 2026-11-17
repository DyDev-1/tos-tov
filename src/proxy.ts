import { clerkMiddleware } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Proxy (called "middleware" before Next.js 16) runs before every matching request.
// 1. Clerk reads the login session, so auth() works in pages and API routes.
// 2. next-intl redirects "/" to "/en" (or "/km") and keeps the language in the URL.
const intlMiddleware = createIntlMiddleware(routing);

export default clerkMiddleware((_auth, req) => {
  // API routes are not translated, so skip the language redirect for them.
  if (req.nextUrl.pathname.startsWith("/api")) return;
  return intlMiddleware(req);
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files.
    "/((?!_next|_vercel|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
