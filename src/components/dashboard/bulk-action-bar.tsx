
"use client";

import { useState } from 'react';
import { Folder, Trash2, X, Move } from 'lucide-react';
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
import { WatchlistFolder, WatchlistItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MoveToFolderDialog } from './move-to-folder-dialog';

interface BulkActionBarProps {
  selectedCount: number;
  folders: WatchlistFolder[];
  items: WatchlistItem[];
  activeTab: 'movies' | 'series' | 'watched';
  selectedItemIds: string[];
  onClear: () => void;
  onMove: (folderId: string | null) => void;
  onDelete: () => void;
}

export function BulkActionBar({
  selectedCount,
  folders,
  items,
  activeTab,
  selectedItemIds,
  onClear,
  onMove,
  onDelete,
}: BulkActionBarProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);

  if (selectedCount === 0) {
    return null;
  }
  
  const selectedItems = items.filter(item => selectedItemIds.includes(item.id));
  const firstSelectedItem = selectedItems[0];


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
            <MoveToFolderDialog
              open={isMoveDialogOpen}
              onOpenChange={setIsMoveDialogOpen}
              trigger={
                <Button variant="secondary">
                  <Move className="mr-2 h-4 w-4" />
                  Move
                </Button>
              }
              itemType={activeTab === 'watched' ? firstSelectedItem?.type : activeTab === 'movies' ? 'movie' : 'series'}
              isWatched={activeTab === 'watched'}
              allFolders={folders}
              allItems={items}
              currentFolderId={null}
              onMove={(folderId) => {
                onMove(folderId);
                setIsMoveDialogOpen(false);
              }}
            />
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
