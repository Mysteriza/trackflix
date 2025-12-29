"use client";

import { Search, X as ClearIcon, PlusCircle, MoreVertical, Trash2 } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectGroup } from '@/components/ui/select';
import { AddItemDialog } from './add-item-dialog';
import { QuickAddDialog } from './quick-add-dialog';
import { DuplicateFinderDialog } from './duplicate-finder-dialog';
import { cn } from '@/lib/utils';
import type { WatchlistItem } from '@/lib/types';

interface WatchlistHeaderProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  unwatchedMoviesCount: number;
  unwatchedSeriesCount: number;
  watchedCount: number;
  watchedSearchTerm: string;
  setWatchedSearchTerm: (value: string) => void;
  watchedSort: string;
  setWatchedSort: (value: string) => void;
  items: WatchlistItem[];
  onAddItem: (itemData: any) => Promise<void>;
  onQuickAdd: (items: any[]) => Promise<void>;
  handleDeleteItem: (id: string) => Promise<void>;
  setIsResetDialogOpen: (open: boolean) => void;
}

export function WatchlistHeader({
  activeTab,
  setActiveTab,
  unwatchedMoviesCount,
  unwatchedSeriesCount,
  watchedCount,
  watchedSearchTerm,
  setWatchedSearchTerm,
  watchedSort,
  setWatchedSort,
  items,
  onAddItem,
  onQuickAdd,
  handleDeleteItem,
  setIsResetDialogOpen,
}: WatchlistHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
      <TabsList className='grid w-full grid-cols-3 lg:inline-flex lg:w-auto'>
        <TabsTrigger value="movies">Movies ({unwatchedMoviesCount})</TabsTrigger>
        <TabsTrigger value="series">Series ({unwatchedSeriesCount})</TabsTrigger>
        <TabsTrigger value="watched">Watched ({watchedCount})</TabsTrigger>
      </TabsList>

      <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
        <div className={cn("flex-1 w-full", activeTab !== 'watched' && 'hidden')}>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search watched list..."
              className="w-full sm:w-64 pl-9"
              value={watchedSearchTerm}
              onChange={(e) => setWatchedSearchTerm(e.target.value)}
            />
            {watchedSearchTerm && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setWatchedSearchTerm('')}>
                <ClearIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className='flex gap-2 w-full sm:w-auto'>
          <div className={cn('flex flex-1 sm:flex-auto', activeTab === 'watched' ? 'hidden' : 'flex')}>
            <AddItemDialog onAddItem={onAddItem}>
              <Button className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </AddItemDialog>
          </div>
          <div className={cn("hidden", activeTab === 'watched' ? 'flex w-full sm:w-auto gap-2' : 'hidden')}>
            <Select value={watchedSort} onValueChange={setWatchedSort}>
              <SelectTrigger className='w-full sm:w-auto'>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Sort by</SelectLabel>
                  <SelectItem value="watchedAt_desc">Watched Date (Newest)</SelectItem>
                  <SelectItem value="watchedAt_asc">Watched Date (Oldest)</SelectItem>
                  <SelectItem value="title_asc">Title (A-Z)</SelectItem>
                  <SelectItem value="title_desc">Title (Z-A)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <QuickAddDialog onQuickAdd={onQuickAdd} />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className='shrink-0'>
                <MoreVertical className="h-4 w-4" />
                <span className='sr-only'>More Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DuplicateFinderDialog allItems={items} onDeleteItem={handleDeleteItem} trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}><Search className="mr-2 h-4 w-4" />Find Duplicates</DropdownMenuItem>} />
              <div className={cn(activeTab === 'watched' ? 'flex flex-col' : 'hidden')}>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setIsResetDialogOpen(true)} className="text-red-500 focus:text-red-500">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete All Watched</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
