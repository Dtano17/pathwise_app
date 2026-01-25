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
  Loader2
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
