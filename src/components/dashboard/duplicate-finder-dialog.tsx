"use client";

import { useState, useMemo, ReactNode } from 'react';
import { Search, Loader2, Trash2, Film, Tv, Folder } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { WatchlistItem, WatchlistFolder } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DuplicateFinderDialogProps {
  allItems: WatchlistItem[];
  allFolders: WatchlistFolder[];
  onDeleteItem: (id: string) => void;
  trigger?: ReactNode;
}

type DuplicateGroup = {
  title: string;
  items: WatchlistItem[];
};

const normalizeTitleForDuplicateCheck = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/\s*\(.*\)\s*|\s*\[.*\]\s*/g, '') 
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(the|a|an)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export function DuplicateFinderDialog({
  allItems,
  allFolders,
  onDeleteItem,
  trigger
}: DuplicateFinderDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [itemToDelete, setItemToDelete] = useState<WatchlistItem | null>(null);
  const { toast } = useToast();

  const folderMap = useMemo(() => {
    return allFolders.reduce((acc, folder) => {
      acc[folder.id] = folder.name;
      return acc;
    }, {} as Record<string, string>);
  }, [allFolders]);

  const findDuplicates = () => {
    setIsSearching(true);
    setDuplicates([]);

    const itemsWithNormalizedTitle = allItems.map(item => ({
      ...item,
      normalizedTitle: normalizeTitleForDuplicateCheck(item.title),
    }));

    const titleGroups = itemsWithNormalizedTitle.reduce((acc, item) => {
      if(item.normalizedTitle){
        acc[item.normalizedTitle] = acc[item.normalizedTitle] || [];
        acc[item.normalizedTitle].push(item);
      }
      return acc;
    }, {} as Record<string, WatchlistItem[]>);

    const foundDuplicates = Object.values(titleGroups)
      .filter(group => group.length > 1)
      .map(group => ({
        title: group[0].title,
        items: group.sort((a, b) => (a.watched ? 1 : -1)),
      }));

    setTimeout(() => {
      setDuplicates(foundDuplicates);
      setIsSearching(false);
      toast({
        title: foundDuplicates.length > 0 ? "Duplicates Found!" : "No Duplicates Found",
        description: foundDuplicates.length > 0 ? `Found ${foundDuplicates.length} sets of duplicates.` : "Your watchlist is clean!",
      });
    }, 500);
  };

  const handleDelete = () => {
    if (itemToDelete) {
      onDeleteItem(itemToDelete.id);
      
      setDuplicates(prevDuplicates => {
        const newDuplicates = prevDuplicates.map(group => {
            const newItems = group.items.filter(item => item.id !== itemToDelete.id);
            if (newItems.length < 2) {
                return null;
            }
            return { ...group, items: newItems };
        }).filter((group): group is DuplicateGroup => group !== null);

        if (prevDuplicates.length > 0 && newDuplicates.length === 0) {
            toast({
                title: "All Duplicates Resolved!",
                description: "Your watchlist is now free of duplicates.",
            });
        }
        
        return newDuplicates;
      });

      setItemToDelete(null);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setDuplicates([]);
      setIsSearching(false);
    }
  };

  const getStatusBadge = (item: WatchlistItem) => {
    if (item.watched) {
      return <Badge variant="secondary">Watched</Badge>;
    }
    return <Badge variant="outline">{item.type === 'movie' ? 'Movie' : 'Series'}</Badge>;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" id="find-duplicates-trigger">
                <Search className="mr-2 h-4 w-4" />
                Find Duplicates
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-2xl h-[90vh] sm:h-[500px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Duplicate Item Finder</DialogTitle>
            <DialogDescription>
              Search for and remove duplicate entries in your watchlist.
            </DialogDescription>
          </DialogHeader>

          {!isSearching && duplicates.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <p className="text-muted-foreground">
                Click the button to scan your entire watchlist for items with the same title.
              </p>
              <Button onClick={findDuplicates}>
                <Search className="mr-2 h-4 w-4" />
                Scan for Duplicates
              </Button>
            </div>
          )}

          {isSearching && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {!isSearching && duplicates.length > 0 && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4">
                {duplicates.map(group => (
                  <div key={group.title} className="p-4 border rounded-lg bg-background">
                    <h3 className="font-semibold mb-3">"{group.items[0].normalizedTitle}"</h3>
                    <div className="space-y-2">
                      {group.items.map(item => (
                        <Card key={item.id} className="p-2 sm:p-3">
                          <CardContent className="p-0 flex items-center justify-between gap-2 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate" title={item.title}>{item.title}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                                {getStatusBadge(item)}
                                {item.type === 'movie' ? <Film className='h-4 w-4'/> : <Tv className='h-4 w-4'/>}
                                {item.folderId && folderMap[item.folderId] && (
                                  <div className="flex items-center gap-1">
                                    <Folder className="h-3 w-3" />
                                    <span>{folderMap[item.folderId]}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-500 hover:bg-red-500/10 h-8 w-8 shrink-0"
                              onClick={() => setItemToDelete(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete "{itemToDelete?.title}" from your watchlist. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({ variant: "destructive" }))}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}