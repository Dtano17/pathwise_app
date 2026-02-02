import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { VerdictCard } from '@/components/VerdictCard';
import {
  Search,
  Link2,
  FileText,
  History,
  Loader2,
  Shield,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  CheckCircle,
  ExternalLink,
  Share2,
  Home,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { onIncomingShare, consumePendingShareData, hasPendingShareData, type IncomingShareData } from '@/lib/shareSheet';
import { isNative } from '@/lib/platform';

interface VerificationQuota {
  used: number;
  limit: number | 'unlimited';
  remaining: number | 'unlimited';
  isPro: boolean;
}

interface VerificationResult {
  id: string;
  trustScore: number;
  verdict: 'verified' | 'mostly_true' | 'mixed' | 'misleading' | 'false' | 'unverifiable';
  verdictSummary: string;
  claims: any[];
  aiDetection?: any;
  accountAnalysis?: any;
  businessVerification?: any;
  biasAnalysis?: any;
  sourceUrl?: string;
  sourcePlatform?: string;
  processingTimeMs?: number;
  webGroundingUsed?: boolean;
  shareToken?: string;
  createdAt?: string;
}

export default function VerifyPage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute('/verify/result/:shareToken');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [activeTab, setActiveTab] = useState<'url' | 'text' | 'history'>('url');
  const [currentResult, setCurrentResult] = useState<VerificationResult | null>(null);

  // Get quota
  const { data: quota, isLoading: quotaLoading } = useQuery<{ quota: VerificationQuota }>({
    queryKey: ['/api/verify/quota'],
    staleTime: 30000,
  });

  // Get history
  const { data: historyData, isLoading: historyLoading } = useQuery<{ verifications: VerificationResult[] }>({
    queryKey: ['/api/verify/history'],
    staleTime: 30000,
  });

  // Get shared verification if viewing a result
  const { data: sharedResult, isLoading: sharedLoading } = useQuery<{ verification: VerificationResult }>({
    queryKey: ['/api/verify/shared', params?.shareToken],
    enabled: !!params?.shareToken,
    staleTime: 60000,
  });

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: async (input: { url?: string; content?: string }) => {
      const response = await apiRequest('POST', '/api/verify', input);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.verification) {
        setCurrentResult(data.verification);
        queryClient.invalidateQueries({ queryKey: ['/api/verify/quota'] });
        queryClient.invalidateQueries({ queryKey: ['/api/verify/history'] });
        toast({
          title: "Verification complete",
          description: `Trust score: ${data.verification.trustScore}/100`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Unable to verify content",
        variant: "destructive",
      });
    },
  });

  // Handle URL from query params (web share sheet / PWA)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const sharedUrl = searchParams.get('url');
    const sharedText = searchParams.get('text');

    if (sharedUrl) {
      setUrlInput(sharedUrl);
      setActiveTab('url');
    } else if (sharedText) {
      setTextInput(sharedText);
      setActiveTab('text');
    }
  }, []);

  // Handle incoming shares from native share sheet (iOS/Android)
  useEffect(() => {
    // Check for pending share data on mount (cold start)
    if (hasPendingShareData()) {
      const shareData = consumePendingShareData();
      if (shareData) {
        handleIncomingShare(shareData);
      }
    }

    // Listen for new shares (hot start / app already open)
    const cleanup = onIncomingShare((data: IncomingShareData) => {
      handleIncomingShare(data);
    });

    return cleanup;
  }, []);

  // Process incoming share data
  const handleIncomingShare = (data: IncomingShareData) => {
    console.log('[VERIFY] Received share data:', data);

    if (data.url) {
      setUrlInput(data.url);
      setActiveTab('url');
      toast({
        title: "Content received",
        description: "URL ready to verify",
      });
    } else if (data.text) {
      // Check if text contains a URL
      const urlMatch = data.text.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        setUrlInput(urlMatch[0]);
        setActiveTab('url');
      } else {
        setTextInput(data.text);
        setActiveTab('text');
      }
      toast({
        title: "Content received",
        description: "Ready to verify",
      });
    }
  };

  // If viewing a shared result
  useEffect(() => {
    if (sharedResult?.verification) {
      setCurrentResult(sharedResult.verification);
    }
  }, [sharedResult]);

  const handleVerifyUrl = () => {
    if (!urlInput.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a URL to verify",
        variant: "destructive",
      });
      return;
    }

    verifyMutation.mutate({ url: urlInput.trim() });
  };

  const handleVerifyText = () => {
    if (!textInput.trim()) {
      toast({
        title: "Content required",
        description: "Please enter some text to verify",
        variant: "destructive",
      });
      return;
    }

    verifyMutation.mutate({ content: textInput.trim() });
  };

  const handleShare = () => {
    if (currentResult?.shareToken) {
      const shareUrl = `${window.location.origin}/verify/result/${currentResult.shareToken}`;
      if (navigator.share) {
        navigator.share({
          title: `VerifyMate Result: ${currentResult.verdict}`,
          text: currentResult.verdictSummary,
          url: shareUrl,
        });
      } else {
        navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied",
          description: "Share link copied to clipboard",
        });
      }
    }
  };

  const canVerify = quota?.quota?.remaining === 'unlimited' || (quota?.quota?.remaining ?? 0) > 0;
  const isVerifying = verifyMutation.isPending;

  // Show result view if we have a result
  if (currentResult && !match) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-6 pb-24">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setCurrentResult(null)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Verify
        </Button>

        <VerdictCard
          result={currentResult}
          onShare={handleShare}
        />
      </div>
    );
  }

  // Show shared result
  if (match && params?.shareToken) {
    if (sharedLoading) {
      return (
        <div className="container max-w-3xl mx-auto px-4 py-6 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg">Loading verification result...</p>
          </div>
        </div>
      );
    }

    if (!sharedResult?.verification) {
      return (
        <div className="container max-w-3xl mx-auto px-4 py-6">
          <Card>
            <CardContent className="p-8 text-center">
              <ShieldX className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Verification Not Found</h2>
              <p className="text-muted-foreground mb-4">
                This verification result may have been deleted or the link is invalid.
              </p>
              <Button onClick={() => navigate('/verify')}>
                Verify New Content
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="container max-w-3xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/verify')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Verify New Content
          </Button>
          <Badge variant="secondary">
            <Share2 className="w-3 h-3 mr-1" />
            Shared Result
          </Badge>
        </div>

        <VerdictCard
          result={sharedResult.verification}
          onShare={handleShare}
        />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="w-10 h-10 text-primary" />
          <h1 className="text-3xl font-bold">VerifyMate</h1>
        </div>
        <p className="text-muted-foreground">
          Verify before you trust. AI-powered fact-checking for social media.
        </p>

        {/* Quota Display */}
        {!quotaLoading && quota?.quota && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 inline-flex items-center gap-4">
            <div className="text-sm">
              <span className="font-medium">
                {quota.quota.remaining === 'unlimited' ? 'Unlimited' : quota.quota.remaining}
              </span>
              <span className="text-muted-foreground"> verifications remaining</span>
            </div>
            {!quota.quota.isPro && (
              <Button variant="outline" size="sm" onClick={() => navigate('/pricing')}>
                <Sparkles className="w-3 h-3 mr-1" />
                Upgrade
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Main Input Tabs */}
      <Card className="mb-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Text
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <CardContent className="pt-6">
            <TabsContent value="url" className="mt-0 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Paste a URL from social media
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://instagram.com/p/... or https://tiktok.com/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    disabled={!canVerify || isVerifying}
                  />
                  <Button
                    onClick={handleVerifyUrl}
                    disabled={!canVerify || isVerifying || !urlInput.trim()}
                  >
                    {isVerifying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Supported platforms:</p>
                <div className="flex flex-wrap gap-2">
                  {['Instagram', 'TikTok', 'YouTube', 'X (Twitter)', 'Facebook', 'LinkedIn', 'News Sites'].map((p) => (
                    <Badge key={p} variant="outline" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="text" className="mt-0 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Paste content to verify
                </label>
                <Textarea
                  placeholder="Paste the text content you want to verify..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={6}
                  disabled={!canVerify || isVerifying}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleVerifyText}
                disabled={!canVerify || isVerifying || !textInput.trim()}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Verify Content
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              {historyLoading ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading history...</p>
                </div>
              ) : historyData?.verifications && historyData.verifications.length > 0 ? (
                <div className="space-y-3">
                  {historyData.verifications.slice(0, 10).map((v) => (
                    <Card
                      key={v.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setCurrentResult(v)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {v.verdict === 'verified' && <ShieldCheck className="w-4 h-4 text-green-500" />}
                              {v.verdict === 'false' && <ShieldX className="w-4 h-4 text-red-500" />}
                              {v.verdict === 'mixed' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                              {!['verified', 'false', 'mixed'].includes(v.verdict) && <Shield className="w-4 h-4 text-muted-foreground" />}
                              <span className="font-medium capitalize">{v.verdict.replace('_', ' ')}</span>
                              <Badge variant="secondary" className="text-xs">
                                {v.trustScore}/100
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {v.verdictSummary}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {v.sourcePlatform && <span className="capitalize">{v.sourcePlatform} &middot; </span>}
                              {v.createdAt && new Date(v.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No verification history yet</p>
                  <p className="text-sm text-muted-foreground">
                    Start verifying content to see your history here
                  </p>
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Verification in Progress */}
      {isVerifying && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Analyzing Content</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Checking facts against reliable sources...
              </p>
              <div className="space-y-2 text-sm text-left max-w-xs mx-auto">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Extracting claims</span>
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Searching web sources</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-4 h-4" />
                  <span>Analyzing credibility</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Quota Left */}
      {!canVerify && !quotaLoading && (
        <Card className="border-amber-500/50">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Monthly Limit Reached</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You've used all {quota?.quota?.limit} free verifications this month.
            </p>
            <Button onClick={() => navigate('/pricing')}>
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade for Unlimited
            </Button>
          </CardContent>
        </Card>
      )}

      {/* How it Works */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">How it Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-medium mb-1">1. Share or Paste</h4>
              <p className="text-sm text-muted-foreground">
                Share a post URL or paste text content
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-medium mb-1">2. AI Analysis</h4>
              <p className="text-sm text-muted-foreground">
                Our AI verifies claims against real sources
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-medium mb-1">3. Get Verdict</h4>
              <p className="text-sm text-muted-foreground">
                Receive a trust score and detailed breakdown
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
