// Use require for pdf-parse as it doesn't have proper ESM exports
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ParsedDocument {
  success: boolean;
  content: string;
  type: 'pdf' | 'docx' | 'image' | 'text' | 'url' | 'video' | 'audio' | 'unknown';
  metadata?: {
    pages?: number;
    title?: string;
    wordCount?: number;
    imageDescription?: string;
    transcriptionDuration?: number;
    platform?: string;
  };
  error?: string;
}

export type SupportedMimeType = 
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'text/plain'
  | 'text/markdown'
  | 'text/csv'
  | 'application/json'
  | 'video/mp4'
  | 'video/webm'
  | 'video/quicktime'
  | 'video/x-msvideo'
  | 'audio/mpeg'
  | 'audio/wav'
  | 'audio/mp4'
  | 'audio/webm';

const SUPPORTED_MIME_TYPES: Record<string, 'pdf' | 'docx' | 'image' | 'text' | 'video' | 'audio'> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'text/plain': 'text',
  'text/markdown': 'text',
  'text/csv': 'text',
  'application/json': 'text',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'video/x-msvideo': 'video',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/mp4': 'audio',
  'audio/webm': 'audio',
};

class DocumentParser {
  async parseFile(filePath: string, mimeType: string): Promise<ParsedDocument> {
    const docType = SUPPORTED_MIME_TYPES[mimeType];
    
    if (!docType) {
      return {
        success: false,
        content: '',
        type: 'unknown',
        error: `Unsupported file type: ${mimeType}. Supported types: PDF, Word (.docx), Images (JPEG, PNG, GIF, WebP), Text files.`
      };
    }

    try {
      switch (docType) {
        case 'pdf':
          return await this.parsePDF(filePath);
        case 'docx':
          return await this.parseWord(filePath);
        case 'image':
          return await this.parseImage(filePath, mimeType);
        case 'text':
          return await this.parseText(filePath);
        case 'video':
          return await this.transcribeVideo(filePath, mimeType);
        case 'audio':
          return await this.transcribeAudio(filePath, mimeType);
        default:
          return {
            success: false,
            content: '',
            type: 'unknown',
            error: 'Unknown document type'
          };
      }
    } catch (error) {
      console.error(`[DOCUMENT_PARSER] Error parsing ${docType}:`, error);
      return {
        success: false,
        content: '',
        type: docType,
        error: error instanceof Error ? error.message : 'Failed to parse document'
      };
    }
  }

  async parsePDF(filePath: string): Promise<ParsedDocument> {
    console.log('[DOCUMENT_PARSER] Parsing PDF:', filePath);
    
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    
    const content = data.text.trim();
    const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;
    
    console.log(`[DOCUMENT_PARSER] PDF parsed: ${data.numpages} pages, ${wordCount} words`);
    
    return {
      success: true,
      content,
      type: 'pdf',
      metadata: {
        pages: data.numpages,
        title: data.info?.Title || undefined,
        wordCount
      }
    };
  }

  async parseWord(filePath: string): Promise<ParsedDocument> {
    console.log('[DOCUMENT_PARSER] Parsing Word document:', filePath);
    
    const result = await mammoth.extractRawText({ path: filePath });
    const content = result.value.trim();
    const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;
    
    if (result.messages.length > 0) {
      console.log('[DOCUMENT_PARSER] Word parser messages:', result.messages);
    }
    
    console.log(`[DOCUMENT_PARSER] Word doc parsed: ${wordCount} words`);
    
    return {
      success: true,
      content,
      type: 'docx',
      metadata: {
        wordCount
      }
    };
  }

  async parseImage(filePath: string, mimeType: string): Promise<ParsedDocument> {
    console.log('[DOCUMENT_PARSER] Parsing image with Vision API:', filePath);
    
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: false,
        content: '',
        type: 'image',
        error: 'OpenAI API key not configured for image analysis'
      };
    }

    const imageData = fs.readFileSync(filePath);
    const base64Image = imageData.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image thoroughly and extract all relevant information that could be used for creating an action plan. Include:

1. **Main Subject/Topic**: What is this image about?
2. **Key Information**: Any text, data, diagrams, charts, or important details visible
3. **Context**: What appears to be the purpose or goal shown in the image
4. **Actionable Elements**: Any steps, tasks, instructions, or goals that can be identified
5. **Recommendations**: Based on what you see, what actions would be beneficial

