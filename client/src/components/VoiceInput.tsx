import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Send, Sparkles, Copy, Plus, Upload, Image } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

// TypeScript declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceInputProps {
  onSubmit: (text: string) => void;
  isGenerating?: boolean;
  placeholder?: string;
}

export default function VoiceInput({ onSubmit, isGenerating = false, placeholder = "Share your goals and intentions..." }: VoiceInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const startRecording = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onstart = () => {
        setIsRecording(true);
        setIsListening(true);
      };
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setText(prev => prev + finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = () => {
        setIsRecording(false);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setIsListening(false);
      };
      
      recognitionRef.current.start();
    } else {
      // Fallback for demo
      setIsRecording(true);
      setIsListening(true);
      setTimeout(() => {
        setText("I want to work out more, take my vitamins daily, and get some sunlight this weekend");
        setIsRecording(false);
        setIsListening(false);
      }, 2000);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setIsListening(false);
  };

  const handleSubmit = () => {
    if (text.trim() && !isGenerating) {
      let submissionText = text.trim();
      if (uploadedImages.length > 0) {
        submissionText += `\n\n[Note: ${uploadedImages.length} image(s) uploaded: ${uploadedImages.map(img => img.name).join(', ')}]`;
      }
      onSubmit(submissionText);
      setText('');
      setUploadedImages([]);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        setUploadedImages(prev => [...prev, ...imageFiles]);
        toast({
          title: "Images Uploaded",
          description: `Added ${imageFiles.length} image(s) to your goal submission.`,
        });
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload only image files.",
          variant: "destructive",
        });
      }
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <motion.div 
        className="bg-card border border-card-border rounded-lg p-6 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-card-foreground">Share Your Intentions</h3>
          </div>
          
          {/* Feature indicators */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs gap-1">
              <Copy className="w-3 h-3" />
              Copy & Paste
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              title="Upload images"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-upload-images"
            >
              <Upload className="w-3 h-3" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        </div>

        {/* Uploaded Images Preview */}
        {uploadedImages.length > 0 && (
          <div className="border rounded-md p-3 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Image className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Uploaded Images ({uploadedImages.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {uploadedImages.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-background rounded px-2 py-1 text-xs">
                  <span className="truncate max-w-24">{file.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeImage(index)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="relative">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="min-h-[120px] pr-16 resize-none text-base"
            data-testid="input-goal"
            disabled={isGenerating}
          />
          
          <div className="absolute bottom-3 right-3 flex gap-2">
            <AnimatePresence>
              {isRecording ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-2 h-2 bg-red-500 rounded-full"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={stopRecording}
                    data-testid="button-stop-recording"
                    className="h-8 w-8"
                  >
                    <MicOff className="w-4 h-4" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={startRecording}
                    data-testid="button-start-recording"
                    className="h-8 w-8"
                    disabled={isGenerating}
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {isListening && "Listening..."}
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={!text.trim() || isGenerating}
            className="gap-2"
            data-testid="button-submit"
          >
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                />
                Generating Plan...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Create Action Plan
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}