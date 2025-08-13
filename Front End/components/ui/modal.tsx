'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/lib/components/ui/dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        'sm:max-w-md border-0 bg-white/95 backdrop-blur-xl shadow-2xl',
        className
      )}>
        {title && (
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {title}
            </DialogTitle>
          </DialogHeader>
        )}
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};