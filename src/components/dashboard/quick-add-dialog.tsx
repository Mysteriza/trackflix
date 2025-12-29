"use client";

import { useState, useEffect, useId, ReactNode } from 'react';
import { PlusCircle, Film, Tv, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { QuickAddItem, WatchlistItemType } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Card } from '../ui/card';
import { useToast } from '@/hooks/use-toast';

interface QuickAddDialogProps {
  onQuickAdd: (items: Omit<QuickAddItem, 'key'>[]) => void;
  children?: ReactNode;
}

export function QuickAddDialog({ onQuickAdd, children }: QuickAddDialogProps) {
  const [open, setOpen] = useState(false);
  const [textValue, setTextValue] = useState('');
  const [items, setItems] = useState<QuickAddItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const uniqueId = useId();
  const { toast } = useToast();

  const resetAndClose = () => {
    setOpen(false);
    setTextValue('');
    setItems([]);
    setIsSubmitting(false);
  };

  useEffect(() => {
    const lines = textValue.split('\n').filter(line => line.trim() !== '');
    setItems(prevItems => {
        return lines.map((line, index) => {
            const title = line.trim();
            const existingItem = prevItems.find(item => item.title === title);
            return {
                key: existingItem?.key || `${uniqueId}-${title}-${index}`,
                title: title,
                type: existingItem?.type || 'movie',
            };
        });
    });
  }, [textValue, uniqueId]);

  const handleTypeChange = (key: string, type: WatchlistItemType) => {
    setItems(prevItems =>
      prevItems.map(item => (item.key === key ? { ...item, type } : item))
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const validItems = items.filter(item => item.title.trim() !== '').map(({key, ...rest}) => rest);
    
    if (validItems.length === 0) {
      toast({
        variant: "destructive",
        title: "No titles entered",
        description: "Please enter at least one title to add.",
      });
      setIsSubmitting(false);
      return;
    }

    await onQuickAdd(validItems);
    resetAndClose();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetAndClose();
    } else {
      setOpen(true);
    }
  };

  const placeholderText = `The Avengers
Avengers: Age of Ultron
Avengers: Infinity War
Avengers: Endgame`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        { children ?? (
            <Button variant="outline" className="w-full">
                <Sparkles className="mr-2 h-4 w-4" />
                Quick Add
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl h-[90vh] sm:h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Quick Add to Watched List</DialogTitle>
          <DialogDescription>
            Add multiple movies and series at once. Enter one title per line.
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6 flex-1 overflow-hidden pt-4">
          <div className="flex flex-col h-full">
            <Label htmlFor="titles" className="mb-2">Titles</Label>
            <Textarea
              id="titles"
              placeholder={placeholderText}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              className="flex-1 resize-none"
            />
          </div>
          <div className="flex flex-col h-full overflow-hidden">
             <div className="grid grid-cols-2 gap-2 mb-2 px-2 items-center">
                <Label className="text-sm font-medium col-start-1 col-span-1">Title</Label>
                 <div className="col-start-2 col-span-1 grid grid-cols-2 gap-2">
                    <Label className="flex items-center gap-1 justify-center text-xs"><Film className="h-4 w-4"/> Movie</Label>
                    <Label className="flex items-center gap-1 justify-center text-xs"><Tv className="h-4 w-4"/> Series</Label>
                </div>
            </div>
            <ScrollArea className="flex-1 pr-1">
              <div className="space-y-2">
                {items.map((item) => (
                  <Card key={item.key} className="p-2">
                    <div className="grid grid-cols-2 gap-2 items-center min-h-[32px]">
                         <p className="text-sm truncate col-start-1 col-span-1" title={item.title}>
                          {item.title}
                        </p>
                        <div className="col-start-2 col-span-1 grid grid-cols-2 gap-2">
                             <div className='flex justify-center'>
                                <Checkbox
                                    checked={item.type === 'movie'}
                                    onCheckedChange={() => handleTypeChange(item.key, 'movie')}
                                    />
                            </div>
                            <div className='flex justify-center'>
                                <Checkbox
                                    checked={item.type === 'series'}
                                    onCheckedChange={() => handleTypeChange(item.key, 'series')}
                                    />
                            </div>
                        </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter className="mt-4 pt-4 border-t flex-col sm:flex-row gap-2 sm:justify-end w-full">
          <div className='flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto'>
            <Button variant="outline" className='w-full sm:w-auto' onClick={resetAndClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || items.length === 0} className='w-full sm:w-auto'>
                {isSubmitting ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                </>
                ) : (
                <>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add to Watched
                </>
                )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}