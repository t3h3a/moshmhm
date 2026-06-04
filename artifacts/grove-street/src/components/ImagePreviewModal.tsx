import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, RotateCcw, X, ChevronLeft, ChevronRight, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImagePreviewModalProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImagePreviewModal({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
}: ImagePreviewModalProps) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Sync index when initialIndex changes
  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  // Reset zoom & position when changing images or closing
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [index, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handleNext();
      if (e.key === "ArrowRight") handlePrev();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, index, images.length]);

  function handleNext() {
    if (images.length <= 1) return;
    setIndex((prev) => (prev + 1) % images.length);
  }

  function handlePrev() {
    if (images.length <= 1) return;
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  }

  function zoomIn() {
    setScale((prev) => Math.min(prev + 0.25, 4));
  }

  function zoomOut() {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  }

  function resetZoom() {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }

  // Handle manual dragging for zoomed images
  function handleMouseDown(e: React.MouseEvent) {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  if (!isOpen || images.length === 0) return null;

  const currentSrc = images[index];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 p-4 backdrop-blur-sm">
        {/* Top bar with buttons and indicator */}
        <div className="w-full flex items-center justify-between max-w-4xl z-10 bg-black/45 p-2 rounded-xl backdrop-blur-md border border-white/5">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={onClose}
              title="إغلاق"
            >
              <X size={20} />
            </Button>
            <span className="text-white/60 text-xs font-mono px-2 py-1 rounded bg-white/5">
              Esc للغلق
            </span>
          </div>

          {images.length > 1 && (
            <p className="text-white font-bold text-sm" dir="ltr">
              {index + 1} / {images.length}
            </p>
          )}

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-9 w-9"
              onClick={zoomIn}
              title="تكبير"
            >
              <ZoomIn size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-9 w-9"
              onClick={zoomOut}
              title="تصغير"
            >
              <ZoomOut size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-9 w-9"
              onClick={resetZoom}
              title="إعادة تعيين"
            >
              <RotateCcw size={18} />
            </Button>
          </div>
        </div>

        {/* Middle Image Area with navigation arrows */}
        <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden my-4">
          {images.length > 1 && (
            <button
              onClick={handlePrev}
              className="absolute right-4 z-10 p-3 rounded-full bg-black/60 hover:bg-black/90 border border-white/10 text-white transition-all transform hover:scale-105 active:scale-95"
            >
              <ChevronRight size={24} />
            </button>
          )}

          <div
            className="w-full h-full flex items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <motion.div
              style={{
                x: position.x,
                y: position.y,
                cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="max-w-full max-h-full p-2 flex items-center justify-center select-none"
            >
              <motion.img
                key={currentSrc}
                src={currentSrc}
                alt="Document Preview"
                style={{
                  scale,
                  transformOrigin: "center",
                }}
                className="max-w-[90vw] max-h-[70vh] md:max-h-[80vh] object-contain rounded-lg shadow-2xl border border-white/5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                draggable={false}
              />
            </motion.div>
          </div>

          {images.length > 1 && (
            <button
              onClick={handleNext}
              className="absolute left-4 z-10 p-3 rounded-full bg-black/60 hover:bg-black/90 border border-white/10 text-white transition-all transform hover:scale-105 active:scale-95"
            >
              <ChevronLeft size={24} />
            </button>
          )}
        </div>

        {/* Bottom bar for mobile and controls preview info */}
        <div className="w-full max-w-lg flex flex-col items-center gap-2 text-center text-xs text-white/50 bg-black/30 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
          <p className="font-medium text-white/70">توجيه: يمكنك السحب للتحريك عندما تكون الصورة مكبرة</p>
          <div className="flex gap-4 mt-1 font-mono text-[10px]">
            <span>التكبير الحلي: {(scale * 100).toFixed(0)}%</span>
            {images.length > 1 && <span>اضغط على الأسهم للتنقل بين المستندات</span>}
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
