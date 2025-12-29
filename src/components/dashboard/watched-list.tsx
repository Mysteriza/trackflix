"use client";

import { cn } from '@/lib/utils';
import { WatchedItemCard } from './watched-item-card';
import { PaginationControls } from './pagination-controls';
import type { WatchlistItem } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';

export interface WatchedListProps {
  list: WatchlistItem[];
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  allItems: WatchlistItem[];
  selectedItemIds: string[];
  handleToggleSelectItem: (id: string) => void;
  draggedItem: WatchlistItem | null;
  dragOverItem: WatchlistItem | null;
  handleUpdateItem: (id: string, updates: any) => Promise<void>;
  handleDeleteItem: (id: string) => Promise<void>;
  handleUpdateWatched: (item: WatchlistItem, watched: boolean) => Promise<void>;
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, item: WatchlistItem) => void;
  handleDragEnter: (e: React.DragEvent<HTMLDivElement>, item: WatchlistItem) => void;
  handleDragEnd: () => Promise<void>;
}

export function WatchedList({
  list,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  allItems,
  selectedItemIds,
  handleToggleSelectItem,
  draggedItem,
  dragOverItem,
  handleUpdateItem,
  handleDeleteItem,
  handleUpdateWatched,
  handleDragStart,
  handleDragEnter,
  handleDragEnd,
}: WatchedListProps) {
  const isMobile = useIsMobile();
  const pageCount = Math.ceil(list.length / itemsPerPage);
  const paginatedList = list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {paginatedList.map((item) => (
          <div
            key={item.id}
            data-item-id={item.id}
            className={cn(
              "relative transition-all duration-300",
              !isMobile && dragOverItem?.id === item.id && "ring-2 ring-primary rounded-lg ring-offset-2 ring-offset-background"
            )}
          >
            <WatchedItemCard
              item={item}
              items={allItems}
              isDragging={!isMobile && draggedItem?.id === item.id}
              isSelected={selectedItemIds.includes(item.id)}
              isSelectionMode={selectedItemIds.length > 0}
              onToggleSelect={handleToggleSelectItem}
              onUpdate={handleUpdateItem}
              onDelete={handleDeleteItem}
              onUpdateWatched={handleUpdateWatched}
              handleDragStart={handleDragStart}
              handleDragEnter={handleDragEnter}
              handleDragEnd={handleDragEnd}
            />
          </div>
        ))}
      </div>
      {pageCount > 1 && (
        <PaginationControls
          currentPage={currentPage}
          pageCount={pageCount}
          onPageChange={onPageChange}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={onItemsPerPageChange}
          itemsPerPageOptions={[25, 50, 100]}
        />
      )}
    </div>
  );
}
