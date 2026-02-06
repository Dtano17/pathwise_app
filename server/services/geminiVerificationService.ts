import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";
import type { InsertVerification } from "@shared/schema";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini client
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Types for verification results
export interface ClaimAnalysis {
  id: string;
  text: string;
  type: 'factual' | 'opinion' | 'speculation' | 'exaggeration' | 'misleading';
  verdict: 'verified' | 'partially_true' | 'unverified' | 'false' | 'opinion';
  confidence: number;
  evidence?: string;
  sources?: Array<{ title: string; url: string; credibility?: number }>;
}

export interface AIDetectionResult {
  isAiGenerated: boolean;
  confidence: number;
  textAiScore?: number;
  imageAiScore?: number;
  videoAiScore?: number;
  synthIdDetected?: boolean;
  detectionMethod?: string;
}

export interface AccountAnalysis {
  isSuspectedBot: boolean;
  botScore: number;
  redFlags?: string[];
  accountCredibility: number;
}

export interface BusinessVerification {
  businessName?: string;
  isVerified: boolean;
  bbbRating?: string;
  bbbAccredited?: boolean;
  trustpilotScore?: number;
  domainAge?: string;
  domainRegistrar?: string;
  scamAdviserScore?: number;
  redFlags?: string[];
  recommendations?: string[];
}

export interface BiasAnalysis {
  politicalBias?: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'unknown';
  sensationalism: number;
  emotionalLanguage: number;
  clickbait: boolean;
}

// NEW: Source Tracing - Find the original source of content
export interface SourceTracing {
  originalSourceFound: boolean;
  originalSource?: {
    url: string;
    platform: string;
    author?: string;
    publishedAt?: string;
    title?: string;
  };
  spreadTimeline?: Array<{
    platform: string;
    url?: string;
    date: string;
    reach?: number;
  }>;
  viralityScore?: number;
  firstAppearance?: string;
  isOriginalPoster: boolean;
  sourceConfidence: number;
}

// NEW: Event Correlation - Match posts to real-world events/incidents
export interface EventCorrelation {
  correlatedEventFound: boolean;
  event?: {
    title: string;
    description: string;
    date: string;
    location?: string;
    category: 'news' | 'incident' | 'announcement' | 'disaster' | 'political' | 'entertainment' | 'sports' | 'other';
    verifiedSources: Array<{ title: string; url: string; credibility: number }>;
  };
  eventMatch: 'exact' | 'related' | 'misattributed' | 'fabricated' | 'not_found';
  discrepancies?: string[];
  manipulationIndicators?: string[];
  noCorrelationReason?: string;
}

// NEW: Timeline Analysis - When things happened vs when posted
export interface TimelineAnalysis {
  postDate: string;
  contentCreationDate?: string;
  eventDate?: string;
  timelineMismatch: boolean;
  mismatchSeverity?: 'none' | 'minor' | 'significant' | 'critical';
  mismatchExplanation?: string;
  isRecycledContent: boolean;
  recycledFromDate?: string;
  ageAnalysis: {
    contentAge: string;
    relevanceToday: 'current' | 'recent' | 'dated' | 'outdated' | 'historical';
    recommendation: string;
  };
}

export interface VerificationResult {
  trustScore: number;
  verdict: 'verified' | 'mostly_true' | 'mixed' | 'misleading' | 'false' | 'unverifiable';
  verdictSummary: string;
  claims: ClaimAnalysis[];
  aiDetection?: AIDetectionResult;
  accountAnalysis?: AccountAnalysis;
  businessVerification?: BusinessVerification;
  biasAnalysis?: BiasAnalysis;
  // NEW: Enhanced analysis features
  sourceTracing?: SourceTracing;
  eventCorrelation?: EventCorrelation;
  timelineAnalysis?: TimelineAnalysis;
  processingTimeMs: number;
  geminiModel: string;
  webGroundingUsed: boolean;
}

export interface VerificationInput {
  url?: string;
  platform?: string;
  content: string;
  mediaUrls?: string[];
  author?: {
    username?: string;
    displayName?: string;
    followers?: number;
    verified?: boolean;
    accountAge?: string;
  };
}

