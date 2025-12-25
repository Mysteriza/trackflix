"use client";

import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { BulkActionBar } from './bulk-action-bar';
import { WatchlistHeader } from './watchlist-header';
import { UnwatchedList } from './unwatched-list';
import { WatchedList } from './watched-list';
import { FolderGrid } from './folder-grid';
import { useWatchlist } from '@/hooks/use-watchlist';
import { cn } from '@/lib/utils';
import type { WatchlistItem } from '@/lib/types';

export function Watchlist() {
  const {
    items,
    folders,
    dataLoading,
    activeTab,
    setActiveTab,
    draggedItem,
    dragOverItem,
    dragOverFolderId,
    setDragOverFolderId,
    openFolderId,
    setOpenFolderId,
    watchedSearchTerm,
    setWatchedSearchTerm,
    watchedSort,
    setWatchedSort,
    watchedTypeFilter,
    setWatchedTypeFilter,
    selectedItemIds,
    setSelectedItemIds,
    columns,
    unwatchedCurrentPage,
    setUnwatchedCurrentPage,
    unwatchedItemsPerPage,
    setUnwatchedItemsPerPage,
    watchedCurrentPage,
    setWatchedCurrentPage,
    watchedItemsPerPage,
    setWatchedItemsPerPage,
    folderCurrentPage,
    setFolderCurrentPage,
    foldersPerPage,
    setFoldersPerPage,
    importWatchedInputRef,
    isResetDialogOpen,
    setIsResetDialogOpen,
    unwatchedMovies,
    unwatchedSeries,
    watchedItems,
    searchedWatchedResults,
    itemsCountMap,
    getCategorizedItems,
    handleUpdateItem,
    handleUpdateWatched,
    handleAddItem,
    handleQuickAdd,
    handleAddFolder,
    handleEditFolder,
    handleDeleteFolder,
    handleBulkDeleteFolders,
    handleDeleteItem,
    handleBulkDelete,
    handleDeleteAllWatched,
    handleExportWatched,
    handleImportWatched,
    handleMoveToFolder,
    handleMoveItem,
    handleDragStart,
    handleDragEnter,
    handleDragOverFolder,
    handleDragEnd,
    handleBulkMove,
    handleDragOver,
    handleToggleSelectItem,
    handleSelectAll,
    handleSelectAllInFolder,
    getIsAllStandaloneSelected,
    getIsAllInFolderSelected,
    cleanUpDrag,
    stopAutoScroll
  } = useWatchlist();

  const renderCategorizedUnwatched = () => {
    const currentList = activeTab === 'movies' ? unwatchedMovies : unwatchedSeries;
    const { standalone, byFolder } = getCategorizedItems(currentList);

    const currentTabType = activeTab === 'movies' ? 'movie' : 'series';
    const visibleFolders = folders.filter(folder => {
      const folderItems = byFolder[folder.id] || [];
      return folderItems.length > 0 && folderItems.every(item => item.type === currentTabType && !item.watched);
    });

    const hasStandaloneContent = standalone.length > 0;
    const typeName = activeTab.slice(0, -1);

    if (!hasStandaloneContent && visibleFolders.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-12">
          <p>Your {typeName} list is empty.</p>
          <p>Click "Add {typeName.charAt(0).toUpperCase() + typeName.slice(1)}" to get started.</p>
        </div>
      );
    }

    return (
      <div
        className="space-y-10"
        onDragOver={handleDragOver}
        onDragLeave={stopAutoScroll}
        onMouseUp={cleanUpDrag}
        onTouchEnd={cleanUpDrag}
      >
        {visibleFolders.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Folders ({visibleFolders.length})</h2>
            <FolderGrid
              visibleFolders={visibleFolders}
              itemsByFolder={byFolder}
              allFolders={folders}
              openFolderId={openFolderId}
              setOpenFolderId={setOpenFolderId}
              columns={columns}
              folderCurrentPage={folderCurrentPage}
              foldersPerPage={foldersPerPage}
              onFolderPageChange={setFolderCurrentPage}
              onFoldersPerPageChange={setFoldersPerPage}
              activeTab={activeTab}
              watchedTypeFilter={watchedTypeFilter}
              draggedItem={draggedItem}
              dragOverFolderId={dragOverFolderId}
              handleDragOverFolder={handleDragOverFolder}
              handleDragEnd={handleDragEnd}
              handleEditFolder={handleEditFolder}
              handleDeleteFolder={handleDeleteFolder}
              handleSelectAllInFolder={handleSelectAllInFolder}
              getIsAllInFolderSelected={getIsAllInFolderSelected}
              listRenderer={(items) => (
                <UnwatchedList
                  list={items}
                  isPaginated={false}
                  currentPage={1}
                  itemsPerPage={items.length}
                  onPageChange={() => {}}
                  onItemsPerPageChange={() => {}}
                  folders={folders}
                  allItems={items}
                  selectedItemIds={selectedItemIds}
                  handleToggleSelectItem={handleToggleSelectItem}
                  draggedItem={draggedItem}
                  dragOverItem={dragOverItem}
                  handleUpdateItem={handleUpdateItem}
                  handleDeleteItem={handleDeleteItem}
                  handleUpdateWatched={handleUpdateWatched}
                  handleMoveToFolder={handleMoveToFolder}
                  handleMoveItem={handleMoveItem}
                  handleDragStart={handleDragStart}
                  handleDragEnter={handleDragEnter}
                  handleDragEnd={handleDragEnd}
                />
              )}
            />
          </div>
        )}

        {hasStandaloneContent && (
          <div
            onDragEnter={(e) => handleDragOverFolder(e, null)}
            onDragLeave={() => setDragOverFolderId(null)}
            onDrop={handleDragEnd}
            data-folder-id="standalone"
            className={cn(
              "p-2 rounded-lg transition-all duration-300",
              draggedItem && dragOverFolderId === null && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
          >
            {visibleFolders.length > 0 && hasStandaloneContent && <Separator className="my-10" />}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Standalone ({standalone.length})</h2>
              {standalone.length > 1 && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-standalone"
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    checked={getIsAllStandaloneSelected()}
                  />
                  <Label htmlFor="select-all-standalone" className='text-sm'>Select All</Label>
                </div>
              )}
            </div>
            <UnwatchedList
              list={standalone}
              currentPage={unwatchedCurrentPage}
              itemsPerPage={unwatchedItemsPerPage}
              onPageChange={setUnwatchedCurrentPage}
              onItemsPerPageChange={setUnwatchedItemsPerPage}
              folders={folders}
              allItems={items}
              selectedItemIds={selectedItemIds}
              handleToggleSelectItem={handleToggleSelectItem}
              draggedItem={draggedItem}
              dragOverItem={dragOverItem}
              handleUpdateItem={handleUpdateItem}
              handleDeleteItem={handleDeleteItem}
              handleUpdateWatched={handleUpdateWatched}
              handleMoveToFolder={handleMoveToFolder}
              handleMoveItem={handleMoveItem}
              handleDragStart={handleDragStart}
              handleDragEnter={handleDragEnter}
              handleDragEnd={handleDragEnd}
            />
          </div>
        )}
      </div>
    );
  };

  const renderCategorizedWatched = () => {
    const { searchedFolders, searchedItems, isSearching } = searchedWatchedResults;
    const allWatchedItemsUnfiltered = items.filter(item => item.watched);
    const watchedMoviesCount = allWatchedItemsUnfiltered.filter(item => item.type === 'movie').length;
    const watchedSeriesCount = allWatchedItemsUnfiltered.filter(item => item.type === 'series').length;
    const totalWatched = allWatchedItemsUnfiltered.length;

    const renderFilterButtons = () => (
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant={watchedTypeFilter === 'all' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setWatchedTypeFilter('all')}
          className="h-8 px-3"
        >
          Total: {totalWatched}
        </Button>
        <Button
          variant={watchedTypeFilter === 'movie' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setWatchedTypeFilter('movie')}
          className="h-8 px-3"
        >
          Movies: {watchedMoviesCount}
        </Button>
        <Button
          variant={watchedTypeFilter === 'series' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setWatchedTypeFilter('series')}
          className="h-8 px-3"
        >
          Series: {watchedSeriesCount}
        </Button>
      </div>
    );

    const handleSelectAllSearchResults = (checked: boolean) => {
      const allSearchItemIds = new Set<string>();
      searchedItems.forEach(item => allSearchItemIds.add(item.id));
      searchedFolders.forEach(folder => {
        const itemsInFolder = items.filter(item =>
          item.folderId === folder.id &&
          item.watched &&
          (watchedTypeFilter === 'all' || item.type === watchedTypeFilter)
        );
        itemsInFolder.forEach(item => allSearchItemIds.add(item.id));
      });

      if (checked) {
        setSelectedItemIds(prev => Array.from(new Set([...prev, ...allSearchItemIds])));
      } else {
        setSelectedItemIds(prev => prev.filter(id => !allSearchItemIds.has(id)));
      }
    };

    const getIsAllSearchResultsSelected = () => {
      const allSearchItemIds = new Set<string>();
      searchedItems.forEach(item => allSearchItemIds.add(item.id));
      searchedFolders.forEach(folder => {
        const itemsInFolder = items.filter(item =>
          item.folderId === folder.id &&
          item.watched &&
          (watchedTypeFilter === 'all' || item.type === watchedTypeFilter)
        );
        itemsInFolder.forEach(item => allSearchItemIds.add(item.id));
      });
      if (allSearchItemIds.size === 0) return false;
      return Array.from(allSearchItemIds).every(id => selectedItemIds.includes(id));
    };

    if (isSearching) {
      if (searchedFolders.length === 0 && searchedItems.length === 0) {
        return (
          <>
            {renderFilterButtons()}
            <p className="text-center text-muted-foreground py-10">No results for "{watchedSearchTerm}" {watchedTypeFilter !== 'all' ? ` in ${watchedTypeFilter}s` : ''}</p>
          </>
        );
      }
      return (
        <div className="space-y-8">
          {renderFilterButtons()}
          {(searchedFolders.length > 0 || searchedItems.length > 0) && (
            <div className="flex justify-end">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all-search"
                  onCheckedChange={(checked) => handleSelectAllSearchResults(Boolean(checked))}
                  checked={getIsAllSearchResultsSelected()}
                />
                <Label htmlFor="select-all-search" className='text-sm'>Select All Results</Label>
              </div>
            </div>
          )}
          {searchedFolders.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Folders ({searchedFolders.length})</h2>
              <FolderGrid
                visibleFolders={searchedFolders}
                itemsByFolder={getCategorizedItems(items.filter(i => i.watched)).byFolder}
                allFolders={folders}
                openFolderId={openFolderId}
                setOpenFolderId={setOpenFolderId}
                columns={columns}
                folderCurrentPage={1}
                foldersPerPage={searchedFolders.length}
                onFolderPageChange={() => {}}
                onFoldersPerPageChange={() => {}}
                activeTab={activeTab}
                watchedTypeFilter={watchedTypeFilter}
                draggedItem={draggedItem}
                dragOverFolderId={dragOverFolderId}
                handleDragOverFolder={handleDragOverFolder}
                handleDragEnd={handleDragEnd}
                handleEditFolder={handleEditFolder}
                handleDeleteFolder={handleDeleteFolder}
                handleSelectAllInFolder={handleSelectAllInFolder}
                getIsAllInFolderSelected={getIsAllInFolderSelected}
                listRenderer={(itemsInFolder) => (
                  <WatchedList
                    list={itemsInFolder.filter(item => (watchedTypeFilter === 'all' || item.type === watchedTypeFilter))}
                    currentPage={1}
                    itemsPerPage={itemsInFolder.length}
                    onPageChange={() => {}}
                    onItemsPerPageChange={() => {}}
                    folders={folders}
                    allItems={items}
                    selectedItemIds={selectedItemIds}
                    handleToggleSelectItem={handleToggleSelectItem}
                    draggedItem={draggedItem}
                    dragOverItem={dragOverItem}
                    handleUpdateItem={handleUpdateItem}
                    handleDeleteItem={handleDeleteItem}
                    handleUpdateWatched={handleUpdateWatched}
                    handleMoveToFolder={handleMoveToFolder}
                    handleDragStart={handleDragStart}
                    handleDragEnter={handleDragEnter}
                    handleDragEnd={handleDragEnd}
                  />
                )}
              />
            </div>
          )}

          {searchedItems.length > 0 && (
            <div>
              {searchedFolders.length > 0 && <Separator className="my-8" />}
              <h2 className="text-2xl font-bold mb-6">Movies & Series ({searchedItems.length})</h2>
              <WatchedList
                list={searchedItems}
                currentPage={1}
                itemsPerPage={searchedItems.length}
                onPageChange={() => {}}
                onItemsPerPageChange={() => {}}
                folders={folders}
                allItems={items}
                selectedItemIds={selectedItemIds}
                handleToggleSelectItem={handleToggleSelectItem}
                draggedItem={draggedItem}
                dragOverItem={dragOverItem}
                handleUpdateItem={handleUpdateItem}
                handleDeleteItem={handleDeleteItem}
                handleUpdateWatched={handleUpdateWatched}
                handleMoveToFolder={handleMoveToFolder}
                handleDragStart={handleDragStart}
                handleDragEnter={handleDragEnter}
                handleDragEnd={handleDragEnd}
              />
            </div>
          )}
        </div>
      );
    }

    const { standalone, byFolder } = getCategorizedItems(watchedItems);
    const visibleFoldersFiltered = folders.filter(folder => (byFolder[folder.id] || []).length > 0);

    if (standalone.length === 0 && visibleFoldersFiltered.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-12">
          {renderFilterButtons()}
          <p>Your watched list {watchedTypeFilter !== 'all' ? `for ${watchedTypeFilter}s ` : ''}is empty.</p>
        </div>
      );
    }

    return (
      <div
        className="space-y-8"
        onDragOver={handleDragOver}
        onDragLeave={stopAutoScroll}
        onMouseUp={cleanUpDrag}
        onTouchEnd={cleanUpDrag}
      >
        {renderFilterButtons()}
        {visibleFoldersFiltered.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Folders ({visibleFoldersFiltered.length})</h2>
            <FolderGrid
              visibleFolders={visibleFoldersFiltered}
              itemsByFolder={byFolder}
              allFolders={folders}
              openFolderId={openFolderId}
              setOpenFolderId={setOpenFolderId}
              columns={columns}
              folderCurrentPage={folderCurrentPage}
              foldersPerPage={foldersPerPage}
              onFolderPageChange={setFolderCurrentPage}
              onFoldersPerPageChange={setFoldersPerPage}
              activeTab={activeTab}
              watchedTypeFilter={watchedTypeFilter}
              draggedItem={draggedItem}
              dragOverFolderId={dragOverFolderId}
              handleDragOverFolder={handleDragOverFolder}
              handleDragEnd={handleDragEnd}
              handleEditFolder={handleEditFolder}
              handleDeleteFolder={handleDeleteFolder}
              handleSelectAllInFolder={handleSelectAllInFolder}
              getIsAllInFolderSelected={getIsAllInFolderSelected}
              listRenderer={(itemsInFolder) => (
                <WatchedList
                  list={itemsInFolder}
                  currentPage={1}
                  itemsPerPage={itemsInFolder.length}
                  onPageChange={() => {}}
                  onItemsPerPageChange={() => {}}
                  folders={folders}
                  allItems={items}
                  selectedItemIds={selectedItemIds}
                  handleToggleSelectItem={handleToggleSelectItem}
                  draggedItem={draggedItem}
                  dragOverItem={dragOverItem}
                  handleUpdateItem={handleUpdateItem}
                  handleDeleteItem={handleDeleteItem}
                  handleUpdateWatched={handleUpdateWatched}
                  handleMoveToFolder={handleMoveToFolder}
                  handleDragStart={handleDragStart}
                  handleDragEnter={handleDragEnter}
                  handleDragEnd={handleDragEnd}
                />
              )}
            />
          </div>
        )}

        {standalone.length > 0 && (
          <div
            onDragEnter={(e) => handleDragOverFolder(e, null)}
            onDragLeave={() => setDragOverFolderId(null)}
            onDrop={handleDragEnd}
            data-folder-id="standalone"
            className={cn("p-2 rounded-lg transition-all duration-300", draggedItem && dragOverFolderId === null && "ring-2 ring-primary ring-offset-2 ring-offset-background")}
          >
            {visibleFoldersFiltered.length > 0 && <Separator className="my-8" />}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Standalone ({standalone.length})</h3>
              {standalone.length > 1 && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-watched-standalone"
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    checked={getIsAllStandaloneSelected()}
                    disabled={standalone.length === 0}
                  />
                  <Label htmlFor="select-all-watched-standalone" className='text-sm whitespace-nowrap'>Select All</Label>
                </div>
              )}
            </div>
            <WatchedList
              list={standalone}
              currentPage={watchedCurrentPage}
              itemsPerPage={watchedItemsPerPage}
              onPageChange={setWatchedCurrentPage}
              onItemsPerPageChange={setWatchedItemsPerPage}
              folders={folders}
              allItems={items}
              selectedItemIds={selectedItemIds}
              handleToggleSelectItem={handleToggleSelectItem}
              draggedItem={draggedItem}
              dragOverItem={dragOverItem}
              handleUpdateItem={handleUpdateItem}
              handleDeleteItem={handleDeleteItem}
              handleUpdateWatched={handleUpdateWatched}
              handleMoveToFolder={handleMoveToFolder}
              handleDragStart={handleDragStart}
              handleDragEnter={handleDragEnter}
              handleDragEnd={handleDragEnd}
            />
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (dataLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      );
    }

    if (activeTab === 'watched') {
      return renderCategorizedWatched();
    }

    return renderCategorizedUnwatched();
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <WatchlistHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unwatchedMoviesCount={unwatchedMovies.length}
          unwatchedSeriesCount={unwatchedSeries.length}
          watchedCount={items.filter(i => i.watched).length}
          watchedSearchTerm={watchedSearchTerm}
          setWatchedSearchTerm={setWatchedSearchTerm}
          watchedSort={watchedSort}
          setWatchedSort={setWatchedSort}
          folders={folders}
          items={items}
          itemsCountMap={itemsCountMap}
          onAddItem={handleAddItem}
          onAddFolder={handleAddFolder}
          onQuickAdd={handleQuickAdd}
          handleEditFolder={handleEditFolder}
          handleDeleteFolder={handleDeleteFolder}
          handleBulkDeleteFolders={handleBulkDeleteFolders}
          handleDeleteItem={handleDeleteItem}
          handleExportWatched={handleExportWatched}
          importWatchedInputRef={importWatchedInputRef}
          setIsResetDialogOpen={setIsResetDialogOpen}
        />

        <TabsContent value="movies">{renderContent()}</TabsContent>
        <TabsContent value="series">{renderContent()}</TabsContent>
        <TabsContent value="watched">{renderContent()}</TabsContent>
      </Tabs>

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all items from your watched list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllWatched} className={cn(buttonVariants({ variant: "destructive" }))}>
              Yes, delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <input
        type="file"
        ref={importWatchedInputRef}
        className="hidden"
        accept="application/json"
        onChange={handleImportWatched}
      />

      <BulkActionBar
        selectedCount={selectedItemIds.length}
        folders={folders}
        items={items}
        activeTab={activeTab as 'movies' | 'series' | 'watched'}
        selectedItemIds={selectedItemIds}
        onClear={() => setSelectedItemIds([])}
        onMove={handleBulkMove}
        onDelete={handleBulkDelete}
      />
    </>
  );
}