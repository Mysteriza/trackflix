"use client";

import { Folder } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FolderMenu } from './folder-menu';
import { PaginationControls } from './pagination-controls';
import { cn, chunk } from '@/lib/utils';
import type { WatchlistItem, WatchlistFolder } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { JSX } from 'react';

interface FolderGridProps {
  visibleFolders: WatchlistFolder[];
  itemsByFolder: Record<string, WatchlistItem[]>;
  allFolders: WatchlistFolder[];
  openFolderId: string | null;
  setOpenFolderId: (id: string | null | ((prev: string|null) => string|null)) => void;
  columns: number;
  folderCurrentPage: number;
  foldersPerPage: number;
  onFolderPageChange: (page: number) => void;
  onFoldersPerPageChange: (count: number) => void;
  activeTab: string;
  watchedTypeFilter: string;
  draggedItem: WatchlistItem | null;
  dragOverFolderId: string | null;
  handleDragOverFolder: (e: React.DragEvent<HTMLDivElement>, folderId: string | null) => void;
  handleDragEnd: () => Promise<void>;
  handleEditFolder: (id: string, name: string) => Promise<void>;
  handleDeleteFolder: (id: string) => Promise<void>;
  handleSelectAllInFolder: (folderItems: WatchlistItem[], checked: boolean) => void;
  getIsAllInFolderSelected: (folderItems: WatchlistItem[]) => boolean;
  listRenderer: (items: WatchlistItem[]) => JSX.Element;
}

export function FolderGrid({
  visibleFolders,
  itemsByFolder,
  allFolders,
  openFolderId,
  setOpenFolderId,
  columns,
  folderCurrentPage,
  foldersPerPage,
  onFolderPageChange,
  onFoldersPerPageChange,
  activeTab,
  watchedTypeFilter,
  draggedItem,
  dragOverFolderId,
  handleDragOverFolder,
  handleDragEnd,
  handleEditFolder,
  handleDeleteFolder,
  handleSelectAllInFolder,
  getIsAllInFolderSelected,
  listRenderer,
}: FolderGridProps) {
  const isMobile = useIsMobile();
  const pageCount = Math.ceil(visibleFolders.length / foldersPerPage);
  const paginatedFolders = visibleFolders.slice(
    (folderCurrentPage - 1) * foldersPerPage,
    folderCurrentPage * foldersPerPage
  );

  const folderRows = chunk(paginatedFolders, columns);
  const openFolderDetails = openFolderId 
    ? { 
        folder: allFolders.find(f => f.id === openFolderId), 
        items: itemsByFolder[openFolderId] || [] 
      } 
    : null;

  return (
    <div className="space-y-4">
      {folderRows.map((row, rowIndex) => {
        const isRowContainingOpenFolder = row.some(folder => folder.id === openFolderId);
        return (
          <div key={rowIndex}>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {row.map((folder) => {
                const folderItems = itemsByFolder[folder.id] || [];
                const isDropTarget = !isMobile && draggedItem && draggedItem.folderId !== folder.id && dragOverFolderId === folder.id;
                const filteredFolderItems = activeTab === 'watched' && watchedTypeFilter !== 'all'
                  ? folderItems.filter(item => item.type === watchedTypeFilter)
                  : folderItems;
                const displayItemCount = filteredFolderItems.length;

                return (
                  <Card
                    key={folder.id}
                    data-folder-id={folder.id}
                    onDragEnter={(e) => handleDragOverFolder(e, folder.id)}
                    onDragLeave={() => {}} 
                    onDrop={handleDragEnd}
                    className={cn(
                      "transition-all duration-300 w-full flex flex-col h-full",
                      isDropTarget && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      openFolderId === folder.id && "border-primary bg-primary/10"
                    )}
                  >
                    <CardContent 
                        className="p-3 sm:p-4 flex-1 w-full flex items-center justify-between gap-2 cursor-pointer hover:opacity-80"
                        onClick={() => setOpenFolderId(prev => prev === folder.id ? null : folder.id)}
                    >
                      <div className='flex items-center gap-4 text-left min-w-0 flex-1'>
                        <Folder className="h-8 w-8 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm sm:text-base break-words">{folder.name}</p>
                          <p className="text-xs text-muted-foreground">{displayItemCount} items</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {isRowContainingOpenFolder && openFolderDetails && (
              <div className="mt-4 border rounded-lg px-4 py-6 bg-card">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold">{openFolderDetails.folder?.name}</h3>
                    {openFolderDetails.folder && (
                      <FolderMenu 
                        folder={openFolderDetails.folder} 
                        allFolders={allFolders} 
                        onEdit={handleEditFolder} 
                        onDelete={handleDeleteFolder} 
                      />
                    )}
                  </div>
                  <div className='pl-2 flex items-center gap-4'>
                    {openFolderDetails.items.length > 1 ? (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`select-all-${openFolderDetails.folder?.id}`}
                          onCheckedChange={(checked) => handleSelectAllInFolder(openFolderDetails.items, Boolean(checked))}
                          checked={getIsAllInFolderSelected(openFolderDetails.items)}
                        />
                        <Label htmlFor={`select-all-${openFolderDetails.folder?.id}`} className='text-sm'>Select All</Label>
                      </div>
                    ) : null}
                  </div>
                </div>
                {listRenderer(openFolderDetails.items)}
              </div>
            )}
          </div>
        );
      })}

      {pageCount > 1 && (
        <PaginationControls
          currentPage={folderCurrentPage}
          pageCount={pageCount}
          onPageChange={onFolderPageChange}
          itemsPerPage={foldersPerPage}
          onItemsPerPageChange={onFoldersPerPageChange}
          itemsPerPageOptions={[25, 50, 100]}
        />
      )}
    </div>
  );
}
