import type { SiteConfig } from "@/types";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://findryai.com";

// utm_source 按惯例只放域名，不带协议
const SITE_HOST = SITE_URL ? new URL(SITE_URL).hostname : SITE_URL;

export const siteConfig: SiteConfig = {
  name: "Findry AI",
  tagline: "Find better AI.",
  description:
    "Discover curated AI tools for work, creativity, development, research, and everyday tasks.",
  keywords: [
    "AI tools",
    "AI directory",
    "artificial intelligence",
    "productivity tools",
    "generative AI",
  ],
  author: "Findry AI",
  url: SITE_URL,
  logo: "/logo.png",
  logoDark: "/logo-dark.png",
  // please increase the version number when you update the image
  image: `${SITE_URL}/og.png?v=1`,
  mail: "support@findryai.com",
  utm: {
    source: SITE_HOST,
    medium: "referral",
    campaign: "navigation",
  },
  links: {
    // leave it blank if you don't want to show the link (don't delete)
    twitter: "",
    github: "",
    youtube: "",
  },
};
