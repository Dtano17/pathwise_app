import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronDown, ChevronUp, ExternalLink, Shield, AlertTriangle, CheckCircle, XCircle, HelpCircle, Loader2, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ClaimSource {
  title: string;
  url: string;
  credibility?: number;
}

interface ClaimAnalysis {
  id: string;
  text: string;
  type?: string;
  verdict: string;
  confidence: number;
  evidence?: string;
  sources?: ClaimSource[] | string[];
}

interface VerificationResult {
  trustScore: number;
  verdict: 'verified' | 'mostly_true' | 'mixed' | 'misleading' | 'false' | 'unverifiable';
  verdictSummary: string;
  claims: ClaimAnalysis[];
  processingTimeMs?: number;
  webGroundingUsed?: boolean;
}

interface VerifyResultCardProps {
  result: VerificationResult | null;
  isLoading: boolean;
  error?: string | null;
  onDismiss: () => void;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600 dark:text-green-400' };
  if (score >= 60) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600 dark:text-yellow-400' };
  if (score >= 40) return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-600 dark:text-orange-400' };
  return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600 dark:text-red-400' };
};

const getVerdictIcon = (verdict: string, size = 'w-4 h-4') => {
  switch (verdict) {
    case 'verified': return <CheckCircle className={`${size} text-green-500`} />;
    case 'mostly_true':
    case 'partially_true': return <CheckCircle className={`${size} text-yellow-500`} />;
    case 'mixed': return <AlertTriangle className={`${size} text-orange-500`} />;
    case 'misleading': return <AlertTriangle className={`${size} text-orange-600`} />;
    case 'false': return <XCircle className={`${size} text-red-500`} />;
    case 'opinion': return <HelpCircle className={`${size} text-blue-500`} />;
    case 'unverified':
    case 'unverifiable': return <HelpCircle className={`${size} text-muted-foreground`} />;
    default: return <HelpCircle className={`${size} text-muted-foreground`} />;
  }
};

const getVerdictLabel = (verdict: string) => {
  switch (verdict) {
    case 'verified': return 'Verified';
    case 'mostly_true':
    case 'partially_true': return 'Mostly True';
    case 'mixed': return 'Mixed';
    case 'misleading': return 'Misleading';
    case 'false': return 'False';
    case 'opinion': return 'Opinion';
    case 'unverified':
    case 'unverifiable': return 'Unverifiable';
    default: return verdict;
  }
};

const getClaimVerdictColor = (verdict: string) => {
  switch (verdict) {
    case 'verified': return 'border-green-500/30 bg-green-500/5';
    case 'mostly_true':
    case 'partially_true': return 'border-yellow-500/30 bg-yellow-500/5';
    case 'mixed': return 'border-orange-500/30 bg-orange-500/5';
    case 'misleading': return 'border-orange-600/30 bg-orange-600/5';
    case 'false': return 'border-red-500/30 bg-red-500/5';
    default: return 'border-border bg-background/50';
  }
};

export default function VerifyResultCard({ result, isLoading, error, onDismiss }: VerifyResultCardProps) {
  const [showClaims, setShowClaims] = useState(false);

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
              <div>
                <p className="text-sm font-medium">Verifying content...</p>
                <p className="text-xs text-muted-foreground">Checking claims with AI + live web sources</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onDismiss} className="h-7 w-7 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!result) return null;

  const colors = getScoreColor(result.trustScore);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`${colors.border} ${colors.bg} border`}>
        <CardContent className="p-4 space-y-3">
          {/* Header: Score + Verdict + Dismiss */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Trust Score Circle */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${colors.border} ${colors.bg}`}>
                <span className={`text-lg font-bold ${colors.text}`}>{result.trustScore}</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  {getVerdictIcon(result.verdict)}
                  <span className={`text-sm font-semibold ${colors.text}`}>
                    {getVerdictLabel(result.verdict)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Trust Score</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onDismiss} className="h-7 w-7 p-0 flex-shrink-0">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Summary */}
          <p className="text-sm text-foreground/80 leading-relaxed">{result.verdictSummary}</p>

          {/* Claims (collapsible) */}
          {result.claims && result.claims.length > 0 && (
            <div>
              <button
                onClick={() => setShowClaims(!showClaims)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {showClaims ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {result.claims.length} claim{result.claims.length !== 1 ? 's' : ''} analyzed
              </button>
              <AnimatePresence>
                {showClaims && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-2.5">
                      {result.claims.map((claim) => (
                        <div key={claim.id} className={`p-3 rounded-lg border ${getClaimVerdictColor(claim.verdict)}`}>
                          {/* Claim header: verdict + confidence */}
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              {getVerdictIcon(claim.verdict, 'w-3.5 h-3.5')}
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {getVerdictLabel(claim.verdict)}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {Math.round(claim.confidence)}% confidence
                            </span>
                          </div>

                          {/* Claim text */}
                          <p className="text-sm font-medium leading-snug">{claim.text}</p>

                          {/* Evidence / reasoning */}
                          {claim.evidence && (
                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                              {claim.evidence}
                            </p>
                          )}

                          {/* Sources */}
                          {claim.sources && claim.sources.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {claim.sources.map((source, idx) => {
                                // Handle both string[] and {title, url}[] formats
                                if (typeof source === 'string') {
                                  return (
                                    <a
                                      key={idx}
                                      href={source}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline bg-blue-500/10 px-1.5 py-0.5 rounded"
                                    >
                                      <Link2 className="w-2.5 h-2.5" />
                                      Source {idx + 1}
                                    </a>
                                  );
                                }
                                return (
                                  <a
                                    key={idx}
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline bg-blue-500/10 px-1.5 py-0.5 rounded"
                                  >
                                    <Link2 className="w-2.5 h-2.5" />
                                    {source.title || `Source ${idx + 1}`}
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* VerifyMate CTA */}
          <div className="pt-2 border-t border-border/50">
            <a
              href="https://verifymate.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 hover:underline"
            >
              <Shield className="w-3.5 h-3.5" />
              For deeper analysis, visit VerifyMate.ai
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
