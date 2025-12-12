import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

export function SEO({ title, description, keywords, image, url, type = "website" }: SEOProps) {
  useEffect(() => {
    document.title = title;
    
    const updateMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    updateMeta("description", description);
    if (keywords) updateMeta("keywords", keywords);
    
    updateMeta("og:title", title, true);
    updateMeta("og:description", description, true);
    updateMeta("og:type", type, true);
    if (url) updateMeta("og:url", url, true);
    if (image) updateMeta("og:image", image, true);
    
    updateMeta("twitter:card", "summary_large_image", true);
    updateMeta("twitter:title", title, true);
    updateMeta("twitter:description", description, true);
    if (image) updateMeta("twitter:image", image, true);
  }, [title, description, keywords, image, url, type]);

  return null;
}

export const PAGE_SEO = {
  home: {
    title: "JournalMate - AI-Powered Planning & Journaling",
    description: "Transform your intentions into actionable plans with AI-powered journaling. Track goals, discover community plans, and achieve more.",
    keywords: "ai journal, goal tracking, planning app, productivity, intention setting",
  },
  login: {
    title: "Login - JournalMate",
    description: "Sign in to your JournalMate account to access your personal journal and plans.",
  },
  discover: {
    title: "Discover Plans - JournalMate",
    description: "Browse trending community plans and get inspired by what others are achieving.",
  },
  profile: {
    title: "Your Profile - JournalMate",
    description: "Manage your JournalMate profile, preferences, and account settings.",
  },
  groups: {
    title: "Groups - JournalMate",
    description: "Join groups, collaborate on plans, and track progress together.",
  },
};

export default SEO;