class GeminiVerificationService {
  private model = "gemini-2.0-flash-exp";

  isConfigured(): boolean {
    return !!GEMINI_API_KEY && !!genAI;
  }

  async verifyContent(input: VerificationInput): Promise<VerificationResult> {
    const startTime = Date.now();

    if (!this.isConfigured()) {
      throw new Error("Gemini API key not configured");
    }

    console.log(`[GEMINI-VERIFY] Starting verification for: ${input.url || 'direct content'}`);

    // Use Gemini 2.0 Flash with web grounding for fact-checking
    const model = genAI!.getGenerativeModel({
      model: this.model,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    // Build the verification prompt
    const prompt = this.buildVerificationPrompt(input);

    try {
      // Request with web grounding enabled
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          maxOutputTokens: 4096,
        },
        // Enable web grounding for real-time fact-checking
        tools: [{
          googleSearchRetrieval: {
            dynamicRetrievalConfig: {
              mode: "MODE_DYNAMIC" as any,
              dynamicThreshold: 0.3,
            },
          },
        }] as any,
      });

      const response = await result.response;
      const text = response.text();

      // Parse the structured response
      const verificationResult = this.parseVerificationResponse(text);

      const processingTime = Date.now() - startTime;
      console.log(`[GEMINI-VERIFY] Verification completed in ${processingTime}ms`);

      return {
        ...verificationResult,
        processingTimeMs: processingTime,
        geminiModel: this.model,
        webGroundingUsed: true,
      };
    } catch (error: any) {
      console.error(`[GEMINI-VERIFY] Error during verification:`, error.message);

      // Fallback to basic analysis without web grounding
      return this.fallbackVerification(input, startTime);
    }
  }

  private buildVerificationPrompt(input: VerificationInput): string {
    const authorInfo = input.author
      ? `
Author Information:
- Username: ${input.author.username || 'Unknown'}
- Display Name: ${input.author.displayName || 'Unknown'}
- Followers: ${input.author.followers || 'Unknown'}
- Verified Account: ${input.author.verified ? 'Yes' : 'No'}
- Account Age: ${input.author.accountAge || 'Unknown'}
`
      : '';

    const currentDate = new Date().toISOString();

    return `You are VerifyMate, an advanced AI fact-checker and content verification assistant. Analyze the following social media post and provide a comprehensive verification report with SOURCE TRACING, EVENT CORRELATION, and TIMELINE ANALYSIS.

CURRENT DATE/TIME: ${currentDate}

CONTENT TO VERIFY:
Platform: ${input.platform || 'Unknown'}
URL: ${input.url || 'Not provided'}
${authorInfo}
Content:
"""
${input.content}
"""
${input.mediaUrls?.length ? `\nMedia URLs: ${input.mediaUrls.join(', ')}` : ''}

ANALYSIS REQUIRED:

1. CLAIM EXTRACTION AND VERIFICATION
Extract all verifiable claims from the content. For each claim:
- Identify the type: factual, opinion, speculation, exaggeration, or misleading
- Verify against reliable sources using web search
- Provide a verdict: verified, partially_true, unverified, false, or opinion
- Cite your sources with URLs when possible

2. AI CONTENT DETECTION
Analyze patterns that might indicate AI-generated content:
- Unnatural phrasing or repetitive structures
- Perfect grammar with unusual word choices
- Stock-like or generic imagery descriptions
- Lack of personal voice or authentic errors

3. ACCOUNT CREDIBILITY (if author info provided)
Assess the account's credibility:
- Account age and follower count
- Posting patterns
- Red flags for bot behavior

4. BUSINESS VERIFICATION (if business/product mentioned)
If a business or product is promoted:
- Search for the business legitimacy
- Check for common scam indicators
- Note any red flags

5. BIAS AND TONE ANALYSIS
Analyze the content for:
- Political bias (left, center-left, center, center-right, right)
- Sensationalism level (0-100)
- Emotional language usage (0-100)
- Clickbait indicators

6. SOURCE TRACING (CRITICAL - Find the original source)
Search the internet to find the ORIGINAL source of this content:
- Is this the original poster or is it reshared/copied content?
- Find the earliest appearance of this content online
- Track how the content has spread across platforms
- Identify the original author if different from current poster
- Calculate virality score (how widely shared)
- If content appears to be from a video/incident/fight, find the original video source

7. EVENT CORRELATION (CRITICAL - Match to real-world events)
Search news and reliable sources to correlate this post with real-world events:
- Does this post describe or reference an actual event/incident?
- If it's a fight video, accident, disaster, or news event - find the actual reported incident
- Verify when and where the event actually occurred
- Compare the post's claims to verified news reports
- Identify any discrepancies between the post and actual events
- If NO correlating event found online, clearly state "No correlating event found"
- Look for manipulation indicators (wrong date, wrong location, misattributed, fabricated)

8. TIMELINE ANALYSIS (CRITICAL - When things actually happened)
Analyze the temporal aspects:
- When was the content likely created vs when was it posted?
- If referencing an event, when did that event actually occur?
- Is this old content being recycled as new?
- Calculate content age and relevance
- Flag significant timeline mismatches (e.g., old video presented as recent)

RESPONSE FORMAT (respond in valid JSON):
{
  "trustScore": <0-100>,
  "verdict": "<verified|mostly_true|mixed|misleading|false|unverifiable>",
  "verdictSummary": "<2-3 sentence summary explaining the overall verdict>",
  "claims": [
    {
      "id": "<uuid>",
      "text": "<the claim>",
      "type": "<factual|opinion|speculation|exaggeration|misleading>",
      "verdict": "<verified|partially_true|unverified|false|opinion>",
      "confidence": <0-100>,
      "evidence": "<explanation and reasoning>",
      "sources": [{"title": "<source name>", "url": "<source url>", "credibility": <0-100>}]
    }
  ],
  "aiDetection": {
    "isAiGenerated": <true|false>,
    "confidence": <0-100>,
    "textAiScore": <0-100>,
    "detectionMethod": "<pattern_analysis>"
  },
  "accountAnalysis": {
    "isSuspectedBot": <true|false>,
    "botScore": <0-100>,
    "redFlags": ["<flag1>", "<flag2>"],
    "accountCredibility": <0-100>
  },
  "businessVerification": {
    "businessName": "<name if found>",
    "isVerified": <true|false>,
    "redFlags": ["<flag1>"],
    "recommendations": ["<recommendation1>"]
  },
  "biasAnalysis": {
    "politicalBias": "<left|center-left|center|center-right|right|unknown>",
    "sensationalism": <0-100>,
    "emotionalLanguage": <0-100>,
    "clickbait": <true|false>
  },
  "sourceTracing": {
    "originalSourceFound": <true|false>,
    "originalSource": {
      "url": "<original source URL if found>",
      "platform": "<platform where first appeared>",
      "author": "<original author if different>",
      "publishedAt": "<ISO date of first appearance>",
      "title": "<title if applicable>"
    },
    "spreadTimeline": [
      {"platform": "<platform>", "url": "<url>", "date": "<ISO date>", "reach": <estimated views>}
    ],
    "viralityScore": <0-100>,
    "firstAppearance": "<ISO date>",
    "isOriginalPoster": <true|false>,
    "sourceConfidence": <0-100>
  },
  "eventCorrelation": {
    "correlatedEventFound": <true|false>,
    "event": {
      "title": "<event title>",
      "description": "<what actually happened>",
      "date": "<when event occurred - ISO date>",
      "location": "<where it happened>",
      "category": "<news|incident|announcement|disaster|political|entertainment|sports|other>",
      "verifiedSources": [{"title": "<news source>", "url": "<url>", "credibility": <0-100>}]
    },
    "eventMatch": "<exact|related|misattributed|fabricated|not_found>",
    "discrepancies": ["<difference between post and actual event>"],
    "manipulationIndicators": ["<signs of manipulation>"],
    "noCorrelationReason": "<why no event found - only if correlatedEventFound is false>"
  },
  "timelineAnalysis": {
    "postDate": "${currentDate}",
    "contentCreationDate": "<estimated creation date - ISO>",
    "eventDate": "<when actual event occurred - ISO>",
    "timelineMismatch": <true|false>,
    "mismatchSeverity": "<none|minor|significant|critical>",
    "mismatchExplanation": "<explanation if mismatch>",
    "isRecycledContent": <true|false>,
    "recycledFromDate": "<original date if recycled>",
    "ageAnalysis": {
      "contentAge": "<human readable age like '2 hours ago' or '3 months old'>",
      "relevanceToday": "<current|recent|dated|outdated|historical>",
      "recommendation": "<advice about the content's timeliness>"
    }
  }
}

IMPORTANT:
- Use web search EXTENSIVELY to verify claims, find original sources, and correlate events
- Be objective and evidence-based
- For incidents/fights/events: ALWAYS search for news reports to verify what actually happened
- If content shows an incident but no news reports exist, note "No correlating event found online"
- Clearly flag if content is being recycled or misattributed
- Timeline accuracy is CRITICAL - verify when events actually occurred
- If unable to verify a claim, mark it as "unverified" rather than making assumptions
- SOURCE TRACING: Find where content originated, not just where it was shared`;
  }

  private parseVerificationResponse(text: string): Omit<VerificationResult, 'processingTimeMs' | 'geminiModel' | 'webGroundingUsed'> {
    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and sanitize the response
      return {
        trustScore: Math.min(100, Math.max(0, parsed.trustScore || 50)),
        verdict: this.validateVerdict(parsed.verdict),
        verdictSummary: parsed.verdictSummary || "Unable to generate summary",
        claims: (parsed.claims || []).map((claim: any) => ({
          id: claim.id || uuidv4(),
          text: claim.text || "",
          type: this.validateClaimType(claim.type),
          verdict: this.validateClaimVerdict(claim.verdict),
          confidence: Math.min(100, Math.max(0, claim.confidence || 50)),
          evidence: claim.evidence,
          sources: claim.sources || [],
        })),
        aiDetection: parsed.aiDetection ? {
          isAiGenerated: !!parsed.aiDetection.isAiGenerated,
          confidence: Math.min(100, Math.max(0, parsed.aiDetection.confidence || 50)),
          textAiScore: parsed.aiDetection.textAiScore,
          imageAiScore: parsed.aiDetection.imageAiScore,
          videoAiScore: parsed.aiDetection.videoAiScore,
          synthIdDetected: parsed.aiDetection.synthIdDetected,
          detectionMethod: parsed.aiDetection.detectionMethod || 'pattern_analysis',
        } : undefined,
        accountAnalysis: parsed.accountAnalysis ? {
          isSuspectedBot: !!parsed.accountAnalysis.isSuspectedBot,
          botScore: Math.min(100, Math.max(0, parsed.accountAnalysis.botScore || 0)),
          redFlags: parsed.accountAnalysis.redFlags || [],
          accountCredibility: Math.min(100, Math.max(0, parsed.accountAnalysis.accountCredibility || 50)),
        } : undefined,
        businessVerification: parsed.businessVerification?.businessName ? {
          businessName: parsed.businessVerification.businessName,
          isVerified: !!parsed.businessVerification.isVerified,
          bbbRating: parsed.businessVerification.bbbRating,
          bbbAccredited: parsed.businessVerification.bbbAccredited,
          trustpilotScore: parsed.businessVerification.trustpilotScore,
          domainAge: parsed.businessVerification.domainAge,
          domainRegistrar: parsed.businessVerification.domainRegistrar,
          scamAdviserScore: parsed.businessVerification.scamAdviserScore,
          redFlags: parsed.businessVerification.redFlags || [],
          recommendations: parsed.businessVerification.recommendations || [],
        } : undefined,
        biasAnalysis: parsed.biasAnalysis ? {
          politicalBias: this.validatePoliticalBias(parsed.biasAnalysis.politicalBias),
          sensationalism: Math.min(100, Math.max(0, parsed.biasAnalysis.sensationalism || 0)),
          emotionalLanguage: Math.min(100, Math.max(0, parsed.biasAnalysis.emotionalLanguage || 0)),
          clickbait: !!parsed.biasAnalysis.clickbait,
        } : undefined,
        // NEW: Source Tracing
        sourceTracing: parsed.sourceTracing ? {
          originalSourceFound: !!parsed.sourceTracing.originalSourceFound,
          originalSource: parsed.sourceTracing.originalSource ? {
            url: parsed.sourceTracing.originalSource.url || '',
            platform: parsed.sourceTracing.originalSource.platform || 'unknown',
            author: parsed.sourceTracing.originalSource.author,
            publishedAt: parsed.sourceTracing.originalSource.publishedAt,
            title: parsed.sourceTracing.originalSource.title,
          } : undefined,
          spreadTimeline: parsed.sourceTracing.spreadTimeline || [],
          viralityScore: parsed.sourceTracing.viralityScore ? Math.min(100, Math.max(0, parsed.sourceTracing.viralityScore)) : undefined,
          firstAppearance: parsed.sourceTracing.firstAppearance,
          isOriginalPoster: !!parsed.sourceTracing.isOriginalPoster,
          sourceConfidence: Math.min(100, Math.max(0, parsed.sourceTracing.sourceConfidence || 50)),
        } : undefined,
        // NEW: Event Correlation
        eventCorrelation: parsed.eventCorrelation ? {
          correlatedEventFound: !!parsed.eventCorrelation.correlatedEventFound,
          event: parsed.eventCorrelation.event ? {
            title: parsed.eventCorrelation.event.title || '',
            description: parsed.eventCorrelation.event.description || '',
            date: parsed.eventCorrelation.event.date || '',
            location: parsed.eventCorrelation.event.location,
            category: this.validateEventCategory(parsed.eventCorrelation.event.category),
            verifiedSources: parsed.eventCorrelation.event.verifiedSources || [],
          } : undefined,
          eventMatch: this.validateEventMatch(parsed.eventCorrelation.eventMatch),
          discrepancies: parsed.eventCorrelation.discrepancies || [],
          manipulationIndicators: parsed.eventCorrelation.manipulationIndicators || [],
          noCorrelationReason: parsed.eventCorrelation.noCorrelationReason,
        } : undefined,
        // NEW: Timeline Analysis
        timelineAnalysis: parsed.timelineAnalysis ? {
          postDate: parsed.timelineAnalysis.postDate || new Date().toISOString(),
          contentCreationDate: parsed.timelineAnalysis.contentCreationDate,
          eventDate: parsed.timelineAnalysis.eventDate,
          timelineMismatch: !!parsed.timelineAnalysis.timelineMismatch,
          mismatchSeverity: this.validateMismatchSeverity(parsed.timelineAnalysis.mismatchSeverity),
          mismatchExplanation: parsed.timelineAnalysis.mismatchExplanation,
          isRecycledContent: !!parsed.timelineAnalysis.isRecycledContent,
          recycledFromDate: parsed.timelineAnalysis.recycledFromDate,
          ageAnalysis: parsed.timelineAnalysis.ageAnalysis ? {
            contentAge: parsed.timelineAnalysis.ageAnalysis.contentAge || 'Unknown',
            relevanceToday: this.validateRelevance(parsed.timelineAnalysis.ageAnalysis.relevanceToday),
            recommendation: parsed.timelineAnalysis.ageAnalysis.recommendation || '',
          } : {
            contentAge: 'Unknown',
            relevanceToday: 'current',
            recommendation: 'Unable to determine content age',
          },
        } : undefined,
      };
    } catch (error) {
      console.error(`[GEMINI-VERIFY] Failed to parse response:`, error);
      return this.getDefaultResult();
    }
  }

  // Validation helpers for new fields
  private validateEventCategory(category: string): 'news' | 'incident' | 'announcement' | 'disaster' | 'political' | 'entertainment' | 'sports' | 'other' {
    const valid = ['news', 'incident', 'announcement', 'disaster', 'political', 'entertainment', 'sports', 'other'];
    return valid.includes(category) ? category as any : 'other';
  }

  private validateEventMatch(match: string): 'exact' | 'related' | 'misattributed' | 'fabricated' | 'not_found' {
    const valid = ['exact', 'related', 'misattributed', 'fabricated', 'not_found'];
    return valid.includes(match) ? match as any : 'not_found';
  }

  private validateMismatchSeverity(severity: string): 'none' | 'minor' | 'significant' | 'critical' {
    const valid = ['none', 'minor', 'significant', 'critical'];
    return valid.includes(severity) ? severity as any : 'none';
  }

  private validateRelevance(relevance: string): 'current' | 'recent' | 'dated' | 'outdated' | 'historical' {
    const valid = ['current', 'recent', 'dated', 'outdated', 'historical'];
    return valid.includes(relevance) ? relevance as any : 'current';
  }

  private async fallbackVerification(input: VerificationInput, startTime: number): Promise<VerificationResult> {
    console.log(`[GEMINI-VERIFY] Using fallback verification without web grounding`);

    // Basic analysis without web grounding
    const model = genAI!.getGenerativeModel({ model: this.model });

    const simplePrompt = `Analyze this content for factual claims and potential misinformation. Be conservative in your assessment.

Content: "${input.content}"

Respond in JSON format with trustScore (0-100), verdict (verified/mostly_true/mixed/misleading/false/unverifiable), verdictSummary, and claims array.`;

    try {
      const result = await model.generateContent(simplePrompt);
      const response = await result.response;
      const verificationResult = this.parseVerificationResponse(response.text());

      return {
        ...verificationResult,
        processingTimeMs: Date.now() - startTime,
        geminiModel: this.model,
        webGroundingUsed: false,
      };
    } catch (error) {
      return {
        ...this.getDefaultResult(),
        processingTimeMs: Date.now() - startTime,
        geminiModel: this.model,
        webGroundingUsed: false,
      };
    }
  }

  private getDefaultResult(): Omit<VerificationResult, 'processingTimeMs' | 'geminiModel' | 'webGroundingUsed'> {
    return {
      trustScore: 50,
      verdict: 'unverifiable',
      verdictSummary: "Unable to verify the content. Please review manually.",
      claims: [],
      aiDetection: undefined,
      accountAnalysis: undefined,
      businessVerification: undefined,
      biasAnalysis: undefined,
    };
  }

  private validateVerdict(verdict: string): VerificationResult['verdict'] {
    const validVerdicts = ['verified', 'mostly_true', 'mixed', 'misleading', 'false', 'unverifiable'];
    return validVerdicts.includes(verdict) ? verdict as VerificationResult['verdict'] : 'unverifiable';
  }

  private validateClaimType(type: string): ClaimAnalysis['type'] {
    const validTypes = ['factual', 'opinion', 'speculation', 'exaggeration', 'misleading'];
    return validTypes.includes(type) ? type as ClaimAnalysis['type'] : 'factual';
  }

  private validateClaimVerdict(verdict: string): ClaimAnalysis['verdict'] {
    const validVerdicts = ['verified', 'partially_true', 'unverified', 'false', 'opinion'];
    return validVerdicts.includes(verdict) ? verdict as ClaimAnalysis['verdict'] : 'unverified';
  }

  private validatePoliticalBias(bias: string): BiasAnalysis['politicalBias'] {
    const validBiases = ['left', 'center-left', 'center', 'center-right', 'right', 'unknown'];
    return validBiases.includes(bias) ? bias as BiasAnalysis['politicalBias'] : 'unknown';
  }

  getStatus(): { configured: boolean; message: string } {
    if (this.isConfigured()) {
      return { configured: true, message: "Gemini verification service ready" };
    }
    return { configured: false, message: "GEMINI_API_KEY not set" };
  }
}

export const geminiVerificationService = new GeminiVerificationService();

// Log service status on startup
const status = geminiVerificationService.getStatus();
console.log(`[GEMINI-VERIFY] Startup check:`, {
  available: geminiVerificationService.isConfigured(),
  message: status.message,
});
