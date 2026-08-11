import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/blog", "/about", "/contact", "/privacy", "/terms"],
      disallow: ["/home", "/room", "/play-online", "/private-room", "/profile", "/settings", "/api"],
    },
    sitemap: "https://ludo-live.vercel.app/sitemap.xml",
  };
}
