"use client";

import { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  deleteField
} from 'firebase/firestore';
import type { WatchlistItem, QuickAddItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

export type WatchedFilterType = 'all' | 'movie' | 'series';

export function useWatchlist() {
  const [user, loading] = useAuthState(auth);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('movies');

  const [draggedItem, setDraggedItem] = useState<WatchlistItem | null>(null);
  const [dragOverItem, setDragOverItem] = useState<WatchlistItem | null>(null);

  const [watchedSearchTerm, setWatchedSearchTerm] = useState('');
  const [watchedSort, setWatchedSort] = useState('watchedAt_desc');
  const [watchedTypeFilter, setWatchedTypeFilter] = useState<WatchedFilterType>('all');

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [unwatchedCurrentPage, setUnwatchedCurrentPage] = useState(1);
  const [unwatchedItemsPerPage, setUnwatchedItemsPerPage] = useState(10);
  const [watchedCurrentPage, setWatchedCurrentPage] = useState(1);
  const [watchedItemsPerPage, setWatchedItemsPerPage] = useState(25);

  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const unwatchedMovies = useMemo(() => 
    items.filter(item => item.type === 'movie' && !item.watched).sort((a, b) => a.order - b.order), 
    [items]
  );
  
  const unwatchedSeries = useMemo(() => 
    items.filter(item => item.type === 'series' && !item.watched).sort((a, b) => a.order - b.order), 
    [items]
  );

  const watchedItems = useMemo(() => {
    const allWatched = items.filter(item => item.watched);
    const filteredByType = watchedTypeFilter === 'all'
      ? allWatched
      : allWatched.filter(item => item.type === watchedTypeFilter);

    return filteredByType.sort((a, b) => {
      switch (watchedSort) {
        case 'watchedAt_asc':
          return (a.watchedAt || 0) - (b.watchedAt || 0);
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        case 'watchedAt_desc':
        default:
          return (b.watchedAt || 0) - (a.watchedAt || 0);
      }
    });
  }, [items, watchedSort, watchedTypeFilter]);

  const deferredWatchedSearchTerm = useDeferredValue(watchedSearchTerm);

  const searchedWatchedResults = useMemo(() => {
    if (!deferredWatchedSearchTerm) {
      return { searchedItems: watchedItems, isSearching: false };
    }
    const lowercasedTerm = deferredWatchedSearchTerm.toLowerCase();
    const searchedItems = watchedItems.filter(item =>
      item.title.toLowerCase().includes(lowercasedTerm)
    );
    return { searchedItems, isSearching: true };
  }, [deferredWatchedSearchTerm, watchedItems]);

  useEffect(() => {
    if (user) {
      setDataLoading(true);
      const itemsQuery = query(collection(db, 'watchlist'), where('userId', '==', user.uid));

      const unsubscribeItems = onSnapshot(itemsQuery, (querySnapshot) => {
        const watchlistItems: WatchlistItem[] = [];
        querySnapshot.forEach((doc) => {
          watchlistItems.push({ id: doc.id, ...doc.data() } as WatchlistItem);
        });
        setItems(watchlistItems);
        setDataLoading(false);
      }, (error) => {
        console.error("Error fetching watchlist:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch watchlist items.",
        });
        setDataLoading(false);
      });

      return () => unsubscribeItems();
    } else if (!loading) {
      setItems([]);
      setDataLoading(false);
    }
  }, [user, loading, toast]);

  useEffect(() => {
    setUnwatchedCurrentPage(1);
    setSelectedItemIds([]);
    setWatchedTypeFilter('all');
    setWatchedSearchTerm('');
  }, [activeTab, unwatchedItemsPerPage]);

  useEffect(() => {
    setWatchedCurrentPage(1);
  }, [watchedSearchTerm, watchedSort, watchedItemsPerPage, watchedTypeFilter]);

  const handleUpdateItem = async (id: string, updates: Partial<Omit<WatchlistItem, 'id'>> | any) => {
    if (!user) return;
    const itemRef = doc(db, 'watchlist', id);
    try {
      await updateDoc(itemRef, updates);
    } catch(error) {
      console.error("Error updating item:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update the item.",
      });
    }
  };

  const handleUpdateWatched = async (item: WatchlistItem, watched: boolean) => {
    if (!user) return;
    const updates: Partial<WatchlistItem> = { watched };

    if (watched) {
      updates.watchedAt = Date.now();
      if (item.rating === undefined || item.rating === null) {
        updates.rating = null;
      }
    } else {
      updates.watchedAt = null;
      updates.notes = item.notes || '';
      (updates as any).rating = deleteField();

      const targetList = items.filter(i => !i.watched && i.type === item.type);
      const maxOrder = targetList.length > 0 ? Math.max(...targetList.map(i => i.order)) : 0;
      updates.order = maxOrder + 1;
    }

    await handleUpdateItem(item.id, updates);
    toast({
      title: watched ? "Moved to Watched" : "Moved to Watchlist",
      description: `"${item.title}" has been moved.`
    });
  };

  const handleAddItem = async (itemData: Omit<WatchlistItem, 'id' | 'order' | 'userId' | 'createdAt' | 'watchedAt' | 'normalizedTitle'>) => {
    if (!user) return;

    try {
      const list = itemData.watched
        ? items.filter(i => i.watched)
        : items.filter(i => i.type === itemData.type && !i.watched);

      const maxOrder = list.length > 0 ? Math.max(...list.map(i => i.order)) : 0;

      const newItem: Omit<WatchlistItem, 'id'> = {
        ...itemData,
        userId: user.uid,
        order: maxOrder + 1,
        createdAt: Date.now(),
        watched: itemData.watched,
        watchedAt: itemData.watched ? Date.now() : null,
        ...(itemData.watched ? { rating: null } : {}),
      };
      if (!itemData.watched) {
        delete (newItem as Partial<WatchlistItem>).rating;
      }

      await addDoc(collection(db, 'watchlist'), newItem);
      toast({
        title: "Item Added",
        description: `"${itemData.title}" has been added to your list.`
      });
    } catch (error) {
      console.error("Error adding item:", error);
      toast({
        variant: "destructive",
        title: "Add Failed",
        description: "Could not add the item to your list.",
      });
    }
  };

  const handleQuickAdd = async (quickAddItems: Omit<QuickAddItem, 'key'>[]) => {
    if (!user) return;

    const validItems = quickAddItems.filter(item => item.title.trim() !== '');
    if (validItems.length === 0) {
      toast({
        variant: "destructive",
        title: "No Items to Add",
        description: "Please enter at least one movie or series title.",
      });
      return;
    }

    try {
      const batch = writeBatch(db);
      const timestamp = Date.now();

      const watchedList = items.filter(i => i.watched);
      let maxOrder = watchedList.length > 0 ? Math.max(...watchedList.map(i => i.order)) : 0;

      validItems.forEach(item => {
        maxOrder++;
        const newItemRef = doc(collection(db, 'watchlist'));
        batch.set(newItemRef, {
          title: item.title.trim(),
          type: item.type,
          userId: user.uid,
          watched: true,
          isD21: false,
          order: maxOrder,
          createdAt: timestamp,
          watchedAt: timestamp,
          rating: null,
          notes: '',
        });
      });

      await batch.commit();
      toast({
        title: "Quick Add Successful",
        description: `${validItems.length} item(s) have been added to your watched list.`,
      });
    } catch (error) {
      console.error("Error during quick add:", error);
      toast({
        variant: "destructive",
        title: "Quick Add Failed",
        description: "Could not add the items to your list.",
      });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'watchlist', id));
      toast({
        title: "Item Deleted",
        description: "The item has been removed from your list."
      });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the item.",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedItemIds.length === 0) return;
    try {
      const batch = writeBatch(db);
      selectedItemIds.forEach(id => {
        const itemRef = doc(db, 'watchlist', id);
        batch.delete(itemRef);
      });
      await batch.commit();
      toast({
        title: "Items Deleted",
        description: `${selectedItemIds.length} item(s) have been removed.`,
      });
      setSelectedItemIds([]);
    } catch (error) {
      console.error("Error bulk deleting items:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the selected items.",
      });
    }
  };

  const handleDeleteAllWatched = async () => {
    if (!user) return;
    setIsResetDialogOpen(false);
    toast({ title: "Resetting Watched List...", description: "This may take a moment." });

    try {
      const batch = writeBatch(db);
      const q = query(collection(db, 'watchlist'), where('userId', '==', user.uid), where('watched', '==', true));
      const snapshot = await getDocs(q);

      if(snapshot.empty) {
        toast({ title: "Already Empty", description: "Your watched list is already empty." });
        return;
      }

      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      toast({ title: "Watched List Cleared", description: "All watched items have been deleted." });
    } catch (error) {
      console.error("Error deleting all watched items:", error);
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: "Could not clear your watched list.",
      });
    }
  };

  const reorderItems = async (list: WatchlistItem[]) => {
    const batch = writeBatch(db);
    list.forEach((item, index) => {
      const newOrder = index + 1;
      if (item.order !== newOrder) {
        const itemRef = doc(db, 'watchlist', item.id);
        batch.update(itemRef, { order: newOrder });
      }
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error("Failed to reorder items:", error);
      toast({
        variant: "destructive",
        title: "Reorder Failed",
        description: "Could not update the item order.",
      });
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: WatchlistItem) => {
    if (isMobile) return;
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, item: WatchlistItem) => {
    if (isMobile || !draggedItem || draggedItem.id === item.id) return;
    if (draggedItem.watched !== item.watched) return;
    if (!draggedItem.watched && (draggedItem.type !== item.type)) return;

    setDragOverItem(item);
  };

  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  const cleanUpDrag = useCallback(() => {
    stopAutoScroll();
    setDraggedItem(null);
    setDragOverItem(null);
  }, [stopAutoScroll]);

  const handleDragEnd = async () => {
    if (isMobile || !draggedItem) {
      cleanUpDrag();
      return;
    }

    if (dragOverItem && dragOverItem.id !== draggedItem.id) {
      const currentList = items
        .filter(i =>
          i.watched === draggedItem.watched &&
          (draggedItem.watched || i.type === draggedItem.type)
        )
        .sort((a, b) => a.order - b.order);

      const draggedIndex = currentList.findIndex(i => i.id === draggedItem.id);
      const targetIndex = currentList.findIndex(i => i.id === dragOverItem.id);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newList = [...currentList];
        const [movedItem] = newList.splice(draggedIndex, 1);
        newList.splice(targetIndex, 0, movedItem);
        await reorderItems(newList);
      }
    }

    cleanUpDrag();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isMobile || !draggedItem) return;

    const scrollThreshold = 80;
    const scrollSpeed = 10;
    const clientY = e.clientY;
    const viewportHeight = window.innerHeight;

    stopAutoScroll();

    if (clientY < scrollThreshold) {
      scrollIntervalRef.current = setInterval(() => {
        window.scrollBy(0, -scrollSpeed);
      }, 25);
    } else if (clientY > viewportHeight - scrollThreshold) {
      scrollIntervalRef.current = setInterval(() => {
        window.scrollBy(0, scrollSpeed);
      }, 25);
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    const isWatched = activeTab === 'watched';
    let visibleIds: string[];

    const currentUnwatchedList = activeTab === 'movies' ? unwatchedMovies : unwatchedSeries;

    if (isWatched) {
      const paginatedWatchedItems = watchedItems.slice(
        (watchedCurrentPage - 1) * watchedItemsPerPage, 
        watchedCurrentPage * watchedItemsPerPage
      );
      visibleIds = paginatedWatchedItems.map(item => item.id);
    } else {
      visibleIds = currentUnwatchedList
        .slice((unwatchedCurrentPage - 1) * unwatchedItemsPerPage, unwatchedCurrentPage * unwatchedItemsPerPage)
        .map(i => i.id);
    }

    if (checked) {
      setSelectedItemIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    } else {
      setSelectedItemIds(prev => prev.filter(id => !visibleIds.includes(id)));
    }
  };

  const getIsAllStandaloneSelected = () => {
    let visibleIds: string[];
    const currentUnwatchedList = activeTab === 'movies' ? unwatchedMovies : unwatchedSeries;

    if (activeTab === 'watched') {
      if (watchedItems.length === 0) return false;
      visibleIds = watchedItems
        .slice((watchedCurrentPage - 1) * watchedItemsPerPage, watchedCurrentPage * watchedItemsPerPage)
        .map(i => i.id);
    } else {
      if (currentUnwatchedList.length === 0) return false;
      visibleIds = currentUnwatchedList
        .slice((unwatchedCurrentPage - 1) * unwatchedItemsPerPage, unwatchedCurrentPage * unwatchedItemsPerPage)
        .map(i => i.id);
    }

    if (visibleIds.length === 0) return false;
    return visibleIds.every(id => selectedItemIds.includes(id));
  };

  return {
    user,
    loading,
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
    handleDragOver,
    handleToggleSelectItem,
    handleSelectAll,
    getIsAllStandaloneSelected,
    cleanUpDrag,
    stopAutoScroll
  };
}
