"use client";

import { useState, ReactNode } from 'react';
import { Search, Loader2, Trash2, Film, Tv, AlertTriangle } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';

import type { WatchlistItem } from '@/lib/types';
import { cn, normalizeTitle } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DuplicateFinderDialogProps {
  allItems: WatchlistItem[];
  onDeleteItem: (id: string) => void;
  trigger?: ReactNode;
}

type DuplicateGroup = {
  title: string;
  items: WatchlistItem[];
};


export function DuplicateFinderDialog({
  allItems,
  onDeleteItem,
  trigger
}: DuplicateFinderDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [itemToDelete, setItemToDelete] = useState<WatchlistItem | null>(null);
  const { toast } = useToast();

  const handleToggleSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const idsToDelete = new Set<string>();
      duplicates.forEach(group => {
        // Keep the first item (best candidate), select the rest for deletion
        group.items.slice(1).forEach(item => idsToDelete.add(item.id));
      });
      setSelectedIds(idsToDelete);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;

    selectedIds.forEach(id => onDeleteItem(id));
      
    setDuplicates(prevDuplicates => {
      const newDuplicates = prevDuplicates.map(group => {
           const newItems = group.items.filter(item => !selectedIds.has(item.id));
           // If only 1 item remains, the duplicate set is resolved. Return null to filter it out.
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

    setSelectedIds(new Set());
    toast({
        title: "Items Deleted",
        description: `Successfully deleted ${selectedIds.size} items.`,
    });
  };

  const findDuplicates = () => {
    setIsSearching(true);
    setDuplicates([]);

    const itemsWithNormalizedTitle = allItems.map(item => ({
      ...item,
      normalizedTitle: normalizeTitle(item.title),
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
        items: group.sort((a, b) => {
            // Prioritize Watched items first (keep them safe at index 0)
            if (a.watched !== b.watched) return a.watched ? -1 : 1;
            // Then prioritize items with more metadata (e.g. rating)
            if ((a.rating || 0) !== (b.rating || 0)) return (b.rating || 0) - (a.rating || 0);
             // Finally sort by created date (keep oldest? or newest? Keep oldest usually original)
            return a.createdAt - b.createdAt;
        }),
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

          {!isSearching && duplicates.length > 0 && (
             <div className="flex items-center justify-between mb-4 border-b pb-4 px-2">
                <div className="flex items-center space-x-2">
                    <Checkbox 
                        id="select-all" 
                        checked={duplicates.length > 0 && selectedIds.size === duplicates.reduce((acc, g) => acc + g.items.length, 0)}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    />
                    <label 
                        htmlFor="select-all" 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                        Select All
                    </label>
                </div>
                {selectedIds.size > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Selected ({selectedIds.size})
                    </Button>
                )}
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
                        <div key={item.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 p-2 sm:p-3 border rounded-md bg-card text-card-foreground shadow-sm w-full">
                             <Checkbox 
                                id={`select-${item.id}`}
                                checked={selectedIds.has(item.id)}
                                onCheckedChange={(checked) => handleToggleSelect(item.id, checked as boolean)}
                             />
                            <div className="min-w-0 overflow-hidden">
                              <p className="font-medium truncate text-sm sm:text-base" title={item.title}>{item.title}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                                {getStatusBadge(item)}
                                {item.type === 'movie' ? <Film className='h-3 w-3'/> : <Tv className='h-3 w-3'/>}
                              </div>
                            </div>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="shrink-0 h-8 w-8 bg-red-600 hover:bg-red-700 text-white rounded-md"
                              onClick={() => setItemToDelete(item)}
                              title="Delete Item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
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