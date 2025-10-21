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
  Timestamp
} from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WatchlistItemCard } from './watchlist-item';
import { WatchedItemCard } from './watched-item-card';
import { AddItemDialog } from './add-item-dialog';
import { AddFolderDialog } from './add-folder-dialog';
import { QuickAddDialog } from './quick-add-dialog';
import type { WatchlistItem, WatchlistFolder, QuickAddItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Folder, Search, X as ClearIcon, Trash2, Upload, Download, MoreVertical, FolderPlus, PlusCircle } from 'lucide-react';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectGroup } from '../ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { PaginationControls } from './pagination-controls';
import { BulkActionBar } from './bulk-action-bar';
import { DuplicateFinderDialog } from './duplicate-finder-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { Button, buttonVariants } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { FolderMenu } from './folder-menu';
import { Badge } from "@/components/ui/badge";

const chunk = <T,>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

export function Watchlist() {
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
    return allWatched.sort((a, b) => {
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
  }, [items, watchedSort]);

  const searchedWatchedResults = useMemo(() => {
    if (!watchedSearchTerm) {
      return { searchedFolders: [], searchedItems: watchedItems, isSearching: false };
    }
    const lowercasedTerm = watchedSearchTerm.toLowerCase();
    const searchedFolders = folders.filter(folder => folder.name.toLowerCase().includes(lowercasedTerm));
    const searchedFolderIds = new Set(searchedFolders.map(f => f.id));

    const searchedItems = watchedItems.filter(item =>
      item.title.toLowerCase().includes(lowercasedTerm) &&
      (!item.folderId || !searchedFolderIds.has(item.folderId))
    );

    return { searchedFolders, searchedItems, isSearching: true };
  }, [watchedSearchTerm, watchedItems, folders]);

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
  }, [activeTab, unwatchedItemsPerPage]);

  useEffect(() => {
    setFolderCurrentPage(1);
    if (!watchedSearchTerm) {
      setOpenFolderId(null);
    }
  }, [activeTab, foldersPerPage, watchedSearchTerm]);

  useEffect(() => {
    setWatchedCurrentPage(1);
  }, [watchedSearchTerm, watchedSort, watchedItemsPerPage]);

  const getCategorizedItems = useCallback((list: WatchlistItem[]) => {
    const itemsByFolder = folders.reduce((acc, folder) => {
        acc[folder.id] = [] as WatchlistItem[];
        return acc;
    }, {} as Record<string, WatchlistItem[]>);

    const standaloneItems: WatchlistItem[] = [];

    list.forEach(item => {
      if (item.folderId && itemsByFolder[item.folderId]) {
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
            return folderItems.every(item => item.watched);
        }
        return folderItems.every(item => item.type === currentTabType && !item.watched);
    });
  }, [activeTab, watchedItems, unwatchedMovies, unwatchedSeries, folders, getCategorizedItems]);

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


  const handleUpdateItem = async (id: string, updates: Partial<Omit<WatchlistItem, 'id'>>) => {
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

  const handleQuickAdd = async (quickAddItems: Omit<QuickAddItem, 'key'>[], folderId: string | null) => {
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
          folderId: folderId,
          createdAt: timestamp,
          watchedAt: timestamp,
          rating: null,
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
        await addDoc(collection(db, 'folders'), {
            name: folderName,
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
    if (!user) return;
    const folderRef = doc(db, 'folders', folderId);
    try {
        await updateDoc(folderRef, { name: newName });
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
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!user) return;

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
            description: "The folder and its contents have been handled."
        });
    } catch (error) {
        console.error("Error deleting folder: ", error);
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: "Could not delete the folder.",
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
      const dataToExport = watchedItems.map(({ id, userId, ...item }) => item);

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

  const handleImportWatched = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || !event.target.files.length) return;

    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      if (!e.target?.result) return;
      try {
        const importedItems = JSON.parse(e.target.result as string);

        if (!Array.isArray(importedItems)) {
          throw new Error('Invalid backup file format. Expected an array of items.');
        }

        toast({ title: 'Importing watched list...', description: 'Please wait, this may take a moment.' });

        const existingTitles = new Set(watchedItems.map(item => item.title.toLowerCase()));
        let maxOrder = watchedItems.length > 0 ? Math.max(...watchedItems.map(i => i.order)) : 0;

        const batch = writeBatch(db);
        let itemsAdded = 0;

        importedItems.forEach((item: any) => {
          const title = item.title?.trim();
          if (!title || existingTitles.has(title.toLowerCase())) {
            return;
          }

          maxOrder++;
          itemsAdded++;
          const newItemRef = doc(collection(db, 'watchlist'));

          const newItem: Omit<WatchlistItem, 'id'> = {
            title: title,
            type: ['movie', 'series'].includes(item.type) ? item.type : 'movie',
            userId: user.uid,
            watched: true,
            watchedAt: item.watchedAt && (typeof item.watchedAt === 'number' || typeof item.watchedAt === 'object') ? (item.watchedAt.seconds ? new Timestamp(item.watchedAt.seconds, item.watchedAt.nanoseconds).toMillis() : item.watchedAt) : Date.now(),
            createdAt: item.createdAt && (typeof item.createdAt === 'number' || typeof item.createdAt === 'object') ? (item.createdAt.seconds ? new Timestamp(item.createdAt.seconds, item.createdAt.nanoseconds).toMillis() : item.createdAt) : Date.now(),
            order: maxOrder,
            folderId: item.folderId || null,
            isD21: item.isD21 || false,
            notes: item.notes || '',
            rating: typeof item.rating === 'number' ? item.rating : null,
            season: typeof item.season === 'number' ? item.season : undefined,
            episode: typeof item.episode === 'number' ? item.episode : undefined,
            normalizedTitle: undefined
          };

          batch.set(newItemRef, newItem);
        });

        if (itemsAdded > 0) {
            await batch.commit();
            toast({ title: 'Import Successful', description: `${itemsAdded} new item(s) have been added to your watched list.` });
        } else {
            toast({ title: 'Import Complete', description: 'No new items were added. The items may already exist in your list.' });
        }

      } catch (error) {
        console.error('Import Error:', error);
        toast({ variant: 'destructive', title: 'Import Failed', description: `Could not import data. Please check the file format. Error: ${(error as Error).message}` });
      } finally {
        if (importWatchedInputRef.current) {
          importWatchedInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const reorderItems = async (list: WatchlistItem[]) => {
    const batch = writeBatch(db);
    list.forEach((item, index) => {
      const newOrder = index + 1;
      // Only update if the order actually changed
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
    if (!itemToMove || itemToMove.folderId === targetFolderId) return; // No change needed

    const originalFolderId = itemToMove.folderId;

    try {
        const batch = writeBatch(db);

        // Update the item being moved
        const itemRef = doc(db, 'watchlist', itemId);
        batch.update(itemRef, { folderId: targetFolderId });

        // Reorder the source list (where the item came from)
        const sourceList = items
            .filter(i => i.folderId === originalFolderId && i.id !== itemId)
            .sort((a, b) => a.order - b.order);

        sourceList.forEach((item, index) => {
            const newOrder = index + 1;
            if (item.order !== newOrder) {
                batch.update(doc(db, 'watchlist', item.id), { order: newOrder });
            }
        });

        // Reorder the destination list (assign highest order in the new list)
        // Note: For watched items, order doesn't matter as much, but we'll reorder unwatched.
        if (!itemToMove.watched) {
            const destinationList = items
                .filter(i => i.folderId === targetFolderId && i.type === itemToMove.type && !i.watched)
                .sort((a, b) => a.order - b.order);
            const newOrderInDestination = destinationList.length + 1;
            batch.update(itemRef, { order: newOrderInDestination }); // Also update the moved item's order
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
        // Revert optimistic update if needed by refetching or manually setting state back
        // For simplicity with Firestore listener, we might rely on the listener to correct the UI
    }
  };


  const handleMoveItem = async (itemId: string, direction: 'up' | 'down') => {
    const itemToMove = items.find(i => i.id === itemId);
    if (!itemToMove) return;

    // Filter only items in the *same context* (same tab, same folder)
    const currentList = items
      .filter(i =>
        i.watched === itemToMove.watched &&
        (itemToMove.watched || i.type === itemToMove.type) && // Match type only if unwatched
        i.folderId === itemToMove.folderId // Match folderId
      )
      .sort((a, b) => a.order - b.order);

    const currentIndex = currentList.findIndex(i => i.id === itemId);
    if (currentIndex === -1) return; // Should not happen

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    // Check boundaries
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    // Perform the swap in the array
    const newList = [...currentList];
    const [movedItem] = newList.splice(currentIndex, 1);
    newList.splice(targetIndex, 0, movedItem);

    // Update the order in Firestore
    await reorderItems(newList);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: WatchlistItem) => {
    if (isMobile) return;
    setDraggedItem(item);
    // Optional: Add visual feedback
    e.dataTransfer.effectAllowed = 'move';
    // e.currentTarget.style.opacity = '0.5'; // Example visual feedback
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, item: WatchlistItem) => {
     if (isMobile || !draggedItem || draggedItem.id === item.id) return;
     // Only allow dropping onto items of the same type and watched status within the same folder context
     if (draggedItem.watched !== item.watched) return;
     if (!draggedItem.watched && (draggedItem.type !== item.type)) return;
     if (draggedItem.folderId !== item.folderId) return; // Prevent reordering across folders here

    setDragOverItem(item);
  };

  const handleDragOverFolder = (e: React.DragEvent<HTMLDivElement>, folderId: string | null) => {
    e.preventDefault(); // Necessary to allow dropping
    if (isMobile || !draggedItem) return;

     // Prevent dropping onto the same folder the item is already in
    if (draggedItem.folderId === folderId) {
        setDragOverFolderId(null); // Don't highlight the current folder
        return;
    }

    const isWatchedItem = draggedItem.watched;
    // Basic check: Allow dropping watched items anywhere (folder or standalone)
    if (isWatchedItem) {
        setDragOverFolderId(folderId);
        setDragOverItem(null); // Clear item drag-over state if hovering folder
        return;
    }

    // Unwatched items: Check type compatibility if dropping into a folder
    const currentTabType = activeTab === 'movies' ? 'movie' : 'series';
    if (draggedItem.type !== currentTabType) {
        return; // Don't allow drop if item type doesn't match current tab
    }

    // Check if target folder (if not null) contains items of a different type
    if (folderId !== null) {
        const itemsInTargetFolder = items.filter(i => i.folderId === folderId && !i.watched);
        if (itemsInTargetFolder.length > 0 && itemsInTargetFolder.some(i => i.type !== draggedItem.type)) {
            // Folder contains different types, prevent drop
            return;
        }
    }

    setDragOverFolderId(folderId);
    setDragOverItem(null); // Clear item drag-over state
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
     // Optional: Remove any lingering visual feedback styles
    // document.querySelectorAll('[style*="opacity: 0.5"]').forEach(el => (el as HTMLElement).style.opacity = '1');
  };

 const handleDragEnd = async () => {
    if (isMobile || !draggedItem) {
      cleanUpDrag();
      return;
    }

    const dragTargetIsFolder = dragOverFolderId !== null && dragOverFolderId !== draggedItem.folderId;
    const dragTargetIsItem = dragOverItem !== null && dragOverItem.id !== draggedItem.id; // Ensure it's not dropped on itself

    // Priority: Folder drop
    if (dragTargetIsFolder) {
      await handleMoveToFolder(draggedItem.id, dragOverFolderId);
    }
    // Else: Item reorder drop (within the same folder/standalone context)
    else if (dragTargetIsItem && draggedItem.folderId === dragOverItem.folderId) {
        const currentList = items
            .filter(i =>
                i.watched === draggedItem.watched &&
                (draggedItem.watched || i.type === draggedItem.type) &&
                i.folderId === draggedItem.folderId // Ensure same context
            )
            .sort((a, b) => a.order - b.order);

        const draggedIndex = currentList.findIndex(i => i.id === draggedItem.id);
        const targetIndex = currentList.findIndex(i => i.id === dragOverItem.id);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            const newList = [...currentList];
            const [movedItem] = newList.splice(draggedIndex, 1);
            newList.splice(targetIndex, 0, movedItem);
            await reorderItems(newList); // Update order in DB
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
        // Get items currently in the destination list to calculate max order
        const destinationList = items.filter(i =>
            !i.watched &&
            i.type === itemType &&
            i.folderId === folderId
        );
        let maxOrder = destinationList.length > 0 ? Math.max(...destinationList.map(i => i.order)) : 0;

        // Get the items being moved to reorder them correctly
        const itemsToMove = selectedItemIds
          .map(id => items.find(item => item.id === id))
          .filter(Boolean) as WatchlistItem[]; // Filter out undefined if any id not found

        // Sort items to move by their original order to maintain relative order if desired
        itemsToMove.sort((a, b) => a.order - b.order);

        // Update each moved item with the new folderId and sequential order
        itemsToMove.forEach(item => {
            maxOrder++;
            const itemRef = doc(db, 'watchlist', item.id);
            batch.update(itemRef, { folderId: folderId, order: maxOrder });
        });

        // Reorder items left in the source folders if necessary
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
    e.preventDefault(); // Necessary to allow dropping
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

  const currentUnwatchedList = activeTab === 'movies' ? unwatchedMovies : unwatchedSeries;

  const handleSelectAll = (checked: boolean) => {
    const isWatched = activeTab === 'watched';
    let visibleIds: string[];

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
        .slice((unwatchedCurrentPage - 1) * unwatchedItemsPerPage, unwatchedItemsPerPage)
        .map(i => i.id);
    }

    if (visibleStandaloneIds.length === 0) return false;
    return visibleStandaloneIds.every(id => selectedItemIds.includes(id));
  };

  const getIsAllInFolderSelected = (folderItems: WatchlistItem[]) => {
    if (folderItems.length === 0) return false;
    return folderItems.every(item => selectedItemIds.includes(item.id));
  };

  const renderUnwatchedList = (list: WatchlistItem[], isPaginated = true) => {
    if (list.length === 0) {
      return <p className="text-muted-foreground px-4 text-sm sm:text-base">Nothing to watch here!</p>;
    }

    const pageCount = isPaginated ? Math.ceil(list.length / unwatchedItemsPerPage) : 1;
    const currentPage = isPaginated ? unwatchedCurrentPage : 1;
    const paginatedList = isPaginated
      ? list.slice((currentPage - 1) * unwatchedItemsPerPage, currentPage * unwatchedItemsPerPage)
      : list;
    const startIndex = isPaginated ? (currentPage - 1) * unwatchedItemsPerPage : 0;


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
                  allFolders={folders}
                  items={items}
                  isSelected={selectedItemIds.includes(item.id)}
                  onToggleSelect={handleToggleSelectItem}
                  isDragging={!isMobile && draggedItem?.id === item.id}
                  isFirst={startIndex + index === 0}
                  isLast={startIndex + index === list.length - 1}
                  onUpdate={handleUpdateItem}
                  onDelete={handleDeleteItem}
                  onUpdateWatched={handleUpdateWatched}
                  onMoveToFolder={handleMoveToFolder}
                  onMoveItem={handleMoveItem}
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
                currentPage={unwatchedCurrentPage}
                pageCount={pageCount}
                onPageChange={setUnwatchedCurrentPage}
                itemsPerPage={unwatchedItemsPerPage}
                onItemsPerPageChange={setUnwatchedItemsPerPage}
                itemsPerPageOptions={[10, 25, 50]}
            />
        )}
      </div>
    )
  }

  const renderWatchedList = (list: WatchlistItem[], allFolders: WatchlistFolder[]) => {
    const pageCount = Math.ceil(list.length / watchedItemsPerPage);
    const paginatedList = list.slice((watchedCurrentPage - 1) * watchedItemsPerPage, watchedCurrentPage * watchedItemsPerPage);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {paginatedList.map((item) => (
            <div
              key={item.id}
              data-item-id={item.id}
              className={cn("relative transition-all duration-300", !isMobile && dragOverItem?.id === item.id && "ring-2 ring-primary rounded-lg ring-offset-2 ring-offset-background")}
            >
              <WatchedItemCard
                item={item}
                allFolders={allFolders}
                items={items}
                isDragging={!isMobile && draggedItem?.id === item.id}
                isSelected={selectedItemIds.includes(item.id)}
                isSelectionMode={selectedItemIds.length > 0}
                onToggleSelect={handleToggleSelectItem}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
                onUpdateWatched={handleUpdateWatched}
                onMoveToFolder={handleMoveToFolder}
                handleDragStart={handleDragStart}
                handleDragEnter={handleDragEnter}
                handleDragEnd={handleDragEnd}
              />
            </div>
          ))}
        </div>
         {pageCount > 1 && (
            <PaginationControls
                currentPage={watchedCurrentPage}
                pageCount={pageCount}
                onPageChange={setWatchedCurrentPage}
                itemsPerPage={watchedItemsPerPage}
                onItemsPerPageChange={(value) => {
                  setWatchedItemsPerPage(value);
                  setWatchedCurrentPage(1);
                }}
                itemsPerPageOptions={[25, 50, 100]}
            />
        )}
      </div>
    );
  };

  const FolderGrid = ({ visibleFolders, itemsByFolder, listRenderer }: { visibleFolders: WatchlistFolder[], itemsByFolder: Record<string, WatchlistItem[]>, listRenderer: (list: WatchlistItem[], allFolders: WatchlistFolder[]) => JSX.Element }) => {
    const pageCount = Math.ceil(visibleFolders.length / foldersPerPage);
    const paginatedFolders = visibleFolders.slice(
      (folderCurrentPage - 1) * foldersPerPage,
      folderCurrentPage * foldersPerPage
    );

    const folderRows = chunk(paginatedFolders, columns);
    const openFolderDetails = openFolderId ? { folder: folders.find(f => f.id === openFolderId), items: itemsByFolder[openFolderId] || [] } : null;

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

                  return (
                    <Card
                      key={folder.id}
                      onClick={() => setOpenFolderId(prev => prev === folder.id ? null : folder.id)}
                      data-folder-id={folder.id}
                      onDragEnter={(e) => handleDragOverFolder(e, folder.id)}
                      onDragLeave={() => setDragOverFolderId(null)}
                      onDrop={handleDragEnd}
                      className={cn(
                        "transition-all duration-300 cursor-pointer hover:border-primary w-full flex flex-col h-full",
                        isDropTarget && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        openFolderId === folder.id && "border-primary bg-primary/10"
                      )}
                    >
                      <CardContent className="p-3 sm:p-4 flex-1 w-full flex items-center justify-between">
                        <div className='flex items-center gap-4 text-left min-w-0'>
                          <Folder className="h-8 w-8 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm sm:text-base break-words">{folder.name}</p>
                            <p className="text-xs text-muted-foreground">{folderItems.length} items</p>
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
                              {openFolderDetails.folder && <FolderMenu folder={openFolderDetails.folder} allFolders={folders} onEdit={handleEditFolder} onDelete={handleDeleteFolder} />}
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
                     {activeTab === 'watched' ? renderWatchedList(openFolderDetails.items, folders) : renderUnwatchedList(openFolderDetails.items, false)}
                 </div>
              )}
            </div>
          );
        })}

        {pageCount > 1 && (
          <PaginationControls
              currentPage={folderCurrentPage}
              pageCount={pageCount}
              onPageChange={setFolderCurrentPage}
              itemsPerPage={foldersPerPage}
              onItemsPerPageChange={setFoldersPerPage}
              itemsPerPageOptions={[25, 50, 100]}
          />
        )}
      </div>
    );
  };

  const renderCategorizedUnwatched = (data: { standalone: WatchlistItem[], byFolder: Record<string, WatchlistItem[]> }) => {
    const { standalone, byFolder } = data;

    const currentTabType = activeTab === 'movies' ? 'movie' : 'series';
    const visibleFolders = folders.filter(folder => {
        const folderItems = byFolder[folder.id] || [];
        return folderItems.length > 0 && folderItems.every(item => item.type === currentTabType && !item.watched);
    });

    const hasStandaloneContent = standalone.length > 0;
    const typeName = activeTab.slice(0,-1);

    if (!hasStandaloneContent && visibleFolders.length === 0) {
        return (
          <div className="text-center text-muted-foreground py-12">
            <p>Your {typeName} list is empty.</p>
            <p>Click "Add Movie/Series" to get started.</p>
          </div>
        )
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
            <FolderGrid visibleFolders={visibleFolders} itemsByFolder={byFolder} listRenderer={(items) => renderUnwatchedList(items, false)} />
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
                    !isMobile && draggedItem && dragOverFolderId === null && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
            >
              {(visibleFolders.length > 0) && hasStandaloneContent && <Separator className="my-10" />}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  Standalone ({standalone.length})
                </h2>
                 {(standalone.length > 1) ? (
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="select-all-standalone"
                            onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                            checked={getIsAllStandaloneSelected()}
                        />
                        <Label htmlFor="select-all-standalone" className='text-sm'>Select All</Label>
                    </div>
                ): null}
              </div>
              {renderUnwatchedList(standalone, true)}
            </div>
        )}
      </div>
    );
  }

  const renderCategorizedWatched = () => {
    const { searchedFolders, searchedItems, isSearching } = searchedWatchedResults;
    const watchedMoviesCount = watchedItems.filter(item => item.type === 'movie').length;
    const watchedSeriesCount = watchedItems.filter(item => item.type === 'series').length;

    const renderCounters = () => (
      <div className="flex items-center gap-2 mb-6">
          <Badge variant="secondary">Total: {watchedItems.length}</Badge>
          <Badge variant="secondary">Movies: {watchedMoviesCount}</Badge>
          <Badge variant="secondary">Series: {watchedSeriesCount}</Badge>
      </div>
    );

    const handleSelectAllSearchResults = (checked: boolean) => {
      const allSearchItemIds = new Set<string>();
      searchedItems.forEach(item => allSearchItemIds.add(item.id));
      searchedFolders.forEach(folder => {
        const itemsInFolder = items.filter(item => item.folderId === folder.id);
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
        const itemsInFolder = items.filter(item => item.folderId === folder.id);
        itemsInFolder.forEach(item => allSearchItemIds.add(item.id));
      });
      if (allSearchItemIds.size === 0) return false;
      return Array.from(allSearchItemIds).every(id => selectedItemIds.includes(id));
    };

    if (isSearching) {
      if (searchedFolders.length === 0 && searchedItems.length === 0) {
        return <p className="text-center text-muted-foreground py-10">No results for "{watchedSearchTerm}"</p>;
      }
      return (
        <div className="space-y-8">
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
          {searchedFolders.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Folders ({searchedFolders.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {searchedFolders.map(folder => (
                  <Card
                    key={folder.id}
                    onClick={() => {
                      setOpenFolderId(prev => prev === folder.id ? null : folder.id);
                    }}
                    className={cn(
                      "transition-all duration-300 cursor-pointer hover:border-primary w-full flex flex-col h-full",
                      openFolderId === folder.id && "border-primary bg-primary/10"
                    )}
                  >
                    <CardContent className="p-3 sm:p-4 flex-1 w-full flex items-center justify-between">
                      <div className='flex items-center gap-4 text-left min-w-0'>
                        <Folder className="h-8 w-8 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm sm:text-base break-words">{folder.name}</p>
                          <p className="text-xs text-muted-foreground">{items.filter(i => i.folderId === folder.id).length} items</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {openFolderId && searchedFolders.some(f => f.id === openFolderId) && (
                <div className="mt-4 border rounded-lg px-4 py-6 bg-card">
                  <h3 className="text-2xl font-bold mb-6">{folders.find(f=>f.id === openFolderId)?.name}</h3>
                  {renderWatchedList(items.filter(item => item.folderId === openFolderId), folders)}
                </div>
              )}
            </div>
          )}

          {searchedItems.length > 0 && (
            <div>
              {searchedFolders.length > 0 && <Separator className="my-8" />}
              <h2 className="text-2xl font-bold mb-6">Movies & Series ({searchedItems.length})</h2>
              {renderWatchedList(searchedItems, folders)}
            </div>
          )}
        </div>
      );
    }

    const { standalone, byFolder } = getCategorizedItems(watchedItems);
    const visibleFolders = folders.filter(folder => (byFolder[folder.id] || []).length > 0 && (byFolder[folder.id] || []).every(item => item.watched));

    if (standalone.length === 0 && visibleFolders.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-12">
            {renderCounters()}
            <p>Your watched list is empty.</p>
        </div>
      )
    }

    return (
      <div
        className="space-y-8"
        onDragOver={handleDragOver}
        onDragLeave={stopAutoScroll}
        onMouseUp={cleanUpDrag}
        onTouchEnd={cleanUpDrag}
      >
        {!isSearching && renderCounters()}
        {visibleFolders.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Folders ({visibleFolders.length})</h2>
            <FolderGrid visibleFolders={visibleFolders} itemsByFolder={byFolder} listRenderer={renderWatchedList} />
          </div>
        )}

        {standalone.length > 0 && (
          <div
            onDragEnter={(e) => handleDragOverFolder(e, null)}
            onDragLeave={() => setDragOverFolderId(null)}
            onDrop={handleDragEnd}
            data-folder-id="standalone"
            className={cn("p-2 rounded-lg transition-all duration-300", !isMobile && draggedItem && dragOverFolderId === null && "ring-2 ring-primary ring-offset-2 ring-offset-background")}
          >
            {(visibleFolders.length > 0) && <Separator className="my-8"/>}
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Standalone ({standalone.length})</h3>
                {standalone.length > 1 ? (
                  <div className="flex items-center space-x-2">
                      <Checkbox
                          id="select-all-watched-standalone"
                          onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                          checked={getIsAllStandaloneSelected()}
                          disabled={standalone.length === 0}
                      />
                      <Label htmlFor="select-all-watched-standalone" className='text-sm whitespace-nowrap'>Select All</Label>
                  </div>
                ) : null}
            </div>
            {renderWatchedList(standalone, folders)}
          </div>
        )}
      </div>
    );
  }

  const renderContent = (list: WatchlistItem[], type: 'movie' | 'series' | 'watched') => {
    if (dataLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
             <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      );
    }

    if (type === 'watched') {
        return renderCategorizedWatched();
    }

    const currentList = activeTab === 'movies' ? unwatchedMovies : unwatchedSeries;
    const categorizedData = getCategorizedItems(currentList);
    return renderCategorizedUnwatched(categorizedData);
  }

  return (
    <>
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
          <TabsList className='grid w-full grid-cols-3 lg:inline-flex lg:w-auto'>
              <TabsTrigger value="movies">Movies ({unwatchedMovies.length})</TabsTrigger>
              <TabsTrigger value="series">Series ({unwatchedSeries.length})</TabsTrigger>
              <TabsTrigger value="watched">Watched ({watchedItems.length})</TabsTrigger>
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
                    <AddItemDialog onAddItem={handleAddItem}>
                        <Button className="w-full">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Item
                        </Button>
                    </AddItemDialog>
                </div>
                <div className={cn('flex flex-1 sm:flex-auto', activeTab === 'watched' ? 'hidden' : 'flex')}>
                    <AddFolderDialog onAddFolder={handleAddFolder} folders={folders}>
                        <Button variant="secondary" className="w-full">
                            <FolderPlus className="mr-2 h-4 w-4" />
                            Add Folder
                        </Button>
                    </AddFolderDialog>
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
                    <QuickAddDialog onQuickAdd={handleQuickAdd} folders={folders} />
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className='shrink-0'>
                            <MoreVertical className="h-4 w-4" />
                            <span className='sr-only'>More Actions</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <div className={cn(activeTab !== 'watched' ? 'flex flex-col' : 'hidden')}>
                          <DuplicateFinderDialog allItems={items} allFolders={folders} onDeleteItem={handleDeleteItem} trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}><Search className="mr-2 h-4 w-4" />Find Duplicates</DropdownMenuItem>} />
                        </div>
                        <div className={cn(activeTab === 'watched' ? 'flex flex-col' : 'hidden')}>
                            <AddFolderDialog onAddFolder={handleAddFolder} folders={folders}>
                               <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <FolderPlus className="mr-2 h-4 w-4" />
                                    <span>Add Folder</span>
                                </DropdownMenuItem>
                            </AddFolderDialog>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={handleExportWatched}>
                                <Download className="mr-2 h-4 w-4" />
                                <span>Export Watched List</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => importWatchedInputRef.current?.click()}>
                                <Upload className="mr-2 h-4 w-4" />
                                <span>Import Watched List</span>
                            </DropdownMenuItem>
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

      <TabsContent value="movies">{renderContent(unwatchedMovies, 'movie')}</TabsContent>
      <TabsContent value="series">{renderContent(unwatchedSeries, 'series')}</TabsContent>
      <TabsContent value="watched">{renderContent(watchedItems, 'watched')}</TabsContent>
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