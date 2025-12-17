interface ApifyStatus {
  available: boolean;
  configured: boolean;
  apiKeySet: boolean;
}

class ApifyService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.APIFY_API_KEY;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getStatus(): ApifyStatus {
    return {
      available: this.isAvailable(),
      configured: !!this.apiKey,
      apiKeySet: !!this.apiKey,
    };
  }

  async runInstagramScraper(url: string): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('Apify service not configured - APIFY_API_KEY not set');
    }
    console.log(`[APIFY] Instagram scraper not implemented for: ${url}`);
    return null;
  }

  async runTikTokScraper(url: string): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('Apify service not configured - APIFY_API_KEY not set');
    }
    console.log(`[APIFY] TikTok scraper not implemented for: ${url}`);
    return null;
  }
}

export const apifyService = new ApifyService();
