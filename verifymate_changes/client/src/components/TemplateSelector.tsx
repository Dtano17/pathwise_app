import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, ArrowRight, Check, Upload } from 'lucide-react';
import { templates, formatTemplateEntry, type JournalTemplate } from '@/lib/journalTemplates';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export default function TemplateSelector({ open, onOpenChange, onComplete }: TemplateSelectorProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<JournalTemplate | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  // Submit journal entry
  const submitEntry = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) return;

      // Upload media if any
      let uploadedMedia = [];
      if (mediaFiles.length > 0) {
        const formData = new FormData();
        mediaFiles.forEach(file => formData.append('media', file));

        const uploadResponse = await apiRequest('POST', '/api/journal/upload', formData);
        const uploadData = await uploadResponse.json();
        uploadedMedia = uploadData.media;
      }

      // Format template into text
      const text = formatTemplateEntry(selectedTemplate, formValues);

      // Submit with keywords
      const response = await apiRequest('POST', '/api/journal/smart-entry', {
        text,
        media: uploadedMedia,
        keywords: selectedTemplate.suggestedKeywords
      });

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Journal entry saved!',
        description: `Added to ${data.category || selectedTemplate?.category}`
      });

      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });

      // Reset
      setSelectedTemplate(null);
      setCurrentStep(0);
      setFormValues({});
      setMediaFiles([]);
      onOpenChange(false);
      onComplete?.();
    },
    onError: () => {
      toast({
        title: 'Failed to save',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  });

  const handleTemplateSelect = (template: JournalTemplate) => {
    setSelectedTemplate(template);
    setCurrentStep(0);
    setFormValues({});
    setMediaFiles([]);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      setSelectedTemplate(null);
    }
  };

  const handleNext = () => {
    if (!selectedTemplate) return;

    const currentField = selectedTemplate.fields[currentStep];

    // Validate required fields
    if (currentField?.required && !formValues[currentField.id]) {
      toast({
        title: 'Required field',
        description: `Please fill out "${currentField.label}"`,
        variant: 'destructive'
      });
      return;
    }

    if (currentStep < selectedTemplate.fields.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - submit
      submitEntry.mutate();
    }
  };

  const updateValue = (fieldId: string, value: any) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const renderField = (field: any) => {
    const value = formValues[field.id] || '';

    switch (field.type) {
      case 'text':
        return (
          <Input
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => updateValue(field.id, e.target.value)}
            className="text-base"
          />
        );

      case 'textarea':
        return (
          <Textarea
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => updateValue(field.id, e.target.value)}
            className="min-h-32 text-base resize-none"
          />
        );

      case 'boolean':
        return (
          <div className="flex gap-3">
            <Button
              variant={value === true ? 'default' : 'outline'}
              onClick={() => updateValue(field.id, true)}
              className="flex-1"
            >
              Yes
            </Button>
            <Button
              variant={value === false ? 'default' : 'outline'}
              onClick={() => updateValue(field.id, false)}
              className="flex-1"
            >
              No
            </Button>
          </div>
        );

      case 'rating':
        return (
          <div className="flex flex-col gap-2">
            {field.options?.map((option: string, idx: number) => (
              <Button
                key={idx}
                variant={value === option ? 'default' : 'outline'}
                onClick={() => updateValue(field.id, option)}
                className="justify-start text-lg"
              >
                {option}
              </Button>
            ))}
          </div>
        );

      case 'media':
        return (
          <div className="space-y-3">
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  setMediaFiles(Array.from(e.target.files));
                  updateValue(field.id, true);
                }
              }}
              className="cursor-pointer"
            />
            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {mediaFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-lg bg-muted flex items-center justify-center"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        {!selectedTemplate ? (
          // Template Selection Grid
          <>
            <DialogHeader className="p-6 pb-4">
              <DialogTitle>Choose a Template</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-6">
                {templates.map(template => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{template.icon}</div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {template.category}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-xs">
                        {template.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          // Template Wizard (Mobile: one field per screen, Desktop: form view)
          <>
            <DialogHeader className="p-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                  <DialogTitle className="flex items-center gap-2">
                    <span>{selectedTemplate.icon}</span>
                    {selectedTemplate.name}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Step {currentStep + 1} of {selectedTemplate.fields.length}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 p-6">
              {(() => {
                const field = selectedTemplate.fields[currentStep];
                return (
                  <div className="space-y-3 max-w-xl mx-auto">
                    <Label className="text-lg font-semibold">
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {field.placeholder && (
                      <p className="text-sm text-muted-foreground">{field.placeholder}</p>
                    )}
                    {renderField(field)}
                  </div>
                );
              })()}
            </ScrollArea>

            <div className="p-6 border-t flex items-center justify-between">
              <div className="flex gap-1">
                {selectedTemplate.fields.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      idx === currentStep
                        ? 'bg-primary'
                        : idx < currentStep
                        ? 'bg-primary/50'
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>

              <Button
                onClick={handleNext}
                disabled={submitEntry.isPending}
                className="gap-2"
              >
                {currentStep === selectedTemplate.fields.length - 1 ? (
                  <>
                    <Check className="h-4 w-4" />
                    {submitEntry.isPending ? 'Saving...' : 'Save Entry'}
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
