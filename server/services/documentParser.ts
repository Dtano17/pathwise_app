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
  type: 'pdf' | 'docx' | 'image' | 'text' | 'url' | 'unknown';
  metadata?: {
    pages?: number;
    title?: string;
    wordCount?: number;
    imageDescription?: string;
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
  | 'application/json';

const SUPPORTED_MIME_TYPES: Record<string, 'pdf' | 'docx' | 'image' | 'text'> = {
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
