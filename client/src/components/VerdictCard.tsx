import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldQuestion,
  AlertTriangle,
  Bot,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Share2,
  Copy,
  Clock,
  Sparkles,
  Scale,
  TrendingUp,
  CheckCircle,
  XCircle,
  HelpCircle,
  Loader2,
  // NEW: Icons for enhanced analysis
  Search,
  MapPin,
  Calendar,
  History,
  Newspaper,
  Link2,
  AlertOctagon,
  RefreshCw,
  Globe,
  FileWarning
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Types matching the verification schema
interface ClaimAnalysis {
  id: string;
  text: string;
  type: 'factual' | 'opinion' | 'speculation' | 'exaggeration' | 'misleading';
  verdict: 'verified' | 'partially_true' | 'unverified' | 'false' | 'opinion';
  confidence: number;
  evidence?: string;
  sources?: Array<{ title: string; url: string; credibility?: number }>;
}

interface AIDetection {
  isAiGenerated: boolean;
  confidence: number;
  textAiScore?: number;
  imageAiScore?: number;
  videoAiScore?: number;
  synthIdDetected?: boolean;
  detectionMethod?: string;
}

interface AccountAnalysis {
  isSuspectedBot: boolean;
  botScore: number;
  redFlags?: string[];
  accountCredibility: number;
}

interface BusinessVerification {
  businessName?: string;
  isVerified: boolean;
  bbbRating?: string;
  bbbAccredited?: boolean;
  trustpilotScore?: number;
  domainAge?: string;
  scamAdviserScore?: number;
  redFlags?: string[];
  recommendations?: string[];
}

interface BiasAnalysis {
  politicalBias?: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'unknown';
  sensationalism: number;
  emotionalLanguage: number;
  clickbait: boolean;
}

// NEW: Source Tracing - Find original source of content
interface SourceTracing {
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

// NEW: Event Correlation - Match posts to real-world events
interface EventCorrelation {
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
interface TimelineAnalysis {
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

interface VerificationResult {
  id: string;
  trustScore: number;
  verdict: 'verified' | 'mostly_true' | 'mixed' | 'misleading' | 'false' | 'unverifiable';
  verdictSummary: string;
  claims: ClaimAnalysis[];
  aiDetection?: AIDetection;
  accountAnalysis?: AccountAnalysis;
  businessVerification?: BusinessVerification;
  biasAnalysis?: BiasAnalysis;
  // NEW: Enhanced analysis
  sourceTracing?: SourceTracing;
  eventCorrelation?: EventCorrelation;
  timelineAnalysis?: TimelineAnalysis;
  sourceUrl?: string;
  sourcePlatform?: string;
  processingTimeMs?: number;
  webGroundingUsed?: boolean;
  shareToken?: string;
  createdAt?: string;
}

interface VerdictCardProps {
  result: VerificationResult;
  onShare?: () => void;
  isLoading?: boolean;
  compact?: boolean;
}

const verdictConfig = {
  verified: {
    icon: ShieldCheck,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    label: 'Verified',
    description: 'Content appears accurate and trustworthy',
  },
  mostly_true: {
    icon: Shield,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    label: 'Mostly True',
    description: 'Largely accurate with minor issues',
  },
  mixed: {
    icon: ShieldAlert,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    label: 'Mixed',
    description: 'Contains both accurate and inaccurate claims',
  },
  misleading: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    label: 'Misleading',
    description: 'May present facts in a misleading way',
  },
  false: {
    icon: ShieldX,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'False',
    description: 'Contains significant inaccuracies',
  },
  unverifiable: {
    icon: ShieldQuestion,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    label: 'Unverifiable',
    description: 'Unable to verify claims at this time',
  },
};

const claimVerdictConfig = {
  verified: { icon: CheckCircle, color: 'text-green-500', label: 'Verified' },
  partially_true: { icon: HelpCircle, color: 'text-blue-500', label: 'Partially True' },
  unverified: { icon: HelpCircle, color: 'text-gray-500', label: 'Unverified' },
  false: { icon: XCircle, color: 'text-red-500', label: 'False' },
  opinion: { icon: Scale, color: 'text-purple-500', label: 'Opinion' },
};

const claimTypeConfig = {
  factual: { color: 'bg-blue-500/20 text-blue-700 dark:text-blue-300' },
  opinion: { color: 'bg-purple-500/20 text-purple-700 dark:text-purple-300' },
  speculation: { color: 'bg-amber-500/20 text-amber-700 dark:text-amber-300' },
  exaggeration: { color: 'bg-orange-500/20 text-orange-700 dark:text-orange-300' },
  misleading: { color: 'bg-red-500/20 text-red-700 dark:text-red-300' },
};

export function VerdictCard({ result, onShare, isLoading, compact = false }: VerdictCardProps) {
  const [claimsExpanded, setClaimsExpanded] = useState(!compact);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const { toast } = useToast();

  const config = verdictConfig[result.verdict];
  const VerdictIcon = config.icon;

  // Calculate trust score color
  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-amber-500';
    if (score >= 20) return 'text-orange-500';
    return 'text-red-500';
  };

