import { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { CheckCircle2, ExternalLink, AlertCircle, X as Twitter, Instagram, Linkedin } from 'lucide-react';
import { SiX, SiInstagram, SiThreads, SiLinkedin } from 'react-icons/si';
import { useToast } from '@/hooks/use-toast';

interface SocialVerificationTabProps {
  activityId: string;
  onLinksUpdated?: (links: SocialMediaLinks) => void;
  existingLinks?: SocialMediaLinks;
}

export interface SocialMediaLinks {
  twitterPostUrl?: string;
  instagramPostUrl?: string;
  threadsPostUrl?: string;
  linkedinPostUrl?: string;
}

interface PlatformConfig {
  id: keyof SocialMediaLinks;
  name: string;
  icon: React.ReactNode;
  placeholder: string;
  domain: string;
  color: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'twitterPostUrl',
    name: 'Twitter/X',
    icon: <SiX className="w-5 h-5" />,
    placeholder: 'https://twitter.com/username/status/1234567890',
    domain: 'twitter.com|x.com',
    color: 'text-black dark:text-white',
  },
  {
    id: 'instagramPostUrl',
    name: 'Instagram',
    icon: <SiInstagram className="w-5 h-5" />,
    placeholder: 'https://instagram.com/p/ABC123/',
    domain: 'instagram.com',
    color: 'text-pink-600',
  },
  {
    id: 'threadsPostUrl',
    name: 'Threads',
    icon: <SiThreads className="w-5 h-5" />,
    placeholder: 'https://threads.net/@username/post/ABC123',
    domain: 'threads.net',
    color: 'text-black dark:text-white',
  },
  {
    id: 'linkedinPostUrl',
    name: 'LinkedIn',
    icon: <SiLinkedin className="w-5 h-5" />,
    placeholder: 'https://linkedin.com/posts/username_activity-123456',
    domain: 'linkedin.com',
    color: 'text-blue-700',
  },
];

export function SocialVerificationTab({
  activityId,
  onLinksUpdated,
  existingLinks = {},
}: SocialVerificationTabProps) {
  const [links, setLinks] = useState<SocialMediaLinks>(existingLinks);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  /**
   * Validate social media post URL
   */
  const validatePostUrl = (platform: keyof SocialMediaLinks, url: string): string | null => {
    if (!url || url.trim() === '') return null; // Empty is okay

    try {
      const urlObj = new URL(url);
      const platformConfig = PLATFORMS.find(p => p.id === platform);

      if (!platformConfig) return 'Invalid platform';

      const domainPattern = new RegExp(`^(${platformConfig.domain})$`, 'i');
      if (!domainPattern.test(urlObj.hostname.replace('www.', ''))) {
        return `Must be a ${platformConfig.name} URL (${platformConfig.domain})`;
      }

      return null; // Valid
    } catch {
      return 'Invalid URL format';
    }
  };

  /**
   * Handle URL input change
   */
  const handleUrlChange = (platform: keyof SocialMediaLinks, value: string) => {
    setLinks(prev => ({ ...prev, [platform]: value }));

    // Validate
    const error = validatePostUrl(platform, value);
    setValidationErrors(prev => {
      const updated = { ...prev };
      if (error) {
        updated[platform] = error;
      } else {
        delete updated[platform];
      }
      return updated;
    });
  };

  /**
   * Save social media post links
   */
  const handleSave = async () => {
    // Validate all links
    let hasErrors = false;
    const errors: Record<string, string> = {};

    Object.entries(links).forEach(([platform, url]) => {
      if (url && url.trim() !== '') {
        const error = validatePostUrl(platform as keyof SocialMediaLinks, url);
        if (error) {
          errors[platform] = error;
          hasErrors = true;
        }
      }
    });

    setValidationErrors(errors);

    if (hasErrors) {
      toast({
        title: 'Validation Failed',
        description: 'Please fix the errors before saving',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/activities/${activityId}/social-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(links),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save social links');
      }

      toast({
        title: 'Success!',
        description: 'Social media verification links saved',
      });

      onLinksUpdated?.(links);
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.message || 'Could not save social links',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasAnyLink = Object.values(links).some(url => url && url.trim() !== '');
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Social Media Verification</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Link your social media posts to build trust and credibility. Your posts will be displayed
          on your plan's discovery page.
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          Adding social proof increases adoption by up to 300%! Share your plan on social media,
          then paste the post URLs here.
        </AlertDescription>
      </Alert>

      {/* Platform Links */}
      <div className="space-y-4">
        {PLATFORMS.map(platform => (
          <Card key={platform.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className={platform.color}>{platform.icon}</span>
                {platform.name}
                {links[platform.id] && !validationErrors[platform.id] && (
                  <Badge variant="secondary" className="ml-auto gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Linked
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Paste the URL of your {platform.name} post about this plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 min-w-0">
                  <Input
                    type="url"
                    placeholder={platform.placeholder}
                    value={links[platform.id] || ''}
                    onChange={e => handleUrlChange(platform.id, e.target.value)}
                    className={`${validationErrors[platform.id] ? 'border-destructive' : ''} text-sm`}
                  />
                  {validationErrors[platform.id] && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span className="break-words">{validationErrors[platform.id]}</span>
                    </p>
                  )}
                </div>
                {links[platform.id] && !validationErrors[platform.id] && (
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                    title="View post"
                    className="flex-shrink-0"
                  >
                    <a href={links[platform.id]} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
        <Button
          onClick={handleSave}
          disabled={isSaving || hasValidationErrors || !hasAnyLink}
          className="w-full sm:w-auto min-h-[44px]"
        >
          {isSaving ? 'Saving...' : 'Save Verification Links'}
        </Button>
      </div>

      {/* Benefits */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Benefits of Social Verification
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Verified badge on your plan's discovery page</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Clickable links drive traffic to your social profiles</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Build credibility and trust with plan adopters</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Earn +5 credits when someone adopts your verified plan</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
