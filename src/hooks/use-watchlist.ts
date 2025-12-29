"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  Timestamp,
  deleteField
} from 'firebase/firestore';
import type { WatchlistItem, WatchlistFolder, QuickAddItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

export type WatchedFilterType = 'all' | 'movie' | 'series';

export function useWatchlist() {
  const [user, loading] = useAuthState(auth);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [folders, setFolders] = useState<WatchlistFolder[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('movies');

  const [draggedItem, setDraggedItem] = useState<WatchlistItem | null>(null);
  const [dragOverItem, setDragOverItem] = useState<WatchlistItem | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  const [watchedSearchTerm, setWatchedSearchTerm] = useState('');
  const [watchedSort, setWatchedSort] = useState('watchedAt_desc');
  const [watchedTypeFilter, setWatchedTypeFilter] = useState<WatchedFilterType>('all');

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [columns, setColumns] = useState(5);

  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [unwatchedCurrentPage, setUnwatchedCurrentPage] = useState(1);
  const [unwatchedItemsPerPage, setUnwatchedItemsPerPage] = useState(10);
  const [watchedCurrentPage, setWatchedCurrentPage] = useState(1);
  const [watchedItemsPerPage, setWatchedItemsPerPage] = useState(25);

  const [folderCurrentPage, setFolderCurrentPage] = useState(1);
  const [foldersPerPage, setFoldersPerPage] = useState(25);

  const importWatchedInputRef = useRef<HTMLInputElement>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const updateColumnCount = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 640) setColumns(2);
    else if (window.innerWidth < 768) setColumns(2);
    else if (window.innerWidth < 1024) setColumns(3);
    else if (window.innerWidth < 1280) setColumns(4);
    else setColumns(5);
  }, []);

  useEffect(() => {
    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, [updateColumnCount]);

  const unwatchedMovies = useMemo(() => items.filter(item => item.type === 'movie' && !item.watched).sort((a, b) => a.order - b.order), [items]);
  const unwatchedSeries = useMemo(() => items.filter(item => item.type === 'series' && !item.watched).sort((a, b) => a.order - b.order), [items]);

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

  const searchedWatchedResults = useMemo(() => {
    if (!watchedSearchTerm) {
      return { searchedFolders: [], searchedItems: watchedItems, isSearching: false };
    }
    const lowercasedTerm = watchedSearchTerm.toLowerCase();

    const searchedFolders = folders.filter(folder =>
      folder.name.toLowerCase().includes(lowercasedTerm) &&
      items.some(item => item.folderId === folder.id && item.watched && (watchedTypeFilter === 'all' || item.type === watchedTypeFilter))
    );
    const searchedFolderIds = new Set(searchedFolders.map(f => f.id));

    const searchedItems = watchedItems.filter(item =>
      item.title.toLowerCase().includes(lowercasedTerm) &&
      (!item.folderId || !searchedFolderIds.has(item.folderId))
    );

    return { searchedFolders, searchedItems, isSearching: true };
  }, [watchedSearchTerm, watchedItems, folders, watchedTypeFilter]);

  useEffect(() => {
    if (user) {
      setDataLoading(true);
      const itemsQuery = query(collection(db, 'watchlist'), where('userId', '==', user.uid));
      const foldersQuery = query(collection(db, 'folders'), where('userId', '==', user.uid));

      const unsubscribeItems = onSnapshot(itemsQuery, (querySnapshot) => {
        const watchlistItems: WatchlistItem[] = [];
        querySnapshot.forEach((doc) => {
          watchlistItems.push({ id: doc.id, ...doc.data() } as WatchlistItem);
        });
        setItems(watchlistItems);
        setDataLoading(false);
      }, (error) => {
        console.error("Error fetching watchlist: ", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch watchlist items.",
        });
        setDataLoading(false);
      });

      const unsubscribeFolders = onSnapshot(foldersQuery, (querySnapshot) => {
        const folderItems: WatchlistFolder[] = [];
        querySnapshot.forEach((doc) => {
          folderItems.push({ id: doc.id, ...doc.data() } as WatchlistFolder);
        });
        setFolders(folderItems.sort((a,b) => a.name.localeCompare(b.name)));
      }, (error) => {
        console.error("Error fetching folders: ", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch folders.",
        });
      });

      return () => {
        unsubscribeItems();
        unsubscribeFolders();
      };
    } else if (!loading) {
      setItems([]);
      setFolders([]);
      setDataLoading(false);
    }
  }, [user, loading, toast]);

  useEffect(() => {
    setUnwatchedCurrentPage(1);
    setSelectedItemIds([]);
    setOpenFolderId(null);
    setWatchedTypeFilter('all');
    setWatchedSearchTerm('');
  }, [activeTab, unwatchedItemsPerPage]);

  useEffect(() => {
    setFolderCurrentPage(1);
    if (!watchedSearchTerm) {
      setOpenFolderId(null);
    }
  }, [activeTab, foldersPerPage, watchedSearchTerm, watchedTypeFilter]);

  useEffect(() => {
    setWatchedCurrentPage(1);
  }, [watchedSearchTerm, watchedSort, watchedItemsPerPage, watchedTypeFilter]);

  const getCategorizedItems = useCallback((list: WatchlistItem[]) => {
    const itemsByFolder = folders.reduce((acc, folder) => {
        acc[folder.id] = [] as WatchlistItem[];
        return acc;
    }, {} as Record<string, WatchlistItem[]>);

    const standaloneItems: WatchlistItem[] = [];

    list.forEach(item => {
      if (item.folderId && itemsByFolder[item.folderId] !== undefined) {
        itemsByFolder[item.folderId].push(item);
      } else {
        standaloneItems.push(item);
      }
    });

    return { standalone: standaloneItems, byFolder: itemsByFolder };
  }, [folders]);

  const visibleFolders = useMemo(() => {
    const list = activeTab === 'watched' ? watchedItems : (activeTab === 'movies' ? unwatchedMovies : unwatchedSeries);
    const { byFolder } = getCategorizedItems(list);
    const currentTabType = activeTab === 'movies' ? 'movie' : 'series';

    return folders.filter(folder => {
        const folderItems = byFolder[folder.id] || [];
        if (folderItems.length === 0) return false;

        if (activeTab === 'watched') {
            const filteredFolderItems = watchedTypeFilter === 'all'
                ? folderItems
                : folderItems.filter(item => item.type === watchedTypeFilter);
            return filteredFolderItems.length > 0 && filteredFolderItems.every(item => item.watched);
        }
        return folderItems.every(item => item.type === currentTabType && !item.watched);
    });
  }, [activeTab, watchedItems, unwatchedMovies, unwatchedSeries, folders, getCategorizedItems, watchedTypeFilter]);

  useEffect(() => {
    if (openFolderId && !searchedWatchedResults.isSearching) {
        const folderExistsOnCurrentPage = visibleFolders
            .slice((folderCurrentPage - 1) * foldersPerPage, folderCurrentPage * foldersPerPage)
            .some(f => f.id === openFolderId);

        if (!folderExistsOnCurrentPage) {
            setOpenFolderId(null);
        }
    }
  }, [folderCurrentPage, foldersPerPage, openFolderId, visibleFolders, searchedWatchedResults.isSearching]);


  const handleUpdateItem = async (id: string, updates: Partial<Omit<WatchlistItem, 'id'>> | any) => {
    if (!user) return;
    const itemRef = doc(db, 'watchlist', id);
    try {
        await updateDoc(itemRef, updates);
    } catch(error) {
        console.error("Error updating item: ", error);
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

        const targetList = items.filter(i =>
            !i.watched &&
            i.type === item.type &&
            i.folderId === null
        );
        const maxOrder = targetList.length > 0 ? Math.max(...targetList.map(i => i.order)) : 0;
        updates.order = maxOrder + 1;
        updates.folderId = null;
    }

    await handleUpdateItem(item.id, updates);
    toast({
        title: watched ? "Moved to Watched" : "Moved to Watchlist",
        description: `"${item.title}" has been moved.`
    })
  };

  const handleAddItem = async (itemData: Omit<WatchlistItem, 'id' | 'order' | 'userId' | 'folderId'>) => {
    if (!user) return;

    try {
        const list = itemData.watched
        ? items.filter(i => i.watched)
        : items.filter(i => i.type === itemData.type && !i.watched && !i.folderId);

      const maxOrder = list.length > 0 ? Math.max(...list.map(i => i.order)) : 0;

      const newItem: Omit<WatchlistItem, 'id'> = {
        ...itemData,
        userId: user.uid,
        order: maxOrder + 1,
        folderId: null,
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
        console.error("Error adding item: ", error);
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
          folderId: null,
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
      console.error("Error during quick add: ", error);
      toast({
        variant: "destructive",
        title: "Quick Add Failed",
        description: "Could not add the items to your list.",
      });
    }
  };

  const handleAddFolder = async (folderName: string) => {
      if(!user) return;
      try {
        const maxOrder = folders.length > 0 ? Math.max(...folders.map(f => f.order)) : 0;
        let finalName = folderName.trim();
        if (activeTab === 'watched' && !finalName.startsWith('Watched ')) {
            finalName = `Watched ${finalName}`;
        }

        await addDoc(collection(db, 'folders'), {
            name: finalName,
            userId: user.uid,
            order: maxOrder + 1,
            createdAt: Date.now(),
        });
        toast({
            title: "Folder Created",
            description: `Folder "${folderName}" has been created.`
        });
      } catch (error) {
        console.error("Error creating folder: ", error);
        toast({
            variant: "destructive",
            title: "Creation Failed",
            description: "Could not create the folder.",
        });
      }
  }

  const handleEditFolder = async (folderId: string, newName: string) => {
    if (!user) return Promise.reject("User not logged in");
    const folderRef = doc(db, 'folders', folderId);
    try {
        const folder = folders.find(f => f.id === folderId);
        let finalName = newName.trim();
        if (folder?.name.startsWith('Watched ') && !finalName.startsWith('Watched ')) {
            finalName = `Watched ${finalName}`;
        }
        await updateDoc(folderRef, { name: finalName });
        toast({
            title: "Folder Renamed",
            description: `Folder has been renamed to "${newName}".`
        });
    } catch (error) {
        console.error("Error renaming folder: ", error);
        toast({
            variant: "destructive",
            title: "Rename Failed",
            description: "Could not rename the folder.",
        });
        return Promise.reject(error);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!user) return Promise.reject("User not logged in");

    try {
        const batch = writeBatch(db);
        const itemsInFolderQuery = query(collection(db, 'watchlist'), where('folderId', '==', folderId), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(itemsInFolderQuery);
        querySnapshot.forEach(doc => {
          batch.update(doc.ref, { folderId: null });
        });

        const folderRef = doc(db, 'folders', folderId);
        batch.delete(folderRef);

        await batch.commit();
        setOpenFolderId(null);
        toast({
            title: "Folder Deleted",
            description: "The folder and its associated items have been handled."
        });
    } catch (error) {
        console.error("Error deleting folder: ", error);
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: "Could not delete the folder.",
        });
         return Promise.reject(error);
    }
  };

  const handleBulkDeleteFolders = async (folderIds: string[]) => {
    if (!user || folderIds.length === 0) return Promise.reject("No folders selected or user not logged in");

    try {
      const batch = writeBatch(db);

      for (const folderId of folderIds) {
        // Move items out of the folder
        const itemsInFolderQuery = query(collection(db, 'watchlist'), where('folderId', '==', folderId), where('userId', '==', user.uid));
        const itemsSnapshot = await getDocs(itemsInFolderQuery);
        itemsSnapshot.forEach(itemDoc => {
          batch.update(itemDoc.ref, { folderId: null });
        });

        // Delete the folder itself
        const folderRef = doc(db, 'folders', folderId);
        batch.delete(folderRef);
      }

      await batch.commit();
      setOpenFolderId(null); // Close any open folder detail view
      toast({
        title: "Folders Deleted",
        description: `${folderIds.length} folder(s) deleted successfully. Items inside were moved to standalone.`,
      });
    } catch (error) {
      console.error("Error bulk deleting folders:", error);
      toast({
        variant: "destructive",
        title: "Bulk Deletion Failed",
        description: "Could not delete the selected folders.",
      });
       return Promise.reject(error);
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
        console.error("Error deleting item: ", error);
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
      console.error("Error bulk deleting items: ", error);
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
        console.error("Error deleting all watched items: ", error);
        toast({
            variant: "destructive",
            title: "Reset Failed",
            description: "Could not clear your watched list.",
        });
    }
  };

  const handleExportWatched = async () => {
    if (!user) return;
    toast({ title: 'Exporting watched list...', description: 'Please wait.' });

    try {
      const dataToExport = items
          .filter(item => item.watched)
          .map(({ id, userId, ...item }) => item);


      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trackflix_watched_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Export Successful', description: 'Your watched list has been downloaded.' });
    } catch (error) {
      console.error('Export Error:', error);
      toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not export your watched list.' });
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

  const handleMoveToFolder = async (itemId: string, targetFolderId: string | null) => {
    if (!user) return;
    const itemToMove = items.find(i => i.id === itemId);
    if (!itemToMove || itemToMove.folderId === targetFolderId) return;

    const originalFolderId = itemToMove.folderId;

    try {
        const batch = writeBatch(db);
        const itemRef = doc(db, 'watchlist', itemId);

        batch.update(itemRef, { folderId: targetFolderId });

        const sourceList = items
            .filter(i => i.folderId === originalFolderId && i.id !== itemId && i.watched === itemToMove.watched && (itemToMove.watched || i.type === itemToMove.type))
            .sort((a, b) => a.order - b.order);

        sourceList.forEach((item, index) => {
            const newOrder = index + 1;
            if (item.order !== newOrder) {
                batch.update(doc(db, 'watchlist', item.id), { order: newOrder });
            }
        });

        if (!itemToMove.watched) {
            const destinationList = items
                .filter(i => i.folderId === targetFolderId && i.type === itemToMove.type && !i.watched)
                .sort((a, b) => a.order - b.order);
            const newOrderInDestination = destinationList.length + 1;
            batch.update(itemRef, { order: newOrderInDestination });
        } else {
             batch.update(itemRef, { order: itemToMove.order });
        }


        await batch.commit();
        toast({
            title: "Item Moved",
            description: `"${itemToMove.title}" has been moved.`
        });

    } catch (error) {
        console.error("Error moving item: ", error);
        toast({
            variant: "destructive",
            title: "Move Failed",
            description: "Could not move the item.",
        });
    }
  };


  const handleMoveItem = async (itemId: string, direction: 'up' | 'down') => {
    const itemToMove = items.find(i => i.id === itemId);
    if (!itemToMove) return;

    const currentList = items
      .filter(i =>
        i.watched === itemToMove.watched &&
        (itemToMove.watched || i.type === itemToMove.type) &&
        i.folderId === itemToMove.folderId
      )
      .sort((a, b) => a.order - b.order);

    const currentIndex = currentList.findIndex(i => i.id === itemId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const newList = [...currentList];
    const [movedItem] = newList.splice(currentIndex, 1);
    newList.splice(targetIndex, 0, movedItem);

    await reorderItems(newList);
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
     if (draggedItem.folderId !== item.folderId) return;

    setDragOverItem(item);
  };

  const handleDragOverFolder = (e: React.DragEvent<HTMLDivElement>, folderId: string | null) => {
    e.preventDefault();
    if (isMobile || !draggedItem) return;

    if (draggedItem.folderId === folderId) {
        setDragOverFolderId(null);
        return;
    }

    const isWatchedItem = draggedItem.watched;
    if (isWatchedItem) {
        if (watchedTypeFilter !== 'all' && draggedItem.type !== watchedTypeFilter) {
            return;
        }
        setDragOverFolderId(folderId);
        setDragOverItem(null);
        return;
    }

    const currentTabType = activeTab === 'movies' ? 'movie' : 'series';
    if (draggedItem.type !== currentTabType) {
        return;
    }

    if (folderId !== null) {
        const itemsInTargetFolder = items.filter(i => i.folderId === folderId && !i.watched);
        if (itemsInTargetFolder.length > 0 && itemsInTargetFolder.some(i => i.type !== draggedItem.type)) {
            return;
        }
    }

    setDragOverFolderId(folderId);
    setDragOverItem(null);
  };

  const stopAutoScroll = () => {
    if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
    }
  };

  const cleanUpDrag = () => {
    stopAutoScroll();
    setDraggedItem(null);
    setDragOverItem(null);
    setDragOverFolderId(null);
  };

  const handleDragEnd = async () => {
    if (isMobile || !draggedItem) {
      cleanUpDrag();
      return;
    }

    const dragTargetIsFolder = dragOverFolderId !== null || (dragOverFolderId === null && draggedItem.folderId !== null);
    const dragTargetIsItem = dragOverItem !== null && dragOverItem.id !== draggedItem.id;

    if (dragTargetIsFolder && dragOverFolderId !== draggedItem.folderId) {
      await handleMoveToFolder(draggedItem.id, dragOverFolderId);
    }
    else if (dragTargetIsItem && draggedItem.folderId === dragOverItem.folderId) {
        const currentList = items
            .filter(i =>
                i.watched === draggedItem.watched &&
                (draggedItem.watched || i.type === draggedItem.type) &&
                i.folderId === draggedItem.folderId
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

  const handleBulkMove = async (folderId: string | null) => {
    if (!user || selectedItemIds.length === 0) return;

    const isWatchedTab = activeTab === 'watched';

    try {
      const batch = writeBatch(db);

      if (isWatchedTab) {
         selectedItemIds.forEach(id => {
            const itemRef = doc(db, 'watchlist', id);
            batch.update(itemRef, { folderId: folderId });
        });
      } else {
        const itemType = activeTab === 'movies' ? 'movie' : 'series';
        const destinationList = items.filter(i =>
            !i.watched &&
            i.type === itemType &&
            i.folderId === folderId
        );
        let maxOrder = destinationList.length > 0 ? Math.max(...destinationList.map(i => i.order)) : 0;

        const itemsToMove = selectedItemIds
          .map(id => items.find(item => item.id === id))
          .filter(Boolean) as WatchlistItem[];

        itemsToMove.sort((a, b) => a.order - b.order);

        itemsToMove.forEach(item => {
            maxOrder++;
            const itemRef = doc(db, 'watchlist', item.id);
            batch.update(itemRef, { folderId: folderId, order: maxOrder });
        });

        const sourceFolderIds = new Set(itemsToMove.map(item => item.folderId));
        sourceFolderIds.forEach(sourceFolderId => {
          const remainingItems = items
            .filter(i => i.folderId === sourceFolderId && !selectedItemIds.includes(i.id))
            .sort((a, b) => a.order - b.order);
          remainingItems.forEach((item, index) => {
             if (item.order !== index + 1) {
               batch.update(doc(db, 'watchlist', item.id), { order: index + 1 });
             }
          });
        });
      }

      await batch.commit();
      toast({
        title: "Items Moved",
        description: `${selectedItemIds.length} item(s) have been moved.`,
      });
      setSelectedItemIds([]);
    } catch (error) {
      console.error("Error bulk moving items: ", error);
      toast({
        variant: "destructive",
        title: "Move Failed",
        description: "Could not move the selected items.",
      });
    }
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
      const { standalone } = getCategorizedItems(watchedItems);
      const paginatedWatchedItems = standalone.slice((watchedCurrentPage - 1) * watchedItemsPerPage, watchedCurrentPage * watchedItemsPerPage);
      visibleIds = paginatedWatchedItems.map(item => item.id);
    } else {
      const { standalone } = getCategorizedItems(currentUnwatchedList);
      visibleIds = standalone
        .slice((unwatchedCurrentPage - 1) * unwatchedItemsPerPage, unwatchedCurrentPage * unwatchedItemsPerPage)
        .map(i => i.id);
    }

    if (checked) {
      setSelectedItemIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    } else {
      setSelectedItemIds(prev => prev.filter(id => !visibleIds.includes(id)));
    }
  };

  const handleSelectAllInFolder = (folderItems: WatchlistItem[], checked: boolean) => {
    const itemIds = folderItems.map(item => item.id);
    if (checked) {
      setSelectedItemIds(prev => Array.from(new Set([...prev, ...itemIds])));
    } else {
      setSelectedItemIds(prev => prev.filter(id => !itemIds.includes(id)));
    }
  };

  const getIsAllStandaloneSelected = () => {
    let visibleStandaloneIds: string[];
    const currentUnwatchedList = activeTab === 'movies' ? unwatchedMovies : unwatchedSeries;

    if (activeTab === 'watched') {
      const { standalone } = getCategorizedItems(watchedItems);
       if (standalone.length === 0) return false;
      visibleStandaloneIds = standalone
        .slice((watchedCurrentPage - 1) * watchedItemsPerPage, watchedCurrentPage * watchedItemsPerPage)
        .map(i => i.id);
    } else {
      const { standalone } = getCategorizedItems(currentUnwatchedList);
       if (standalone.length === 0) return false;
      visibleStandaloneIds = standalone
        .slice((unwatchedCurrentPage - 1) * unwatchedItemsPerPage, unwatchedCurrentPage * unwatchedItemsPerPage)
        .map(i => i.id);
    }

    if (visibleStandaloneIds.length === 0) return false;
    return visibleStandaloneIds.every(id => selectedItemIds.includes(id));
  };


  const getIsAllInFolderSelected = (folderItems: WatchlistItem[]) => {
    if (folderItems.length === 0) return false;
    return folderItems.every(item => selectedItemIds.includes(item.id));
  };

  const itemsCountMap = useMemo(() => {
    return folders.reduce((acc, folder) => {
      acc[folder.id] = items.filter(item => item.folderId === folder.id).length;
      return acc;
    }, {} as Record<string, number>);
  }, [folders, items]);

  return {
    user,
    loading,
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
    visibleFolders,
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
  };
}