Provide a detailed, structured analysis that can be used to create a personalized action plan.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ]
      });

      const description = response.choices[0]?.message?.content || 'Unable to analyze image';
      
      console.log('[DOCUMENT_PARSER] Image analyzed successfully');
      
      return {
        success: true,
        content: description,
        type: 'image',
        metadata: {
          imageDescription: description.substring(0, 200) + '...'
        }
      };
    } catch (error) {
      console.error('[DOCUMENT_PARSER] Vision API error:', error);
      return {
        success: false,
        content: '',
        type: 'image',
        error: error instanceof Error ? error.message : 'Failed to analyze image'
      };
    }
  }

  async parseText(filePath: string): Promise<ParsedDocument> {
    console.log('[DOCUMENT_PARSER] Parsing text file:', filePath);
    
    const content = fs.readFileSync(filePath, 'utf-8').trim();
    const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;
    
    console.log(`[DOCUMENT_PARSER] Text file parsed: ${wordCount} words`);
    
    return {
      success: true,
      content,
      type: 'text',
      metadata: {
        wordCount
      }
    };
  }

  async transcribeVideo(filePath: string, mimeType: string): Promise<ParsedDocument> {
    console.log('[DOCUMENT_PARSER] Transcribing video with Whisper:', filePath);
    
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: false,
        content: '',
        type: 'video',
        error: 'OpenAI API key not configured for video transcription'
      };
    }

    try {
      const fileSize = fs.statSync(filePath).size;
      const maxSize = 25 * 1024 * 1024;
      
      if (fileSize > maxSize) {
        return {
          success: false,
          content: '',
          type: 'video',
          error: `Video file too large (${Math.round(fileSize / 1024 / 1024)}MB). Maximum size is 25MB. Please trim or compress the video.`
        };
      }

      console.log(`[DOCUMENT_PARSER] Video size: ${Math.round(fileSize / 1024)}KB, sending to Whisper...`);
      
      const fileName = path.basename(filePath);
      const file = await OpenAI.toFile(fs.createReadStream(filePath), fileName, { contentType: mimeType });
      
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        response_format: 'verbose_json'
      });

      const content = transcription.text || '';
      const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;
      const duration = (transcription as any).duration || 0;
      
      console.log(`[DOCUMENT_PARSER] Video transcribed: ${wordCount} words, ${Math.round(duration)}s duration`);

      if (!content || content.length < 10) {
        return {
          success: true,
          content: '[No speech detected in video - the video may contain only music or ambient sounds]\n\nTo create a plan from this video, please describe what you see: the locations, activities, venues, or recommendations shown.',
          type: 'video',
          metadata: {
            wordCount: 0,
            transcriptionDuration: duration
          }
        };
      }

      const formattedContent = `[Video Transcription]\n\n${content}\n\n---\nDuration: ${Math.round(duration)} seconds | Words: ${wordCount}`;
      
      return {
        success: true,
        content: formattedContent,
        type: 'video',
        metadata: {
          wordCount,
          transcriptionDuration: duration
        }
      };
    } catch (error: any) {
      console.error('[DOCUMENT_PARSER] Whisper transcription error:', error);
      
      if (error.message?.includes('Invalid file format')) {
        return {
          success: false,
          content: '',
          type: 'video',
          error: 'Unsupported video format. Please use MP4, WebM, or MOV format.'
        };
      }
      
      return {
        success: false,
        content: '',
        type: 'video',
        error: error.message || 'Failed to transcribe video'
      };
    }
  }

  async transcribeAudio(filePath: string, mimeType: string): Promise<ParsedDocument> {
    console.log('[DOCUMENT_PARSER] Transcribing audio with Whisper:', filePath);
    
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: false,
        content: '',
        type: 'audio',
        error: 'OpenAI API key not configured for audio transcription'
      };
    }

    try {
      const fileSize = fs.statSync(filePath).size;
      const maxSize = 25 * 1024 * 1024;
      
      if (fileSize > maxSize) {
        return {
          success: false,
          content: '',
          type: 'audio',
          error: `Audio file too large (${Math.round(fileSize / 1024 / 1024)}MB). Maximum size is 25MB.`
        };
      }

      console.log(`[DOCUMENT_PARSER] Audio size: ${Math.round(fileSize / 1024)}KB, sending to Whisper...`);
      
      const fileName = path.basename(filePath);
      const file = await OpenAI.toFile(fs.createReadStream(filePath), fileName, { contentType: mimeType });
      
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        response_format: 'verbose_json'
      });

      const content = transcription.text || '';
      const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;
      const duration = (transcription as any).duration || 0;
      
      console.log(`[DOCUMENT_PARSER] Audio transcribed: ${wordCount} words, ${Math.round(duration)}s duration`);

      if (!content || content.length < 10) {
        return {
          success: true,
          content: '[No speech detected in audio - the file may contain only music or ambient sounds]',
          type: 'audio',
          metadata: {
            wordCount: 0,
            transcriptionDuration: duration
          }
        };
      }

      const formattedContent = `[Audio Transcription]\n\n${content}\n\n---\nDuration: ${Math.round(duration)} seconds | Words: ${wordCount}`;
      
      return {
        success: true,
        content: formattedContent,
        type: 'audio',
        metadata: {
          wordCount,
          transcriptionDuration: duration
        }
      };
    } catch (error: any) {
      console.error('[DOCUMENT_PARSER] Whisper transcription error:', error);
      
      return {
        success: false,
        content: '',
        type: 'audio',
        error: error.message || 'Failed to transcribe audio'
      };
    }
  }

  async parseBuffer(buffer: Buffer, mimeType: string, originalName?: string): Promise<ParsedDocument> {
    const docType = SUPPORTED_MIME_TYPES[mimeType];
    
    if (!docType) {
      return {
        success: false,
        content: '',
        type: 'unknown',
        error: `Unsupported file type: ${mimeType}`
      };
    }

    const tempDir = '/tmp/document-parser';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const ext = this.getExtension(mimeType, originalName);
    const tempPath = path.join(tempDir, `upload-${Date.now()}${ext}`);
    
    try {
      fs.writeFileSync(tempPath, buffer);
      const result = await this.parseFile(tempPath, mimeType);
      return result;
    } finally {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }

  private getExtension(mimeType: string, originalName?: string): string {
    if (originalName) {
      const ext = path.extname(originalName);
      if (ext) return ext;
    }
    
    const extensions: Record<string, string> = {
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'text/plain': '.txt',
      'text/markdown': '.md',
      'text/csv': '.csv',
      'application/json': '.json',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/mp4': '.m4a',
      'audio/webm': '.weba',
    };
    
    return extensions[mimeType] || '.bin';
  }

  getSupportedTypes(): string[] {
    return Object.keys(SUPPORTED_MIME_TYPES);
  }

  isSupported(mimeType: string): boolean {
    return mimeType in SUPPORTED_MIME_TYPES;
  }
}

export const documentParser = new DocumentParser();
