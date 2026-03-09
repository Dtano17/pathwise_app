import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronDown, ChevronUp, ExternalLink, Shield, AlertTriangle, CheckCircle, XCircle, HelpCircle, Loader2, Link2, Info, Heart, Eye, Hash, Minus } from 'lucide-react';
import { SiInstagram, SiTiktok, SiYoutube, SiX, SiFacebook, SiReddit } from 'react-icons/si';
import { motion, AnimatePresence } from 'framer-motion';

const getPlatformBadge = (url: string): { icon: JSX.Element; label: string; color: string } | null => {
  const lower = url.toLowerCase();
  if (lower.includes('instagram.com'))
    return { icon: <SiInstagram className="w-3.5 h-3.5" />, label: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' };
  if (lower.includes('tiktok.com'))
    return { icon: <SiTiktok className="w-3.5 h-3.5" />, label: 'TikTok', color: 'bg-black text-white dark:bg-white dark:text-black' };
  if (lower.includes('youtube.com') || lower.includes('youtu.be'))
    return { icon: <SiYoutube className="w-3.5 h-3.5" />, label: 'YouTube', color: 'bg-red-600 text-white' };
  if (lower.includes('twitter.com') || lower.includes('x.com'))
    return { icon: <SiX className="w-3.5 h-3.5" />, label: 'X', color: 'bg-black text-white dark:bg-white dark:text-black' };
  if (lower.includes('facebook.com'))
    return { icon: <SiFacebook className="w-3.5 h-3.5" />, label: 'Facebook', color: 'bg-blue-600 text-white' };
  if (lower.includes('reddit.com'))
    return { icon: <SiReddit className="w-3.5 h-3.5" />, label: 'Reddit', color: 'bg-orange-500 text-white' };
  return null;
};

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
  verificationStatus?: 'confirmed' | 'partially_confirmed' | 'insufficient_sources' | 'contradicted' | 'no_credible_sources' | 'opinion_based';
  statusReason?: string;
}

interface PostMetadata {
  author?: string;
  likesCount?: number;
  viewsCount?: number;
  hashtags?: string[];
  caption?: string;
  firstImageUrl?: string;
}

interface VerificationResult {
  trustScore: number;
  verdict: 'verified' | 'mostly_true' | 'mixed' | 'misleading' | 'false' | 'unverifiable';
  verdictSummary: string;
  claims: ClaimAnalysis[];
  processingTimeMs?: number;
  webGroundingUsed?: boolean;
  postMetadata?: PostMetadata;
}

