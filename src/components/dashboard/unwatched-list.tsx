"use client";

import { cn } from '@/lib/utils';
import { WatchlistItemCard } from './watchlist-item';
import { PaginationControls } from './pagination-controls';
import type { WatchlistItem } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';

export interface UnwatchedListProps {
  list: WatchlistItem[];
  isPaginated?: boolean;
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

export function UnwatchedList({
  list,
  isPaginated = true,
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
}: UnwatchedListProps) {
  const isMobile = useIsMobile();

  if (list.length === 0) {
    return <p className="text-muted-foreground px-4 text-sm sm:text-base">Nothing to watch here!</p>;
  }

  const pageCount = isPaginated ? Math.ceil(list.length / itemsPerPage) : 1;
  const startIndex = isPaginated ? (currentPage - 1) * itemsPerPage : 0;
  const paginatedList = isPaginated
    ? list.slice(startIndex, startIndex + itemsPerPage)
    : list;

  return (
    <div className="space-y-4">
      <div className="space-y-2 sm:space-y-3">
        {paginatedList.map((item, index) => (
          <div
            key={item.id}
            data-item-id={item.id}
            className={cn(
              "relative transition-all duration-300 flex items-center gap-2 sm:gap-4",
              !isMobile && dragOverItem?.id === item.id && "ring-2 ring-primary rounded-lg ring-offset-2 ring-offset-background"
            )}
          >
            <div className="flex-1">
              <WatchlistItemCard
                item={item}
                items={allItems}
                isSelected={selectedItemIds.includes(item.id)}
                onToggleSelect={handleToggleSelectItem}
                isDragging={!isMobile && draggedItem?.id === item.id}
                isFirst={startIndex + index === 0}
                isLast={startIndex + index === list.length - 1}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
                onUpdateWatched={handleUpdateWatched}
                handleDragStart={handleDragStart}
                handleDragEnter={handleDragEnter}
                handleDragEnd={handleDragEnd}
                index={startIndex + index}
              />
            </div>
          </div>
        ))}
      </div>
      {isPaginated && pageCount > 1 && (
        <PaginationControls
          currentPage={currentPage}
          pageCount={pageCount}
          onPageChange={onPageChange}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={onItemsPerPageChange}
          itemsPerPageOptions={[10, 25, 50]}
        />
      )}
    </div>
  );
}
