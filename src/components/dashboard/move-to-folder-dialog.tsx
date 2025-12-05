"use client";

import { useState, useMemo, ReactNode, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder, Search } from 'lucide-react';
import type { WatchlistFolder, WatchlistItem, WatchlistItemType } from '@/lib/types';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactNode;
  itemType: WatchlistItemType | undefined;
  isWatched: boolean;
  allFolders: WatchlistFolder[];
  allItems: WatchlistItem[];
  currentFolderId: string | null | undefined;
  onMove: (folderId: string | null) => void;
}

export function MoveToFolderDialog({
  open,
  onOpenChange,
  trigger,
  itemType,
  isWatched,
  allFolders,
  allItems,
  currentFolderId,
  onMove,
}: MoveToFolderDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (open) {
      setSearchTerm('');
    }
  }, [open]);

  const relevantFolders = useMemo(() => {
    return allFolders.filter(folder => {
      const folderItems = allItems.filter(item => item.folderId === folder.id);
      
      // Always allow moving to empty folders
      if (folderItems.length === 0) return true;

      // When moving a watched item, only show folders that contain *only* watched items.
      if (isWatched) {
        return folderItems.every(item => item.watched);
      } 
      // When moving an unwatched item, only show folders that contain *only* unwatched items of the same type.
      else {
        return folderItems.every(item => !item.watched && item.type === itemType);
      }
    });
  }, [allFolders, allItems, itemType, isWatched]);
  
  const filteredFolders = useMemo(() => {
    if (!searchTerm) {
      return relevantFolders;
    }
    return relevantFolders.filter(folder => 
      folder.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [relevantFolders, searchTerm]);

  const handleSelectFolder = (folderId: string | null) => {
    onMove(folderId);
    onOpenChange(false);
  };

  const DialogBody = (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Move to Folder</DialogTitle>
        <DialogDescription>
          Select a destination folder. Only relevant folders are shown.
        </DialogDescription>
      </DialogHeader>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search folders..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <ScrollArea className="max-h-80 -mx-6 px-6">
        <div className="space-y-2 py-4">
            <Card
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleSelectFolder(null)}
            >
                <CardContent className="p-3 flex items-center gap-3">
                    <Folder className="h-5 w-5 text-primary" />
                    <span className="font-medium">Standalone (No Folder)</span>
                </CardContent>
            </Card>
            {filteredFolders.filter(folder => folder.id !== currentFolderId).map(folder => {
                const itemCount = allItems.filter(item => item.folderId === folder.id).length;
                return (
                    <Card 
                        key={folder.id}
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => handleSelectFolder(folder.id)}
                    >
                         <CardContent className="p-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <Folder className="h-5 w-5 text-primary" />
                                <span className="font-medium truncate">{folder.name}</span>
                            </div>
                            <span className="text-sm text-muted-foreground shrink-0">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                        </CardContent>
                    </Card>
                );
            })}
             {filteredFolders.length === 0 && searchTerm && (
              <p className="text-center text-muted-foreground py-4">No folders found for "{searchTerm}".</p>
            )}
        </div>
      </ScrollArea>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {DialogBody}
      </Dialog>
    );
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>{DialogBody}</Dialog>;
}