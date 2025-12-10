import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { 
  MessageSquare, 
  Sparkles, 
  Globe2, 
  Save, 
  Calendar,
  Heart,
  ArrowRight
} from 'lucide-react';

interface RelatedLink {
  href: string;
  title: string;
  description: string;
  icon: 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'social' | 'discover' | 'weekend' | 'dating';
}

const iconMap = {
  chatgpt: MessageSquare,
  claude: Sparkles,
  gemini: Globe2,
  perplexity: Globe2,
  social: Save,
  discover: Sparkles,
  weekend: Calendar,
  dating: Heart,
};

const RELATED_LINKS_CONFIG: Record<string, RelatedLink[]> = {
  '/chatgpt-plan-tracker': [
    { href: '/claude-ai-integration', title: 'Claude AI Integration', description: 'Import plans from Claude AI', icon: 'claude' },
    { href: '/gemini-plan-importer', title: 'Gemini Plans', description: 'Use Google Gemini for planning', icon: 'gemini' },
    { href: '/discover', title: 'Community Plans', description: 'Browse shared activity plans', icon: 'discover' },
  ],
  '/claude-ai-integration': [
    { href: '/chatgpt-plan-tracker', title: 'ChatGPT Plans', description: 'Import plans from ChatGPT', icon: 'chatgpt' },
    { href: '/perplexity-plans', title: 'Perplexity Plans', description: 'Research-backed planning', icon: 'perplexity' },
    { href: '/discover', title: 'Community Plans', description: 'Browse shared activity plans', icon: 'discover' },
  ],
  '/gemini-plan-importer': [
    { href: '/chatgpt-plan-tracker', title: 'ChatGPT Plans', description: 'Import plans from ChatGPT', icon: 'chatgpt' },
    { href: '/claude-ai-integration', title: 'Claude AI', description: 'Use Claude for planning', icon: 'claude' },
    { href: '/weekend-plans', title: 'Weekend Ideas', description: 'Find weekend activities', icon: 'weekend' },
  ],
  '/perplexity-plans': [
    { href: '/chatgpt-plan-tracker', title: 'ChatGPT Plans', description: 'Import plans from ChatGPT', icon: 'chatgpt' },
    { href: '/gemini-plan-importer', title: 'Gemini Plans', description: 'Google Gemini integration', icon: 'gemini' },
    { href: '/save-social-media', title: 'Save Social Media', description: 'Import from Instagram & TikTok', icon: 'social' },
  ],
  '/save-social-media': [
    { href: '/discover', title: 'Community Plans', description: 'Browse shared activity plans', icon: 'discover' },
    { href: '/weekend-plans', title: 'Weekend Ideas', description: 'Find weekend activities', icon: 'weekend' },
    { href: '/chatgpt-plan-tracker', title: 'ChatGPT Plans', description: 'AI-powered planning', icon: 'chatgpt' },
  ],
  '/weekend-plans': [
    { href: '/date-night-ideas', title: 'Date Night Ideas', description: 'Romantic activity suggestions', icon: 'dating' },
    { href: '/discover', title: 'Community Plans', description: 'Browse shared activity plans', icon: 'discover' },
    { href: '/save-social-media', title: 'Save Social Media', description: 'Import from Instagram & TikTok', icon: 'social' },
  ],
  '/date-night-ideas': [
    { href: '/weekend-plans', title: 'Weekend Plans', description: 'Weekend activity ideas', icon: 'weekend' },
    { href: '/discover', title: 'Community Plans', description: 'Browse shared activity plans', icon: 'discover' },
    { href: '/chatgpt-plan-tracker', title: 'AI Planning', description: 'Create custom plans with AI', icon: 'chatgpt' },
  ],
  '/discover': [
    { href: '/weekend-plans', title: 'Weekend Ideas', description: 'Find weekend activities', icon: 'weekend' },
    { href: '/save-social-media', title: 'Save Social Media', description: 'Import from Instagram & TikTok', icon: 'social' },
    { href: '/chatgpt-plan-tracker', title: 'AI Planning', description: 'Create custom plans with AI', icon: 'chatgpt' },
  ],
  '/import-plan': [
    { href: '/chatgpt-plan-tracker', title: 'ChatGPT Plans', description: 'Import plans from ChatGPT', icon: 'chatgpt' },
    { href: '/claude-ai-integration', title: 'Claude AI', description: 'Use Claude for planning', icon: 'claude' },
    { href: '/discover', title: 'Community Plans', description: 'Browse shared activity plans', icon: 'discover' },
  ],
};

interface RelatedLinksProps {
  currentPath: string;
  className?: string;
}

export function RelatedLinks({ currentPath, className = '' }: RelatedLinksProps) {
  const links = RELATED_LINKS_CONFIG[currentPath];
  
  if (!links || links.length === 0) {
    return null;
  }

  return (
    <section className={`mt-12 ${className}`} aria-labelledby="related-content">
      <h2 id="related-content" className="text-xl font-semibold mb-6 text-foreground">
        Related Features
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {links.map((link) => {
          const Icon = iconMap[link.icon];
          return (
            <Link key={link.href} href={link.href}>
              <Card className="p-4 hover-elevate cursor-pointer h-full" data-testid={`related-link-${link.href.slice(1)}`}>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground flex items-center gap-1">
                      {link.title}
                      <ArrowRight className="w-3 h-3 opacity-60" />
                    </h3>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
