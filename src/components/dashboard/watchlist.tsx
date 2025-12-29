"use client";

import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { BulkActionBar } from './bulk-action-bar';
import { WatchlistHeader } from './watchlist-header';
import { UnwatchedList } from './unwatched-list';
import { WatchedList } from './watched-list';
import { useWatchlist } from '@/hooks/use-watchlist';
import { cn } from '@/lib/utils';

export function Watchlist() {
  const {
    items,
    dataLoading,
    activeTab,
    setActiveTab,
    draggedItem,
    dragOverItem,
    watchedSearchTerm,
    setWatchedSearchTerm,
    watchedSort,
    setWatchedSort,
    watchedTypeFilter,
    setWatchedTypeFilter,
    selectedItemIds,
    setSelectedItemIds,
    unwatchedCurrentPage,
    setUnwatchedCurrentPage,
    unwatchedItemsPerPage,
    setUnwatchedItemsPerPage,
    watchedCurrentPage,
    setWatchedCurrentPage,
    watchedItemsPerPage,
    setWatchedItemsPerPage,
    isResetDialogOpen,
    setIsResetDialogOpen,
    unwatchedMovies,
    unwatchedSeries,
    watchedItems,
    searchedWatchedResults,
    handleUpdateItem,
    handleUpdateWatched,
    handleAddItem,
    handleQuickAdd,
    handleDeleteItem,
    handleBulkDelete,
    handleDeleteAllWatched,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    handleToggleSelectItem,
    handleSelectAll,
    getIsAllStandaloneSelected,
  } = useWatchlist();

  const renderUnwatched = () => {
    const currentList = activeTab === 'movies' ? unwatchedMovies : unwatchedSeries;
    const typeName = activeTab.slice(0, -1);

    if (currentList.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-12">
          <p>Your {typeName} list is empty.</p>
          <p>Click "Add Item" to get started.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{activeTab === 'movies' ? 'Movies' : 'Series'} ({currentList.length})</h2>
          {currentList.length > 1 && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                checked={getIsAllStandaloneSelected()}
              />
              <Label htmlFor="select-all" className='text-sm'>Select All</Label>
            </div>
          )}
        </div>
        <UnwatchedList
          list={currentList}
          currentPage={unwatchedCurrentPage}
          itemsPerPage={unwatchedItemsPerPage}
          onPageChange={setUnwatchedCurrentPage}
          onItemsPerPageChange={setUnwatchedItemsPerPage}
          allItems={items}
          selectedItemIds={selectedItemIds}
          handleToggleSelectItem={handleToggleSelectItem}
          draggedItem={draggedItem}
          dragOverItem={dragOverItem}
          handleUpdateItem={handleUpdateItem}
          handleDeleteItem={handleDeleteItem}
          handleUpdateWatched={handleUpdateWatched}
          handleDragStart={handleDragStart}
          handleDragEnter={handleDragEnter}
          handleDragEnd={handleDragEnd}
        />
      </div>
    );
  };

  const renderWatched = () => {
    const { searchedItems, isSearching } = searchedWatchedResults;
    const allWatchedItems = items.filter(item => item.watched);
    const watchedMoviesCount = allWatchedItems.filter(item => item.type === 'movie').length;
    const watchedSeriesCount = allWatchedItems.filter(item => item.type === 'series').length;
    const totalWatched = allWatchedItems.length;

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

    if (isSearching) {
      if (searchedItems.length === 0) {
        return (
          <>
            {renderFilterButtons()}
            <p className="text-center text-muted-foreground py-10">No results for "{watchedSearchTerm}" {watchedTypeFilter !== 'all' ? ` in ${watchedTypeFilter}s` : ''}</p>
          </>
        );
      }
      return (
        <div className="space-y-6">
          {renderFilterButtons()}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Search Results ({searchedItems.length})</h2>
          </div>
          <WatchedList
            list={searchedItems}
            currentPage={1}
            itemsPerPage={searchedItems.length}
            onPageChange={() => {}}
            onItemsPerPageChange={() => {}}
            allItems={items}
            selectedItemIds={selectedItemIds}
            handleToggleSelectItem={handleToggleSelectItem}
            draggedItem={draggedItem}
            dragOverItem={dragOverItem}
            handleUpdateItem={handleUpdateItem}
            handleDeleteItem={handleDeleteItem}
            handleUpdateWatched={handleUpdateWatched}
            handleDragStart={handleDragStart}
            handleDragEnter={handleDragEnter}
            handleDragEnd={handleDragEnd}
          />
        </div>
      );
    }

    if (watchedItems.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-12">
          {renderFilterButtons()}
          <p>Your watched list {watchedTypeFilter !== 'all' ? `for ${watchedTypeFilter}s ` : ''}is empty.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {renderFilterButtons()}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Watched ({watchedItems.length})</h2>
          {watchedItems.length > 1 && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all-watched"
                onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                checked={getIsAllStandaloneSelected()}
              />
              <Label htmlFor="select-all-watched" className='text-sm'>Select All</Label>
            </div>
          )}
        </div>
        <WatchedList
          list={watchedItems}
          currentPage={watchedCurrentPage}
          itemsPerPage={watchedItemsPerPage}
          onPageChange={setWatchedCurrentPage}
          onItemsPerPageChange={setWatchedItemsPerPage}
          allItems={items}
          selectedItemIds={selectedItemIds}
          handleToggleSelectItem={handleToggleSelectItem}
          draggedItem={draggedItem}
          dragOverItem={dragOverItem}
          handleUpdateItem={handleUpdateItem}
          handleDeleteItem={handleDeleteItem}
          handleUpdateWatched={handleUpdateWatched}
          handleDragStart={handleDragStart}
          handleDragEnter={handleDragEnter}
          handleDragEnd={handleDragEnd}
        />
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
      return renderWatched();
    }

    return renderUnwatched();
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
          items={items}
          onAddItem={handleAddItem}
          onQuickAdd={handleQuickAdd}
          handleDeleteItem={handleDeleteItem}
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

      <BulkActionBar
        selectedCount={selectedItemIds.length}
        items={items}
        activeTab={activeTab as 'movies' | 'series' | 'watched'}
        selectedItemIds={selectedItemIds}
        onClear={() => setSelectedItemIds([])}
        onDelete={handleBulkDelete}
      />
    </>
  );
}