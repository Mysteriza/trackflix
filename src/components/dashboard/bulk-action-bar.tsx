"use client";

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { WatchlistItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface BulkActionBarProps {
  selectedCount: number;
  items: WatchlistItem[];
  activeTab: 'movies' | 'series' | 'watched';
  selectedItemIds: string[];
  onClear: () => void;
  onDelete: () => void;
}

export function BulkActionBar({
  selectedCount,
  items,
  activeTab,
  selectedItemIds,
  onClear,
  onDelete,
}: BulkActionBarProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl z-50">
        <div className="bg-card text-card-foreground rounded-lg shadow-2xl border p-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={onClear} className="h-8 w-8">
                <X className="h-5 w-5" />
                <span className="sr-only">Clear selection</span>
            </Button>
            <p className="text-sm font-semibold">
              {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {selectedCount} selected item{selectedCount > 1 ? 's' : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className={cn(buttonVariants({ variant: 'destructive' }))}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
