import Anthropic from "@anthropic-ai/sdk";
import * as fs from 'fs/promises';
import * as path from 'path';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/*
<important_code_snippet_instructions>
The newest Anthropic model is "claude-sonnet-4-20250514", not "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022" nor "claude-3-sonnet-20240229".
</important_code_snippet_instructions>
*/

const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";

export interface Question {
  id: string;
  question: string;
  why_matters: string;
  type: 'text' | 'choice' | 'date_range' | 'number';
  options?: string[];
  required: boolean;
  slot_path: string;
}

export interface EnrichmentRule {
  condition: string;
  apis?: Array<{
    type: string;
    params: Record<string, string>;
  }>;
  web_searches?: string[];
}

export interface PlanTemplate {
  sections: Array<{
    title: string;
    required_data: string[];
  }>;
}

export interface DomainConfig {
  domain: string;
  aliases: string[];
  description: string;
  questions: {
    quick_plan: Question[];
    smart_plan: Question[];
  };
  enrichment_rules: EnrichmentRule[];
  plan_template: PlanTemplate;
  safety_checks?: string[];
}

export interface DomainDetectionResult {
  domain: string;
  confidence: number;
  reasoning: string;
  extractedSlots: any;
}

/**
 * Domain Registry - Manages all planning domains and their configurations
 */
export class DomainRegistry {
  private domains: Map<string, DomainConfig> = new Map();
  private aliasMap: Map<string, string> = new Map(); // alias -> primary domain
  private initialized: boolean = false;

  /**
   * Load all domain configurations from JSON files
   */
  async loadDomains(): Promise<void> {
    if (this.initialized) return;

    try {
      const domainsDir = path.join(process.cwd(), 'server', 'domains');
      console.log('[DOMAIN REGISTRY] Loading domains from:', domainsDir);

      // Check if directory exists
      try {
        await fs.access(domainsDir);
      } catch {
        console.warn('[DOMAIN REGISTRY] Domains directory not found, creating it');
        await fs.mkdir(domainsDir, { recursive: true });
        this.initialized = true;
        return;
      }

      const files = await fs.readdir(domainsDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      console.log(`[DOMAIN REGISTRY] Found ${jsonFiles.length} domain config files`);

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(domainsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const config: DomainConfig = JSON.parse(content);

          // Validate config has required fields
          if (!config.domain || !config.questions) {
            console.error(`[DOMAIN REGISTRY] Invalid config in ${file}: missing required fields`);
            continue;
          }

          // Register primary domain
          this.domains.set(config.domain, config);
          console.log(`[DOMAIN REGISTRY] Loaded domain: ${config.domain}`);

          // Register aliases
          for (const alias of config.aliases || []) {
            this.aliasMap.set(alias.toLowerCase(), config.domain);
          }
        } catch (error) {
          console.error(`[DOMAIN REGISTRY] Error loading ${file}:`, error);
        }
      }

      this.initialized = true;
      console.log(`[DOMAIN REGISTRY] Initialized with ${this.domains.size} domains`);
    } catch (error) {
      console.error('[DOMAIN REGISTRY] Error loading domains:', error);
      this.initialized = true; // Mark as initialized even on error to prevent retry loops
    }
  }

