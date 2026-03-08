import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronDown, ChevronUp, ExternalLink, Shield, AlertTriangle, CheckCircle, XCircle, HelpCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ClaimAnalysis {
  id: string;
  text: string;
  type?: string;
  verdict: string;
  confidence: number;
  evidence?: string;
  sources?: string[];
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
  if (score >= 80) return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600 dark:text-green-400', ring: 'ring-green-500' };
  if (score >= 60) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600 dark:text-yellow-400', ring: 'ring-yellow-500' };
  if (score >= 40) return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-500' };
  return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600 dark:text-red-400', ring: 'ring-red-500' };
};

const getVerdictIcon = (verdict: string) => {
  switch (verdict) {
    case 'verified': return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'mostly_true': return <CheckCircle className="w-4 h-4 text-yellow-500" />;
    case 'mixed': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    case 'misleading': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
    case 'false': return <XCircle className="w-4 h-4 text-red-500" />;
    default: return <HelpCircle className="w-4 h-4 text-muted-foreground" />;
  }
};

const getVerdictLabel = (verdict: string) => {
  switch (verdict) {
    case 'verified': return 'Verified';
    case 'mostly_true': return 'Mostly True';
    case 'mixed': return 'Mixed';
    case 'misleading': return 'Misleading';
    case 'false': return 'False';
    case 'unverifiable': return 'Unverifiable';
    default: return verdict;
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
                    <div className="mt-2 space-y-2">
                      {result.claims.map((claim) => (
                        <div key={claim.id} className="flex items-start gap-2 p-2 rounded-lg bg-background/50">
                          {getVerdictIcon(claim.verdict)}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{claim.text}</p>
                            {claim.evidence && (
                              <p className="text-xs text-muted-foreground mt-0.5">{claim.evidence}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-[10px] flex-shrink-0">
                            {Math.round(claim.confidence * 100)}%
                          </Badge>
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
