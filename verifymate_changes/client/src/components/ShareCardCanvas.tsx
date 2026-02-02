import { forwardRef, useRef, useImperativeHandle } from 'react';
import { toPng, toJpeg } from 'html-to-image';
import { Badge } from './ui/badge';
import { getContextualEmoji, PLATFORM_TEMPLATES } from '@/lib/shareCardTemplates';
import { Check, Circle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  completed: boolean;
}

interface ShareCardCanvasProps {
  activityId: string;
  activityTitle: string;
  activityCategory: string;
  backdrop: string;
  creatorName?: string;
  creatorSocial?: { platform: string; handle: string; postUrl?: string };
  planSummary?: string;
  tasks?: Task[];
  platformId?: string;
}

export interface ShareCardCanvasRef {
  generateImage: (format: 'png' | 'jpg') => Promise<Blob | null>;
}

export const ShareCardCanvas = forwardRef<ShareCardCanvasRef, ShareCardCanvasProps>(({
  activityId,
  activityTitle,
  activityCategory,
  backdrop,
  creatorName,
  creatorSocial,
  planSummary,
  tasks = [],
  platformId = 'instagram_feed'
}, ref) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const platform = PLATFORM_TEMPLATES[platformId];

  // Expose generateImage method via ref
  useImperativeHandle(ref, () => ({
    generateImage: async (format: 'png' | 'jpg'): Promise<Blob | null> => {
      if (!cardRef.current) return null;

      try {
        // Wait for backdrop image to load
        const img = cardRef.current.querySelector('img');
        if (img && !img.complete) {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Image load timeout')), 10000);
            img.onload = () => {
              clearTimeout(timeout);
              resolve();
            };
            img.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('Image load failed'));
            };
          });
        }

        // Additional safety delay for rendering
        await new Promise(resolve => setTimeout(resolve, 300));

        if (format === 'jpg') {
          const dataUrl = await toJpeg(cardRef.current, {
            quality: 0.95,
            pixelRatio: 2,
          });
          const response = await fetch(dataUrl);
          return await response.blob();
        } else {
          const dataUrl = await toPng(cardRef.current, {
            quality: 1.0,
            pixelRatio: 2,
          });
          const response = await fetch(dataUrl);
          return await response.blob();
        }
      } catch (error) {
        console.error('[ShareCardCanvas] Generation failed:', error);
        return null;
      }
    },
  }));

  return (
    <div
      ref={cardRef}
      style={{
        width: `${platform.width}px`,
        height: `${platform.height}px`,
      }}
      className="relative overflow-hidden bg-white flex-shrink-0"
    >
      {/* Backdrop Image */}
      <img
        src={backdrop}
        alt="backdrop"
        className="absolute inset-0 w-full h-full object-cover"
        crossOrigin="anonymous"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-8" style={{ padding: platform.width > 1200 ? '3rem' : '2rem' }}>
        {/* Header - Brand & Verification */}
        <div className="flex justify-between items-start">
          <Badge className="bg-primary text-primary-foreground px-4 py-1.5 text-sm font-semibold">
            JournalMate.ai
          </Badge>
          {creatorSocial && (
            <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm px-3 py-1">
              ✓ Verified
            </Badge>
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-4" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
          <h1
            className="text-white font-bold drop-shadow-lg leading-tight"
            style={{
              fontSize: platform.width > 1200 ? '3.5rem' : platform.width > 800 ? '2.5rem' : '2rem',
            }}
          >
            {getContextualEmoji(activityTitle, activityCategory)} {activityTitle}
          </h1>

          {planSummary && (
            <p 
              className="text-white/95 drop-shadow-md" 
              style={{ 
                fontSize: platform.width > 1200 ? '1.5rem' : platform.width > 800 ? '1.25rem' : '1rem',
                maxWidth: '90%'
              }}
            >
              {planSummary}
            </p>
          )}

          {/* Tasks List */}
          {tasks.length > 0 && (
            <div className="space-y-2 pt-2">
              {tasks.slice(0, 5).map((task, index) => (
                <div key={task.id} className="flex items-start gap-2 text-white/90">
                  {task.completed ? (
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                  <span 
                    className="text-sm leading-tight"
                    style={{
                      fontSize: platform.width > 1200 ? '1.25rem' : '1rem'
                    }}
                  >
                    {task.title}
                  </span>
                </div>
              ))}
              {tasks.length > 5 && (
                <p className="text-white/70 text-sm pl-7">
                  +{tasks.length - 5} more tasks
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer - Creator Info */}
        <div className="space-y-2">
          <div className="text-white/80 text-sm">
            📱 Scan to customize this plan
          </div>
          {creatorName && (
            <div className="flex items-center gap-2 text-white/90 pt-2">
              <span className="text-sm">Created by</span>
              <span className="font-semibold">{creatorName}</span>
              {creatorSocial && (
                <span className="text-sm">• {creatorSocial.handle}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ShareCardCanvas.displayName = 'ShareCardCanvas';
