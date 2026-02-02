import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface MediaProcessingResult {
  extractedText: string;
  confidence: number;
  processingTimeMs: number;
  detectedContent?: {
    hasText: boolean;
    hasObjects: boolean;
    hasPeople: boolean;
    suggestedCategory?: string;
  };
}

export interface ImageOCRResult extends MediaProcessingResult {
  type: 'image';
  imageDescription?: string;
}

export interface VideoTranscriptionResult extends MediaProcessingResult {
  type: 'video';
  durationSeconds: number;
  hasAudio: boolean;
}

export async function extractTextFromImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<ImageOCRResult> {
  const startTime = Date.now();
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image and extract ALL text visible in it. Also describe what the image shows.

Your response MUST be in this exact JSON format:
{
  "extractedText": "all text found in the image, preserving line breaks",
  "imageDescription": "brief description of what the image shows",
  "hasText": true/false,
  "hasObjects": true/false,
  "hasPeople": true/false,
  "suggestedCategory": "one of: travel, fitness, career, personal, food, shopping, event, education, health, other",
  "confidence": 0.0 to 1.0
}

If no text is found, return extractedText as empty string but still describe the image.
Focus on extracting any lists, steps, instructions, or actionable content that could be turned into tasks.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content || '';
    
    let parsed: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = {
          extractedText: content,
          imageDescription: "Unable to parse structured response",
          hasText: content.length > 0,
          hasObjects: true,
          hasPeople: false,
          suggestedCategory: "other",
          confidence: 0.5
        };
      }
    } catch {
      parsed = {
        extractedText: content,
        imageDescription: "Image analysis complete",
        hasText: content.length > 0,
        hasObjects: true,
        hasPeople: false,
        suggestedCategory: "other",
        confidence: 0.5
      };
    }

    return {
      type: 'image',
      extractedText: parsed.extractedText || '',
      imageDescription: parsed.imageDescription || '',
      confidence: parsed.confidence || 0.7,
      processingTimeMs: Date.now() - startTime,
      detectedContent: {
        hasText: parsed.hasText ?? false,
        hasObjects: parsed.hasObjects ?? true,
        hasPeople: parsed.hasPeople ?? false,
        suggestedCategory: parsed.suggestedCategory
      }
    };
  } catch (error: any) {
    console.error('[MediaInterpretation] Image OCR error:', error.message);
    return {
      type: 'image',
      extractedText: '',
      confidence: 0,
      processingTimeMs: Date.now() - startTime,
      detectedContent: {
        hasText: false,
        hasObjects: false,
        hasPeople: false
      }
    };
  }
}

export async function transcribeVideo(
  audioBuffer: Buffer,
  filename: string = 'audio.mp3'
): Promise<VideoTranscriptionResult> {
  const startTime = Date.now();
  
  try {
    const file = new File([audioBuffer], filename, { type: 'audio/mp3' });
    
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "en",
      response_format: "verbose_json"
    });

    const text = transcription.text || '';
    const duration = (transcription as any).duration || 0;

    return {
      type: 'video',
      extractedText: text,
      durationSeconds: Math.round(duration),
      hasAudio: text.length > 0,
      confidence: text.length > 10 ? 0.9 : 0.5,
      processingTimeMs: Date.now() - startTime,
      detectedContent: {
        hasText: text.length > 0,
        hasObjects: true,
        hasPeople: true,
        suggestedCategory: categorizeContent(text)
      }
    };
  } catch (error: any) {
    console.error('[MediaInterpretation] Video transcription error:', error.message);
    return {
      type: 'video',
      extractedText: '',
      durationSeconds: 0,
      hasAudio: false,
      confidence: 0,
      processingTimeMs: Date.now() - startTime,
      detectedContent: {
        hasText: false,
        hasObjects: false,
        hasPeople: false
      }
    };
  }
}

function categorizeContent(text: string): string {
  const lower = text.toLowerCase();
  
  const categories = [
    { name: 'travel', keywords: ['trip', 'vacation', 'hotel', 'flight', 'destination', 'travel', 'visit', 'tour', 'beach', 'mountain'] },
    { name: 'fitness', keywords: ['workout', 'exercise', 'gym', 'run', 'yoga', 'stretch', 'weight', 'cardio', 'training', 'fit'] },
    { name: 'career', keywords: ['work', 'job', 'meeting', 'project', 'deadline', 'interview', 'resume', 'professional', 'business'] },
    { name: 'food', keywords: ['recipe', 'cook', 'eat', 'meal', 'ingredient', 'restaurant', 'dinner', 'lunch', 'breakfast'] },
    { name: 'health', keywords: ['health', 'doctor', 'medicine', 'wellness', 'sleep', 'stress', 'mental', 'therapy'] },
    { name: 'education', keywords: ['learn', 'study', 'course', 'class', 'book', 'read', 'tutorial', 'skill', 'practice'] },
    { name: 'event', keywords: ['party', 'birthday', 'wedding', 'celebration', 'event', 'festival', 'concert', 'gathering'] },
    { name: 'shopping', keywords: ['buy', 'shop', 'purchase', 'order', 'deal', 'sale', 'price', 'store'] },
  ];

  let maxScore = 0;
  let bestCategory = 'personal';

  for (const cat of categories) {
    const score = cat.keywords.filter(kw => lower.includes(kw)).length;
    if (score > maxScore) {
      maxScore = score;
      bestCategory = cat.name;
    }
  }

  return bestCategory;
}

export function mergeMediaContent(
  caption: string | null,
  extractedText: string | null,
  imageDescription?: string | null
): string {
  const parts: string[] = [];

  if (caption && caption.trim()) {
    parts.push(`Caption: ${caption.trim()}`);
  }

  if (extractedText && extractedText.trim()) {
    parts.push(`Content from media:\n${extractedText.trim()}`);
  }

  if (imageDescription && imageDescription.trim()) {
    parts.push(`Image shows: ${imageDescription.trim()}`);
  }

  if (parts.length === 0) {
    return "No content could be extracted from this media.";
  }

  return parts.join('\n\n---\n\n');
}

export function detectMediaSource(url: string, caption: string = ''): string {
  const lower = (url + caption).toLowerCase();
  
  if (lower.includes('instagram') || lower.includes('ig://')) {
    return 'instagram';
  }
  if (lower.includes('tiktok') || lower.includes('musically')) {
    return 'tiktok';
  }
  if (lower.includes('youtube') || lower.includes('youtu.be')) {
    return 'youtube';
  }
  if (lower.includes('facebook') || lower.includes('fb://')) {
    return 'facebook';
  }
  if (lower.includes('twitter') || lower.includes('x.com')) {
    return 'twitter';
  }
  if (lower.includes('content://media') || lower.includes('file://')) {
    return 'gallery';
  }
  
  return 'unknown';
}
