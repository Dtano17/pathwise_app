import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState, useEffect } from "react";

interface ImageGalleryModalProps {
  images: { url: string; filename?: string }[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageGalleryModal({ images, initialIndex, isOpen, onClose }: ImageGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-black/95">
        <div className="relative w-full h-full flex items-center justify-center">
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
            onClick={onClose}
            data-testid="button-close-gallery"
          >
            <X className="h-6 w-6" />
          </Button>

          {images.length > 1 && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-40 text-white hover:bg-white/20 disabled:opacity-30"
                onClick={handlePrevious}
                data-testid="button-gallery-previous"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-40 text-white hover:bg-white/20 disabled:opacity-30"
                onClick={handleNext}
                data-testid="button-gallery-next"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium" data-testid="text-gallery-counter">
                {currentIndex + 1} of {images.length}
              </div>
            </>
          )}

          <div className="w-full h-full flex items-center justify-center p-12">
            <img
              src={currentImage.url}
              alt={currentImage.filename || `Image ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              data-testid={`img-gallery-${currentIndex}`}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