  const getTrustScoreProgress = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleCopyLink = async () => {
    if (result.shareToken) {
      const shareUrl = `${window.location.origin}/verify/result/${result.shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied",
        description: "Verification result link copied to clipboard",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full animate-pulse">
        <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium">Analyzing content...</p>
          <p className="text-sm text-muted-foreground mt-2">Checking facts against reliable sources</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${config.borderColor} border-2`}>
      {/* Main Verdict Header */}
      <CardHeader className={`${config.bgColor} rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${config.bgColor} border ${config.borderColor}`}>
              <VerdictIcon className={`w-8 h-8 ${config.color}`} />
            </div>
            <div>
              <CardTitle className={`text-2xl font-bold ${config.color}`}>
                {config.label}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
          </div>

          {/* Trust Score */}
          <div className="text-right">
            <div className={`text-4xl font-bold ${getTrustScoreColor(result.trustScore)}`}>
              {result.trustScore}
            </div>
            <p className="text-xs text-muted-foreground">Trust Score</p>
          </div>
        </div>

        {/* Trust Score Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getTrustScoreProgress(result.trustScore)}`}
              style={{ width: `${result.trustScore}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Summary */}
        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-base leading-relaxed">{result.verdictSummary}</p>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Claims Count */}
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <div className="text-2xl font-bold text-primary">{result.claims.length}</div>
            <p className="text-xs text-muted-foreground">Claims Analyzed</p>
          </div>

          {/* Verified Claims */}
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <div className="text-2xl font-bold text-green-500">
              {result.claims.filter(c => c.verdict === 'verified').length}
            </div>
            <p className="text-xs text-muted-foreground">Verified</p>
          </div>

          {/* False Claims */}
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <div className="text-2xl font-bold text-red-500">
              {result.claims.filter(c => c.verdict === 'false').length}
            </div>
            <p className="text-xs text-muted-foreground">False</p>
          </div>

          {/* Processing Time */}
          {result.processingTimeMs && (
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <div className="text-2xl font-bold text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="w-4 h-4" />
                {(result.processingTimeMs / 1000).toFixed(1)}s
              </div>
              <p className="text-xs text-muted-foreground">Analysis Time</p>
            </div>
          )}
        </div>

        {/* Claims Analysis Section */}
        {result.claims.length > 0 && (
          <Collapsible open={claimsExpanded} onOpenChange={setClaimsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between p-4 hover:bg-muted/50">
                <span className="font-semibold">Claims Analysis ({result.claims.length})</span>
                {claimsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {result.claims.map((claim) => {
                const verdictConf = claimVerdictConfig[claim.verdict];
                const VerdictClaimIcon = verdictConf.icon;
                const typeConf = claimTypeConfig[claim.type];

                return (
                  <div key={claim.id} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <VerdictClaimIcon className={`w-5 h-5 flex-shrink-0 ${verdictConf.color}`} />
                        <Badge variant="secondary" className={typeConf.color}>
                          {claim.type}
                        </Badge>
                      </div>
                      <Badge variant="outline" className={verdictConf.color}>
                        {verdictConf.label} ({claim.confidence}%)
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{claim.text}</p>
                    {claim.evidence && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        {claim.evidence}
                      </p>
                    )}
                    {claim.sources && claim.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {claim.sources.map((source, idx) => (
                          <a
                            key={idx}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {source.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Additional Details Section */}
        <Collapsible open={detailsExpanded} onOpenChange={setDetailsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between p-4 hover:bg-muted/50">
              <span className="font-semibold">Additional Analysis</span>
              {detailsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            {/* AI Detection */}
            {result.aiDetection && (
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <h4 className="font-semibold">AI Content Detection</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">AI Generated</p>
                    <p className={`font-medium ${result.aiDetection.isAiGenerated ? 'text-amber-500' : 'text-green-500'}`}>
                      {result.aiDetection.isAiGenerated ? 'Likely AI' : 'Likely Human'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p className="font-medium">{result.aiDetection.confidence}%</p>
                  </div>
                  {result.aiDetection.synthIdDetected !== undefined && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">SynthID Watermark</p>
                      <p className={`font-medium ${result.aiDetection.synthIdDetected ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        {result.aiDetection.synthIdDetected ? 'Detected' : 'Not Detected'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Account Analysis */}
            {result.accountAnalysis && (
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="w-5 h-5 text-blue-500" />
                  <h4 className="font-semibold">Account Analysis</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Bot Likelihood</p>
                    <p className={`font-medium ${result.accountAnalysis.botScore > 50 ? 'text-amber-500' : 'text-green-500'}`}>
                      {result.accountAnalysis.botScore}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Credibility</p>
                    <p className="font-medium">{result.accountAnalysis.accountCredibility}%</p>
                  </div>
                  {result.accountAnalysis.redFlags && result.accountAnalysis.redFlags.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground mb-1">Red Flags</p>
                      <div className="flex flex-wrap gap-1">
                        {result.accountAnalysis.redFlags.map((flag, idx) => (
                          <Badge key={idx} variant="destructive" className="text-xs">
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Business Verification */}
            {result.businessVerification && (
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-indigo-500" />
                  <h4 className="font-semibold">Business Verification</h4>
                </div>
                {result.businessVerification.businessName && (
                  <p className="text-lg font-medium mb-2">{result.businessVerification.businessName}</p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Verified</p>
                    <p className={`font-medium ${result.businessVerification.isVerified ? 'text-green-500' : 'text-red-500'}`}>
                      {result.businessVerification.isVerified ? 'Yes' : 'No'}
                    </p>
                  </div>
                  {result.businessVerification.bbbRating && (
                    <div>
                      <p className="text-sm text-muted-foreground">BBB Rating</p>
                      <p className="font-medium">{result.businessVerification.bbbRating}</p>
                    </div>
                  )}
                  {result.businessVerification.trustpilotScore !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground">Trustpilot</p>
                      <p className="font-medium">{result.businessVerification.trustpilotScore}/5</p>
                    </div>
                  )}
                  {result.businessVerification.domainAge && (
                    <div>
                      <p className="text-sm text-muted-foreground">Domain Age</p>
                      <p className="font-medium">{result.businessVerification.domainAge}</p>
                    </div>
                  )}
                </div>
                {result.businessVerification.redFlags && result.businessVerification.redFlags.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground mb-1">Warning Signs</p>
                    <div className="flex flex-wrap gap-1">
                      {result.businessVerification.redFlags.map((flag, idx) => (
                        <Badge key={idx} variant="destructive" className="text-xs">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bias Analysis */}
            {result.biasAnalysis && (
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  <h4 className="font-semibold">Bias & Tone Analysis</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {result.biasAnalysis.politicalBias && (
                    <div>
                      <p className="text-sm text-muted-foreground">Political Lean</p>
                      <p className="font-medium capitalize">{result.biasAnalysis.politicalBias.replace('-', ' ')}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Clickbait</p>
                    <p className={`font-medium ${result.biasAnalysis.clickbait ? 'text-amber-500' : 'text-green-500'}`}>
                      {result.biasAnalysis.clickbait ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sensationalism</p>
                    <div className="flex items-center gap-2">
                      <Progress value={result.biasAnalysis.sensationalism} className="h-2" />
                      <span className="text-sm">{result.biasAnalysis.sensationalism}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Emotional Language</p>
                    <div className="flex items-center gap-2">
                      <Progress value={result.biasAnalysis.emotionalLanguage} className="h-2" />
                      <span className="text-sm">{result.biasAnalysis.emotionalLanguage}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SOURCE TRACING - Find original source */}
            {result.sourceTracing && (
              <div className={`p-4 rounded-lg border ${result.sourceTracing.isOriginalPoster ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-5 h-5 text-cyan-500" />
                  <h4 className="font-semibold">Source Tracing</h4>
                  {result.sourceTracing.originalSourceFound && (
                    <Badge variant={result.sourceTracing.isOriginalPoster ? "default" : "secondary"} className="ml-auto">
                      {result.sourceTracing.isOriginalPoster ? 'Original Source' : 'Reshared Content'}
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Original Source */}
                  {result.sourceTracing.originalSource && !result.sourceTracing.isOriginalPoster && (
                    <div className="p-3 bg-background/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Original Source Found:</p>
                      <a
                        href={result.sourceTracing.originalSource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 font-medium"
                      >
                        <Link2 className="w-4 h-4" />
                        {result.sourceTracing.originalSource.title || result.sourceTracing.originalSource.platform}
                      </a>
                      {result.sourceTracing.originalSource.author && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Original author: <span className="font-medium">{result.sourceTracing.originalSource.author}</span>
                        </p>
                      )}
                      {result.sourceTracing.originalSource.publishedAt && (
                        <p className="text-sm text-muted-foreground">
                          First appeared: {new Date(result.sourceTracing.originalSource.publishedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Source Confidence</p>
                      <div className="flex items-center gap-2">
                        <Progress value={result.sourceTracing.sourceConfidence} className="h-2" />
                        <span className="text-sm font-medium">{result.sourceTracing.sourceConfidence}%</span>
                      </div>
                    </div>
                    {result.sourceTracing.viralityScore !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground">Virality Score</p>
                        <div className="flex items-center gap-2">
                          <Progress value={result.sourceTracing.viralityScore} className="h-2" />
                          <span className="text-sm font-medium">{result.sourceTracing.viralityScore}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Spread Timeline */}
                  {result.sourceTracing.spreadTimeline && result.sourceTracing.spreadTimeline.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Spread Timeline:</p>
                      <div className="flex flex-wrap gap-2">
                        {result.sourceTracing.spreadTimeline.slice(0, 5).map((spread, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {spread.platform} • {new Date(spread.date).toLocaleDateString()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EVENT CORRELATION - Match to real-world events */}
            {result.eventCorrelation && (
              <div className={`p-4 rounded-lg border ${
                result.eventCorrelation.eventMatch === 'exact' ? 'border-green-500/30 bg-green-500/5' :
                result.eventCorrelation.eventMatch === 'related' ? 'border-blue-500/30 bg-blue-500/5' :
                result.eventCorrelation.eventMatch === 'misattributed' || result.eventCorrelation.eventMatch === 'fabricated' ? 'border-red-500/30 bg-red-500/5' :
                'border-muted'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <Newspaper className="w-5 h-5 text-indigo-500" />
                  <h4 className="font-semibold">Event Correlation</h4>
                  <Badge
                    variant={
                      result.eventCorrelation.eventMatch === 'exact' ? 'default' :
                      result.eventCorrelation.eventMatch === 'related' ? 'secondary' :
                      result.eventCorrelation.eventMatch === 'fabricated' || result.eventCorrelation.eventMatch === 'misattributed' ? 'destructive' :
                      'outline'
                    }
                    className="ml-auto"
                  >
                    {result.eventCorrelation.eventMatch === 'exact' ? 'Verified Event' :
                     result.eventCorrelation.eventMatch === 'related' ? 'Related Event' :
                     result.eventCorrelation.eventMatch === 'misattributed' ? 'Misattributed' :
                     result.eventCorrelation.eventMatch === 'fabricated' ? 'Fabricated' :
                     'No Event Found'}
                  </Badge>
                </div>

                {result.eventCorrelation.correlatedEventFound && result.eventCorrelation.event ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-background/50 rounded-lg">
                      <h5 className="font-semibold text-lg">{result.eventCorrelation.event.title}</h5>
                      <p className="text-sm text-muted-foreground mt-1">{result.eventCorrelation.event.description}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(result.eventCorrelation.event.date).toLocaleDateString()}
                        </span>
                        {result.eventCorrelation.event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {result.eventCorrelation.event.location}
                          </span>
                        )}
                        <Badge variant="outline" className="capitalize">
                          {result.eventCorrelation.event.category}
                        </Badge>
                      </div>
                    </div>

                    {/* Verified Sources */}
                    {result.eventCorrelation.event.verifiedSources && result.eventCorrelation.event.verifiedSources.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Verified News Sources:</p>
                        <div className="space-y-1">
                          {result.eventCorrelation.event.verifiedSources.slice(0, 3).map((source, idx) => (
                            <a
                              key={idx}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Globe className="w-3 h-3" />
                              {source.title}
                              <span className="text-muted-foreground ml-1">({source.credibility}% credible)</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Discrepancies */}
                    {result.eventCorrelation.discrepancies && result.eventCorrelation.discrepancies.length > 0 && (
                      <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertOctagon className="w-4 h-4 text-amber-500" />
                          <p className="text-sm font-medium text-amber-500">Discrepancies Found:</p>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {result.eventCorrelation.discrepancies.map((d, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span>•</span>
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Manipulation Indicators */}
                    {result.eventCorrelation.manipulationIndicators && result.eventCorrelation.manipulationIndicators.length > 0 && (
                      <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <FileWarning className="w-4 h-4 text-red-500" />
                          <p className="text-sm font-medium text-red-500">Manipulation Indicators:</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {result.eventCorrelation.manipulationIndicators.map((indicator, idx) => (
                            <Badge key={idx} variant="destructive" className="text-xs">
                              {indicator}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">No correlating event found online.</span>
                      {result.eventCorrelation.noCorrelationReason && (
                        <span className="block mt-1">{result.eventCorrelation.noCorrelationReason}</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TIMELINE ANALYSIS - When things happened */}
            {result.timelineAnalysis && (
              <div className={`p-4 rounded-lg border ${
                result.timelineAnalysis.isRecycledContent || result.timelineAnalysis.mismatchSeverity === 'critical' || result.timelineAnalysis.mismatchSeverity === 'significant'
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : 'border-muted'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-5 h-5 text-teal-500" />
                  <h4 className="font-semibold">Timeline Analysis</h4>
                  {result.timelineAnalysis.isRecycledContent && (
                    <Badge variant="secondary" className="ml-auto flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      Recycled Content
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Age Analysis */}
                  <div className="p-3 bg-background/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Content Age</p>
                        <p className="font-semibold text-lg">{result.timelineAnalysis.ageAnalysis.contentAge}</p>
                      </div>
                      <Badge
                        variant={
                          result.timelineAnalysis.ageAnalysis.relevanceToday === 'current' ? 'default' :
                          result.timelineAnalysis.ageAnalysis.relevanceToday === 'recent' ? 'secondary' :
                          result.timelineAnalysis.ageAnalysis.relevanceToday === 'dated' ? 'outline' :
                          'destructive'
                        }
                        className="capitalize"
                      >
                        {result.timelineAnalysis.ageAnalysis.relevanceToday}
                      </Badge>
                    </div>
                    {result.timelineAnalysis.ageAnalysis.recommendation && (
                      <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                        {result.timelineAnalysis.ageAnalysis.recommendation}
                      </p>
                    )}
                  </div>

                  {/* Timeline Dates */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {result.timelineAnalysis.eventDate && (
                      <div className="p-2 bg-muted/30 rounded">
                        <p className="text-xs text-muted-foreground">Event Date</p>
                        <p className="text-sm font-medium">{new Date(result.timelineAnalysis.eventDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {result.timelineAnalysis.contentCreationDate && (
                      <div className="p-2 bg-muted/30 rounded">
                        <p className="text-xs text-muted-foreground">Content Created</p>
                        <p className="text-sm font-medium">{new Date(result.timelineAnalysis.contentCreationDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="text-xs text-muted-foreground">Analyzed</p>
                      <p className="text-sm font-medium">{new Date(result.timelineAnalysis.postDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Timeline Mismatch Warning */}
                  {result.timelineAnalysis.timelineMismatch && result.timelineAnalysis.mismatchSeverity !== 'none' && (
                    <div className={`p-3 rounded-lg ${
                      result.timelineAnalysis.mismatchSeverity === 'critical' ? 'bg-red-500/10 border border-red-500/30' :
                      result.timelineAnalysis.mismatchSeverity === 'significant' ? 'bg-amber-500/10 border border-amber-500/30' :
                      'bg-yellow-500/10 border border-yellow-500/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className={`w-4 h-4 ${
                          result.timelineAnalysis.mismatchSeverity === 'critical' ? 'text-red-500' :
                          result.timelineAnalysis.mismatchSeverity === 'significant' ? 'text-amber-500' :
                          'text-yellow-500'
                        }`} />
                        <p className={`text-sm font-medium ${
                          result.timelineAnalysis.mismatchSeverity === 'critical' ? 'text-red-500' :
                          result.timelineAnalysis.mismatchSeverity === 'significant' ? 'text-amber-500' :
                          'text-yellow-500'
                        }`}>
                          Timeline Mismatch ({result.timelineAnalysis.mismatchSeverity})
                        </p>
                      </div>
                      {result.timelineAnalysis.mismatchExplanation && (
                        <p className="text-sm text-muted-foreground">{result.timelineAnalysis.mismatchExplanation}</p>
                      )}
                    </div>
                  )}

                  {/* Recycled Content Warning */}
                  {result.timelineAnalysis.isRecycledContent && (
                    <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-amber-500" />
                        <p className="text-sm font-medium text-amber-500">
                          This content appears to be recycled from an earlier time
                          {result.timelineAnalysis.recycledFromDate && (
                            <span> (originally from {new Date(result.timelineAnalysis.recycledFromDate).toLocaleDateString()})</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          {result.shareToken && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button variant="outline" size="sm" onClick={onShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share Result
              </Button>
            </>
          )}
          {result.sourceUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Original
              </a>
            </Button>
          )}
        </div>

        {/* Metadata Footer */}
        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-4 pt-2">
          {result.sourcePlatform && (
            <span className="capitalize">Source: {result.sourcePlatform}</span>
          )}
          {result.webGroundingUsed && (
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              Web-grounded verification
            </span>
          )}
          {result.createdAt && (
            <span>Analyzed: {new Date(result.createdAt).toLocaleString()}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default VerdictCard;