  /**
   * Detect domain from user message using Claude Sonnet 4
   */
  async detectDomain(userMessage: string): Promise<DomainDetectionResult> {
    await this.loadDomains(); // Ensure domains are loaded

    // If no domains loaded, return generic domain
    if (this.domains.size === 0) {
      console.warn('[DOMAIN REGISTRY] No domains loaded, using generic');
      return {
        domain: 'general',
        confidence: 0.5,
        reasoning: 'No domain configs loaded',
        extractedSlots: {}
      };
    }

    const availableDomains = Array.from(this.domains.keys());
    const domainDescriptions = availableDomains.map(d => {
      const config = this.domains.get(d);
      return `- ${d}: ${config?.description || 'No description'}`;
    }).join('\n');

    try {
      const prompt = `You are a domain classification expert. Classify the user's planning request into one of the available domains.

AVAILABLE DOMAINS:
${domainDescriptions}

USER MESSAGE: "${userMessage}"

Analyze the message and determine which planning domain it belongs to. Also extract any information mentioned.

Respond with JSON in this exact format:
{
  "domain": "the_domain_name",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this domain was chosen",
  "extractedSlots": {
    "location": {"destination": "Dallas"},
    "timing": {"date": "next week"},
    // ... any other information extracted from the message
  }
}`;

      const response = await anthropic.messages.create({
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 1000,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      });

      const aiResponse = response.content[0].type === 'text' ? response.content[0].text : '{}';

      // Extract JSON from response
      let jsonStr = aiResponse;
      if (aiResponse.includes('```json')) {
        const match = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) jsonStr = match[1];
      }

      const result = JSON.parse(jsonStr);

      // Validate domain exists
      if (!this.domains.has(result.domain)) {
        // Check if it's an alias
        const primaryDomain = this.aliasMap.get(result.domain.toLowerCase());
        if (primaryDomain) {
          result.domain = primaryDomain;
        } else {
          // Fallback to first available domain
          result.domain = availableDomains[0] || 'general';
          result.confidence = 0.3;
          result.reasoning = 'Domain not found, using fallback';
        }
      }

      console.log('[DOMAIN DETECTION]', result);
      return result;

    } catch (error) {
      console.error('[DOMAIN DETECTION] Error:', error);
      // Fallback to keyword matching
      return this.fallbackDomainDetection(userMessage);
    }
  }

  /**
   * Fallback domain detection using keyword matching
   */
  private fallbackDomainDetection(message: string): DomainDetectionResult {
    const lowerMessage = message.toLowerCase();

    // Simple keyword matching as fallback
    const keywords: Record<string, string[]> = {
      travel: ['travel', 'trip', 'vacation', 'visit', 'destination', 'flight', 'hotel'],
      interview_prep: ['interview', 'job', 'preparation', 'prepare', 'hiring', 'candidate'],
      date_night: ['date', 'romantic', 'dinner', 'date night'],
      daily_planning: ['day', 'schedule', 'plan my day', 'daily', 'routine'],
      fitness: ['workout', 'exercise', 'fitness', 'gym', 'training']
    };

    for (const [domain, words] of Object.entries(keywords)) {
      if (this.domains.has(domain)) {
        for (const word of words) {
          if (lowerMessage.includes(word)) {
            return {
              domain,
              confidence: 0.7,
              reasoning: `Keyword match: "${word}"`,
              extractedSlots: {}
            };
          }
        }
      }
    }

    // Default fallback
    const firstDomain = Array.from(this.domains.keys())[0] || 'general';
    return {
      domain: firstDomain,
      confidence: 0.4,
      reasoning: 'No clear keyword match, using default',
      extractedSlots: {}
    };
  }

  /**
   * Get questions for a specific domain and plan type
   */
  getQuestions(domain: string, planType: 'quick' | 'smart'): Question[] {
    const config = this.domains.get(domain);
    if (!config) {
      console.warn(`[DOMAIN REGISTRY] Domain ${domain} not found`);
      return [];
    }

    const key = `${planType}_plan` as 'quick_plan' | 'smart_plan';
    return config.questions[key] || [];
  }

  /**
   * Get enrichment rules for a domain
   */
  getEnrichmentRules(domain: string): EnrichmentRule[] {
    const config = this.domains.get(domain);
    return config?.enrichment_rules || [];
  }

  /**
   * Get domain configuration
   */
  getDomain(domain: string): DomainConfig | undefined {
    return this.domains.get(domain);
  }

  /**
   * Get all available domain names
   */
  getAvailableDomains(): string[] {
    return Array.from(this.domains.keys());
  }

  /**
   * Check if a domain exists
   */
  hasDomain(domain: string): boolean {
    return this.domains.has(domain) || this.aliasMap.has(domain.toLowerCase());
  }
}

// Export singleton instance
export const domainRegistry = new DomainRegistry();