interface VerifyResultCardProps {
  result: VerificationResult | null;
  isLoading: boolean;
  error?: string | null;
  onDismiss: () => void;
  postUrl?: string;
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

export default function VerifyResultCard({ result, isLoading, error, onDismiss, postUrl }: VerifyResultCardProps) {
  const hasFlaggedClaims = result?.claims?.some(c => ['false', 'misleading', 'unverified', 'unverifiable', 'mixed'].includes(c.verdict));
  const [showClaims, setShowClaims] = useState(hasFlaggedClaims || false);
  const [isDocked, setIsDocked] = useState(false);

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
        {/* ── Docked bar (always visible) ── */}
        <button
          onClick={() => isDocked && setIsDocked(false)}
          className={`w-full text-left ${isDocked ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <div className="flex items-center gap-2 px-4 py-3">
            {/* Score pill */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${colors.border} ${colors.bg}`}>
              <span className={`text-sm font-bold ${colors.text}`}>{result.trustScore}</span>
            </div>

            {/* Verdict */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {getVerdictIcon(result.verdict, 'w-3.5 h-3.5')}
              <span className={`text-sm font-semibold truncate ${colors.text}`}>
                {getVerdictLabel(result.verdict)}
              </span>
              {isDocked && (
                <span className="text-xs text-muted-foreground ml-1 truncate hidden sm:block">
                  — tap to expand
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDocked(v => !v)}
                title={isDocked ? 'Expand' : 'Collapse'}
              >
                {isDocked ? <ChevronDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={onDismiss} title="Dismiss">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </button>

        {/* ── Expandable body ── */}
        <AnimatePresence initial={false}>
          {!isDocked && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                {/* Divider */}
                <div className="border-t border-border/40" />

                {/* Post Source Panel */}
                {(postUrl || result.postMetadata) && (() => {
                  const platform = postUrl ? getPlatformBadge(postUrl) : null;
                  const meta = result.postMetadata;
                  const hasStats = meta && (meta.likesCount != null || meta.viewsCount != null || (meta.hashtags && meta.hashtags.length > 0) || meta.caption);
                  if (!platform && !hasStats) return null;
                  return (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground bg-background/50 rounded-lg px-3 py-2">
                      {/* Platform icon link */}
                      {platform && postUrl && (
                        <a href={postUrl} target="_blank" rel="noopener noreferrer" data-testid="badge-source-label">
                          <Badge variant="outline" className="gap-1.5 pr-2 cursor-pointer">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${platform.color}`}>
                              {platform.icon}
                            </span>
                            <span className="text-xs font-medium">{platform.label}</span>
                          </Badge>
                        </a>
                      )}
                      {/* Stats */}
                      {meta?.likesCount != null && (
                        <span className="inline-flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {meta.likesCount.toLocaleString()}
                        </span>
                      )}
                      {meta?.viewsCount != null && (
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {meta.viewsCount.toLocaleString()}
                        </span>
                      )}
                      {meta?.hashtags && meta.hashtags.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {meta.hashtags.slice(0, 4).map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}
                        </span>
                      )}
                      {meta?.caption && (
                        <p className="w-full mt-1 italic text-muted-foreground/80 line-clamp-2">
                          {meta.caption.substring(0, 150)}{meta.caption.length > 150 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  );
                })()}

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

                                <p className="text-sm font-medium leading-snug">{claim.text}</p>

                                {claim.statusReason && (
                                  <p className="text-xs mt-1.5 px-2 py-1 rounded bg-muted/50 border border-border/50">
                                    <span className="font-semibold text-foreground/70">
                                      {claim.verificationStatus === 'confirmed' ? 'Confirmed' :
                                       claim.verificationStatus === 'insufficient_sources' ? 'Insufficient Sources' :
                                       claim.verificationStatus === 'no_credible_sources' ? 'No Credible Sources' :
                                       claim.verificationStatus === 'contradicted' ? 'Contradicted' :
                                       claim.verificationStatus === 'partially_confirmed' ? 'Partially Confirmed' :
                                       claim.verificationStatus === 'opinion_based' ? 'Opinion' :
                                       'Status'}:
                                    </span>{' '}
                                    <span className="text-muted-foreground">{claim.statusReason}</span>
                                  </p>
                                )}

                                {claim.evidence && (
                                  <div className={`text-xs mt-1.5 leading-relaxed flex items-start gap-1.5 ${
                                    ['false', 'misleading', 'unverified', 'unverifiable'].includes(claim.verdict)
                                      ? 'px-2 py-1.5 rounded bg-red-500/5 border border-red-500/20 text-foreground/70'
                                      : 'text-muted-foreground'
                                  }`}>
                                    {['false', 'misleading', 'unverified', 'unverifiable'].includes(claim.verdict) && (
                                      <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-500/70" />
                                    )}
                                    <span>{claim.evidence}</span>
                                  </div>
                                )}

                                {['false', 'misleading', 'unverified', 'unverifiable'].includes(claim.verdict) &&
                                  (!claim.sources || claim.sources.length === 0) && (
                                  <p className="text-[10px] text-muted-foreground mt-1.5 italic">
                                    No independent sources found to verify this claim
                                  </p>
                                )}

                                {claim.sources && claim.sources.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {claim.sources.map((source, idx) => {
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
                    href={postUrl
                      ? `https://verifymate.ai?url=${encodeURIComponent(postUrl)}&auto=true&source=journalmate`
                      : 'https://verifymate.ai'
                    }
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
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
